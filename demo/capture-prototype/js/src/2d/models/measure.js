"use strict";
/* Measure is a line with start and end points inside a room.
 * Unlike (central) dimension, measure can have a start or end point not on the wall.
 *  ___________
 * |           |
 * |      _____|
 * |     |
 * |     | a
 * |_____|
 *
 */
const Measure = function(startCorner, endCorner, room) {
    this.start = startCorner;
    this.end = endCorner;
    this.room = room || null;
    this.defaultShift = 20;

    this.init();
};

Measure.prototype = Object.create(Dimension.prototype);

/* move this segment's center to a new position.
 * @param {number} middleX coordinates of middle of new line segment O_O
 * @param {number} middleY
 */
Measure.prototype.moveCenterTo = Measure.prototype.move = function(middleX, middleY) {
    var diff, c = this.getCenter();
    diff = new THREE.Vector2().subVectors(new THREE.Vector2(middleX, middleY), new THREE.Vector2(c.x, c.y));

    this.start.x += diff.x;
    this.end.x += diff.x;
    this.start.y += diff.y;
    this.end.y += diff.y;
};

if ( typeof exports !== 'undefined' ) module.exports = Measure;