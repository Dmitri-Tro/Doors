"use strict";

const TransformController = function(geometry, material) {
  this._materials = {
    default: new THREE.MeshBasicMaterial({transparent: true, opacity: 0}),
    active: new THREE.MeshBasicMaterial({transparent: true, color: 0x007ffa, opacity: 0.2}),
    trigger: new THREE.MeshBasicMaterial({color: 0x007ffa}),
  };

  if (!material) {
    material = this._materials.default;
  }

  THREE.Mesh.call(this, geometry, material);

  this.geometry.computeBoundingBox();
  this._initial = {
    x: this.geometry.boundingBox.max.x - this.geometry.boundingBox.min.x,
    y: this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y,
    z: this.geometry.boundingBox.max.z - this.geometry.boundingBox.min.z
  }

  this._controls = null;
  this._onChange = null;
  this._transform = {};
};

TransformController.prototype = Object.create(THREE.Mesh.prototype);

TransformController.prototype.setOnChange = function (f) {
  if (typeof(f) === 'function') {
    this._onChange = f;
  } else {
    console.warn('Trigger onChange - need be a function!');
  }

  return this;
}

TransformController.prototype.showTriggers = function () {
  // Need two way binding architecture

  if (!this.controls) {
    const _this = this;

    var x1 = new Trigger(
      new THREE.BoxGeometry(5, this._initial.y, this._initial.z * 1.1), 
      this._materials.trigger,
      this, 
      'x'
    );

    var x2 = new Trigger(
      new THREE.BoxGeometry(5, this._initial.y, this._initial.z * 1.1), 
      this._materials.trigger, 
      this, 
      'x'
    );

    var y = new Trigger(
      new THREE.BoxGeometry(this._initial.x, 5, this._initial.z * 1.1), 
      this._materials.trigger, 
      this, 
      'y'
    ); 

    x1.position.x = this.geometry.boundingBox.max.x;
    x2.position.x = this.geometry.boundingBox.min.x;
    y.position.y = this.geometry.boundingBox.max.y;

    x1.setOnMove(function (position) {  
      var worldPos = _this.localToWorld(position.clone());
      _this._transform.start = worldPos;

      if (typeof(_this._onChange) === 'function') {
        _this._onChange(_this._transform);
      }
    });

    x2.setOnMove(function (position) {  
      var worldPos = _this.localToWorld(position.clone());
      _this._transform.end = worldPos;

      if (typeof(_this._onChange) === 'function') {
        _this._onChange(_this._transform);
      }
    });

    y.setOnMove(function (position) {  
      var worldPos = _this.localToWorld(position.clone());
      _this._transform.height = worldPos;

      if (typeof(_this._onChange) === 'function') {
        _this._onChange(_this._transform);
      }
    });

    this.add(x1);
    this.add(x2);
    this.add(y);

    this.controls = [x1, x2, y];
  } else {
    this.controls.forEach(function (control) {
      control.visible = true;
    });
  }
}

TransformController.prototype.hideTriggers = function () {
  if (this.controls) {
    this.controls.forEach(function (control) {
      control.visible = false;
    });
  }
}

TransformController.prototype.setActive = function () {
  this.material = this._materials.active;
}

TransformController.prototype.setInactive = function () {
  this.material = this._materials.default;
}

TransformController.prototype.showControls = function () {
  this.showTriggers();
  this.setActive();
}

TransformController.prototype.hideControls = function () {
  this.hideTriggers();
  this.setInactive();
}