
'use strict';
function Camera(x, y, angle, mergeAngle, id, roomName, isActive, isAddedManually) {

    this.id = id || Utils.guid();

    this.x = x;
    this.y = y;
    this.mergeAngle = mergeAngle || 0; //additional angle appeared after merging, always subtracted from usual angle
    this.angle = angle + this.mergeAngle;
    this.roomName = roomName; //room name which is camera attached to
    this.isActive = isActive;
    this.isAddedManually = isAddedManually;
    this.highlighted = false;
    this.visibleName = ""; //camera name from panorama
    this.indicatorHighlighted = false;
};

/**
 * Height of tripod
 * @type {number}
 */
Camera.lens = 150;

Camera.indicatorLineLength = 300;

/**
 *
 * @param {array} pointsList enumeration of coordinates
 * @return {boolean}
 */
Camera.prototype.isInsideRoom = function(pointsList) {
    return Utils.isPointInsidePolygon(this.x, this.y, pointsList);
};

/**
 * set rooms rotating angle
 * @param {number} newAngle
 */
Camera.prototype.setAngle = function(newAngle) {
    this.angle = newAngle;
    if (this.mergeAngle) this.angle += this.mergeAngle;
};

/**
 *
 * @param x
 * @param y
 * @return {*}
 */
Camera.prototype.distanceFrom = function(x, y) {
    var a = new THREE.Vector2(x, y);
    var b = new THREE.Vector2(this.x, this.y);
    return a.distanceTo(b);
};

/**
 * get an indicator point coordinate.
 * @return {{x:number,y:number}}
 */
Camera.prototype.getIndicatorPoint = function () {
    var v = new THREE.Vector2(1, 0);
    v.rotateAround(new THREE.Vector2(), this.angle * Math.PI/180);
    v.multiplyScalar(Camera.indicatorLineLength);
    v.add(new THREE.Vector2(this.x, this.y));
    return v;
};

if ( typeof exports !== 'undefined' ) module.exports = Camera;