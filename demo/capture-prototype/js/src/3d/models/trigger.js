"use strict";

const Trigger = function(geometry, material, parent, axis) {
  THREE.Mesh.call(this, geometry, material);

  this._parent = parent;
  this._axis = axis;
  this._onMove = null;
};

Trigger.prototype = Object.create(THREE.Mesh.prototype);

Trigger.prototype.setParent = function (parent) {
  this._parent = parent;
  return this;
};

Trigger.prototype.getParent = function () {
  return this._parent;
}

Trigger.prototype.setAxis = function (axis) {
  this._axis = axis;
  return this;
};

Trigger.prototype.getAxis = function () {
  return this._axis;
}

Trigger.prototype.setOnMove = function (f) {
  if (typeof(f) === 'function') {
    this._onMove = f;
  } else {
    console.warn('Trigger onMove - need be a function!');
  }

  return this;
}

Trigger.prototype.resetOnMove = function () {
  this._onMove = null;

  return this;
}

Trigger.prototype.move = function (position) {
  this.position.set(
    ~this._axis.indexOf('x') ? position.x : this.position.x,
    ~this._axis.indexOf('y') ? position.y : this.position.y,
    ~this._axis.indexOf('z') ? position.z : this.position.z
  );

  if (typeof(this._onMove) === 'function') {
    this._onMove(this.position);
  }

  return this;
}