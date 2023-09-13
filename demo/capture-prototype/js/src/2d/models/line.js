/**
 * Line constructor
 * @param start {Corner}
 * @param end {Corner}
 * @constructor
 */
const Line = function(start, end) {

    this.id = Utils.guid();
    this.start = start;
    this.end = end;

    this.thickness = 5; //default thickness measurement for halfedges
    this.lengthFormatted = 0;

    this.moved_callbacks = $.Callbacks();
    this.deleted_callbacks = $.Callbacks();

    this.editable = {
        "lengthFormatted": {
            type: "string",
            label: "Length",
            disabled: true,
            value: this.lengthFormatted
        }
    };

    this.init();
};

Line.prototype.toJSON = function() {
    var propNames = [
        "id",
        "start",
        "end",
        "thickness",
        "lengthFormatted"
    ];
    var props = {};
    propNames.forEach(function(val, key, arProps) {
        if (this.hasOwnProperty(val)) props[val] = this[val];
    }.bind(this));
    return props;
};

Line.prototype.init = function() {
    this.getLength();
    this.fireOnMove(this.getLength.bind(this));
};

Line.prototype.snapToAxis = function(tolerance) {
    // order here is important, but unfortunately arbitrary
    this.start.snapToAxis(tolerance);
    this.end.snapToAxis(tolerance);
};

Line.prototype.getStart = function() {
    return this.start;
};
Line.prototype.getEnd = function() {
    return this.end;
};
Line.prototype.getStartX = function() {
    return this.start.getX();
};
Line.prototype.getEndX = function() {
    return this.end.getX();
};
Line.prototype.getStartY = function() {
    return this.start.getY();
};
Line.prototype.getEndY = function() {
    return this.end.getY();
};

Line.prototype.fireOnMove = function(func) {
    this.moved_callbacks.add(func);
};

Line.prototype.fireMoved = function() {
    this.moved_callbacks.fire();
};

Line.prototype.fireOnDelete = function(func) {
    this.deleted_callbacks.add(func);
};

Line.prototype.dontFireOnDelete = function(func) {
    this.deleted_callbacks.remove(func);
};

Line.prototype.getCenter = function() {
    return {x: (this.getStartX() + this.getEndX()) / 2, y: (this.getStartY() + this.getEndY()) / 2};
};

Line.prototype.getLength = function() {
    var start = new THREE.Vector2(this.getStartX(), this.getStartY());
    var end = new THREE.Vector2(this.getEndX(), this.getEndY());
    var length = start.distanceTo(end);
    this.lengthFormatted = Utils.cmToMeters(length, 2);
    return length;
};

Line.prototype.relativeMove = function(dx, dy) {
    this.start.relativeMove(dx, dy);
    this.end.relativeMove(dx, dy);
    this.fireMoved();
};

Line.prototype.remove = function() {
    this.start.detachWall(this);
    this.end.detachWall(this);
    this.deleted_callbacks.fire(this);
};

Line.prototype.distanceFrom = function(x, y) {
    return Utils.pointDistanceFromLine(x, y,
        this.getStartX(), this.getStartY(),
        this.getEndX(), this.getEndY());
};

Line.prototype.getWidth = Line.prototype.getThickness = function() {
    return this.thickness;
};

Line.prototype.angle = function () {
    var v = new THREE.Vector2();
    var st = this.getStart();
    var end = this.getEnd();
    return v.clone().subVectors(new THREE.Vector2(end.x, end.y), new THREE.Vector2(st.x, st.y)).angle();
};

Line.prototype.isAngleMultipleTo45Deg = function (num, tolerance) {
    const a45deg = (Math.PI/4);
    tolerance = tolerance || (Math.PI/1024); //~0.003
    const modulo = Math.abs(this.angle() % a45deg);
    const diff = a45deg - modulo;
    return (diff >= 0 && diff <= tolerance) || (diff <= a45deg && (a45deg-diff) <= tolerance);
};

if ( typeof exports !== 'undefined' ) module.exports = Line;