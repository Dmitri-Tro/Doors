const FloorCutLine3D = function (options) {
  THREE.Object3D.call(this);

  this.options = {
    color: 0xFF0000,
    levelHeight: 50
  };

  if (options) {
    Object.assign(this.options, options);
  }

  this.transformConfig = new TransformConfig('', '', '', 'local');

  this.line = new THREE.Line(
    new THREE.Geometry(), 
    new THREE.LineBasicMaterial({
      color: this.options.color
    })
  );

  this.startLever = new FloorCutLineLever3D({color: this.options.color, height: this.options.leverHeight});
  this.endLever = new FloorCutLineLever3D({color: this.options.color, height: this.options.leverHeight});

  this.points = {
    start: null,
    end: null
  };

  this.savedPoints = null;

  this.add(this.line);
  this.add(this.startLever);
  this.add(this.endLever);

  this.setColor = function (color) {
    this.color = color;
    this.line.material.color.setHex(color);

    return this;
  }

  this.setStart = function (vector) {
    this.line.geometry.vertices = [
      new THREE.Vector3,
      new THREE.Vector3
    ];

    this.line.geometry.vertices[0].copy(vector);
    this.line.geometry.vertices[1].copy(vector);
    this.line.geometry.vertices[0].y = 10;
    this.line.geometry.verticesNeedUpdate = true;
    this.startLever.position.copy(vector);
    this.startLever.setHeight(this.options.levelHeight);

    this.points.start = true;

    return this;
  }

  this.setEnd = function (vector, isFinal) {
    this.line.geometry.vertices[1].copy(vector);
    this.line.geometry.vertices[1].y = 10;
    this.line.geometry.verticesNeedUpdate = true;
    this.endLever.position.copy(vector);
    this.endLever.setHeight(this.options.levelHeight);

    this.points.end = !!isFinal;

    return this;
  }

  this.setPoint = function (vector, isFinal) {
    if (!this.points.start) {
      this.setStart(vector, isFinal);
    } else if (!this.points.end) {
      this.setEnd(vector, isFinal);
    }

    return this;
  }

  this.getPoints = function () {
    return {
      sx: this.startLever.position.x,
      sy: this.startLever.position.z,
      ex: this.endLever.position.x,
      ey: this.endLever.position.z
    };
  }

  this.isDone = function () {
    return this.points.start && this.points.end;
  }

  this.isSaved = function () {
    return this.savedPoints !== null;
  }

  this.save = function () {
    this.savedPoints = this.getPoints();
    return this;
  }

  this.onLeverTransform = function (lever) {
    if (lever === this.startLever) {
      this.line.geometry.vertices[0].copy(lever.position);
      this.line.geometry.vertices[0].y = 10;
    } else if (lever === this.endLever) {
      this.line.geometry.vertices[1].copy(lever.position);
      this.line.geometry.vertices[1].y = 10;
    }

    this.line.geometry.verticesNeedUpdate = true;
  }

  this.getParameters = function () {
    return [new ControlsElement({
        id: 'remove_line',
        label: 'Remove line',
        type: 'button',
        onClick: function () {
            this.parent.removeFloorCutLine(this);
        }.bind(this)
    })];
  }

  this.setStructure = function (data) {
    this.setStart(new THREE.Vector3(data.points.sx, 0, data.points.sy), true);
    this.setEnd(new THREE.Vector3(data.points.ex, 0, data.points.ey), true);
    this.setColor(data.color);
    this.save();

    return this;
  }

  this.getStructure = function () {
    return {
      id: this.uuid,
      color: this.options.color,
      points: this.savedPoints
    };
  }
}

FloorCutLine3D.prototype = Object.create(THREE.Object3D.prototype);
FloorCutLine3D.prototype.constructor = FloorCutLine3D;