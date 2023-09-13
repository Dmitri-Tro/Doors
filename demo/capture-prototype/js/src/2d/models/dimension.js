"use strict";
/* Central dimension is a width or a height of the room.
 * Currently it is chosen manually by user, because there's no exact criterias for choosing those in a room.
 * But some of criterias are formulated though:
 * 1. dimension is a segment inside room, it has 2 points: start and end.
 * 2. Each room has 2 dimensions: width and height.
 * 3. width and height are perpendiculars to each other.
 */
var Dimension = function(startCorner, endCorner, room) {
    this.start = startCorner;
    this.end = endCorner;
    this.room = room;
    this.boundingBox = null;
    this.initial = null; //initial state of this dimension
    this.defaultShift = 35; //gap between wall and dimension

    this.init();
};

/* Construct a bounding box to easily determine if cursor overlaps line or not
 */
Dimension.prototype.getBoundingBox = function() {
    if (!this.boundingBox) {
        var enlargement = 2; //margin in pixels
        var realLineWidth = 1;
        var widthWithMargins = realLineWidth + enlargement * 2;
        var v = new THREE.Vector2();
        var start = new THREE.Vector2(this.start.x, this.start.y);
        var end = new THREE.Vector2(this.end.x, this.end.y);
        var vector = v.clone().subVectors(end, start);
        var angle = vector.angle();
        var len = vector.length();

        var box = new THREE.BoxGeometry(len + enlargement * 2, 1, widthWithMargins);
        box.translate((len + enlargement) / 2, 0, widthWithMargins / 2);
        box.translate(-widthWithMargins / 2, 0, -widthWithMargins / 2);
        box.rotateY(-angle);
        box.translate(start.x, 0, start.y);
        this.boundingBox = [
            {x: box.vertices[0].x, y: box.vertices[0].z},
            {x: box.vertices[1].x, y: box.vertices[1].z},
            {x: box.vertices[4].x, y: box.vertices[4].z},
            {x: box.vertices[5].x, y: box.vertices[5].z}
        ];
        //console.log(this.start.x, this.start.y, this.end.x, this.end.y)
        //console.log(this.boundingBox)
    }
    return this.boundingBox;
};

Dimension.prototype.getLength = function() {
    var start = new THREE.Vector2(this.start.x, this.start.y);
    var end = new THREE.Vector2(this.end.x, this.end.y);
    return start.distanceTo(end);
};

/* Get length of dimension in the initial position
 */
Dimension.prototype.getInitialLength = function() {
    if (!this.initial) return this.getLength();
    var start = new THREE.Vector2(this.initial.start.x, this.initial.start.y);
    var end = new THREE.Vector2(this.initial.end.x, this.initial.end.y);
    return start.distanceTo(end);
};

Dimension.prototype.getCenter = function() { //TODO move outside to a line class, and extend it everywhere
    var start = new THREE.Vector2(this.start.x, this.start.y);
    var end = new THREE.Vector2(this.end.x, this.end.y);
    return {x: (this.start.x + this.end.x) / 2, y: (this.start.y + this.end.y) / 2};
};

/* Move dimension in parallel: new dimension start/end points must costruct a line through point with (x,y) coordinates.
 */
Dimension.prototype.move = function(x, y) {
    if (!this.initial) this.saveInitialState();

    var raycast = new THREE.Raycaster(), v = new THREE.Vector3(), intersections,
        start3 = new THREE.Vector3(this.start.x, 0, this.start.y), end3 = new THREE.Vector3(this.end.x, 0, this.end.y),
        object3d = new THREE.Object3D();

    object3d = this.room.getObject3D();

    var direction = v.clone().subVectors(end3, start3).normalize();

    raycast.set(
        new THREE.Vector3(x, 0, y),
        direction
    );
    raycast.ray.recast(-this.room.getPerimetr());

    intersections = raycast.intersectObjects(object3d.children);
    //3.2 consider first and last points of intersections array to be a maxWidth segment
    if (intersections !== undefined && intersections.length > 1) {
        this.start.x = intersections[0].point.x;
        this.start.y = intersections[0].point.z;
        this.end.x = intersections[intersections.length-1].point.x;
        this.end.y = intersections[intersections.length-1].point.z;
        this.boundingBox = null; //update boundingBox
    }

    return true;
};

Dimension.prototype.saveInitialState = function() {
    var startCopy = Object.assign({}, this.start);
    var endCopy = Object.assign({}, this.end);
    var roomCopy = Object.assign({}, this.room);
    this.initial = Object.assign({}, this);
    this.initial.start = startCopy;
    this.initial.end = endCopy;
    this.initial.room = roomCopy;
};

/* System suggests dimension's position when it doesn't touch other walls (except those walls where dimension starts and ends)
 * Saves position to this.start and this.end
 * @param {number} altShift alternative shift value, default is 35
 */
Dimension.prototype.suggestPosition = function(altShift) {
    var perpendicular;

    //try to move from wall if both points are on one wall
    var shift = altShift || +this.defaultShift; //arrow length + 5px
    var start = new THREE.Vector3(this.start.x, 0, this.start.y);
    var end = new THREE.Vector3(this.end.x, 0, this.end.y);

    var line, middle, centerCorner, direction, endMiddle;
    if (this.room) {
        if (this.room.containsInteriorCorner(this.start) && this.room.containsInteriorCorner(this.end)) {
            line = new THREE.Line3(start, end);
            middle = line.at(0.5, new THREE.Vector3());
            centerCorner = this.room.getCenter();
            direction = (((centerCorner.x - this.start.x) * (this.end.y - this.start.y) - (centerCorner.y - this.start.y) * (this.end.x - this.start.x))) < 0;
            endMiddle = (new THREE.Vector3).subVectors(end, middle);
            if (direction) perpendicular = new THREE.Vector3(-endMiddle.z, 0, endMiddle.x);
            else perpendicular = new THREE.Vector3(endMiddle.z, 0, -endMiddle.x);

            perpendicular.setLength(shift);
            perpendicular.add(middle);

            //in complex L- and U-shapes its not enough to check if a center of room is on an inner side of line.
            //that's why make an additional check
            if (!Utils.isPointInsidePolygon(perpendicular.x, perpendicular.z, this.room.interiorCorners)) {
                //change direction on 180deg
                perpendicular.sub(middle);
                perpendicular.setLength(-shift);
                perpendicular.add(middle);
            }

            this.move(perpendicular.x, perpendicular.z);
        }
    } else { //no room: probably its an orphan wall
        line = new THREE.Line3(start, end);
        middle = line.at(0.5, new THREE.Vector3());
        direction = true;
        endMiddle = (new THREE.Vector3).subVectors(end, middle);
        if (direction) perpendicular = new THREE.Vector3(-endMiddle.z, 0, endMiddle.x);
        else perpendicular = new THREE.Vector3(endMiddle.z, 0, -endMiddle.x);

        perpendicular.setLength(shift);
        perpendicular.add(middle);

        this.move(perpendicular.x, perpendicular.z);
    }
};

Dimension.prototype.init = function() {
    this.getLength();
    this.getBoundingBox();
    this.suggestPosition();
};

if ( typeof exports !== 'undefined' ) module.exports = Dimension;