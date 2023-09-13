'use strict';

const Corner3D = function () {
  THREE.Object3D.call(this);

  this.walls = [];
  this.floors = [];
  this.corner2D = null;
  this.clearable = true;
  this.height = 250;
  this.heightOffset = 25;

  this.transformConfig = new TransformConfig('xz', '', '', 'local');
  
  this.lever = new Corner3DLever;
  this.add(this.lever);

  this.setHeight = function (newHeight) {
    this.height = newHeight;
    // this.position.y = this.height + this.heightOffset;
    this.lever.setHeight(this.height + this.heightOffset);

    return this;
  }

  this.setFromCorner2D = function (corner2D) {
    this.corner2D = corner2D;

    this.position.set(corner2D.x, 0, corner2D.y);

    return this;
  }

  this.addWall = function (wall3D) {
    if (!~this.walls.indexOf(wall3D)) {
      this.walls.push(wall3D);
    }
    return this;
  }

  this.hasWall = function (wall3D) {
    return !!~this.walls.indexOf(wall3D);
  } 

  this.updateWalls = function (ignore) {
    if (!Array.isArray(ignore)) ignore = [];
    
    this.walls.forEach(function (wall) {
      if (!~ignore.indexOf(wall)) {
        wall.refresh();
      }
    });

    return this;
  };

  this.addFloor = function (floor3D) {
    if (!~this.floors.indexOf(floor3D)) {
      this.floors.push(floor3D);
    }
    return this;
  } 

  this.updateFloors = function () {
    this.floors.forEach(function (floor) {
      floor.refresh(true);
    });

    return this;
  }

  this.hasFloor = function (floor3D) {
    return !!~this.floors.indexOf(floor3D);
  } 

  this.updateHeightFromWalls = function () {
    var maxHeight = 0; 
    
    this.walls.forEach(function (wall) {
      if (wall.height > maxHeight) {
        maxHeight = wall.height;
      }
    });

    this.setHeight(maxHeight);

    return this;
  }

  this.getWorldPosition = function () {
    var worldPosition = new THREE.Vector3;

    if (this.parent) {
      this.updateMatrixWorld();
      worldPosition.copy(this.position);
      this.parent.localToWorld(worldPosition);
    } else {
      console.warn('Need parent for get world position!');
    }

    return worldPosition;
  }

  this.onTransform = function (ignoreWalls) {
    if (this.corner2D) {
      this.corner2D.move(this.position.x, this.position.z, false);
      this.updateWalls(ignoreWalls).updateFloors();
    }

    return this;
  }
}

Corner3D.prototype = Object.create(THREE.Object3D.prototype);
Corner3D.prototype.constructor = Corner3D;