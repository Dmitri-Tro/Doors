/** Door constructor
 * @param {number} x1 door's start corner coord
 * @param {number} y1 door's start corner coord
 * @param {number} x2 door's end corner coord
 * @param {number} y2 door's end corner coord
 * @param {FloorModel} floormodel system object to take array of walls to attach door to and other stuff
 * @param {number=} direction direction of door with path, exactly 1 or -1
 */
function Door(x1, y1, x2, y2, floormodel, direction) {

    var tolerance = 20; //default tolerance

    this.TYPE_EMPTY = 0;
    this.TYPE_WITH_PATH = 1;
    this.TYPE_SLIDING = 2; //pocket
    this.TYPE_DOUBLE = 3;

    this.TYPE_BIFOLD = 4;
    this.TYPE_DUTCH = 5;
    this.TYPE_OVERHEAD = 6;
    this.TYPE_POCKET = 7;

    this.TYPE_NEW_WITH_PATH = 8;
    this.TYPE_NEW = 9;

    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.floormodel = floormodel;

    this.id = Utils.guid();
    this.wall = null;
    this.wallWidth = 0; // value to compare with current wall width from this.wall
    this.minWallWidth = 40; // value to compare with current wall width from this.wall
    this.startDistance = 0; // distance from door (x1;y1) to nearest corner of wall
    this.endDistance = 0;   // distance from door (x2;y2) corner of wall

    this.startPointOnFrontEdge = null;
    this.endPointOnFrontEdge = null;
    this.startPointOnBackEdge = null;
    this.endPointOnBackEdge = null;

    this.type = this.TYPE_WITH_PATH;
    this.direction = direction || getDefaultDirection(x1, y1, x2, y2);
    this.pathFrom = 1;
    this.openRate = 1; //[0;1] coefficient 0-closed, 1-opened
    this.lengthFormatted = "";
    this.height = 200;

    /* door state */
    this.hovered = false;
    this.startHovered = false;
    this.endHovered = false;

    /* for caching positions of 3d arrows  */
    this.cacheArrow = {};

    /* room's id which this door leads to */
    this.leadsToRoom = "";

    this.editable = {
        "type": {
            type: "switch",
            label: "Type of door",
            variants: [
                {label: "With path", value: 1, checked: 1, showProps: ["direction", "pathFrom", "openRate"]},
                {label: "Sliding", value: 2, showProps: ["openRate"], hideProps: ["direction", "pathFrom"]},
                {label: "Empty", value: 0, showProps: ["openRate"], hideProps: ["direction", "pathFrom"]},
                {label: "Double", value: 3, showProps: ["direction", "openRate"], hideProps: ["pathFrom"]},
                {label: "Bifold", value: 4, showProps: ["pathFrom", "openRate"], hideProps: ["direction"]},
                {label: "Dutch", value: 5, showProps: ["openRate", "pathFrom", "direction"]},
                {label: "Overhead", value: 6, showProps: ["openRate", "direction"], hideProps: ["pathFrom"]},
                {label: "Pocket", value: 7, showProps: ["openRate", "pathFrom"], hideProps: ["direction"]},
                {label: "New With path", value: 8, showProps: ["direction", "pathFrom", "openRate"]},
                {label: "New", value: 9, showProps: ["openRate"], hideProps: ["direction", "pathFrom"]},
            ],
            value: this.type,
            casttype: "number"
        },
        "direction": {
            type: "switch",
            label: "Path Direction",
            variants: [
                {label: "A", value: 1, checked: 1},
                {label: "B", value: -1}
            ],
            value: this.direction,
            width: "50%",
            casttype: "number"
        },
        "pathFrom": {
            type: "switch",
            label: "Path Corner",
            variants: [
                {label: "A", value: 1, checked: 1},
                {label: "B", value: -1}
            ],
            value: this.pathFrom,
            width: "50%",
            casttype: "number"
        },
        "openRate": {
            type: "switch",
            label: "Position",
            variants: [
                {label: "Closed", value: 0, checked: 1},
                {label: "Opened", value: 1}
            ],
            value: this.openRate,
            casttype: "number"
        },
        "length": {
            type: "number",
            label: "Length",
            value: this.length,
            width: "49%"
        },
        "height": {
            type: "number",
            label: "Height",
            value: this.height,
            width: "49%"
        },
        "leadsToRoom": {
            type: "select",
            label: "Lead to other floor",
            variants: [],
            value: this.leadsToRoom,
            casttype: "string"
        }
    };
    this.getEditable = function() {
        if (this instanceof Door) this.editable["leadsToRoom"].variants = this.getRoomsFromOtherFloors();
        return this.editable;
    };

    function getDefaultDirection(x1, y1, x2, y2, pointX, pointY) {
        var defaultPointX = pointX || 0;
        var defaultPointY = pointY || 0;
        return ((defaultPointX-x1) * (y2-y1) - (defaultPointY-y1) * (x2-x1)) < 0 ? 1 : -1;
    }

    this.init = function() {
        if (!this.floormodel) return; // pass init, when door class created without parameters

        this.assignWall();
        if (this.wall) {
            this.wall.fireOnMove($.proxy(this.recalcCoordinates, this));
            this.assignProperties();
            this.assignWallWidth();
            this.recalcCoordinates();
        }
        if (this.type === this.TYPE_EMPTY) this.openRate = 1;
    };
    /* Find the wall to which door is assigned
     * @return bool
     */
    this.assignWall = function () {
        var scope = this, wallList = this.floormodel.walls;
        var firstPoint = new THREE.Vector3(this.x1, this.y1, 0);
        var secondPoint = new THREE.Vector3(this.x2, this.y2, 0);

        function isPointOnLine(cornerA, cornerB, pointToCheck) {
            return Utils.pointDistanceFromLine(pointToCheck.x, pointToCheck.y, cornerA.x, cornerA.y, cornerB.x, cornerB.y) < tolerance;
        }

        function isPointOnLineAndBetweenPoints (pointA, pointB, pointToCheck) {
            var dx = pointB.x - pointA.x;
            var dy = pointB.y - pointA.y;

            // if a line is a more horizontal than vertical:
            if (Math.abs(dx) >= Math.abs(dy)) {
                if (dx > 0) {
                    return pointA.x <= pointToCheck.x && pointToCheck.x <= pointB.x;
                } else {
                    return pointB.x <= pointToCheck.x && pointToCheck.x <= pointA.x;
                }
            } else {
                if (dy > 0 ) {
                    return pointA.y <= pointToCheck.y && pointToCheck.y <= pointB.y;
                } else {
                    return pointB.y <= pointToCheck.y && pointToCheck.y <= pointA.y;
                }
            }
        }

        for (var i in wallList) {
            if (isPointOnLine(wallList[i].getStart(), wallList[i].getEnd(), firstPoint) &&
                isPointOnLine(wallList[i].getStart(), wallList[i].getEnd(), secondPoint) &&
                isPointOnLineAndBetweenPoints(wallList[i].getStart(), wallList[i].getEnd(), firstPoint) &&
                isPointOnLineAndBetweenPoints(wallList[i].getStart(), wallList[i].getEnd(), secondPoint)) {
                scope.wall = wallList[i];
                return true;
            }
        }
        return false;
    };

    this.getHeight = function () {
        return this.height;
    };

    this.setHeight = function (height) {
        this.height = parseFloat(height);
    };
   
    /**
     * @returns {object}
     */ 
    this.getDistanceBetweenWallCorners = function () {
        var wallStart = this.wall.getStart();
        var wallEnd = this.wall.getEnd();

        var firstCorner =  new THREE.Vector3(wallStart.x, 0, wallStart.y);
        var secondCorner = new THREE.Vector3(wallEnd.x, 0, wallEnd.y);

        var startPoint = new THREE.Vector3(this.x1, 0, this.y1);
        var endPoint = new THREE.Vector3(this.x2, 0, this.y2); 
        
        var dist = startPoint.distanceTo(endPoint);
        var direction = endPoint.clone().sub(startPoint).normalize().multiplyScalar((dist / 2));
        var center = startPoint.clone().add(direction);

        var distance = {
            first: firstCorner.distanceTo(center),
            second: secondCorner.distanceTo(center),
            total: firstCorner.distanceTo(secondCorner)
        };

        distance.percent = (distance.total - this.getWidth()) / 200;
        distance.center = (distance.first - (this.getWidth() / 2)) / distance.percent - 100;

        return distance;
    };

    /* Get door's width
     * @return {number}
     */
    this.getWidth = function() {
        var start = new THREE.Vector2(this.x1, this.y1);
        var end = new THREE.Vector2(this.x2, this.y2);
        var length = start.distanceTo(end);
        this.length = length;
        this.lengthFormatted = Utils.cmToMeters(length);
        return length;
    };
    
    /**
     * @param  {number} center from -100 to 100 on wall
     */
    this.moveCenter = function (center) {
        center = Math.min(Math.max(center, -100), 100) + 100;

        var wallStart = this.wall.getStart();
        var wallEnd = this.wall.getEnd();

        var firstCorner =  new THREE.Vector3(wallStart.x, 0, wallStart.y);
        var secondCorner = new THREE.Vector3(wallEnd.x, 0, wallEnd.y);

        var distance = this.getDistanceBetweenWallCorners();

        var doorWidth = this.getWidth();

        var startDirection = secondCorner.clone().sub(firstCorner).normalize().multiplyScalar(
            (distance.percent * center)
        );
        var endDirection = secondCorner.clone().sub(firstCorner).normalize().multiplyScalar(
            (distance.percent * center) + (doorWidth)
        );

        var newStart = firstCorner.clone().add(startDirection);
        var newEnd = firstCorner.clone().add(endDirection);

        this.x2 = newStart.x;
        this.y2 = newStart.z;

        this.x1 = newEnd.x;
        this.y1 = newEnd.z;

        return {
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2
        }
    };

    this.setNewCoordinate = function (coordinate, side) {
        if (side === 'start') {
            this.x2 = coordinate.x;
            this.y2 = coordinate.y;
        } else if (side === 'end') {
            this.x1 = coordinate.x;
            this.y1 = coordinate.y;
        }
    };

    /* Set width of door by
     * @param {number} value exact width to set in cm
     * @param {string} bound Set which boundary to move when
     */
    this.setLength = this.setWidth = function(value, bound) {
        if (value < this.minWallWidth) return false;
        var startPoint = new THREE.Vector3(this.x1, 0, this.y1);
        var endPoint = new THREE.Vector3(this.x2, 0, this.y2);
        var newPoint;
        if (bound === "end") {
            newPoint = (new THREE.Vector3()).subVectors(endPoint, startPoint).setLength(value).add(startPoint);
            this.x2 = newPoint.x;
            this.y2 = newPoint.z;
        } else if (bound === "center") {        
            var distance = startPoint.distanceTo(endPoint);

            var startDirection = endPoint.clone().sub(startPoint).normalize().multiplyScalar((distance / 2) + (value / 2));
            var endDirection = endPoint.clone().sub(startPoint).normalize().multiplyScalar((distance / 2) - (value / 2));

            var newStart = startPoint.clone().add(startDirection);
            var newEnd = startPoint.clone().add(endDirection);

            this.x2 = newStart.x;
            this.y2 = newStart.z;

            this.x1 = newEnd.x;
            this.y1 = newEnd.z;
        } else { //bound === start
            newPoint = (new THREE.Vector3()).subVectors(startPoint, endPoint).setLength(value).add(endPoint);
            this.x1 = newPoint.x;
            this.y1 = newPoint.z;
        }

        this.assignProperties();
    };

    /* change (x1,y1) and (x2,y2) when the wall is moved
     */
    this.recalcCoordinates = function() {
        if (!!this.wall) {
            this.assignProperties();
            this.assignEdgePoints();
            var start = this.wall.getStart();
            var end = this.wall.getEnd();
            var startPoint = new THREE.Vector3(start.x, 0, start.y);
            var endPoint = new THREE.Vector3(end.x, 0, end.y);
            var wallLine = new THREE.Line3(startPoint, endPoint);
            var lineLength = wallLine.distance();
            var k = lineLength / this.wallWidth; //scale coefficient

            var newDoorStart, newDoorEnd, wallWidthPercent, doorStartPercent, doorEndPercent;
            if (this.nearestDistance === this.startDistance) {
                var startDistance = this.startDistance * k;
                doorStartPercent = this.checkProportionBorders(startDistance / lineLength);
                newDoorStart = wallLine.at(doorStartPercent, new THREE.Vector3());

                wallWidthPercent = this.getWidth() / lineLength;
                doorEndPercent = this.checkProportionBorders(doorStartPercent + wallWidthPercent);
                newDoorEnd = wallLine.at(doorEndPercent, new THREE.Vector3());
            } else {
                var endDistance = this.endDistance * k;
                doorEndPercent = this.checkProportionBorders(1 - endDistance / lineLength);
                newDoorEnd = wallLine.at(doorEndPercent, new THREE.Vector3());

                wallWidthPercent = this.getWidth() / lineLength;
                doorStartPercent = this.checkProportionBorders(doorEndPercent - wallWidthPercent);
                newDoorStart = wallLine.at(doorStartPercent, new THREE.Vector3());
            }
            this.assignWallWidth();

            this.x1 = newDoorStart.x;
            this.y1 = newDoorStart.z;
            this.x2 = newDoorEnd.x;
            this.y2 = newDoorEnd.z;
        }
    };

    /* get door open trajectory for rendering
     * For double doors return array with 2 paths
     * @return Array|Object
     */
    this.getPath = function() {
        if (this.type === this.TYPE_DOUBLE) {
            var coords = [];
            coords.push(this.getPathCoordinates(1));
            coords.push(this.getPathCoordinates(-1));
            return coords;
        }
        return this.getPathCoordinates(this.pathFrom);
    };

    this.getPathCoordinates = function(pathFrom) {
        var narrowA, narrowB, topPoint, dir2; // to draw path a bit smaller than real
        var leftNarrowPercentage = 0.95;
        var rightNarrowPercentage = 0.05;
        var rotateCorner = 90;

        var pointA = new THREE.Vector2(this.x1, this.y1);
        var pointB = new THREE.Vector2(this.x2, this.y2);
        if (pathFrom === -1) { //change places
            var temp = pointA; pointA = pointB; pointB = temp;
        }
        var dir = pointB.clone().sub(pointA);
        var len = dir.length();

        dir = dir.clone().normalize().multiplyScalar(len * leftNarrowPercentage);
        if (this.type === this.TYPE_DOUBLE) dir2 = dir.clone().normalize().multiplyScalar(len * 0.5);
        else dir2 = dir.clone().normalize().multiplyScalar(len * rightNarrowPercentage);
        narrowB = pointA.clone().add(dir);
        narrowA = pointA.clone().add(dir2);

        narrowA.rotateAround( narrowB, (this.direction) * pathFrom * rotateCorner * THREE.Math.DEG2RAD );
        return {
            topX: narrowA.x,
            topY: narrowA.y,
            bottomX: narrowB.x,
            bottomY: narrowB.y,
            radius: narrowA.distanceTo(narrowB),
            angle: (Math.atan2(narrowA.y - narrowB.y, narrowA.x - narrowB.x)) * THREE.Math.RAD2DEG,
            rotateCoefficient: pathFrom * this.direction
        };
    };

    /* get the nearest distance from one of wall corners to one of door corners
     */
    this.assignProperties = function() {
        var wallStart = this.wall.getStart();
        var wallEnd = this.wall.getEnd();
        var pointWallStart = new THREE.Vector2(wallStart.x, wallStart.y);
        var pointWallEnd = new THREE.Vector2(wallEnd.x, wallEnd.y);
        var pointA = new THREE.Vector2(this.x1, this.y1);
        var pointB = new THREE.Vector2(this.x2, this.y2);

        var minPointA = (pointWallStart.distanceTo(pointA) < pointWallStart.distanceTo(pointB) ? pointWallStart.distanceTo(pointA) : pointWallStart.distanceTo(pointB));
        var minPointB = (pointWallEnd.distanceTo(pointB) < pointWallEnd.distanceTo(pointA) ? pointWallEnd.distanceTo(pointB) : pointWallEnd.distanceTo(pointA));

        this.startDistance = minPointA;
        this.endDistance = minPointB;
        this.nearestDistance = (minPointA < minPointB ? minPointA : minPointB);
        this.getWidth();
    };

    this.assignWallWidth = function() {
        var start = this.wall.getStart();
        var end = this.wall.getEnd();
        return this.wallWidth = new THREE.Vector3(start.x, 0, start.y).distanceTo(new THREE.Vector3(end.x, 0, end.y));
    };

    /* move door's start or end (resizing), or both (moving)
     * @param {number} resize difference on x axis
     * @param {number} resize difference on y axis
     * @param {string} "start" or "end", or if undefined it means move both start and end.
     */
    this.move = function(dx, dy, bound) {
        var doMoveStart = (bound === "start");
        var doMoveEnd = (bound === "end");
        if (!bound) {
            doMoveStart = true;
            doMoveEnd = true;
        }
        var d = new THREE.Vector3(dx, 0, dy);
        var start = this.wall.getStart();
        var end = this.wall.getEnd();
        var startPoint = new THREE.Vector3(start.x, 0, start.y);
        var endPoint = new THREE.Vector3(end.x, 0, end.y);
        var line = new THREE.Line3(startPoint, endPoint);
        var lineLength = line.distance();

        //direction is got from a perpendicular vector from line (rotate 90)
        var delta = line.clone().delta(new THREE.Vector3());
        var direction = getDefaultDirection(0, 0, delta.z, -delta.x, dx, dy);

        var startPercentage = startPoint.distanceTo(new THREE.Vector3(this.x1, 0, this.y1)) / lineLength;
        var endPercentage = startPercentage + this.getWidth() / lineLength;
        startPercentage = (startPercentage < 0 ? 0 : startPercentage);
        endPercentage = (endPercentage > 1 ? 1 : endPercentage);

        //a projection of door points to line
        var k = Utils.pointPerpendicularToLine(0, 0, this.x1, this.y1, this.x2, this.y2);
        var m = Utils.pointPerpendicularToLine(dx, dy, this.x1, this.y1, this.x2, this.y2);
        var l = new THREE.Vector3(k.x, 0, k.y).distanceTo(new THREE.Vector3(m.x, 0, m.y));

        this.assignEdgePoints();
        var b = this.wall.getEdgeBoundaries(); //wall gates
        //plus add space out of wall, door can't be so close to wall
        const startBoundWithOffset = b[0]; // on range of [0-1]
        const endBoundWithOffset = b[1]; // on range of [0-1]

        //todo revise this bounding mechanism v
        if (doMoveStart) {
            var newStartPercentage = startPercentage + direction * l / lineLength;
            newStartPercentage = (newStartPercentage < startBoundWithOffset ? startBoundWithOffset : newStartPercentage);
        }
        if (doMoveEnd) {
            var newEndPercentage = endPercentage + direction * l / lineLength;
            newEndPercentage = (newEndPercentage > endBoundWithOffset ? endBoundWithOffset : newEndPercentage);
        }
        if (doMoveStart && doMoveEnd) {
            if (newStartPercentage === startBoundWithOffset) newEndPercentage = endPercentage;
            if (newEndPercentage === endBoundWithOffset) newStartPercentage = startPercentage;
        }
        //todo revise this bounding mechanism ^

        if (doMoveStart) {
            var newStart = line.at(newStartPercentage, new THREE.Vector3());
            this.x1 = newStart.x;
            this.y1 = newStart.z;
        }

        if (doMoveEnd) {
            var newEnd = line.at(newEndPercentage, new THREE.Vector3());
            this.x2 = newEnd.x;
            this.y2 = newEnd.z;
        }

        this.assignProperties();
        this.assignEdgePoints();
        this.resetArrowCache();
    };

    /* Helper method to prevent any percent number go out of borders 0 <= x <= 1
     * @return {number} [0,1]
     */
    this.checkProportionBorders = function(proportion) {
        return (proportion < 0 ? 0 : (proportion > 1 ? 1 : proportion));
    };

    /* Get distance from any point to nearest point on door
     * @param {number} x
     * @param {number} y
     * @return {number} distance
     */
    this.distanceFrom = function(x, y) {
        return Utils.pointDistanceFromLine(x, y,
            this.x1, this.y1,
            this.x2, this.y2);
    };

    /* Check flags if mouse pointer overlaps doors borders
     */
    this.checkBordersOverlapped = function(x, y) {
        var radius = 10;
        var start = new THREE.Vector3(this.x1, this.y1+5, 0);
        var end = new THREE.Vector3(this.x2, this.y2-5, 0);
        var point = new THREE.Vector3(x, y, 0);

        this.startHovered = start.distanceTo(point) <= radius;
        this.endHovered = end.distanceTo(point) <= radius;
    };

    /* Get arrow position from cache or calculate it if not found in cache. Every door can have 2 exits, so 2 arrows. todo: separate arrows to class
     * @param {string} roomName to check from cache
     * @param {THREE.Vector3} Any 2d point (e.g. center of room) to decide from which side of door to place arrow
     */
    this.getArrowPosition = function(roomName, roomPoint) {
        if (roomName !== undefined) {
            if ("cacheArrow" in this && roomName in this.cacheArrow) return this.cacheArrow[roomName];
        }

        return this.calcArrowPosition(roomName, roomPoint);
    };

    /* Calculate arrow position
     * @param {THREE.Vector3} Any 2d point (e.g. center of room) to decide from which side of door to place arrow
     */
    this.calcArrowPosition = function(roomName, roomPoint) {
        roomPoint = new THREE.Vector2(roomPoint.x, roomPoint.y);
        var direction = ((roomPoint.x - this.x1) * (this.y2 - this.y1) - (roomPoint.y - this.y1) * (this.x2 - this.x1)) <= 0 ? 0 : 1;

        //calculate point where arrow will be situated
        var leftPoint = new THREE.Vector2(this.x1, this.y1);
        var center = this.getCenter();
        var angle = (direction === 0 ? -90 : 90);
        var newPoint = leftPoint.clone().rotateAround(center, angle * THREE.Math.DEG2RAD);
        if (roomPoint.distanceTo(newPoint) < 200) {
            var c = new THREE.Vector2(center.x, center.y);
            newPoint = new THREE.Vector2().subVectors(newPoint, c).multiplyScalar(0.1).add(c);
        }

        this.cacheArrow[roomName] = newPoint;

        return newPoint;
    };

    this.resetArrowCache = function() {
        this.cacheArrow = {};
    };

    this.getCenter = function() {
        return {x: (this.x1 + this.x2) / 2, y: (this.y1 + this.y2) / 2};
    };

    this.clone = function() {
        return new Door(this.x1, this.y1, this.x2, this.y2, this.floormodel, this.direction);
    };

    /* Get rooms from apartmentData global variable (data is downloaded from backend)
     */
    this.getRoomsFromOtherFloors = function() {
        var arRooms = [];

        arRooms.push({
            label: "None", value: ""
        });
        for (var roomKey in window.apartmentData) {
            var item = window.apartmentData[roomKey];
            if (window.apartmentData.hasOwnProperty(roomKey) && ("plan" in item) && ("floor" in window.dataHandling.params) && item.plan !== +window.dataHandling.params.floor) {
                arRooms.push({
                    label: item.name+" ["+item.plan+"]", value: item.filename, plan: item.plan
                });
            }
        }
        arRooms.sort(function(a, b) { //sort rooms by floor
            return a.plan - b.plan;
        });
        return arRooms;
    };

    /**
     * Updates door boundings on edges (in rooms). Used for measuring wall pieces near the door
     */
    this.assignEdgePoints = function() {
        //calc distances from door to interior edges
        var edge, oEdges;
        if (this.wall.frontEdge || this.wall.backEdge) {
            oEdges = {front: this.wall.frontEdge, back: this.wall.backEdge};
            for (var key in oEdges) {
                edge = oEdges[key];
                if (edge) {
                    var start = edge.getInteriorStart();
                    var end = edge.getInteriorEnd();
                    var startV = new THREE.Vector2(start.x, start.y);

                    var ending1 = Utils.closestPointOnLine(this.x1, this.y1, start.x, start.y, end.x, end.y);
                    var ending2 = Utils.closestPointOnLine(this.x2, this.y2, start.x, start.y, end.x, end.y);

                    if (key === "front") {
                        this.startPointOnFrontEdge = startV.distanceTo(ending1) < startV.distanceTo(ending2) ? ending1 : ending2;
                        this.endPointOnFrontEdge = this.startPointOnFrontEdge === ending1 ? ending2 : ending1;
                    }
                    if (key === "back") {
                        this.startPointOnBackEdge = startV.distanceTo(ending1) < startV.distanceTo(ending2) ? ending1 : ending2;
                        this.endPointOnBackEdge = this.startPointOnBackEdge === ending1 ? ending2 : ending1;
                    }
                }
            }
        }
    };

    /**
     * Xactimate software doesn't allow doors/windows to stay closer than 2' to wall end.
     * So it moves door out of wall endings (start, end). And if we move a door (doesn't fit) -> change width.
     */
    this.optimizeForXactimate = function() {
        const minGapFromWall = 11; //door must be not nearer than 4inches from wall
        var len, len_perc, moved, p1, p2;

        var wallGap1 = this.distanceFrom(this.wall.getStartX(), this.wall.getStartY(), this.wall.getStartX(), this.wall.getStartY());
        var wallGap2 = this.distanceFrom(this.wall.getEndX(), this.wall.getEndY(), this.wall.getEndX(), this.wall.getEndY());
        if (wallGap1 < minGapFromWall && wallGap2 < minGapFromWall) {
            console.log("need to shorten door because it doesn't fit its wall");
            var residual1 = minGapFromWall - wallGap1;
            var residual2 = minGapFromWall - wallGap2;
            this.setWidth(this.getWidth()-residual1, "start");
            this.setWidth(this.getWidth()-residual2, "end");
        } else if (wallGap1 < minGapFromWall) {
            len = minGapFromWall - wallGap1;
            len_perc = len / this.getWidth();
            p1 = new THREE.Vector3(this.x1, this.y1, 0);
            p2 = new THREE.Vector3(this.x2, this.y2, 0);
            moved = new THREE.Line3(p1, p2).at(len_perc);
            if (wallGap2 >= minGapFromWall * 2) {
                this.move(moved.x-this.x1, moved.y-this.y1);
            } else {
                this.move(moved.x-this.x2, moved.y-this.y2, "start");
            }
        } else if (wallGap2 < minGapFromWall) {
            len = minGapFromWall - wallGap2;
            len_perc = len / this.getWidth();
            p1 = new THREE.Vector3(this.x1, this.y1, 0);
            p2 = new THREE.Vector3(this.x2, this.y2, 0);
            moved = new THREE.Line3(p2, p1).at(len_perc);
            if (wallGap1 >= minGapFromWall * 2) {
                this.move(moved.x-this.x2, moved.y-this.y2);
            } else {
                this.move(moved.x-this.x2, moved.y-this.y2, "end");
            }
        }
    };

    this.init();
};

