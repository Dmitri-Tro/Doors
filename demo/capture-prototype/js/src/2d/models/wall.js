function Wall(startCorner, endCorner) {

    this.modes = {
        NORMAL: 0,
        THICK: 1,
        THIN: 2,
        INVISIBLE: 3,
        CUSTOM: 4
    };

    this.start = startCorner; //corner object
    this.end = endCorner; //corner object

    this.id = Utils.guid();

    this.thickness = 15; //default thickness measurement for halfedges
    this.bearing = this.modes.NORMAL; //type of thickness wall
    this.height = null;
    this.lengthFormatted = 0;
    this.lengthInner = null;
    this.outerLength = null;
    this.wallAngle = (Math.atan2(startCorner.y - endCorner.y, startCorner.x - endCorner.x)) * (180 / Math.PI)

    // front is the plane from start to end
    // these are of type HalfEdge
    this.frontEdge = null;
    this.backEdge = null;
    this.orphan = false;
    this.orphanBelongsTo = null;

    // wall state
    this.hovered = false;

    this.editable = {
        "bearing": {
            type: "switch",
            label: "Type",
            variants: [
                {label: "Invisible", value: this.modes.INVISIBLE, hideProps: ["thickness"]},
                {label: "Thin", value: this.modes.THIN, hideProps: ["thickness"]},
                {label: "Normal", value: this.modes.NORMAL, checked: 1, hideProps: ["thickness"]},
                {label: "Thick", value: this.modes.THICK, hideProps: ["thickness"]},
                {label: "Custom", value: this.modes.CUSTOM, showProps: ["thickness"]}
            ],
            value: this.bearing,
            casttype: "number"
        },
        "thickness": {
            type: "number",
            label: "Thickness in cm",
            value: this.thickness
        },
        "lengthFormatted": {
            type: "string",
            label: "Length",
            disabled: true,
            value: this.lengthFormatted
        }/*,
        "lengthInner": {
            type: "number",
            label: "Inner Length",
            value: this.lengthInner,
            width: "50%"
        },
        "outerLength": {
            type: "number",
            label: "Outer Length",
            value: this.outerLength,
            width: "50%"
        }*/
    };

    this.checkAngle = function () {
        let angle = (Math.atan2(this.start.y - this.end.y, this.start.x - this.end.x)) * (180 / Math.PI)
        this.wallAngle = angle
    }

    this.getEditable = function() {
        this.getLength();
        this.checkAngle()
        //this.editable["lengthInner"].value = this.lengthInner;
        return this.editable;
    };

    /* method is invoked via sidebar controller
     */
    this.setLengthInner = function(len) {
        if (len.toString().match(/[0-9]+\.[0-9]{2}/) !== null) {
            //this.
        }
        return true;
    };

    this.moved_callbacks = $.Callbacks();
    this.deleted_callbacks = $.Callbacks();
    this.action_callbacks = $.Callbacks();

    this.start.attachStart(this);
    this.end.attachEnd(this);

    this.init();
};

Wall.prototype = Object.create(Line.prototype);
Wall.prototype.constructor = Wall;

/* default wall thicknesses */
Wall.prototype.thicknesses = {};

Wall.immoviewerThicknesses = {NORMAL: 15, THICK: 30, THIN: 5, INVISIBLE: 5, CUSTOM: 0};
Wall.docusketchThicknesses = {NORMAL: 10.16, THICK: 15.24, THIN: 5.08, INVISIBLE: 5, CUSTOM: 0};

Wall.setDefaultThicknesses = function(oWidths) {
    for (var key in oWidths) {
        Wall.prototype.thicknesses[key] = oWidths[key];
    }
};

/**
 * Its a distance from door corner to near-standing wall
 * @type {number}
 */
Wall.prototype.maxClosenessToEdge = 0;

/**
 * Assign a default set of thicknesses used in docusketch for walls
 * @static
 */
Wall.setDSDefaultThicknesses = function() {
    Wall.setDefaultThicknesses(Wall.docusketchThicknesses);
};

/**
 * Assign a default set of thicknesses used in immoviewer for walls
 * @static
 */
Wall.setIMDefaultThicknesses = function() { //immoviewer width by default
    Wall.setDefaultThicknesses(Wall.immoviewerThicknesses);
}();
/* default wall width */

