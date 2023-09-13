/* A connection between two walls
 */
var Joint = function(edge1, edge2) {
    this.edge1 = edge1;
    this.edge2 = edge2;
};

/* Get a center point of intersection of 2 given walls
 * @return {object} object with {x, y} properties
 */
Joint.prototype.getCenter = function() {
    var e1start = this.edge1.getStart(), e1end = this.edge1.getEnd();
    var e2start = this.edge2.getStart(), e2end = this.edge2.getEnd();
    var c = Utils.linesIntersect(e1start.x, e1start.y, e1end.x, e1end.y, e2start.x, e2start.y, e2end.x, e2end.y);
    if (c === null) { //return some average point between 2 lines
        var w1 = this.edge1.wall.getCenter();
        var w2 = this.edge2.wall.getCenter();
        var lineCenter = new THREE.Line3(new THREE.Vector3(w1.x, w1.y), new THREE.Vector3(w2.x, w2.y)).getCenter(new THREE.Vector3());
        c = {x: lineCenter.x, y: lineCenter.y}
    }
    return c;
};

/* Get an intersection point of two given edges of walls
 * For example, interior edges of walls.
 * @return {object} object with {x, y} properties
 */
Joint.prototype.getBoundCenter = function(doUseInteriorBound, doUseFirstEdge) {
    function angleBetween(edge1, edge2) {
        var aPrev = new THREE.Vector3(edge1.getEnd().x, edge1.getEnd().y, 0)
            .sub(new THREE.Vector3(edge1.getStart().x, edge1.getStart().y, 0));
        var aThis = new THREE.Vector3(edge2.getEnd().x, edge2.getEnd().y, 0)
            .sub(new THREE.Vector3(edge2.getStart().x, edge2.getStart().y, 0));
        return aPrev.angleTo(aThis) % 6.28319; //360 radians
    }
    function checkEndPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
        function isSamePoint(x1, y1, x2, y2) {
            return x1 === x2 && y1 === y2;
        }
        var p = null;
        if (isSamePoint(x1,y1, x3,y3)) p = {x: x1, y: y1};
        if (isSamePoint(x1,y1, x4,y4)) p = {x: x1, y: y1};
        if (isSamePoint(x2,y2, x3,y3)) p = {x: x2, y: y2};
        if (isSamePoint(x2,y2, x4,y4)) p = {x: x2, y: y2};
        return p;
    }

    doUseInteriorBound = doUseInteriorBound === undefined ? true : doUseInteriorBound;
    doUseFirstEdge = doUseFirstEdge === undefined ? true : doUseFirstEdge;
    var line1 = this.edge1.getWallBound(doUseInteriorBound);
    var line2 = this.edge2.getWallBound(doUseInteriorBound);

    var angle = angleBetween(this.edge1, this.edge2);
    if (angle > 0 && angle < 0.2) { //small angle, render it accurately
        if (doUseFirstEdge) inter = {x: line2.x1, y: line2.y1}; //get...Start()
        else inter = {x: line1.x2, y: line1.y2}; //get...End()
        if (this.edge2.wall.getThickness() !== this.edge1.wall.getThickness()) {
            if (doUseFirstEdge) {
                inter["add_x"] = line1.x2;
                inter["add_y"] = line1.y2;
            } else {
                inter["add_x"] = line2.x1;
                inter["add_y"] = line2.y1;
            }
        }
        return inter;
    }

    var inter = Utils.linesIntersect(line1.x1, line1.y1, line1.x2, line1.y2, line2.x1, line2.y1, line2.x2, line2.y2);
    if (!inter || !this.isPointInsideBoundingBox(inter)) {
        inter = checkEndPoints(line1.x1, line1.y1, line1.x2, line1.y2, line2.x1, line2.y1, line2.x2, line2.y2);
        if (!inter) {
            if (doUseFirstEdge) inter = {x: line2.x1, y: line2.y1}; //get...Start()
            else inter = {x: line1.x2, y: line1.y2}; //get...End()
            if (this.edge2.wall.getThickness() !== this.edge1.wall.getThickness()) {
                if (doUseFirstEdge) {
                    inter["add_x"] = line1.x2;
                    inter["add_y"] = line1.y2;
                } else {
                    inter["add_x"] = line2.x1;
                    inter["add_y"] = line2.y1;
                }
            }
        }
    }

    if (this.edge1.isFake) {
        if (this.edge1 === this.edge1.wall.frontEdge) this.edge1.wall.frontEdge = null;
        else this.edge1.wall.backEdge = null;
    }
    if (this.edge2.isFake) {
        if (this.edge2 === this.edge2.wall.frontEdge) this.edge2.wall.frontEdge = null;
        else this.edge2.wall.backEdge = null;
    }

    return inter;
};

/* Get a rectangle over joint point
 * @return {object}
 */
Joint.prototype.getBoundingBox = function() {
    var point = this.getCenter(), point2, minWidth, maxWidth, minHeight, maxHeight;

    //todo calculate real bounding box of a joint. Currently its a big box where wall lengths are used instead of thicknesses.
    var s1 = this.edge1.getStart();
    var e1 = this.edge1.getEnd();
    var s2 = this.edge2.getStart();
    var e2 = this.edge2.getEnd();
    var length1 = new THREE.Vector2(s1.x, s1.y).distanceTo(new THREE.Vector2(e1.x, e1.y));
    var length2 = new THREE.Vector2(s2.x, s2.y).distanceTo(new THREE.Vector2(e2.x, e2.y));
    var halfThickness = length1 > length2 ? length1 : length2;
    if (point && "add_x" in point) point2 = {x: point.add_x, y: point.add_y};
    else point2 = point;

    minWidth = point.x < point2.x ? point.x - halfThickness : point2.x - halfThickness;
    maxWidth = point.x > point2.x ? point.x + halfThickness : point2.x + halfThickness;
    minHeight = point.y < point2.y ? point.y - halfThickness : point2.y - halfThickness;
    maxHeight = point.y > point2.y ? point.y + halfThickness : point2.y + halfThickness;

    return {maxX: maxWidth, minX: minWidth, maxY: maxHeight, minY: minHeight};
};

/*
 * @param {object} object with {x, y} properties
 * @return {boolean}
 */
Joint.prototype.isPointInsideBoundingBox = function(point) {
    var bb = this.getBoundingBox();
    return point.x > bb.minX && point.x < bb.maxX && point.y > bb.minY && point.y < bb.maxY;
};

if ( typeof exports !== 'undefined' ) module.exports = Joint;