Door.prototype.toJSON = function() {
    return {
        "x1": this.x1,
        "y1": this.y1,
        "x2": this.x2,
        "y2": this.y2,
        "id": this.id,
        "wall": this.wall,
        "wallWidth": this.wallWidth,
        "startDistance": this.startDistance,
        "type": this.type,
        "direction": this.direction,
        "pathFrom": this.pathFrom,
        "openRate": this.openRate,
        "height": this.height,
        "lengthFormatted": this.lengthFormatted,
        "leadsToRoom": this.leadsToRoom
    };
};

/**
 * Remove doors overlapping current door
 * @param floormodel {FloorModel}
 * @return {boolean}
 */
Door.prototype.removeOverlapDoors = function(floormodel) {
    //get distances from wall.getStart() and wall.getEnd() to nearest and farthest door corners
    function getDistances(door) {
        var first = new THREE.Vector3(door.x1, door.y1);
        var sec = new THREE.Vector3(door.x2, door.y2);
        var start = new THREE.Vector3(door.wall.getStart().x, door.wall.getStart().y);
        var end = new THREE.Vector3(door.wall.getEnd().x, door.wall.getEnd().y);
        var nearestToStart = first.distanceTo(start) < sec.distanceTo(end) ? first : sec;
        var nearestToEnd = first === nearestToStart ? sec : first;

        var wallStartToDoor1 = nearestToStart.distanceTo(start);
        var wallStartToDoor2 = wallStartToDoor1 + door.getWidth();
        var wallEndToDoor1 = nearestToEnd.distanceTo(end);
        var wallEndToDoor2 = wallEndToDoor1 + door.getWidth();

        return {
            wallStartToDoor1: wallStartToDoor1,
            wallStartToDoor2: wallStartToDoor2,
            wallEndToDoor1: wallEndToDoor1,
            wallEndToDoor2: wallEndToDoor2
        };
    }

    var bRemoved = false;

    // find doors on the same wall
    var dDist, curDist;
    floormodel.doors.forEach(function(d){
        if (d.wall !== null && this.wall !== null && d.wall.id === this.wall.id && d.id !== this.id) {
            //if current door overlaps one of others, leave old, remove current
            dDist = getDistances(d);
            curDist = getDistances(this);

            if ((curDist.wallStartToDoor1 >= dDist.wallStartToDoor1 && curDist.wallStartToDoor1 <= dDist.wallStartToDoor2) ||
                (curDist.wallStartToDoor2 >= dDist.wallEndToDoor1 && curDist.wallStartToDoor2 <= dDist.wallEndToDoor2)) {
                floormodel.removeObject(d);
                bRemoved = true;
            }
        }
    }.bind(this));

    return bRemoved;
};

if ( typeof exports !== 'undefined' ) module.exports = Door;