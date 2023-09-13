const Corner3DLever = function (options) {
  Lever3D.call(this, options);
  this.useParent = true;
}

Corner3DLever.prototype = Object.create(THREE.Mesh.prototype);
Corner3DLever.prototype.constructor = Corner3DLever;