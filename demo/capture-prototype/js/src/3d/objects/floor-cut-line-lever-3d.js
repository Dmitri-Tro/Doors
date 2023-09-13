const FloorCutLineLever3D = function (options) {
  Lever3D.call(this, options);
  this.useParent = false;

  this.onTransform = function () {
    if (this.parent) {
      this.parent.onLeverTransform(this);
    }
  }

  this.getParameters = function () {
    if (this.parent) {
      return this.parent.getParameters();
    }
  }
}

FloorCutLineLever3D.prototype = Object.create(THREE.Mesh.prototype);
FloorCutLineLever3D.prototype.constructor = FloorCutLineLever3D;