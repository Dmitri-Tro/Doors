
'use strict';
var FloorModel = function() {
    this.defaultFloorPlanTolerance = 10.0;

    /* objects of plan stored */
    this.walls = [];
    this.corners = [];
    this.rooms = [];
    this.placements = {};
    this.doors = [];
    this.windows = [];
    this.cameras = [];
    this.embeds = [];
    this.lines = [];
    this.points = [];
    this.compass = {};
    this.settings = null;

    FloorHoverable.apply(this, arguments);

    this.compass = new Compass();

    /* Copies of Room objects. Used to find existing room objects instead of creating new ones when plan is changed. */
    this.archiveRooms = [];

    /** available modes */
    this.modes = {
        MOVE: 0,
        DRAW: 1,
        DELETE: 2,
        ROTATE: 3,
        DRAWLINE: 4
    };

    /* current mode */
    this.mode = 0;

    /* callbacks to redraw rooms when updated */
    this.updated_rooms = $.Callbacks();

    this.fireOnUpdatedRooms = function (callback) {
        this.updated_rooms.add(callback);
    };
    
    this.getWalls = function () { return this.walls; };
    this.getLines = function () { return this.lines; };
    this.getCorners = function () { return this.corners; };
    this.getRooms = function () { return this.rooms; };
    this.getDoors = function () { return this.doors; };
    this.getWindows = function () { return this.windows; };
    this.getCameras = function() { return this.cameras; };
    this.getEmbeds = function() { return this.embeds; };

    this.getRoomByName = function(roomName) {
        var retRoom = null;
        this.rooms.forEach(function(room) {
            if (room.roomName === roomName) retRoom = room;
        });
        return retRoom;
    };
    this.getDoorById = function (id) {
        var result = null;
        this.doors.forEach(function (door) {
            if (door.id === id) {
                result = door;
            }
        });
        return result;
    };
    this.getActiveCamera = function() {
        var activeCamera = null;
        this.cameras.forEach(function(camera) {
            if (camera.isActive) activeCamera = camera;
        });
        return activeCamera;
    };
    this.getCameraByRoom = function(roomName) {
        var retCamera = null;
        this.cameras.forEach(function(camera) {
            if (camera.roomName === roomName) retCamera = camera;
        });
        return retCamera;
    };
    this.getCameraById = function(cameraId) {
        var retCamera = null;
        this.cameras.forEach(function(camera) {
            if (camera.id === cameraId) retCamera = camera;
        });
        return retCamera;
    };
    this.getObjectById = function(guid) {
        var list = {};

        //arrays
        [this.corners, this.walls, this.doors, this.windows, this.embeds].forEach(function(objList) {
            objList.forEach(function(obj) {
                list[ obj.id ] = obj;
            });
        });

        //objects
        for (var i in this.placements) list[ this.placements[i].id ] = this.placements[i];

        return (guid in list ? list[guid] : null);
    };

    this.setMode = function(mode) {
        this.mode = mode; 
    };
    this.setActiveCameraByRoomName = function(roomName) {
        this.cameras.forEach(function(camera) {
            camera.isActive = (camera.id === roomName);
        });
    };

    /**
     * trigger a camera's indicator rotate
     * @param x krpano's ath horizontal coordinate
     */
    this.rotateActiveCamera = function(x) {
        var camera = this.getActiveCamera();
        if (camera !== null) {
            camera.setAngle(x);
            this.updated_rooms.fire();
        }
    };

    /* Removes any type of objects from floormodel
     */
    this.removeObject = function(obj) {
        var type = (obj.constructor.name + "s").toLowerCase();
        if (type === "embedobjects") type = "embeds";
        Utils.removeValue(this[type], obj); //e.g. object Door will be removed from this.doors
    };

    /**
     * Creates a new wall.
     * @param start The start corner.
     * @param end The end corner.
     * @param noUpdate flag indicating whether to update canvas or not.
     * @param noPush flag indicating whether to add wall to floormodel stack or not
     * @returns {Wall|boolean} The new wall.
     */
    this.newWall = function (start, end, noUpdate, noPush) {
        if (!start || !end) return false;

        var wall = new Wall(start, end);
        if (!noPush) { //noPush
            this.walls.push(wall);
            var scope = this;
            wall.fireOnDelete(function () {
                scope.removeWall(wall);
            });
            wall.fireOnChangeThickness(function () {
                scope.update();
            });
        }
        if (!noUpdate) this.update();
        return wall;
    };
    /** Removes a wall.
     * @param wall The wall to be removed.
     */
    this.removeWall = function (wall) {
        //check any objects attached (doors, windows)
        var doorsOrWindows = wall.detachDoors(this);
        for (var key in doorsOrWindows) { this.removeObject(doorsOrWindows[key]); }

        this.removeObject(wall);
        this.update();
    };

    /**
     * Creates a new corner.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @param id An optional id. If unspecified, the id will be created internally.
     * @param order An optional array key id. If specified, it will be pushed to array of corners on specified order position
     * @returns {Corner} The new corner.
     */
    this.newCorner = function (x, y, id, order) {
        var _this = this;
        var corner = new Corner(this, x, y, id);
        if (order != null) this.corners.splice(order, 0, corner);
        else this.corners.push(corner);
        corner.fireOnDelete(function () {
            _this.removeObject(corner);
        });
        return corner;
    };

    /**
     * Creates a new door.
     * @param startX {number}The x coordinate.
     * @param startY {number} The y coordinate.
     * @param endX {number} The x coordinate.
     * @param endY {number} The y coordinate.
     * @param floormodel {FloorModel=}
     * @param direction {number=} 2d vector direction of opening hte door
     * @returns {Door} The new door.
     */
    this.newDoor = function(startX, startY, endX, endY, floormodel, direction) {
        floormodel = floormodel || this;
        var door = new Door(startX, startY, endX, endY, floormodel, direction);
        this.doors.push(door);
        return door;
    };
    this.newDoorToPoint = function(pointX, pointY, wall, length) {
        var line = new THREE.Line3(new THREE.Vector3(wall.getStartX(), wall.getStartY(), 0), new THREE.Vector3(wall.getEndX(), wall.getEndY(), 0));
        var lineLength = line.distance();
        var lineLengthProportion = length / lineLength;
        var point = new THREE.Vector3(pointX, pointY, 0);
        var gap = 0;
        if (1) { //does it contain this point?
            var pointProportion = line.start.distanceTo(point) / lineLength;
            var b = wall.getEdgeBoundaries();
            var windowStartProportion = pointProportion - lineLengthProportion / 2;
            var windowEndProportion = pointProportion + lineLengthProportion / 2;
            if (windowEndProportion-windowStartProportion >= b[1]-b[0]) { //window is bigger than wall
                windowStartProportion = b[0];
                windowEndProportion = b[1];
            } else { //window is too closer to wall
                if (windowStartProportion < b[0]) gap = b[0] - windowStartProportion;
                if (windowEndProportion > b[1]) gap = windowEndProportion - b[1];

                if (windowStartProportion < b[0]) {
                    windowStartProportion = b[0];
                    windowEndProportion += gap;
                }
                if (windowEndProportion > b[1]) {
                    windowEndProportion = b[1];
                    windowStartProportion -= gap;
                }
            }

            var windowStart = line.at(windowStartProportion, new THREE.Vector3());
            var windowEnd = line.at(windowEndProportion, new THREE.Vector3());
        }
        return this.newDoor(windowStart.x, windowStart.y, windowEnd.x, windowEnd.y);
    };

    /**
     * Creates a new window.
     * @param startX The x coordinate.
     * @param startY The y coordinate.
     * @param endX The x coordinate.
     * @param endY The y coordinate.
     * @returns {Window} The new window.
     */
    this.newWindow = function(startX, startY, endX, endY) {
        var window = new Window(startX, startY, endX, endY, this);
        this.windows.push(window);
        return window;
    };
    this.newWindowToPoint = function(pointX, pointY, wall, length) {
        var line = new THREE.Line3(new THREE.Vector3(wall.getStartX(), wall.getStartY(), 0), new THREE.Vector3(wall.getEndX(), wall.getEndY(), 0));
        var lineLength = line.distance();
        var lineLengthProportion = length / lineLength;
        var point = new THREE.Vector3(pointX, pointY, 0);
        var gap = 0;
        if (1) { //does it contain this point?
            var pointProportion = line.start.distanceTo(point) / lineLength;
            var b = wall.getEdgeBoundaries();
            var windowStartProportion = pointProportion - lineLengthProportion / 2;
            var windowEndProportion = pointProportion + lineLengthProportion / 2;
            if (windowEndProportion-windowStartProportion >= b[1]-b[0]) { //window is bigger than wall
                windowStartProportion = b[0];
                windowEndProportion = b[1];
            } else { //window is too closer to wall
                if (windowStartProportion < b[0]) gap = b[0] - windowStartProportion;
                if (windowEndProportion > b[1]) gap = windowEndProportion - b[1];

                if (windowStartProportion < b[0]) {
                    windowStartProportion = b[0];
                    windowEndProportion += gap;
                }
                if (windowEndProportion > b[1]) {
                    windowEndProportion = b[1];
                    windowStartProportion -= gap;
                }
            }

            var windowStart = line.at(windowStartProportion, new THREE.Vector3());
            var windowEnd = line.at(windowEndProportion, new THREE.Vector3());
        }
        return this.newWindow(windowStart.x, windowStart.y, windowEnd.x, windowEnd.y);
    };
    /**
     * Creates a door or a window to point.
     * Determines a wall itself unlike in newDoorToPoint() or newWindowToPoint()
     * @param type {string} door or window
     * @param x {number} coordinates
     * @param y {number} coordinates
     * @return {boolean}
     */
    this.newDoorOrWindowToPoint = function (type, x, y) {
        var doorOrWindow = null;
        var hoverWall = this.overlappedWall(x, y);
        if (hoverWall !== null && hoverWall instanceof Wall) {
            if (type === "door") doorOrWindow = this.newDoorToPoint(x, y, hoverWall, 80);
            else doorOrWindow = this.newWindowToPoint(x, y, hoverWall, 80);
            this.updated_rooms.fire();
        }
        return doorOrWindow;
    };

    /**
     * Creates a new Embedded object.
     * @param x The x coordinate.
     * @param y The y coordinate.
     * @param angle object's rotation angle.
     * @param type String representation of the type (bedroom, bedroom_single, bath, toilet, nightstand, chair, etc)
     * @returns {EmbedObject} The new Embedded object.
     */
    this.newEmbedObject = function(x, y, angle, type) {
        var embed, typeCorrected = Utils.humanize(type);
        if (window["Embed" + typeCorrected] !== undefined) embed = new window["Embed" + typeCorrected](x, y, angle);
        else embed = new EmbedObject(x, y, angle, type);
        this.embeds.push(embed);
        return embed;
    };

    this.newLine = function(start, end) {
        if (!start || !end) return false;

        var wall = new Line(start, end);
        this.lines.push(wall);
        var scope = this;
        wall.fireOnDelete(function () {
            scope.removeWall(wall);
        });
        this.update();
        return wall;
    };

    this.loadFloorplan = function (floorplan) { //todo: no need for separate method, merge with this.loadFrom3dScene
        this.reset();
        var corners = {}, walls = {};
        if (floorplan == null || !('corners' in floorplan) || !('walls' in floorplan)) {
            return;
        }
        for (var id in floorplan.corners) {
            var corner = floorplan.corners[id];
            corners[id] = this.newCorner(corner.x, corner.y, id);
        }
        var scope = this;
        floorplan.walls.forEach(function (wall) {
            var newWall = scope.newWall(corners[wall.corner1], corners[wall.corner2]);
            if (!!wall.corner1 && !!wall.corner2) {
                walls[corners[wall.corner1].x+";"+corners[wall.corner1].y+";"+corners[wall.corner2].x+";"+corners[wall.corner2].y] = newWall; //TODO use any hashing algo
            }
        });
        this.mergeIntersectedCorners();
        floorplan.doors.forEach(function (door) {
            var newDoor = scope.newDoor(
                door.startX,
                door.startY,
                door.endX,
                door.endY,
                scope.walls
            );
        });
        floorplan.cameras.forEach(function (camera) {
            scope.cameras.push(new Camera(camera.position.x, camera.position.y, camera.angle, camera.mergeAngle, camera.imageName, apartmentData[camera.imageName].name, camera.active));
        });
        this.transform(0, true);
        this.update();
    };

    this.reset = function() {
        var tmpCorners = this.corners.slice(0);
        var tmpWalls = this.walls.slice(0);
        tmpCorners.forEach(function(c) {
            c.remove();
        });
        tmpWalls.forEach(function(w) {
            w.remove();
        });
        this.corners = [];
        this.walls = [];
        this.doors = [];
        this.windows = [];
        this.cameras = [];
        this.embeds = [];
        this.rooms = [];
        this.lines = [];
    };

    /* Reset all corners of walls and find new rooms from available walls.
     */
    this.update = function() {
        var _this = this;
        this.walls.forEach(function(wall) {
            wall.resetFrontBack();
        });

        //try to store the copies of rooms
        if (this.rooms.length > 0 && this.rooms.length >= this.archiveRooms.length) this.archiveRooms = Object.assign([], this.rooms);

        var roomCorners = determineRooms(this.corners);
        this.rooms = [];
        roomCorners.forEach(function(corners) {
            var newRoom = new Room(_this, corners);
            _this.rooms.push(newRoom);
        });
        this.assignOrphanEdges();
        this.assignRoomNames();

        this.updated_rooms.fire();
    };

    this.findRoomInArchive = function(room) {
        function symmetricDifference(a1, a2) {
            var result = [], similarFound = false;
            for (var i = 0; i < a1.length; i++) {
                similarFound = false;
                for (var j = 0; j < a2.length; j++) {
                    if (a2[j].x === a1[i].x && a2[j].y === a1[i].y) { //compare only coordinates
                        similarFound = true;
                    }
                }
                if (!similarFound) result.push(a1[i]);
            }
            for (i = 0; i < a2.length; i++) {
                similarFound = false;
                for (j = 0; j < a1.length; j++) {
                    if (a1[j].x === a2[i].x && a1[j].y === a2[i].y) { //compare only coordinates
                        similarFound = true;
                    }
                }
                if (!similarFound) result.push(a2[i]);
            }
            return result;
        }

        var searchedRoom = null;
        this.archiveRooms.forEach(function(archiveRoom) {
            var diff = symmetricDifference(room.corners, archiveRoom.corners);
            if (diff.length < 2) {
                searchedRoom = archiveRoom;
            }
        });

        // delete room from archive to avoid double taking
        var index = this.archiveRooms.indexOf(searchedRoom);
        if (index > -1) {
            this.archiveRooms.splice(index, 1);
        }

        return searchedRoom;
    };

    // find orphaned wall segments (i.e. not part of rooms) and
    // give them edges
    this.assignOrphanEdges = function() {
        this.walls.forEach(function(wall) {
            if (!wall.backEdge && !wall.frontEdge) {
                wall.orphan = true;
                wall.attachOrphanToRoom();
                new HalfEdge(null, wall, false); //edges are assigned to wall inside
                new HalfEdge(null, wall, true);
            }
        });
    };

    /*
     * Find the "rooms" in our planar straight-line graph.
     * Rooms are set of the smallest (by area) possible cycles in this graph.
     */
    // corners has attributes: id, x, y, adjacents
    function determineRooms(corners) {

        function calculateTheta(previousCorner, currentCorner, nextCorner) {
            var theta = Utils.angle2pi(
                previousCorner.x - currentCorner.x,
                previousCorner.y - currentCorner.y,
                nextCorner.x - currentCorner.x,
                nextCorner.y - currentCorner.y);
            return theta;
        }

        function removeDuplicateRooms(roomArray) {
            var results = [];
            var lookup = {};
            var hashFunc = function(corner) {
                return corner.id
            };
            var sep = '-';
            for (var i = 0; i < roomArray.length; i++) {
                // rooms are cycles, shift it around to check uniqueness
                var add = true;
                var room = roomArray[i];
                for (var j = 0; j < room.length; j++) {
                    var roomShift = Utils.cycle(room, j);
                    var str = $.map(roomShift, hashFunc).join(sep);
                    if (lookup.hasOwnProperty(str)) {
                        add = false;
                    }
                }
                if (add) {
                    results.push(roomArray[i]);
                    lookup[str] = true;
                }
            }
            return results;
        }

        function findTightestCycle(firstCorner, secondCorner) {
            var stack = [];
            var next = {
                corner: secondCorner,
                previousCorners: [firstCorner]
            };
            var visited = {};
            visited[firstCorner.id] = true;

            while ( next ) {
                // update previous corners, current corner, and visited corners
                var currentCorner = next.corner;
                visited[currentCorner.id] = true;

                // did we make it back to the startCorner?
                if ( next.corner === firstCorner && currentCorner !== secondCorner ) {
                    return next.previousCorners;
                }

                var addToStack = [];
                var adjacentCorners = next.corner.adjacentCorners();
                for ( var i = 0; i < adjacentCorners.length; i++ ) {
                    var nextCorner = adjacentCorners[i];

                    // is this where we came from?
                    // give an exception if its the first corner and we aren't at the second corner
                    if ( nextCorner.id in visited &&
                        !( nextCorner === firstCorner && currentCorner !== secondCorner )) {
                        continue;
                    }

                    // nope, throw it on the queue
                    addToStack.push( nextCorner );
                }

                var previousCorners = next.previousCorners.slice(0);
                previousCorners.push( currentCorner );
                if (addToStack.length > 1) {
                    // visit the ones with smallest theta first
                    var previousCorner = next.previousCorners[next.previousCorners.length - 1];
                    addToStack.sort(function(a,b) {
                        return (calculateTheta(previousCorner, currentCorner, b) -
                        calculateTheta(previousCorner, currentCorner, a));
                    });
                }

                if (addToStack.length > 0) {
                    // add to the stack
                    addToStack.forEach(function(corner) {
                        stack.push({
                            corner: corner,
                            previousCorners: previousCorners
                        });
                    });
                }

                // pop off the next one
                next = stack.pop();
            }
            return [];
        }

        // find tightest loops, for each corner, for each adjacent
        // TODO: optimize this, only check corners with > 2 adjacents, or isolated cycles
        var loops = [];
        for (var i = 0; i < corners.length; i++) {
            var firstCorner = corners[i];
            var adjacentCorners = firstCorner.adjacentCorners();
            for (var j = 0; j < adjacentCorners.length; j++) {
                var secondCorner = adjacentCorners[j];
                loops.push(findTightestCycle(firstCorner, secondCorner));
            }
        }
        
        // remove duplicates
        var uniqueLoops = removeDuplicateRooms(loops);
        
        //remove CW loops
        var uniqueCCWLoops = [];
        uniqueLoops.forEach(function (element) {
            if (!Utils.isClockwise(element)) {
                uniqueCCWLoops.push(element);
            }
        });

        /*uniqueCCWLoops.forEach(function(loop) {
            console.log("LOOP");
            loop.forEach(function(corner) {
                console.log(corner.id);
            });
        });*/
        return uniqueCCWLoops;
    }

    /**
     * Makes a single loop going through all corners and merging each one.
     * For a complete merging of all exsiting corners with given tolerance, please use
     */
    this.mergeIntersectedCorners = function() {
        for (var cor in this.corners) {
            this.corners[cor].mergeWithIntersected();
        }
    };
    /**
     * makes a complete merging of each corner in system.
     * TODO
     */
    this.mergeIntersectedCornersCompletely = function() {
        for (var i=0; i<5; i++) {
            this.mergeIntersectedCorners();
        }
    };

    /* Because of fact that rooms are destructed and build again every move, special Placement models are held.
     */
    this.assignRoomNames = function() {
        var scope = this, doCleanPlacements = false;
        function chooseRoomName() {
            var placementsKeys = Object.keys(scope.placements);
            function roomExists(number) {
                var doExists = false;
                placementsKeys.forEach(function(room) {
                    if (room === "room"+number) doExists = true;
                });
                return doExists;
            }
            var counter = 1, roomName = "room1";
            while (roomExists(counter)) {
                counter++;
                roomName = "room"+counter;
            }
            return roomName;
        }

        scope.rooms.forEach(function(room, index, roomObj) {
            var isCameraInside = false;
            scope.cameras.forEach(function(camera) {
                if (camera.isInsideRoom(room.corners)) {
                    isCameraInside = true;
                    roomObj[index].roomName = camera.roomName;
                    if (!scope.placements[camera.roomName]) scope.placements[camera.roomName] = new Placement(camera.roomName);
                }
            });

            if (!isCameraInside) { //assign other rooms
                var archivedRoom = scope.findRoomInArchive(room);
                if (archivedRoom) { // room already exists in archive
                    room.roomName = archivedRoom.roomName;
                    //console.log("!archived room! "+room.getUuid(), archivedRoom.roomName, archivedRoom.corners);
                } else { //new room, set new name
                    var tempName = chooseRoomName();
                    room.roomName = tempName;
                    if (!scope.placements[tempName]) scope.placements[tempName] = new Placement(tempName);
                    doCleanPlacements = true;
                    //console.log("!new room!"+room.getUuid(), tempName, room.corners);
                }
            }
        });

        if (doCleanPlacements) this.cleanPlacements();
    };

    /* Remove old unused placement objects, which we don't need anymore.
     * Amount of placements must match an amount of rooms.
     */
    this.cleanPlacements = function() {
        var placementsMap = [];
        if (this.rooms.length > 0) {
            for (var i=0; i<this.rooms.length; i++) {
                placementsMap.push(this.rooms[i].getPlacement());
            }
        }
        if (Object.keys(this.placements).length > 0) {
            for (var key in this.placements) {
                if (this.placements.hasOwnProperty(key) && placementsMap.indexOf(this.placements[key]) === -1) delete this.placements[key];
            }
        }
    };

    /* Rotate corners(walls), cameras and doors on floorplan to look neat. Try to parallelize walls to grid.
     * @param {number} rotating angle in radians
     * @param {boolean} try to snap to axis
     */
    this.transform = function(angle, doSnap) {
        if (!this.walls.length) return false;
        var scope = this;
        if (!angle) { //rotate by first wall's angle
            var vector = new THREE.Vector2();
            var start = this.walls[0].getStart();
            var end = this.walls[0].getEnd();
            var startVector = new THREE.Vector2(start.x, start.y);
            var endVector = new THREE.Vector2(end.x, end.y);
            angle = new THREE.Vector2().subVectors(endVector, startVector).angle() * (-1);
        }

        function rotPoint(x, y, rad) {
            var X = x * Math.cos(rad) - y * Math.sin(rad),
                Y = x * Math.sin(rad) + y * Math.cos(rad);
            return {x: X, y: Y};
        }
        [this.corners, this.cameras, this.embeds].forEach(function(obj, key, arPoints) {
            arPoints[key].forEach(function(item, key, arPoints) {
                var point = rotPoint(arPoints[key].x, arPoints[key].y, angle);
                arPoints[key].x = point.x; arPoints[key].y = point.y;
                if (item instanceof Camera) arPoints[key].mergeAngle += angle * THREE.Math.RAD2DEG;
                if (item instanceof Corner) item.moved_callbacks.fire(point.x, point.y);
                if ("isEmbedObject" in item && item.isEmbedObject === true) arPoints[key].angle += angle;
            });
        });
        this.doors.concat(this.windows).forEach(function(item, key, arPoints) {
            var pointStart = rotPoint(item.x1, item.y1, angle);
            var pointEnd = rotPoint(item.x2, item.y2, angle);
            arPoints[key].x1 = pointStart.x; arPoints[key].y1 = pointStart.y;
            arPoints[key].x2 = pointEnd.x; arPoints[key].y2 = pointEnd.y;
            item.recalcCoordinates();
            item.resetArrowCache();
        });
        this.lines.forEach(function(item, key, arPoints) {
            var pointStart = rotPoint(item.start.x, item.start.y, angle);
            var pointEnd = rotPoint(item.end.x, item.end.y, angle);
            arPoints[key].start.x = pointStart.x; arPoints[key].start.y = pointStart.y;
            arPoints[key].end.x = pointEnd.x; arPoints[key].end.y = pointEnd.y;
        });
        for (var i in this.placements) {
            var pos = this.placements[i].visibleNamePosition;
            if (pos !== null) this.placements[i].visibleNamePosition = rotPoint(pos.x, pos.y, angle);
        }
        if (doSnap) {
            this.walls.forEach(function(item, key, arPoints) {
                arPoints[key].snapToAxis(scope.defaultFloorPlanTolerance);
            });
        }
        return true;
    };

    /* Scales floorplan objects on coef value.
     * @param {number} coef scale value
     */
    this.scale = function(coef) {
        if (!this.walls.length) return false;

        function scalePoint(x, y, coef) {
            var X = x * coef,
                Y = y * coef;
            return {x: X, y: Y};
        }
        [this.corners, this.cameras, this.embeds].forEach(function(obj, key, arPoints) {
            arPoints[key].forEach(function(item, key, arPoints) {
                var point = scalePoint(arPoints[key].x, arPoints[key].y, coef);
                arPoints[key].x = point.x; arPoints[key].y = point.y;
                if (item instanceof Corner) item.moved_callbacks.fire(point.x, point.y);
            });
        });
        this.doors.concat(this.windows).forEach(function(item, key, arPoints) {
            var pointStart = scalePoint(item.x1, item.y1, coef);
            var pointEnd = scalePoint(item.x2, item.y2, coef);
            arPoints[key].x1 = pointStart.x; arPoints[key].y1 = pointStart.y;
            arPoints[key].x2 = pointEnd.x; arPoints[key].y2 = pointEnd.y;
            item.recalcCoordinates();
            item.resetArrowCache();
        });
        this.lines.forEach(function(item, key, arPoints) {
            var pointStart = scalePoint(item.start.x, item.start.y, coef);
            var pointEnd = scalePoint(item.end.x, item.end.y, coef);
            arPoints[key].start.x = pointStart.x; arPoints[key].start.y = pointStart.y;
            arPoints[key].end.x = pointEnd.x; arPoints[key].end.y = pointEnd.y;
        });
        return true;
    };

    this.reflectY = function() {
        if (!this.walls.length) return false;

        [this.corners, this.cameras, this.embeds].forEach(function(obj, indexes, arItems) {
            arItems[indexes].forEach(function(item, key, arPoints) {
                arPoints[key].y = -item.y;
                if (item instanceof Corner) item.moved_callbacks.fire(arPoints[key].x, arPoints[key].y);
            });
        });
        this.doors.concat(this.windows).forEach(function(item, key, arPoints) {
            arPoints[key].y1 = -item.y1;
            arPoints[key].y2 = -item.y2;
            item.recalcCoordinates();
            item.resetArrowCache();
        });
        this.lines.forEach(function(item, key, arPoints) {
            arPoints[key].y = -item.y;
        });
        for (var i in this.placements) {
            var pos = this.placements[i].visibleNamePosition;
            if (pos !== null) this.placements[i].visibleNamePosition.y = -pos.y;
        }
        return true;
    };

    /* Move floorplan objects by dx/dy value
     * @param {number} dx
     * @param {number} dy
     */
    this.dislocate = function(dx, dy) {
        if (!this.walls.length) return false;
        [this.corners, this.cameras, this.embeds].forEach(function(obj, key, arPoints) {
            arPoints[key].forEach(function(item, key, arPoints) {
                arPoints[key].x += dx; arPoints[key].y += dy;
                if (item instanceof Corner) item.moved_callbacks.fire(arPoints[key].x, arPoints[key].y);
            });
        });
        this.doors.concat(this.windows).forEach(function(item, key, arPoints) {
            arPoints[key].x1 += dx; arPoints[key].y1 += dy;
            arPoints[key].x2 += dx; arPoints[key].y2 += dy;
            item.recalcCoordinates();
            item.resetArrowCache();
        });
        this.lines.forEach(function(item, key, arPoints) {
            arPoints[key].start.x += dx; arPoints[key].start.y += dy;
            arPoints[key].end.x += dx; arPoints[key].end.y += dy;
        });
        for (var i in this.placements) {
            if (this.placements[i].visibleNamePosition !== null) {
                this.placements[i].visibleNamePosition.x += dx;
                this.placements[i].visibleNamePosition.y += dy;
            }
        }
        return true;
    };

    /* Get overall width and height of floorplan with objects. Currently watches walls and embedObjects
     * @return {object} object with width and height dimensions
     */
    this.getBoundingBox = function(useWallThickness) {
        var arX = [], arY = [], minWidth = 0, maxWidth = 0, minHeight = 0, maxHeight = 0, halfThickness;
        if (useWallThickness === true) {
            this.walls.forEach(function(item) {
                if (item.getLength() > 0) {
                    halfThickness = item.getThickness()/2;
                    arX.push(item.getStartX()-halfThickness);
                    arX.push(item.getStartX()+halfThickness);
                    arY.push(item.getStartY()-halfThickness);
                    arY.push(item.getStartY()+halfThickness);
                }
            });
        } else {
            this.corners.forEach(function(item) {
                arX.push(item.x);
                arY.push(item.y);
            });
        }

        this.rooms.forEach(function(room) {
            room.corners.forEach(function(corner) {
                arX.push(corner.x);
                arY.push(corner.y);
            });
        });
        this.embeds.forEach(function(item) {
            var box = item.getRectangle(true);
            arX.push(box[0].x); arX.push(box[2].x);
            arY.push(box[0].y); arY.push(box[2].y);
        });
        minWidth = Math.min.apply(null, arX);
        maxWidth = Math.max.apply(null, arX);
        minHeight = Math.min.apply(null, arY);
        maxHeight = Math.max.apply(null, arY);
        return {width: maxWidth - minWidth, height: maxHeight - minHeight, maxX: maxWidth, minX: minWidth, maxY: maxHeight, minY: minHeight};
    };

    /* Get floorplan's current state
     * @return {object} Object with variables representing floorplan stuff
     */
    this.getCurrentState = function() {
        var state = {}, scope = this;
        var keys = ["walls", "corners", "rooms", "doors", "windows", "cameras", "embeds", "placements", "lines",
            "compass", "settings"];
        keys.forEach(function(key) {
            state[key] = scope[key];
        });
        return state;
    };

    /* Set floorplan's current state
     */
    this.setCurrentState = function(data) {
        this.reset();
        this.cleanPlacements();
        this.placements = {}; this.archiveRooms = [];
        var scope = this, cornersCache = {};
        var defaultObjects = {
            corners: {func: Corner, args: [scope, 0, 0, ""]},
            walls: {func: Wall, args: [new Corner(scope, 0, 0, ""), new Corner(scope, 0, 0, ""), true]},
            doors: {func: Door, args: [0, 0, 1, 1, scope]},
            windows: {func: Window, args: [0, 0, 1, 1, scope]},
            cameras: {func: Camera, args: [0, 0, 0, 0, "", "", false]},
            embeds: {func: EmbedObject, args: [0, 0, 0, "chair"]},
            rooms: {func: Room, args: [scope]},
            placements: {func: Placement, args: []},
            lines: {func: Line, args: [new Dot(0, 0, ""), new Dot(0, 0, "")]},
            compass: {func: Compass, args: []}, //may be canvas element must reassigned anywhere else
            settings: {func: SettingsMapper, args: [scope]}
        };

        //helper to resolve dependencies inside objects
        function findObjectById(id, list) {
            var returnedWall = null;
            list.forEach(function(externalWall) {
                if (externalWall.id === id) returnedWall = externalWall;
            });
            return returnedWall;
        }
        //create a new instance of object
        function createObject(constructor, argList, additional) {
            var obj, args = Object.assign([], argList);
            if (constructor.name === "EmbedObject") {
                //change type of embed object to create the right instance in newEmbedObject method
                args[3] = additional.type;
            }
            if (("new" + constructor.name) in scope) {
                if (constructor.name === "Corner") args.shift();
                obj = scope["new" + constructor.name].apply(scope, args);
            }
            else obj = new (Function.prototype.bind.apply(constructor, [null].concat(args)));
            return obj;
        }
        //replace wall links inside corners with real walls
        function resolvePointers() {
            var foundWall;
            scope.corners.forEach(function(corner) {
                corner.wallStarts.forEach(function(wall, index, arWalls) {
                    if (foundWall = findObjectById(wall.id, scope.walls)) {
                        arWalls[index] = foundWall;
                        if (foundWall.getLength() <= 0) {
                            console.log("found wall with non-positive length: ", foundWall)
                        }
                    } else {
                        console.log("wall not found: " + wall.id);
                    }
                });

                corner.wallEnds.forEach(function(wall, index, arWalls) {
                    if (foundWall = findObjectById(wall.id, scope.walls)) {
                        arWalls[index] = foundWall;
                        if (foundWall.getLength() <= 0) {
                            console.log("found wall with non-positive length: ", foundWall);
                        }
                    } else {
                        console.log("wall not found: " + wall.id);
                    }
                });
            });
        }

        for (var key in defaultObjects) {
            if (Array.isArray(data[key])) {
                data[key].forEach(function(item, itemKey, itemArr) {
                    if ("editable" in item) delete item.editable; //take this fields from class, not json. support for old jsons
                    if ("modes" in item) delete item.modes; //
                    var newObject = Object.assign(
                        createObject(defaultObjects[key].func, defaultObjects[key].args, item),
                        item
                    );

                    if (newObject instanceof Corner) {
                        newObject.wallStarts.forEach(function(wall, index, arWalls) {
                            if (!cornersCache[wall.id]) cornersCache[wall.id] = {};
                            cornersCache[wall.id]["start"] = newObject;
                        });
                        newObject.wallEnds.forEach(function(wall, index, arWalls) {
                            if (!cornersCache[wall.id]) cornersCache[wall.id] = {};
                            cornersCache[wall.id]["end"] = newObject;
                        });
                        newObject.wallStarts = [];
                        newObject.wallEnds = [];
                    }
                    if (newObject instanceof Wall) {
                        if (newObject.id in cornersCache) {
                            if ("start" in cornersCache[newObject.id]) newObject.setStart(cornersCache[newObject.id]["start"]);
                            if ("end" in cornersCache[newObject.id]) newObject.setEnd(cornersCache[newObject.id]["end"]);
                        }
                    }
                    if (newObject instanceof Door || newObject instanceof Window) {
                        try {
                            newObject.init();
                        } catch(e) {
                            console.error("something wrong with door "+newObject.id+". Removed from plan!");
                            scope.removeObject(newObject);
                        }
                    }
                    if (newObject instanceof EmbedObject) {
                        if (newObject.matrix instanceof Object) {
                            var tmp = newObject.matrix.elements;
                            var tmpMatrix = new THREE.Matrix4();
                            tmpMatrix.elements = Float32Array.from(Object.keys(tmp).map(function (key) { return tmp[key]; }));
                            newObject.matrix = new THREE.Matrix4();
                            newObject.matrix.copy(tmpMatrix);

                            if (!("version" in item)) {
                                newObject.version = 1;
                            }
                        }
                    }
                    if (newObject.constructor.name === "Line") {
                        if (newObject.start) newObject.start = new Dot(newObject.start.x, newObject.start.y, newObject.start.id);
                        if (newObject.end) newObject.end = new Dot(newObject.end.x, newObject.end.y, newObject.end.id);
                    }

                    //and save object
                    if (newObject instanceof Camera || newObject instanceof Room) scope[key].push(newObject);
                });
            } else if (key === "placements") {
                for (var i in data[key]) {
                    if (data[key].hasOwnProperty(i) && i.length > 0) { //case when
                        if ("editable" in data[key][i]) delete data[key][i].editable; //we have to remove some keys for old jsons
                        var newObject = Object.assign(createObject(defaultObjects[key].func, defaultObjects[key].args), data[key][i]);
                        if (newObject.dimensionsCache.length > 0) { //convert simple objects to dimensions
                            newObject.dimensionsCache.forEach(function(obj, key, arr) {
                                var room = scope.getRoomByName(obj.room.roomName);
                                arr[key] = new Dimension(obj.start, obj.end, room);
                            });
                        }
                        scope[key][newObject.roomName] = newObject;
                    }
                }
            } else if (typeof data[key] === "object") {
                scope[key] = Object.assign(createObject(defaultObjects[key].func, defaultObjects[key].args), data[key]);
            }

            //after creating walls and corners resolve dependencies inside this objects
            if (key === "walls") resolvePointers();
            if (key === "settings") scope[key].updateReferences();
        }

        this.archiveRooms = this.rooms;
        this.update();
    };

    /* Loads floorplan json
     * @param {(string|JSON)} json loading source
     */
    this.loadJSON = function(json) {
        if (typeof json === "string") json = JSON.parse(json);
        this.setCurrentState(json);
    };

    /* Merge corners. Delete empty walls
     */
    this.sanitize = function() {
        const ALLOWED_MAX_WIDTH = 1000000; //10km, i hope we won't make plans for golf fields
        var scope = this;
        this.mergeIntersectedCornersCompletely();
        this.walls.forEach(function(obj) {
            if (obj.getLength() <= 0) {
                Utils.removeValue(scope.walls, obj);
            }
        });
        this.corners.forEach(function(corner) {
            for( var i = corner.wallStarts.length - 1; i >= 0; i-- ) {
                if (corner.wallStarts[i].getLength() <= 0) corner.wallStarts.splice(i, 1)
            }
            for( var j = corner.wallEnds.length - 1; j >= 0; j-- ) {
                if (corner.wallEnds[j].getLength() <= 0) corner.wallEnds.splice(j, 1)
            }

            if (corner.wallStarts.length === 0 && corner.wallEnds.length === 0) scope.removeObject(corner);
        });
        this.doors.forEach(function(door) {
             if (door.getWidth() <= 0) Utils.removeValue(scope.doors, door);
        });

        var bb = this.getBoundingBox();
        if (bb.width > ALLOWED_MAX_WIDTH || bb.height > ALLOWED_MAX_WIDTH) {
            console.warn("Probably one or more corners are left in space. Check corners to find a problem");
        }
    };

    this.calcCamerasPositions = function() {
        var positions = [], scope = this;
        this.cameras.forEach(function(camera) {
            var box = scope.getBoundingBox(true);
            box.minX -= window.pngViewer.imageMargin; box.minY -= window.pngViewer.imageMargin;
            box.maxX += window.pngViewer.imageMargin; box.maxY += window.pngViewer.imageMargin;
            var left = (camera.x - box.minX) * 100 / (box.maxX - box.minX);
            var top = (camera.y - box.minY) * 100 / (box.maxY - box.minY);
            positions.push({hotspotVPos: top, hotspotHPos: left, filenamePanorama: camera.id, viewAngle: camera.mergeAngle});
        });
        return positions;
    };

    /* Check if all cameras have associations with real panoramas from 3d tour
     */
    this.checkCamerasAssociations = function() {
        var badCameras = [];
        this.cameras.forEach(function(camera) {
            if (camera.isAddedManually) badCameras.push(camera);
        });
        return badCameras.length === 0;
    };

    /* Check if current cameras associations are valid, because sometimes they can be broken somewhere in backend.
     */
    this.checkCamerasAssociationsAsync = function() {
        var scope = this;
        function performCheck() {
            var list = [], bFoundInvalidCamera = false;
            for (var key in window.jsonData.tour.rooms) {
                list.push(window.jsonData.tour.rooms[key].filename);
            }

            scope.cameras.forEach(function(camera, index, arCameras) {
                if (list.indexOf(camera.id) === -1) {
                    arCameras[index].highlighted = true;
                    bFoundInvalidCamera = true;
                }
            });

            if (bFoundInvalidCamera) {
                var alert = new Alert("It seems some cameras do not have associations with panoramas.", "", 3000);
                console.info("It seems some cameras do not have associations with panoramas.");
                alert.render();
            }
        }

        if (!window.jsonData) {
            if (window.dataHandling.dataRequest) {
                window.dataHandling.dataRequest.then(performCheck);
            } else {
                console.warn('Something wrong with window.dataHandling.dataRequest!');
            }
        } else {
            performCheck();
        }
    };

    /**
     * Connect 3d scene model with floorplan, save some references (eg. sceneModel.wallsHeight).
     */
    this.hookUpSceneModel = function(sceneModel) {
        this.sceneModel = sceneModel; //store a ref to 3d class instance
        this.settings = new SettingsMapper(this);
    };

    /**
     * Delete invisible walls to normalize corners rendering
     * @return {FloorModel} copy of changed floormodel.
     */
    this.purify = function() {
        return this; //fast workaround to keep hands off invisible walls currently

        var model = $.extend(true, new FloorModel(), this);
        var exportInstance = new Export(model), removeValFromIndex = [], tempRooms = [], tempPlacements = {};
        model.resetState = exportInstance.toJSON();

        $.extend(true, tempRooms, model.rooms);
        $.extend(true, tempPlacements, model.placements);
        model.getWalls().forEach(function (wall, index) {
            if (wall.bearing === wall.modes.INVISIBLE) removeValFromIndex.push(index);
        });
        for (var i = removeValFromIndex.length-1; i >= 0; i--)
            model.walls[removeValFromIndex[i]].remove();
        model.update();

        model.rooms = tempRooms;
        model.placements = tempPlacements;
        return model;
    };

    
    /**
     * Get walls with filter
     * @param  {function} filter
     */
    this.filterWalls = function (filter) {
        return this.getWalls().filter(function (wall, index) {
            return filter(wall);
        });
    };

    /**
     * Add Walls
     * @param  {array} walls
     */
    this.addWalls = function (walls) {
        walls.forEach(function (wall) {
            if (!~this.corners.indexOf(wall.start)) {
                wall.start = this.newCorner(wall.start.x, wall.start.y, wall.start.id);
            } 
            if (!~this.corners.indexOf(wall.end)) {
                wall.end = this.newCorner(wall.end.x, wall.end.y, wall.end.id);
            }

            var newWall = this.newWall(wall.start, wall.end);
            
            Object.keys(wall).forEach(function (key) {
                if ((typeof wall[key]) === 'function' || ~key.indexOf('callback')) {
                    delete wall[key];
                }
            });

            Object.assign(newWall, wall);
        }.bind(this));

        this.update();
    }

    /**
     * Remove Walls
     * @param  {array} walls
     */
    this.removeWalls = function (walls) {
        walls.forEach(function (wall) {
            wall.remove();
        });

        this.update();
    }

    /**
     * save and then use underlying level of current floor.
     * @param json
     */
    this.handleUnderlyingLevel = function(json) {
        var fm = new FloorModel();
        fm.hookUpSceneModel();
        fm.loadJSON(json);
        this.underlyingOverlay = fm;
    };

    this.getTotalSquare = function () {
        var total = 0;
        this.rooms.forEach(function (room) {
            total += room.getSquareReal();
        });
        return Number(total.toFixed(2));
    }
};

if ( typeof exports !== 'undefined' ) module.exports = FloorModel;
