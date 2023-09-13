/* Class representing a line-virtual wall before this walls really appears
 */
const DrawnWall = function(floormodel) {
    this.floormodel = floormodel;
    this.arWalls = [];

    this.initialStart = null;
    this.initialEnd = null;
    this.isLeft = 1;

    this.start = null;
    this.end = null;

    this.tolerance = 20;
};

/**
 * Move current wall's center inside or outside of line drawn with cursor
 * @param startCorner {{x,y}}
 * @param endCorner {{x,y}}
 * @param isLeft {null|boolean}
 */
DrawnWall.prototype.shift = function(startCorner, endCorner, isLeft) {
    this.initialStart = startCorner;
    this.initialEnd = endCorner;
    this.isLeft = null;
    if (isLeft === true) this.isLeft = 1;
    if (isLeft === false) this.isLeft = -1;
    this.calc();
};

/**
 * Helper method to calculate the center of future line
 * @return {Corner[]}
 */
DrawnWall.prototype.calc = function() {
    var startCopy, endCopy;
    if (this.isLeft === null) { //do not shift, future wall will render in center of line
        this.start = new Corner(null, this.initialStart.x, this.initialStart.y);
        this.end = new Corner(null, this.initialEnd.x, this.initialEnd.y);

        startCopy = new Corner(this.floormodel, this.initialStart.x, this.initialStart.y);
        endCopy = new Corner(this.floormodel, this.initialEnd.x, this.initialEnd.y);
    } else {
        var empty = new THREE.Vector2();
        var a = empty.clone().set(this.initialStart.x, this.initialStart.y);
        var b = empty.clone().set(this.initialEnd.x, this.initialEnd.y);
        var c = empty.clone().subVectors(b, a).rotateAround({x: 0, y: 0}, this.isLeft * Math.PI/2);
        c.normalize().multiplyScalar(Wall.prototype.thicknesses.NORMAL / 2).add(a);
        var d = c.clone().add(empty.clone().subVectors(b, a));

        this.start = new Corner(null, c.x, c.y);
        this.end = new Corner(null, d.x, d.y);

        startCopy = new Corner(this.floormodel, c.x, c.y);
        endCopy = new Corner(this.floormodel, d.x, d.y);
    }

    return [startCopy, endCopy];
};

/**
 * Save a new wall
 * @return {Corner|null}
 */
DrawnWall.prototype.save = function() {
    if (this.arWalls.length > 0) { //same point, abort
        var temp = new Corner(null, this.arWalls[ this.arWalls.length-1 ].end.x, this.arWalls[ this.arWalls.length-1 ].end.y);
        var temp2 = new Corner(null, this.initialEnd.x, this.initialEnd.y);
        if (temp.distanceFromCorner(temp2) < this.tolerance) return null;
    }
    var line = this.calc();
    this.arWalls.push({start: line[0], end: line[1]});
    this.start = null;
    this.end = null;

    return line[1];
};

/**
 * Build a whole room from separate walls
 * @return {boolean}
 */
DrawnWall.prototype.build = function() {
    function getJoint(start1, end1, start2, end2) {
        var point = Utils.linesIntersect(start1.x, start1.y, end1.x, end1.y, start2.x, start2.y, end2.x, end2.y);
        if (point === null) {
            var line3 = new THREE.Line3(
                new THREE.Vector3(end1.x, end1.y),
                new THREE.Vector3(start2.x, start2.y)
            );
            point = line3.getCenter();
        }
        return {x: point.x, y: point.y};
    }

    var prev, wall, next, point1, point2, corner1, corner2;
    if (this.hasIntersections()) { //a complete room
        //take all wall pairs
        for (var k=0; k<this.arWalls.length; k++) {
            prev = k-1 in this.arWalls ? this.arWalls[k-1] : this.arWalls[this.arWalls.length-1];
            wall = this.arWalls[k];
            next = k+1 in this.arWalls ? this.arWalls[k+1] : this.arWalls[0];

            point1 = getJoint(prev.start, prev.end, wall.start, wall.end);
            point2 = getJoint(wall.start, wall.end, next.start, next.end);

            corner1 = this.floormodel.newCorner(point1.x, point1.y);
            corner2 = this.floormodel.newCorner(point2.x, point2.y);
            corner1.mergeWithIntersected();
            corner2.mergeWithIntersected();

            this.floormodel.newWall(corner1, corner2);

            corner1.merged = false;
            corner2.merged = false;
        }
    } else {
        var arLines = [];
        //take all wall pairs, except first-last pair
        for (var j=0; j<this.arWalls.length; j++) {
            prev = j-1 in this.arWalls ? this.arWalls[j-1] : this.arWalls[this.arWalls.length-1];
            wall = this.arWalls[j];
            next = j+1 in this.arWalls ? this.arWalls[j+1] : this.arWalls[0];

            if (j === 0) point1 = wall.start;
            else point1 = getJoint(prev.start, prev.end, wall.start, wall.end);
            if (j === this.arWalls.length-1) point2 = wall.end;
            else point2 = getJoint(wall.start, wall.end, next.start, next.end);

            corner1 = this.floormodel.newCorner(point1.x, point1.y);
            if (j === 0) corner1.mergeWithIntersected(); //2 merges in total: 1-with wall, 2-with corner
            corner2 = this.floormodel.newCorner(point2.x, point2.y);

            this.floormodel.newWall(corner1, corner2);

            corner1.mergeWithIntersected();
            corner2.mergeWithIntersected();

            corner1.merged = false;
            corner2.merged = false;
        }
    }

    return true;
};

/**
 * Find out if last corner intersected any new drawn walls
 * @return {Corner|boolean}
 */
DrawnWall.prototype.hasIntersections = function() {
    var corners = this.arWalls.map(function(wall) {
        return wall.start;
    });

    var last = this.arWalls[ this.arWalls.length-1 ].end;
    for (var i = 0; i < corners.length; i++) {
        var obj = corners[i];
        if (last.distanceFromCorner(obj) < this.tolerance && obj !== last) {
            return true;
        }
    }
    return false;
};

if ( typeof exports !== 'undefined' ) module.exports = DrawnWall;