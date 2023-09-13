/**
 * Todo: make class for elements like doors and windows 
 */
const Door3D = function () {
  THREE.Mesh.call(this);

  this.defaults = {
    color: 0x0A3348
  };

  // Constructor
  this.floor3D = null;
  this.door2D = null;
  this.wall3D = null;
  this.events = new EventsSystem('Door3D-' + this.uuid);
  this.transformConfig = new TransformConfig('', '', '', 'local'); 
  this.material = new THREE.MeshLambertMaterial({color: this.defaults.color, transparent:true, opacity: 0.5});

  this.clearable = true;
  this.useParent = false;

  this.length = 80;
  this.width = 20;
  this.height = 200;

  this.linkedDoor = null;
  this.isOpened = true;

  this.coordinates = {
    start: new THREE.Vector3,
    center: new THREE.Vector3,
    end: new THREE.Vector3,
    position: new THREE.Vector3
  };

  this.controls = {
    start: null,
    end: null,
    height: null
  };

  this.arrows = [];

  this.getId = function () {
    return this.door2D ? this.door2D.id : this.uuid;
  }

  this.getColor = function () {
    return this.material.color.getHex();
  }

  this.setColor = function (hex) {
    this.material.color.setHex(hex);
    return this;
  }

  this.resetColor = function () {
    this.material.color.setHex(this.defaults.color);
    return this;
  }

  this.refresh = function () {
    if (this.door2D) {
      this.setFromDoor2D(this.door2D);
    }

    return this;
  }

  this.updateGeometry = function () {
    this.geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
    return this;
  }

  this.setViewMode = function (mode) {
    if (mode === 'player') {
      this.visible = false;
    } else if (mode === 'editor') {
      this.visible = true;
    }

    return this;
  }

  this.setOpened = function (value) {
    this.isOpened = !!value;
    return this;
  }

  this.getOpened = function () {
    return this.isOpened;
  }

  this.setMaterial = function (material) {
    this.material = material;
  }

  this.setFromDoor2D = function (door2D) {
    this.door2D = door2D;
    this.name = 'Door_' + this.door2D.id;

    this.height = this.door2D.height || this.height;
    this.length = this.door2D.getWidth();
    this.width = this.door2D.wall.getWidth() + 10;

    this.coordinates.start.set(this.door2D.x1, this.height, this.door2D.y1);
    this.coordinates.end.set(this.door2D.x2, this.height, this.door2D.y2);

    this.coordinates.center.set(
      this.coordinates.end.x - this.coordinates.start.x, 
      0,
      this.coordinates.end.z - this.coordinates.start.z
    );

    this.coordinates.position.set(
      (this.coordinates.end.x + this.coordinates.start.x) / 2,
      this.height / 2,
      (this.coordinates.end.z + this.coordinates.start.z) / 2
    );

    this.updateGeometry().addControls().updateWithWall();

    this.events.fire('update');

    return this;
  }

  this.setFloor = function (floor3D) {
    this.floor3D = floor3D;
    this.updateWithWall();

    return this;
}

  this.setWall = function (wall3D) {
      this.wall3D = wall3D;
      this.updateWithWall();

      return this;
  }

  this.updateWithWall = function () {
    if (this.wall3D) {
      this.updateMatrixWorld();

      var localPosition = new THREE.Vector3;
      var worldPosition = new THREE.Vector3;

      localPosition.copy(this.coordinates.position);
      this.floor3D.localToWorld(localPosition);
      worldPosition.copy(localPosition);
      this.wall3D.worldToLocal(worldPosition);

      this.position.copy(worldPosition);
    }

    return this;
  }

  this.addControls = function () {
    Object.keys(this.controls).forEach(function (type) {
      if (!this.controls[type]) {
        this.controls[type] = new Door3DControl(this, this.width + 5);
        this.controls[type].visible = false;

        if (type === 'height') {
          this.controls[type].setTranslateAxes('y');
        } else { 
          this.controls[type].setTranslateAxes('x');
        }

        var localStartPosition = new THREE.Vector3;
        var localEndPosition = new THREE.Vector3;
        var worldStartPosition = new THREE.Vector3;
        var worldEndPosition = new THREE.Vector3;
  
        this.controls[type].onTransform = function () {
          this.door2D.height = this.controls.height.position.y * 2;

          this.updateMatrixWorld();

          localStartPosition.copy(this.controls.start.position);
          this.localToWorld(localStartPosition);
          worldStartPosition.copy(localStartPosition);
          this.floor3D.worldToLocal(worldStartPosition);

          localEndPosition.copy(this.controls.end.position);
          this.localToWorld(localEndPosition);
          worldEndPosition.copy(localEndPosition);
          this.floor3D.worldToLocal(worldEndPosition);

          this.door2D.x1 = worldStartPosition.x;
          this.door2D.y1 = worldStartPosition.z;
          this.door2D.x2 = worldEndPosition.x;
          this.door2D.y2 = worldEndPosition.z;

          this.controls.height.updateSize(this.length + 8);
          this.controls.start.updateSize(undefined, this.door2D.height);
          this.controls.end.updateSize(undefined, this.door2D.height);

          this.refresh();
          this.wall3D.refresh();
        }.bind(this);
  
        this.add(this.controls[type]);
      }

      if (type === 'height') {
        this.controls[type].position.y = this.height / 2;
      } else if (type === 'start') {
        this.controls[type].position.x = this.length / 2 * -1;
      } else if (type === 'end') { 
        this.controls[type].position.x = this.length / 2;
      }
    }.bind(this));

    this.controls.height.updateSize(this.length + 8);
    this.controls.start.updateSize(undefined, this.door2D.height);
    this.controls.end.updateSize(undefined, this.door2D.height);

    return this;
  }

  this.showControls = function () {
    Object.keys(this.controls).forEach(function (type) {
      this.controls[type].visible = true;
    }.bind(this));

    return this;
  }

  this.hideControls = function () {
    Object.keys(this.controls).forEach(function (type) {
      this.controls[type].visible = false;
    }.bind(this));

    return this;
  }

  this.getArrows = function () {
    return this.arrows;
  }

  this.prepareForExport = function () {
    Object.keys(this.controls).forEach(function (type) {
      if (this.controls[type]) {
        this.remove(this.controls[type]);
        this.controls[type] = null;
      }
    }.bind(this));

    return this;
  }

  this.resetExportPrepared = function () {
    this.addControls();
    return this;
  }

  this.setArrowsFromWallsRoomsMap2D = function (wallsRoomsMap2D) {
    const door2D = this.door2D;
    door2D.resetArrowCache();

    for (var room2DKey in wallsRoomsMap2D[door2D.wall.id]) {
      const room2D = wallsRoomsMap2D[door2D.wall.id][room2DKey];
      const point = door2D.getArrowPosition(room2D.roomName, room2D.getCenter());

      var arrow3D = new Arrow3D(
        door2D.id,
        wallsRoomsMap2D[door2D.wall.id][room2DKey].roomName,
        new THREE.Vector3(point.x, 150, point.y)
      );

      this.arrows.push(arrow3D);
      this.add(arrow3D);

      arrow3D.calculatePositionFromFloor(this.floor3D);
    }

    return this;
  }

  this.canLink = function () {
    return this.arrows.length === 1 && this.linkedDoor === null;
  }

  this.getLinkAngleAndPosition = function () {
    if (this.arrows[0]) {
      const arrow3D = this.arrows[0];

      this.floor3D.updateMatrixWorld();

      var zeroPoint = new THREE.Vector3;
      var directionPoint = arrow3D.position.clone();
      directionPoint.z *= 10;
      this.localToWorld(zeroPoint);
      this.localToWorld(directionPoint);
      this.floor3D.worldToLocal(zeroPoint);
      this.floor3D.worldToLocal(directionPoint);

      var angle = Utils.getRotationOfLine(zeroPoint.x, directionPoint.x, zeroPoint.z, directionPoint.z);

      return {
        position: zeroPoint,
        angle: angle
      };
    } else {
      return null; //door already between rooms
    }
  }

  this.getParameters = function (mode, floor3D) {
    return null; // disabled

    if (mode === 'puzzle') {
      var doors = floor3D.getDoors();
  
      console.log(doors);
  
      return [new ControlsElement({
          id: this.getId() + '_height',
          label: 'Linked door:',
          type: 'select',
          options: [{
            name: '@',
            value: '100'
          }],
          value: this.linkedDoor ? this.linkedDoor.id : '',
          onChange: function (value) {
            console.log(value)
          }.bind(this)
        })
      ]
    } else {
      return null;
    }
  }

  this.onTransform = function () {
    Object.keys(this.controls).forEach(function (cKey) {
      this.controls[cKey].onTransform();
    }.bind(this));

    this.updateWithWall().updateArrowsPositions();
    this.events.fire('update');
  }
}

Door3D.prototype = Object.create(THREE.Mesh.prototype);
Door3D.prototype.constructor = Door3D;