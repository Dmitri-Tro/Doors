const Camera3DPointer = function () {
  THREE.Mesh.call(
    this, 
    new THREE.ConeGeometry(15, 60, 4), 
    new THREE.MeshLambertMaterial({color: 0xFF0000})
  );

  this.defaultColorHex = 0x0A3348;
  this.useParent = true;
  this.rotation.z = -Math.PI / 2;
}

Camera3DPointer.prototype = Object.create(THREE.Mesh.prototype);
Camera3DPointer.prototype.constructor = Camera3DPointer;