Wall.prototype.toJSON = function() {
    var propNames = [
        "id",
        "thickness",
        "bearing",
        "height",
        "lengthFormatted",
        "orphan"
    ];
    var props = {};
    propNames.forEach(function(val, key, arProps) {
        if (this.hasOwnProperty(val)) props[val] = this[val];
    }.bind(this));
    return props;
};

Wall.prototype.resetFrontBack = function(func) {
    this.frontEdge = null;
    this.backEdge = null;
    this.orphan = false;
};

Wall.prototype.getCenter = function() {
    return {x: (this.getStartX() + this.getEndX()) / 2, y: (this.getStartY() + this.getEndY()) / 2};
};

Wall.prototype.getLength = function() {
    var start = new THREE.Vector2(this.getStartX(), this.getStartY());
    var end = new THREE.Vector2(this.getEndX(), this.getEndY());
    var length = start.distanceTo(end);
    this.lengthFormatted = Utils.cmToMeters(length, 2);

    var edge = this.frontEdge || this.backEdge;
    if (edge) {
        var dist = edge.interiorDistance();
        this.lengthInner = (dist / 100).toFixed(2);
    }

    return length;
};

Wall.prototype.relativeMove = function(dx, dy) {
    this.start.relativeMove(dx, dy);
    this.end.relativeMove(dx, dy);
    this.checkFullIntersection(this.start, this.end);
    this.fireMoved();
};

Wall.prototype.fireOnChangeThickness = function(func) {
    this.action_callbacks.add(func)
};

Wall.prototype.fireChangeThickness = function(action) {
    this.action_callbacks.fire(action)
};

Wall.prototype.fireRedraw = function() {
    if (this.frontEdge) {
        this.frontEdge.redrawCallbacks.fire();
    }
    if (this.backEdge) {
        this.backEdge.redrawCallbacks.fire();
    }
};

Wall.prototype.setStart = function(corner) {
    this.start.detachWall(this);
    corner.attachStart(this);
    this.start = corner;
    this.fireMoved();
};

Wall.prototype.setEnd = function(corner) {
    this.end.detachWall(this);
    corner.attachEnd(this);
    this.end = corner;
    this.fireMoved();
};

// return the corner opposite of the one provided
Wall.prototype.oppositeCorner = function( corner ) {
    if ( start === corner ) {
        return end;
    } else if ( end === corner ) {
        return start;
    } else {
        console.log('Wall does not connect to corner');
    }
};

/**
 * split wall into two walls on point (x,y)
 * @return {Corner} the split corner
 */
Wall.prototype.divide = function(x, y, floormodel) {
    var scope = this;
    //detachDoorsFromThisWall
    this.detachDoors(floormodel);

    var startCorner = this.getStart();
    var endCorner = this.getEnd();

    var middleClosest = Utils.closestPointOnLine(x, y, startCorner.x, startCorner.y, endCorner.x, endCorner.y),
        middle;
    // if there's already such a corner on this place, do not clone it
    if (floormodel.corners[floormodel.corners.length-1].x === x && floormodel.corners[floormodel.corners.length-1].y === y)
        middle = floormodel.corners[floormodel.corners.length-1];
    else
        middle = floormodel.newCorner.call(floormodel, middleClosest.x, middleClosest.y, undefined, endCorner.getOrderPosition());
    var secondWall = floormodel.newWall(middle, endCorner);

    this.setEnd(middle);

    //set initial wall's width
    secondWall.setBearing(this.bearing);
    secondWall.thickness = this.thickness;

    //attach doors back to right part of divided wall
    floormodel.doors.concat(floormodel.windows).forEach(function(door){
        door.assignWall();
        if (!door.wall)
            door.wall = scope;
        else { //new wall attached
            door.wall.fireOnMove($.proxy(door.recalcCoordinates, door));
        }
    });

    return middle;
};

/**
 * Detach doors and windows from wall
 * @param floormodel
 * @return {Array} array of detached doors/windows
 */
Wall.prototype.detachDoors = function(floormodel) {
    var thisWall = this;
    var doorsWindowsCache = [];
    var doorsWindows = floormodel.doors.concat(floormodel.windows);
    doorsWindows.forEach(function(door){
        if (!!door.wall && door.wall.id === thisWall.id) {
            doorsWindowsCache.push(door);
            door.wall = null;
        }
    });
    return doorsWindowsCache;
};

