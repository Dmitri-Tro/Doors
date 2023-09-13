const Ceiling3D = function (geometry, material) {
  THREE.Mesh.call(this, geometry, material);
  this.name = 'Ceiling';
}

Ceiling3D.prototype = Object.create(THREE.Mesh.prototype);
Ceiling3D.prototype.constructor = Ceiling3D;