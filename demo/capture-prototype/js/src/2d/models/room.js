/* Room is a highly dynamic object, it depends on corners, and system recreates rooms very often.
 * Thats why all properties of rooms are stored in special Placement objects, which are stored in archive.
 * Placement object of room can be taken with room.getPlacement();
 */
var Room = function(floorplan, corners) {

    var scope = this;

    // ordered CCW
    var floorplan = floorplan;
    this.corners = corners;

    this.interiorCorners = [];
    this.edgePointer = null;

    // floor plane for intersection testing
    this.floorPlane = null;
    this.roomName = "";

    var floorChangeCallbacks = $.Callbacks();

    if (!this.corners) return this; //just return an empty instance

    updateWalls();

    this.getFloorplan = function() {
        return floorplan;
    };

    this.getUuid = function() {
        var cornerUuids = $.map(this.corners, function(c) {
            return c.id;
        });
        cornerUuids.sort();
        return cornerUuids.join();
    };

    this.fireOnFloorChange = function(callback) {
        floorChangeCallbacks.add(callback);
    };

    this.generatePlane = function() {
        var points = [];
        if ("interiorCorners" in scope) {
            scope.interiorCorners.forEach( function(corner) {
                points.push(new THREE.Vector2(
                    corner.x,
                    corner.y));
            });
        }
        return points;
    };

    this.updateInteriorCorners = function() {
        scope.interiorCorners = [];
        var edge = scope.edgePointer;
        while (true) {
            scope.interiorCorners.push(edge.getInteriorStart());
            if (edge.next === scope.edgePointer) {
                break;
            } else {
                edge = edge.next;
            }
        }
    };
    this.updateInteriorCorners();

    // set wall's half edges relating to this room
    function updateWalls() {

        var prevEdge = null;
        var firstEdge = null;

        for (var i = 0; i < scope.corners.length; i++) {

            var firstCorner = scope.corners[i];
            var secondCorner = scope.corners[(i + 1) % scope.corners.length];

            // find if wall is heading in that direction
            var wallTo = firstCorner.wallTo(secondCorner);
            var wallFrom = firstCorner.wallFrom(secondCorner);

            if (wallTo) {
                var edge = new HalfEdge(scope, wallTo, true);
            } else if (wallFrom) {
                var edge = new HalfEdge(scope, wallFrom, false);
            } else {
                // something horrible has happened
                console.log("corners arent connected by a wall, uh oh");
            }

            if (i == 0) {
                firstEdge = edge;
            }  else {
                edge.prev = prevEdge;
                prevEdge.next = edge;
                if (i + 1 == scope.corners.length) {
                    firstEdge.prev = edge;
                    edge.next = firstEdge;
                }
            }
            prevEdge = edge;
        }

        // hold on to an edge reference
        scope.edgePointer = firstEdge;
    }

    this.clearDimensionsCache = function() {
        this.getPlacement().dimensionsCache = [];
    };

    this.bindUpdatingDimensions = function() {
        scope.corners.forEach(function(corner) {
            corner.fireOnMove($.proxy(scope.clearDimensionsCache, scope));
            corner.fireOnMove($.proxy(scope.updateInteriorCorners, scope));
        });
    };
    this.bindUpdatingDimensions();
};

Room.prototype.containsCorner = function(corner) { //indexOf
    for (var i=0; i<this.corners.length; i++) {
        if (corner.id == this.corners[i].id) return true;
    }
    return false;
};

Room.prototype.containsInteriorCorner = function(corner) { //indexOf
    for (var i=0; i<this.corners.length; i++) {
        if (corner.id == this.interiorCorners[i].id) return true;
    }
    return false;
};

Room.prototype.getWalls = function() {
    var arWalls = [], edge = this.edgePointer;
    while (true) {
        arWalls.push(edge.wall);
        if (edge.next === this.edgePointer) {
            break;
        } else {
            edge = edge.next;
        }
    }
    return arWalls;
};