Wall.prototype.setThickness = function (thickness) {
    thickness = parseFloat(thickness);

    if (!isNaN(thickness)) {
        this.thickness = thickness;
    }
};

Wall.prototype.setBearing = function(value) {
    this.bearing = value;
    this.fireChangeThickness();
};

Wall.prototype.getWidth = Wall.prototype.getThickness = function() {
    if (this.bearing === this.modes.CUSTOM) return this.thickness;
    return Wall.prototype.thicknesses[Utils.getKeyByValue(this.modes, this.bearing)];
};

/**
 * Check if one of the walls fully belongs to another one.
 * In such situation merge corners and remove one of 2 equally positioned walls
 * @param start {Corner}
 * @param end {Corner}
 * @return {boolean}
 */
Wall.prototype.checkFullIntersection = function(start, end) {
    var bRemoved = false;
    if ("merged" in start && start.merged === true && "merged" in end && end.merged === true) {
        this.remove(); //just remove a redunant wall
        bRemoved = true;
    }

    start.merged = false;
    end.merged = false;
    return bRemoved;
};

Wall.prototype.isVisible = function () {
    return this.bearing !== this.modes.INVISIBLE;
};

/**
 * Get wall boundaries coefficients.
 * @return {number[]} start and end coefficients on range of [0-1]
 */
Wall.prototype.getEdgeBoundaries = function () {
    var oEdges, edge, startOffsets = [], endOffsets = [], bounds = [0, 1];
    if (this.frontEdge || this.backEdge) {
        oEdges = {front: this.frontEdge, back: this.backEdge};
        for (var key in oEdges) {
            edge = oEdges[key];
            if (edge) {
                var start = this.getStart();
                var end = this.getEnd();
                var edgeStart = (key === "front" ? edge.getInteriorStart() : edge.getInteriorEnd());
                var edgeEnd = (key === "front" ? edge.getInteriorEnd() : edge.getInteriorStart());

                var edgeOnLineStart = Utils.closestPointOnLine(edgeStart.x, edgeStart.y, start.x, start.y, end.x, end.y);
                var edgeOnLineEnd = Utils.closestPointOnLine(edgeEnd.x, edgeEnd.y, start.x, start.y, end.x, end.y);

                var startPoint = new THREE.Vector2(start.x, start.y);
                var endPoint = new THREE.Vector2(end.x, end.y);
                var lineLength = startPoint.distanceTo(endPoint);

                startOffsets.push(startPoint.distanceTo(edgeOnLineStart) / lineLength);
                endOffsets.push(endPoint.distanceTo(edgeOnLineEnd) / lineLength);
            }
        }

        var maxStartOffset = Math.max.apply(null, startOffsets);
        var maxEndOffset = Math.max.apply(null, endOffsets);

        //add space that is not allowed by xactimate doors
        maxStartOffset += this.maxClosenessToEdge / lineLength;
        maxEndOffset += this.maxClosenessToEdge / lineLength;

        bounds = [maxStartOffset, 1 - maxEndOffset];
    }
    return bounds;
};

Wall.prototype.isBetweenTwoRooms = function () {
    return (this.frontEdge !== null && this.backEdge !== null) && !this.orphan;
};

/**
 * Mark a room if this orphan wall is inside one.
 */
Wall.prototype.attachOrphanToRoom = function () {
    if (this.orphan) {
        var adjWalls, c = this.getCenter(), testingRoom;
        adjWalls = this.getStart().wallStarts.concat(this.getStart().wallEnds);
        adjWalls = adjWalls.concat(this.getEnd().wallStarts.concat(this.getEnd().wallEnds));
        adjWalls.forEach(function (wall) {
            if (wall.frontEdge) {
                testingRoom = wall.frontEdge.room;
                if (testingRoom && Utils.isPointInsidePolygon(c.x, c.y, testingRoom.corners)) this.orphanBelongsTo = testingRoom;
            }

            if (wall.backEdge) {
                testingRoom = wall.backEdge.room;
                if (testingRoom && Utils.isPointInsidePolygon(c.x, c.y, testingRoom.corners)) this.orphanBelongsTo = testingRoom;
            }
        }.bind(this));
    }
};



if ( typeof exports !== 'undefined' ) module.exports = Wall;
