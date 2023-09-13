const Lever3D = function (options) {
  THREE.Mesh.call(this);

  this.options = {
    height: 250,
    color: 0xFFFFFF
  };

  if (options) {
    Object.assign(this.options, options);
  }

  this.geometry = new THREE.BoxGeometry(8, 8, 8);

  if (!options || !options.color) {
    this.material = new THREE.MeshNormalMaterial();
  } else {
    this.material = new THREE.MeshLambertMaterial({color: this.options.color});
  }

  this.transformConfig = new TransformConfig('xz', '', '', 'world');

  this.topOfLine = new THREE.Vector3(this.options.height, 0, 0);
  this.bottomOfLine = new THREE.Vector3(0, 0, 0);

  var lineGeometry = new THREE.Geometry;
  lineGeometry.vertices.push(this.topOfLine);
  lineGeometry.vertices.push(this.bottomOfLine);

  this.line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({color: this.options.color}));
  this.line.rotation.z = -Math.PI / 2;
  this.add(this.line);

  this.setHeight = function (newHeight) {
    this.options.height = newHeight;

    this.topOfLine.x = this.options.height;
    this.position.y = this.options.height;

    this.line.geometry.verticesNeedUpdate = true;

    return this;
  }

  this.setColor = function (color) {
    this.options.color = color;
    this.line.material.color.setHex(color);

    if (!(this.material instanceof THREE.MeshLambertMaterial)) {
      this.material = new THREE.MeshLambertMaterial({color: this.options.color});
    }

    return this;
  }
}

Lever3D.prototype = Object.create(THREE.Mesh.prototype);
Lever3D.prototype.constructor = Lever3D;