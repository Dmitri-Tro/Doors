const Arrow3D = function (doorID, roomID, positionInFloor) {
  THREE.Mesh.call(this);

  this.doorID = doorID;
  this.roomID = roomID;

  this.name = 'arrow_pos' + this.doorID + '|' + this.roomID;
  this.visible = false;
  this.geometry = new THREE.BoxGeometry(10, 10, 10);
  this.material = new THREE.MeshLambertMaterial({color: 0xff0000});
  this.positionInFloor = positionInFloor || new THREE.Vector3;

  this.updateName = function () {
    this.name = 'arrow_pos' + this.doorID + '|' + this.roomID;
    return this;
  }

  this.calculatePositionFromFloor = function (floor3D) {
    var floorPosition = this.positionInFloor.clone();

    floor3D.updateMatrixWorld();

    floor3D.localToWorld(floorPosition);
    this.parent.worldToLocal(floorPosition);

    this.position.copy(floorPosition);

    return this;
  }
}

Arrow3D.prototype = Object.create(THREE.Mesh.prototype);
Arrow3D.prototype.constructor = Arrow3D;