Room.prototype.getCenter = function () {
    var x = 0, y = 0, i, j, f, point1, point2;

    for (i = 0, j = this.interiorCorners.length - 1; i < this.interiorCorners.length; j=i,i++) {
        point1 = this.interiorCorners[i];
        point2 = this.interiorCorners[j];
        f = point1.x * point2.y - point2.x * point1.y;
        x += (point1.x + point2.x) * f;
        y += (point1.y + point2.y) * f;
    }

    f = this.getSquare() * 6;

    return new Corner(false, x / f, y / f);
};

/**
 * get a visual center of polygon. Center of polygon sometimes is not inside polygon itself, eg when its a U-shape poly
 * https://github.com/mapbox/polylabel/
 * @return {Corner}
 */
Room.prototype.getVisualCenter = function () {

    function polylabel(polygon, precision, debug) {
        precision = precision || 1.0;

        // find the bounding box of the outer ring
        var minX, minY, maxX, maxY;
        for (var i = 0; i < polygon[0].length; i++) {
            var p = polygon[0][i];
            if (!i || p[0] < minX) minX = p[0];
            if (!i || p[1] < minY) minY = p[1];
            if (!i || p[0] > maxX) maxX = p[0];
            if (!i || p[1] > maxY) maxY = p[1];
        }

        var width = maxX - minX;
        var height = maxY - minY;
        var cellSize = Math.min(width, height);
        var h = cellSize / 2;

        // a priority queue of cells in order of their "potential" (max distance to polygon)
        var cellQueue = new Queue(null, compareMax);

        if ((Math.round(cellSize * 100000) / 100000) === 0) return [minX, minY];

        // cover polygon with initial cells
        for (var x = minX; x < maxX; x += cellSize) {
            for (var y = minY; y < maxY; y += cellSize) {
                cellQueue.push(new Cell(x + h, y + h, h, polygon));
            }
        }

        // take centroid as the first best guess
        var bestCell = getCentroidCell(polygon);

        // special case for rectangular polygons
        var bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
        if (bboxCell.d > bestCell.d) bestCell = bboxCell;

        var numProbes = cellQueue.length;

        while (cellQueue.length) {
            // pick the most promising cell from the queue
            var cell = cellQueue.pop();

            // update the best cell if we found a better one
            if (cell.d > bestCell.d) {
                bestCell = cell;
                if (debug) console.log('found best %d after %d probes', Math.round(1e4 * cell.d) / 1e4, numProbes);
            }

            // do not drill down further if there's no chance of a better solution
            if (cell.max - bestCell.d <= precision) continue;

            // split the cell into four cells
            h = cell.h / 2;
            cellQueue.push(new Cell(cell.x - h, cell.y - h, h, polygon));
            cellQueue.push(new Cell(cell.x + h, cell.y - h, h, polygon));
            cellQueue.push(new Cell(cell.x - h, cell.y + h, h, polygon));
            cellQueue.push(new Cell(cell.x + h, cell.y + h, h, polygon));
            numProbes += 4;
        }

        if (debug) {
            console.log('num probes: ' + numProbes);
            console.log('best distance: ' + bestCell.d);
        }

        return [bestCell.x, bestCell.y];
    }

    const Queue = function(data, compare) {
        function defaultCompare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

        this.data = data || [];
        this.length = this.data.length;
        this.compare = compare || defaultCompare;

        if (this.length > 0) {
            for (var i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
        }

        this.push = function(item) {
            this.data.push(item);
            this.length++;
            this._up(this.length - 1);
        };

        this.pop = function() {
            if (this.length === 0) return undefined;

            const top = this.data[0];
            const bottom = this.data.pop();
            this.length--;

            if (this.length > 0) {
                this.data[0] = bottom;
                this._down(0);
            }

            return top;
        };

        this.peek = function() {
            return this.data[0];
        };

        this._up = function(pos) {
            const data = this.data;
            const compare = this.compare;
            const item = data[pos];

            while (pos > 0) {
                const parent = (pos - 1) >> 1;
                const current = data[parent];
                if (compare(item, current) >= 0) break;
                data[pos] = current;
                pos = parent;
            }

            data[pos] = item;
        };

        this._down = function(pos) {
            const data = this.data;
            const compare = this.compare;
            const halfLength = this.length >> 1;
            const item = data[pos];

            while (pos < halfLength) {
                var left = (pos << 1) + 1;
                var best = data[left];
                const right = left + 1;

                if (right < this.length && compare(data[right], best) < 0) {
                    left = right;
                    best = data[right];
                }
                if (compare(best, item) >= 0) break;

                data[pos] = best;
                pos = left;
            }

            data[pos] = item;
        };
    };

    function compareMax(a, b) {
        return b.max - a.max;
    }

    function Cell(x, y, h, polygon) {
        this.x = x; // cell center x
        this.y = y; // cell center y
        this.h = h; // half the cell size
        this.d = pointToPolygonDist(x, y, polygon); // distance from cell center to polygon
        this.max = this.d + this.h * Math.SQRT2; // max distance to polygon within a cell
    }

    // signed distance from point to polygon outline (negative if point is outside)
    function pointToPolygonDist(x, y, polygon) {
        var inside = false;
        var minDistSq = Infinity;

        for (var k = 0; k < polygon.length; k++) {
            var ring = polygon[k];

            for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
                var a = ring[i];
                var b = ring[j];

                if ((a[1] > y !== b[1] > y) &&
                    (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) inside = !inside;

                minDistSq = Math.min(minDistSq, getSegDistSq(x, y, a, b));
            }
        }

        return (inside ? 1 : -1) * Math.sqrt(minDistSq);
    }

    // get polygon centroid
    function getCentroidCell(polygon) {
        var area = 0;
        var x = 0;
        var y = 0;
        var points = polygon[0];

        for (var i = 0, len = points.length, j = len - 1; i < len; j = i++) {
            var a = points[i];
            var b = points[j];
            var f = a[0] * b[1] - b[0] * a[1];
            x += (a[0] + b[0]) * f;
            y += (a[1] + b[1]) * f;
            area += f * 3;
        }
        if (area === 0) return new Cell(points[0][0], points[0][1], 0, polygon);
        return new Cell(x / area, y / area, 0, polygon);
    }

    // get squared distance from a point to a segment
    function getSegDistSq(px, py, a, b) {

        var x = a[0];
        var y = a[1];
        var dx = b[0] - x;
        var dy = b[1] - y;

        if (dx !== 0 || dy !== 0) {

            var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);

            if (t > 1) {
                x = b[0];
                y = b[1];

            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = px - x;
        dy = py - y;

        return dx * dx + dy * dy;
    }

    //convert from [{x:1, y:2}, {x:3, y:4}] to [[1, 2], [3, 4]]
    function toMultiArray(array) {
        return array.map(function (value) {
            return [value.x, value.y];
        });
    }

    var point = polylabel([toMultiArray(this.interiorCorners)]);

    return new Corner(false, point[0], point[1]);
};

/* Get room's square number with with pozitive or negative sign depending on points position.
 * For real square in meters use this.getSquareFormatted();
 * @return {number} square in cm2
 */
Room.prototype.getSquare = function () {
    var area = 0, i, j, point1, point2;

    for (i = 0, j = this.interiorCorners.length - 1; i < this.interiorCorners.length; j = i, i += 1) {
        point1 = this.interiorCorners[i];
        point2 = this.interiorCorners[j];
        area += point1.x * point2.y;
        area -= point1.y * point2.x;
    }
    area /= 2;

    return area;
};

/* Get room's precise square
 * @return {number} square in m2
 */
Room.prototype.getSquareReal = function() {
    return Math.abs(this.getSquare() / 10000);
};

/* Get room's approximate square in m2 rounded to 1cm
 * @return {number} square in m2
 */
Room.prototype.getSquareFormatted = function() {
    return Math.abs(this.getSquare() / 10000).toFixed(2);
};

/* Get perimetr of room
 * @return {number} perimetr in centimeters
 */
Room.prototype.getPerimetr = function() {
    var j, dx, dy, distance = 0;
    for (var i = 0; i < this.corners.length; i++) {
        j = i+1;
        if (j === this.corners.length) j = 0;
        dx = this.corners[i].x - this.corners[j].x;
        dy = this.corners[i].y - this.corners[j].y;
        distance += Math.sqrt( dx*dx + dy*dy );
    }
    return distance;
};

Room.prototype.getName = function() {
    return this.roomName;
};

Room.prototype.getPlacement = function() {
    var floorplan = this.getFloorplan();
    if (!floorplan.placements[this.roomName]) {
        floorplan.placements[this.roomName] = new Placement(this.roomName);
    }
    return floorplan.placements[this.roomName];
};

//visible room name, not that coming from 3d
Room.prototype.getVisibleName = function() {
    var p = this.getPlacement(), sName = "";
    if (p) sName = p.isRoomNameShown ? p.visibleName : "";
    return sName;
};

Room.prototype.setVisibleName = function(roomName) {
    var ret = false;
    var p = this.getPlacement();
    if (!!p) {
        p.setName(roomName);
        ret = true;
    }
    return ret;
};

/**
 * Define a room name position. By its in center, if center point is outside room (eg. U-shape rooms) - we get visual center point, Or it is defined by user - take those coordinates.
 * @return {object} {x:1, y:1} object with x-y fields
 */
Room.prototype.getRoomNamePosition = function() {
    var p = this.getPlacement();
    var c = this.getCenter();
    var point;
    if (p.visibleNamePosition !== null) point = p.visibleNamePosition;
    else if (Utils.isPointInsidePolygon(c.x, c.y, this.interiorCorners)) point = c;
    else point = this.getVisualCenter();

    return point;
};

/* Calculate room's central measurements
 * @return {array}
 */
Room.prototype.getDimensions = function() {
    //if dimensionIndex != 0, method will return not the longest width and height, but at this index. Default is 0 (the longest)
    var index = this.getPlacement().dimensionIndex || 0;

    var scope = this, i, j, k, point1, point2, arLengths = [], v = new THREE.Vector3(), intersections, dist,
        maxLength = 0, maxWidth = 0, maxDirection, perimetr = this.getPerimetr(),
        raycast = new THREE.Raycaster(),
        line1Start, line1End, line2Start, line2End;

    var object3d = this.getObject3D();

    if (!this.getPlacement().dimensionsCache || this.getPlacement().dimensionsCache.length === 0) {

        //1.iterate all nodes and
        for (i = 0, j = this.interiorCorners.length - 1; i < this.interiorCorners.length; j = i, i++) {
            point1 = this.interiorCorners[i];
            point2 = this.interiorCorners[j];

            //2. find the longest parallel to each node inside polygon
            var direction = v.clone().subVectors(new THREE.Vector3(point2.x, 0, point2.y), new THREE.Vector3(point1.x, 0, point1.y)).normalize();

            //2.1 iterate other points
            for (k = 0; k < this.interiorCorners.length; k++) {
                if (k === i || k === j) continue;

                //2.2 check parallel lines and find intersections
                raycast.set(
                    new THREE.Vector3(this.interiorCorners[k].x, 0, this.interiorCorners[k].y),
                    direction.clone()
                );
                //ray has one direction, so move origin back
                raycast.ray.recast(-perimetr);

                intersections = raycast.intersectObjects(object3d.children);
                //2.3 find length of intersections and append them to stack
                if (intersections.length) {
                    dist = intersections[0].point.distanceTo(intersections[intersections.length - 1].point);
                    if (dist > 1) // >1cm to take tolerance into account
                        arLengths.push({
                            "len": dist,
                            "direction": direction,
                            "line": [intersections[0].point, intersections[intersections.length - 1].point]
                        });
                }
            }
        }

        //2.4 choose the longest segment
        arLengths.sort(function (a, b) {
            return a.len - b.len;
        });
        if (arLengths) {
            index = index % arLengths.length;
            maxLength = arLengths[arLengths.length - 1 - index].len;
            maxDirection = arLengths[arLengths.length - 1 - index].direction;
            line1Start = arLengths[arLengths.length - 1 - index].line[0];
            line1End = arLengths[arLengths.length - 1 - index].line[1];

            this.getPlacement().dimensionsCache[0] = new Dimension(
                {x: line1Start.x, y: line1Start.z},
                {x: line1End.x, y: line1End.z},
                this
            );
        }

        //3. get perpendiculars, try to find out maxWidth
        if (maxLength && maxDirection) {
            //3.1 rotate direction
            var perpendicular = maxDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            perpendicular.normalize();

            for (k = 0; k < this.interiorCorners.length; k++) {
                raycast.set(
                    new THREE.Vector3(this.interiorCorners[k].x, 0, this.interiorCorners[k].y),
                    perpendicular
                );
                raycast.ray.recast(-perimetr);

                intersections = raycast.intersectObjects(object3d.children);
                //3.2 consider first and last points of intersections array to be a maxWidth segment
                if (intersections !== undefined && intersections.length > 1) {
                    dist = intersections[0].point.distanceTo(intersections[intersections.length - 1].point);
                    if (dist > maxWidth) {
                        maxWidth = dist;
                        line2Start = intersections[0].point;
                        line2End = intersections[intersections.length - 1].point;
                    }
                }
            }
            this.getPlacement().dimensionsCache[1] = new Dimension(
                {x: line2Start.x, y: line2Start.z},
                {x: line2End.x, y: line2End.z},
                this
            );
            setTimeout(function() { scope.getFloorplan().updated_rooms.fire() }, 10); //redraw
        }
    } else { //return from cache
        var start1 = this.getPlacement().dimensionsCache[0].start;
        var end1 = this.getPlacement().dimensionsCache[0].end;
        var start2 = this.getPlacement().dimensionsCache[1].start;
        var end2 = this.getPlacement().dimensionsCache[1].end;

        maxLength = this.getPlacement().dimensionsCache[0].getInitialLength();
        maxWidth = this.getPlacement().dimensionsCache[1].getInitialLength();
        line1Start = {x: start1.x, y: 0, z: start1.y};
        line1End = {x: end1.x, y: 0, z: end1.y};
        line2Start = {x: start2.x, y: 0, z: start2.y};
        line2End = {x: end2.x, y: 0, z: end2.y};
    }
    return [Utils.metersToFeet(maxLength), Utils.metersToFeet(maxWidth), Utils.cmToMeters(maxLength), Utils.cmToMeters(maxWidth),
        line1Start, line1End, line2Start, line2End];
};

/**
 * Get a 3d representation of room with THREE.Lines in THREE.Object3D
 * @return {THREE.Object3D}
 */
Room.prototype.getObject3D = function() {
    var line, object3d = new THREE.Object3D();
    for (var l = 0; l < this.interiorCorners.length; l++) {
        var next = l+1;
        if (!this.interiorCorners[next]) next = 0;

        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(this.interiorCorners[l].x, 0, this.interiorCorners[l].y));
        geometry.vertices.push(new THREE.Vector3(this.interiorCorners[next].x, 0, this.interiorCorners[next].y));
        line = new THREE.Line( geometry );
        object3d.add(line);
    }
    return object3d;
};
if ( typeof exports !== 'undefined' ) module.exports = Room;
