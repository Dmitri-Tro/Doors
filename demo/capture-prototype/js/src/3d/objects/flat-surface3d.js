const FlatSurface = function (type) {
  THREE.Mesh.call(this);

  // Constructor
  // this.events = new EventsSystem('FlatSurface-' + this.uuid);
  this.transformConfig = new TransformConfig('', '', '', 'world'); 

  this.type = 'floor' || type;
  this.clearable = true;
  this.canRaycasted = true;
  this.needRaycast = true;
  this.cuttedFrom = null;
  this.replacedWithCut = false;

  this.defaults = {
    height: 0,
    ceilingHeight: 250
  };

  this.height = 0;
  this.ceilingHeight = 250;

  this.shape = null;
  this.ceiling = null;

  this.material = [
    new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false}), // Transparent
    new THREE.MeshLambertMaterial({color: 0x272822}), // NoTexture
    new THREE.MeshLambertMaterial({color: 0xFFFF00}) // Texture
  ];

  this.side = {
    materialIndex: 0,
    defaultMaterial: 0,
    projectionCamera: null,
    faces: [],
    room: null
  };

  this.getId = function () {
    return (this.room2D && 0) ? md5(this.room2D.getUuid()) : this.getIdFromShape();
  }

  this.getIdFromShape = function () { 
    if (this.shape) {
      var points = this.shape.curves.map(function (curve) {
        return curve.v1;
      });

      return md5(JSON.stringify(points));
    } else {
      console.warn('Flat surface not contain a shape!')
      return this.uuid;
    }
  }

  this.getName = function () {
    this.name = this.type.charAt(0).toUpperCase() + this.type.slice(1) + 'Flat_' + this.getId();
    return this.name;
  }

  this.getTitle = function () {
    return (this.room2D ? this.room2D.roomName : this.getName()).trim();
  }

  this.setCuttedFrom = function (parent) {
    this.cuttedFrom = parent;
    return this;
  }

  this.isCut = function () {
    return this.cuttedFrom !== null;
  }

  this.setHeight = function (value) {
    value = parseFloat(value);

    if (!isNaN(value)) {
      this.height = value;
    } else {
      console.warn('Height of floor need be a number!');
    }

    return this;
  }

  this.setCeilingHeight = function (value) {
    value = parseFloat(value);

    if (!isNaN(value)) {
      this.ceilingHeight = value;
    } else {
      console.warn('Height of ceiling need be a number!');
    }

    return this;
  }

  this.setDefault = function (key, value) {
    if (this[key] === this.defaults[key]) {
      this[key] = value;
    }

    this.defaults[key] = value;

    return this;
  }

  this.refresh = function (refreshGeometry) {
    this.position.y = this.height;

    if (this.ceiling) {
      this.ceiling.position.y = this.ceilingHeight;
    }

    if (refreshGeometry) {
      if (this.room2D) {
        this.setFromRoom2D(this.room2D).syncGeometryFacesWithSide();
      }
    }

    return this;
  }

  this.syncGeometryFacesWithSide = function () {
    this.setSideFacesMaterialsIndexes(this.side.materialIndex);
    return this;
  }

  this.setFromRoom2D = function (room2D) {
    this.room2D = room2D; 

    var corners = room2D.corners;

    if (corners.length) {
      this.shape = new THREE.Shape();

      this.shape.moveTo(corners[0].x, corners[0].y);
  
      for (var i = 1; i < corners.length; i++) {
        this.shape.lineTo(corners[i].x, corners[i].y);
      }
  
      this.shape.lineTo(corners[0].x, corners[0].y);

      this.buildGeometry();
    }

    this.getName();

    return this;
  };

  this.setFromShape = function (shape) {
    this.shape = shape;
    this.getName()
    this.buildGeometry();
    return this;
  }

  this.buildGeometry = function () {
    if (this.shape) {
      this.geometry = new THREE.Geometry().fromBufferGeometry(new THREE.ExtrudeBufferGeometry(this.shape, {
        steps: 1,
        depth: 3,
        bevelEnabled: false
      }));
  
      this.geometry.rotateX(Math.PI / 2);
      this.makeCeiling();
    }

    return this;
  }

  this.makeCeiling = function () {
    if (this.ceiling) {
      this.remove(this.ceiling);
      this.ceiling = null;
    }

    this.ceiling = new Ceiling3D(this.geometry, this.material[0]);
    this.ceiling.position.y = this.ceilingHeight;
    this.ceiling.visible = false;
    this.add(this.ceiling);

    return this;
  }

  this.getMaterialByFace = function (faceIndex) {
    if (~this.side.faces.indexOf(faceIndex)) {
      if (this.side.projectionCamera) {
        return this.side.projectionCamera.getId();
      } else {
        return this.side.defaultMaterial;
      }
    } else {
      return undefined;
    }
  }

  this.getRoomByFace = function (faceIndex) {
    if (this.side.room) {
      return this.side.room.getId();
    }

    return undefined;
  }

  this.getSideFaces = function () {
    var sideFaces = [];

    this.geometry.computeFaceNormals();
    this.geometry.faces.forEach(function (face, index) {     
      if (face.normal.y > 0) {
        sideFaces.push(index);
      } else {
        face.materialIndex = 0;
      }
    }.bind(this));

    this.side.faces = sideFaces;
    this.setSideFacesMaterialsIndexes(this.side.materialIndex);

    return this;
  }

  this.setSideFacesMaterialsIndexes = function (index, updateGroups) {
    this.side.faces.forEach(function (faceIndex) {
      try {
        this.geometry.faces[faceIndex].materialIndex = index;
      } catch (e) {
        console.warn('Faces not valid!', e);
      } 
    }.bind(this));

    this.geometry.groupsNeedUpdate = true;

    return this;
  }

  this.setSideCameraMaterial = function (camera) {
    this.material[2] = camera.shaderMaterial;
    this.side.materialIndex = 2;
    this.side.defaultMaterial = null;
    this.side.projectionCamera = camera;
    this.setSideFacesMaterialsIndexes(2);

    return this;
  }

  this.setSideCameraMaterialByFace = function (camera, face) {
    if (~this.side.faces.indexOf(face)) {
      this.needRaycast = false;
      this.setSideFacesMaterialsIndexes(2).setSideCameraMaterial(camera);
    }
    return this;
  }

  this.setSideDefaultMaterialByFace = function (material, face) {
    if (~this.side.faces.indexOf(face)) {
      this.needRaycast = false;
      this.side.materialIndex = material;
      this.side.defaultMaterial = material;
      this.side.projectionCamera = null;
      this.setSideFacesMaterialsIndexes(material);
    }

    return this;
  }

  this.onParametersShown = function () {
    this.ceiling.visible = true;
    return this;
  }

  this.onParametersHidden = function () {
    this.ceiling.visible = false;
    return this;
  }

  this.getParameters = function () {
    return [new ControlsElement({
        id: this.getId() + '_height',
        label: 'Floor height:',
        type: 'input',
        options: {
          type: 'number'
        },
        value: this.height,
        onChange: function (value) {
          this.setHeight(value).refresh();
        }.bind(this)
      }), new ControlsElement({
        id: this.getId() + '_ceiling_height',
        label: 'Ceiling height:',
        type: 'input',
        options: {
          type: 'number'
        },
        value: this.ceilingHeight,
        onChange: function (value) {
          this.setCeilingHeight(value).refresh();
        }.bind(this)
      })
    ]
  }

  this.repairMaterials = function () { // todo: get why materials broken in sometimes (after 2d tab)
    const side = this.side;

    if (this.side.projectionCamera) {
        var material = this.material[side.materialIndex];
        var cameraMaterial = side.projectionCamera.shaderMaterial;
        if (material !== cameraMaterial) {
            this.setSideCameraMaterialByFace(side.projectionCamera, side.faces[0]);
        }
    }

    return this;
  }

  this.setStructure = function (floor3D, structure) {
    if (!_.isEqual(this.side.faces, structure.side.faces)) {
      return;
    } else {
      this.needRaycast = false;
    }

    delete structure.isCut; // Hint: override function replace

    this.setHeight(structure.height).setCeilingHeight(structure.ceilingHeight).refresh();

    Object.assign(this.side, structure.side);

    if (this.side.projectionCamera) {
      var camera3D = floor3D.findInGroup('cameras', function (camera) {
        return camera.getId() === this.side.projectionCamera;
      }.bind(this));

      if (camera3D !== undefined && camera3D.shaderMaterial) {
        this.setSideCameraMaterialByFace(camera3D, this.side.faces[0]);
      } else {
        this.setSideDefaultMaterialByFace(0, this.side.faces[0]);
      }
    } else if (!isNaN(parseInt(this.side.defaultMaterial))) {
      this.setSideDefaultMaterialByFace(this.side.defaultMaterial, this.side.faces[0]);
    } else {
      this.setSideDefaultMaterialByFace(0, this.side.faces[0]);
    }

    return this;
  }

  this.getStructure = function () {
    var structure = {
      id: this.getId(),
      name: this.getName(),
      height: this.height,
      ceilingHeight: this.ceilingHeight,
      side: _.clone(this.side),
      cuttedFrom: this.cuttedFrom ? this.cuttedFrom.getName() : null,
      replacedWithCut: this.replacedWithCut
    };

    if (structure.side.projectionCamera instanceof Camera3D) {
      structure.side.projectionCamera = structure.side.projectionCamera.getId();
    } else if (structure.side.projectionCamera) {
      console.warn('Projection camera isn\'t a camera!', structure.side.projectionCamera);
    }

    if (structure.side.room) {
      structure.side.room = structure.side.room.getId();
    }

    return structure;
  }
}

FlatSurface.prototype = Object.create(THREE.Mesh.prototype);
FlatSurface.prototype.constructor = FlatSurface;