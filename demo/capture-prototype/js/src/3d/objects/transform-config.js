const TransformConfig = function (translateAxes, rotateAxes, scaleAxes, space) {
  translateAxes = translateAxes || '';
  rotateAxes = rotateAxes || '';

  this.stringHasValue = function (string, value) { // Todo: move to prototype
    return !!~string.toLowerCase().indexOf(value.toLowerCase());
  };

  this.translateAxes = {
    x: this.stringHasValue(translateAxes, 'x'),
    y: this.stringHasValue(translateAxes, 'y'),
    z: this.stringHasValue(translateAxes, 'z')
  };
  this.rotateAxes = {
    x: this.stringHasValue(rotateAxes, 'x'),
    y: this.stringHasValue(rotateAxes, 'y'),
    z: this.stringHasValue(rotateAxes, 'z')
  };
  this.space = space || 'local';

  this.setTranslate = function (translateAxes) {
    this.translateAxes = {
      x: this.stringHasValue(translateAxes, 'x'),
      y: this.stringHasValue(translateAxes, 'y'),
      z: this.stringHasValue(translateAxes, 'z')
    }
  };

  this.setRotate = function (rotateAxes) {
    this.rotateAxes = {
      x: this.stringHasValue(rotateAxes, 'x'),
      y: this.stringHasValue(rotateAxes, 'y'),
      z: this.stringHasValue(rotateAxes, 'z')
    }
  };

  this.setSpace = function (space) {
    if (space === 'world') {
      this.space = 'world';
    } else {
      this.space = 'local'; 
    }

    return this;
  };

  this.applyToTransformController = function (transformController, mode) {
    var config = this[mode + 'Axes'];

    Object.keys(config).forEach(function (axis) {
      transformController['show' + axis.toUpperCase()] = config[axis];
    });

    transformController.setSpace(this.space);

    return this;
  };
}