'use strict';

const TransformGroup = function (name) {
  THREE.Group.call(this);

  this.name = name || _.uniqueId('transform_group_');
  this.items = [];
  this.group = null;

  this.setType = function (type) {
    this.type = type;
  }

  this.getType = function () {
    return this.type;
  }

  this.addItem = function (item) {
    this.items.push(item);
    return this;
  }

  this.hasItem = function (item) {
    return ~this.getIndex(item);
  }

  this.getIndex = function (item) {
    return this.items.indexOf(item);
  }

  this.getItem = function (item) {
    var index = this.getIndex(item)
    return ~index ? this.items[index] : undefined;
  }

  this.findItem = function (callback) {
    return this.items.find(callback);
  } 

  this.filterItems = function (callback) {
    return this.items.filter(callback);
  }

  this.forEach = function (callback) {
    this.items.forEach(callback);
    return this;
  }

  this.removeItem = function () {
    var index = this.getIndex(item)
    if (index) this.items.splice(index, 1);
    return this;
  }

  this.toGroup = function () {
    if (!this.group) {
      this.group = new THREE.Group();
    }

    this.items.forEach(function (item) {
      this.group.add(item);
    }.bind(this));

    return this.group;
  }

  this.toObject = function (object) {
    this.items.forEach(function (item) {
      object.add(item);
    }.bind(this));

    return this;
  }

  this.clear = function () {
    this.items = [];

    if (this.group) {
      while (this.group.children.length) {
          this.group.remove(this.group.children[0]);
      }
    }

    return this;
  }
}

TransformGroup.prototype = Object.create(THREE.Group.prototype);
TransformGroup.prototype.constructor = TransformGroup;