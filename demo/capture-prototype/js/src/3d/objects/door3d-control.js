const Door3DControl = function (door, depth) {
  THREE.Mesh.call(
    this, 
    new THREE.BoxGeometry(1, 1, 1), 
    new THREE.MeshNormalMaterial()
  );

  this.scale.set(8, 8, depth || 24);

  this.transformConfig = new TransformConfig('x', '', '', 'local');

  this.door = door;

  this.setTranslateAxes = function (axes) {
    this.transformConfig.setTranslate(axes);
    return this;
  }
  
  this.updateSize = function (width, height, depth) {
    this.scale.set(
      width || this.scale.x, 
      height || this.scale.y, 
      depth || this.scale.z
    );

    return this;
  }
}

Door3DControl.prototype = Object.create(THREE.Mesh.prototype);
Door3DControl.prototype.constructor = Door3DControl;