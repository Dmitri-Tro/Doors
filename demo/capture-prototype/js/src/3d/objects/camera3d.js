const Camera3D = function (cameraID, texturesCache, textureSize) {
  THREE.Object3D.call(this);

  this.cameraID = cameraID || '';
  this.camera2D = null;
  this.shaderMaterial = null;
  this.shaderIsCubemap = false;
  this.textureSize = textureSize || 256;
  this.texturesCache = texturesCache || {};

  this.transformConfig = new TransformConfig('xyz', 'y', '', 'world'); 

  this.shader = {
    quaternion: new THREE.Quaternion()
  };

  this.clearable = true;

  this.pointer = new Camera3DPointer;
  this.add(this.pointer);

  this.getId = function () {
    return this.camera2D ? this.camera2D.id : this.cameraID;
  }

  this.getName = function () {
    return this.camera2D ? this.camera2D.visibleName : 'Unnamed ' + this.id;
  }

  this.getAngle = function () {
    if (this.rotation.x > 0) {
      return Math.PI + this.rotation.y;
    } else if (this.rotation.x < 0) {
      return Math.PI - this.rotation.y;
    } else if (this.rotation.y < 0) {
      return (Math.PI * 2) + (this.rotation.y % (Math.PI * 2));
    } else {
      return this.rotation.y % (Math.PI * 2);
    }
  }

  this.getMaterialByFace = function () {
    if (this.camera2D && this.shaderMaterial) {
      return this.getId();
    } else {
      return undefined;
    }
  }

  this.setViewMode = function (mode) {
    if (mode === 'player') {
      this.pointer.visible = false;
    } else if (mode === 'editor') {
      this.pointer.visible = true;
    }

    return this;
  }

  this.setPointerColor = function (hex) {
    this.pointer.material.color.setHex(hex);
    return this;
  }
  
  this.resetPointerColor = function () {
    if (this.shaderMaterial) {
      this.pointer.material.color.setHex(this.pointer.defaultColorHex);
    } else {
      this.pointer.material.color.setHex(0xFF0000);
    }

    return this;
  }

  this.setFromCamera2D = function (camera2D) {
    this.cameraID = camera2D.id;
    this.setCamera2D(camera2D).setStructureFrom2D();
    return this;
  }

  this.setCamera2D = function (camera2D) {
    this.camera2D = camera2D;
    return this;
  }

  this.getCamera2D = function () {
    return this.camera2D;
  } 

  this.setStructureFrom2D = function () {
    if (this.camera2D) {
      this.setStructure(null, {
        position: {
          x: this.camera2D.x,
          y: this.camera2D.height || 150,
          z: this.camera2D.y
        },
        rotation: (Utils.normalizeAngle(360 - this.camera2D.mergeAngle)) * THREE.Math.DEG2RAD
      });
    }

    return this;
  }

  this.setShaderMaterial = function (texture, isCubeMap) {
    if (isCubeMap) {
      this.shaderMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([CubemapShader.uniforms, {}]),
        vertexShader: CubemapShader.vertexShader,
        fragmentShader: CubemapShader.fragmentShader,
        // side: THREE.DoubleSide
      });
    } else {
      this.shaderMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([EquirectangularShader.uniforms, {}]),
        vertexShader: EquirectangularShader.vertexShader,
        fragmentShader: EquirectangularShader.fragmentShader,
        // side: THREE.DoubleSide
      });
    }

    this.resetPointerColor();

    this.shaderMaterial.uniforms.texture = {type: 't', value: texture};
    this.shaderMaterial.uniforms.placement = {type: 'v3', value: new THREE.Vector3};
    this.shaderMaterial.uniforms.rotation = {type: 'v3', value: new THREE.Euler};
    this.updateShader();

    return this;
  }

  /** 
   * Resize image to make its dimensions be a multiple of 2 (eg. 16x16, 512x1024)
   * @param {HTMLImageElement}
   * @param {number} maxW max width
   * @param {number} maxH max height
   * @return {HTMLImageElement} resized or source image
   */
  this.resizePowerOfTwo = function (image, maxW, maxH) {
    if (maxW === undefined) maxW = Infinity;
    if (maxH === undefined) maxH = Infinity;

    return this.resizeImage(
      image,
      Math.min(THREE.Math.floorPowerOfTwo(image.width), maxW), 
      Math.min(THREE.Math.floorPowerOfTwo(image.height), maxH)
    );
  }

  /**
   * Resize image
   * @param {HTMLImageElement}
   * @return {HTMLImageElement} resized or source image
   */
  this.resizeImage = function (image, newWidth, newHeight) {
    if (
      (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap) &&
      (image.width !== newWidth || image.height !== newHeight)
    ) {
      var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      var context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      // console.log('%cResize', 'color: purple', this.cameraID, newHeight, newWidth);

      return canvas;
    }

    return image;
  }

  this.setTexture = function (textureUrl, isCubeMap) {
    var id = this.getId();
    if (!this.texturesCache[id].texture) {
      this.setPointerColor(0xEEEEEE);

      if (isCubeMap) {
        var urls = ["r", "l", "u", "d", "f", "b"].map(function (letter) {  
          // Hint: Strange, but CORS in chrome not works when ?v={{TIMESTAMP}} in url
          return textureUrl.replace("%s", letter).replace(".JPG", ".jpg").replace(/\?v=.*$/, '');
        });
  
        var cubeLoader = new THREE.CubeTextureLoader;
        var texture = cubeLoader.load(urls, function (edge) {
          edge.image = edge.image.map(function (image) {
            return this.resizePowerOfTwo(
              image, 
              this.textureSize,
              this.textureSize
            );
          }.bind(this));
        }.bind(this));
        
        this.texturesCache[id].texture = texture;
        this.resetPointerColor();
        this.setShaderMaterial(texture, true);
      } else { // Equirectangular
        var textureLoader = new THREE.TextureLoader;
        var texture = textureLoader.load(textureUrl.replace(/\?v=.*$/, ''), function (loadedTexture) {
          loadedTexture.image = this.resizePowerOfTwo(
            loadedTexture.image, 
            this.textureSize * 4, 
            this.textureSize * 2
          );

          this.texturesCache[id].texture = texture;
          this.resetPointerColor();
        }.bind(this));
  
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        this.setShaderMaterial(texture, false);
      }
    } else {
      this.setShaderMaterial(this.texturesCache[id].texture, this.texturesCache[id].cubeMap);
    }

    return this;
  }

  this.updateShader = function () {
    if (this.shaderMaterial && this.parent) {
      this.getWorldPosition(this.shaderMaterial.uniforms.placement.value);
      this.getWorldQuaternion(this.shader.quaternion);
      this.shaderMaterial.uniforms.rotation.value.setFromQuaternion(this.shader.quaternion);

      // Fix setFromQuaternion, when gives same angle for x/-x directions
      if (this.shaderMaterial.uniforms.rotation.value.y < 0) {
        this.shaderMaterial.uniforms.rotation.value.y += Math.PI * 2;
      }

      if (Math.abs(this.shader.quaternion.y) > Math.abs(this.shader.quaternion.w)) {
        this.shaderMaterial.uniforms.rotation.value.y = Math.PI - this.shaderMaterial.uniforms.rotation.value.y;
      }

      if (this.camera2D && jsonData.tour.rooms[this.camera2D.id]) {
        this.shaderMaterial.uniforms.pitch.value = THREE.Math.degToRad(jsonData.tour.rooms[this.camera2D.id].pitch) || 0;
        this.shaderMaterial.uniforms.roll.value = THREE.Math.degToRad(jsonData.tour.rooms[this.camera2D.id].roll) || 0;
      }
    }

    return this;
  }

  this.onTransform = function (mode) {
    this.updateShader().update2D();
  }

  this.update2D = function () {
    if (this.camera2D) {
      this.camera2D.x = this.position.x;
      this.camera2D.y = this.position.z;
      // this.camera2D.lens = this.position.y;
      this.camera2D.mergeAngle = Utils.normalizeAngle(360 - this.getAngle() * THREE.Math.RAD2DEG);
      this.camera2D.setAngle(0);
    }
  }

  this.aboveFloor = function (flatFloor3D) {
    var raycaster = new THREE.Raycaster;

    var origin = new THREE.Vector3;
    var directionDown = new THREE.Vector3(0, -1, 0);

    this.updateMatrixWorld();
    origin.setFromMatrixPosition(this.matrixWorld);

    raycaster.set(origin, directionDown);

    return !!raycaster.intersectObject(flatFloor3D).length;
  }

  this.getStructure = function () {
    return {
      id: this.getId(),
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      },
      rotation: this.getAngle()
    }
  }
  
  this.setStructure = function (floor3D, structure) {
    this.position.x = structure.position.x;
    this.position.y = structure.position.y;
    this.position.z = structure.position.z;

    this.rotation.y = structure.rotation;

    this.updateShader();

    return this;
  }

}

Camera3D.prototype = Object.create(THREE.Object3D.prototype);
Camera3D.prototype.constructor = Camera3D;