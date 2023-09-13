// https://en.wikipedia.org/wiki/Doubly_connected_edge_list
// HalfEdge's are created by Room
var HalfEdge = function(room, wall, front) {

    var scope = this;

    this.room = room; // the room this fall faces
    this.next;
    this.prev;
    this.front = front || false;
    this.wall = wall;
    //this.id = md5(room?room.roomName:"" + "_" + wall.id + "_" + front);

    // used for intersection testing... not convinced this belongs here
    this.plane = null;

    this.doubleOffset = wall.getThickness();
    this.offset = this.doubleOffset / 2.0; //we will use middle of offset
    this.height = wall.height;

    this.redrawCallbacks = $.Callbacks();

    if (front) {
        wall.frontEdge = this;
    } else {
        wall.backEdge = this;
    }

    this.interiorDistance = function() {
        var start = this.getInteriorStart();
        var end = this.getInteriorEnd();
        var startPoint = new THREE.Vector2(start.x, start.y);
        return startPoint.distanceTo(new THREE.Vector2(end.x, end.y));
    };

    this.distanceTo = function(x, y) {
        // x, y, x1, y1, x2, y2
        return Utils.pointDistanceFromLine(x, y,
            this.interiorStart().x,
            this.interiorStart().y,
            this.interiorEnd().x,
            this.interiorEnd().y);
    };

    this.getStart = function() {
        if (this.front) {
            return this.wall.getStart();
        } else {
            return this.wall.getEnd();
        }
    };

    this.getEnd = function() {
        if (this.front) {
            return this.wall.getEnd();
        } else {
            return this.wall.getStart();
        }
    };

    this.getOppositeEdge = function() {
        if (this.front) {
            return this.wall.backEdge;
        } else {
            return this.wall.frontEdge;
        }
    };

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

    function hasEqualEndings(edge1, edge2) {
        return (edge1.getStart() === edge2.getStart() && edge1.getEnd() === edge2.getEnd()) ||
            (edge1.getStart() === edge2.getEnd() && edge1.getEnd() === edge2.getStart());
    }

    function doesOneEdgeContinuesAnother(edge1, edge2) {
        return edge1.getEnd() === edge2.getStart() || edge2.getEnd() === edge1.getStart();
    }


    // simple halfangle division
    this.interiorStart = function() {
        var vec = this.halfAngleVector(this.prev, this);
        return {
            x: this.getStart().x + vec.x,
            y: this.getStart().y + vec.y
        }
    };
    this.interiorEnd = function() {
        var vec = this.halfAngleVector(this, this.next);
        return {
            x: this.getEnd().x + vec.x,
            y: this.getEnd().y + vec.y
        }
    };
    this.exteriorEnd = function() {
        var vec = this.halfAngleVector(this, this.next);
        return {
            x: this.getEnd().x - vec.x,
            y: this.getEnd().y - vec.y
        }
    };
    this.exteriorStart = function() {
        var vec = this.halfAngleVector(this.prev, this);
        return {
            x: this.getStart().x - vec.x,
            y: this.getStart().y - vec.y
        };
    };
    this.interiorCenter = function() {
        return {
            x: (this.interiorStart().x + this.interiorEnd().x) / 2.0,
            y: (this.interiorStart().y + this.interiorEnd().y) / 2.0
        }
    };

    /**
     * get interior bound coordinates
     * @return {{x, y}}
     */
    this.getInteriorStart = function() {
        if (!("prev" in this) || this.wall.orphan) { //orphan wall
            //interior is always a left-hand edge (keep in mind start and end of the wall)
            var adjs = this.getStart().adjacentCorners();
            if (adjs.length > 1) {
                var chosenEdge, interiorEdge, isFake = false;
                var wall = this.orphanChooseNearestWall(true, true);
                if (!wall) return this.interiorStart();

                //choose a correct edge of an adjacent wall
                if (wall.isBetweenTwoRooms()) { // 2 edges
                    if (this.wall.orphanBelongsTo === wall.frontEdge.room) {
                        chosenEdge = wall.frontEdge;
                    } else if (this.wall.orphanBelongsTo === wall.backEdge.room) {
                        chosenEdge = wall.backEdge;
                    } else {
                        console.error("error with orphan, it should belong to room");
                    }
                } else { // 1 edge
                    interiorEdge = (wall.frontEdge || wall.backEdge);
                    if (interiorEdge.room && this.wall.orphanBelongsTo === interiorEdge.room) {
                        chosenEdge = interiorEdge;
                    } else if (interiorEdge.wall.orphan) {
                        if (doesOneEdgeContinuesAnother(this, interiorEdge)) chosenEdge = interiorEdge;
                        else chosenEdge = interiorEdge.getOppositeEdge();
                    } else { //create a temporary fake edge
                        chosenEdge = new HalfEdge(null, wall, !interiorEdge.front); //fake edge
                        isFake = true;
                    }
                }

                j = new Joint(chosenEdge, this);
                var c = j.getBoundCenter(true, true);

                if (isFake) { //remove fake edge
                    if (chosenEdge === wall.frontEdge) wall.frontEdge = null;
                    else wall.backEdge = null;
                }

                return c;
            }

            return this.interiorStart();
        } else { //wall inside room
            var j = new Joint(this.prev, this);
            return j.getBoundCenter(true, true);
        }
    };

    this.getInteriorEnd = function() {
        if (this.wall.orphan || !("next" in this)) { //orphan wall
            var adjs = this.getEnd().adjacentCorners();
            if (adjs.length > 1) {
                var chosenEdge, interiorEdge, isFake = false;
                var wall = this.orphanChooseNearestWall(true, false);
                if (!wall) return this.interiorEnd();

                //choose a correct edge of an adjacent wall
                if (wall.isBetweenTwoRooms()) { // 2 edges
                    if (this.wall.orphanBelongsTo === wall.frontEdge.room) {
                        chosenEdge = wall.frontEdge;
                    } else if (this.wall.orphanBelongsTo === wall.backEdge.room) {
                        chosenEdge = wall.backEdge;
                    } else {
                        console.error("error with orphan, it should belong to room");
                    }
                } else { // 1 edge
                    interiorEdge = (wall.frontEdge || wall.backEdge);
                    if (interiorEdge.room && this.wall.orphanBelongsTo === interiorEdge.room) {
                        chosenEdge = interiorEdge;
                    } else if (interiorEdge.wall.orphan) {
                        if (doesOneEdgeContinuesAnother(this, interiorEdge)) chosenEdge = interiorEdge;
                        else chosenEdge = interiorEdge.getOppositeEdge();
                    } else {
                        chosenEdge = new HalfEdge(null, wall, !interiorEdge.front); //fake edge
                        isFake = true;
                    }
                }

                j = new Joint(this, chosenEdge);
                var c = j.getBoundCenter(true, false);

                if (isFake) {
                    if (chosenEdge === wall.frontEdge) wall.frontEdge = null;
                    else wall.backEdge = null;
                }

                return c;
            }
            return this.interiorEnd();
        } else { //wall inside room
            var j = new Joint(this, this.next);
            return j.getBoundCenter(true, false);
        }
    };

    this.getExteriorStart = function() {
        var adjCorners = this.getStart().adjacentCornersWithoutOrphan(), j, chosenEdge, isFake, wall, adjs, interiorEdge;

        if (!("prev" in this) || this.wall.orphan || adjCorners.length === 1) { //orphan wall

            adjs = this.getStart().adjacentCorners();
            if (adjs.length > 1) {
                wall = this.orphanChooseNearestWall(false, true);
                if (!wall) return this.exteriorStart();

                interiorEdge = (wall.frontEdge || wall.backEdge);
                if (interiorEdge.room && this.wall.orphanBelongsTo === interiorEdge.room) {
                    chosenEdge = new HalfEdge(null, wall, !interiorEdge.front); //fake edge
                    isFake = true;
                } else if (interiorEdge.wall.orphan) {
                    if (doesOneEdgeContinuesAnother(this, interiorEdge)) chosenEdge = interiorEdge;
                    else chosenEdge = interiorEdge.getOppositeEdge();
                } else {
                    chosenEdge = interiorEdge;
                }

                j = new Joint(chosenEdge, this);
                var c = j.getBoundCenter(false, true);

                if (isFake) {
                    if (chosenEdge === wall.frontEdge) wall.frontEdge = null;
                    else wall.backEdge = null;
                }

                return c;
            }

            return this.exteriorStart();
        } else if (adjCorners.length === 2) { //just intersection of start of wall inside room and mutual wall
            var line1 = this.prev.getWallBound(false);
            var line2 = this.getWallBound(false);
            var inter = Utils.linesIntersect(line1.x1, line1.y1, line1.x2, line1.y2, line2.x1, line2.y1, line2.x2, line2.y2);
            if (!inter) {
                inter = checkEndPoints(line1.x1, line1.y1, line1.x2, line1.y2, line2.x1, line2.y1, line2.x2, line2.y2);
                if (!inter) {
                    inter = {x: line2.x1, y: line2.y1, add_x: line1.x2, add_y: line1.y2};
                }
            }
            return inter;
        } else if (adjCorners.length === 3) {
            var tempWall, tempEdge;
            for (var index in adjCorners) {
                var cache = this.getStart().wallToOrFrom(adjCorners[index]);
                if (cache !== this.wall && cache !== this.prev.wall) { //todo choose correct exterior wall
                    tempWall = cache;
                    if (cache.orphan) {
                        //choose side of orphan
                        var wallTo = this.getStart().wallTo(adjCorners[index]);
                        var wallFrom = this.getStart().wallFrom(adjCorners[index]);
                        if (wallTo) {
                            tempEdge = tempWall.backEdge;
                        } else if (wallFrom) {
                            tempEdge = tempWall.frontEdge;
                        }
                    } else {
                        tempEdge = tempWall.frontEdge || tempWall.backEdge;
                    }
                }
            }
            //UPDATE: problem is in old walls structure, usually it can be fixed with removing/adding buggy walls
            //PROBLEM: sometimes in old tours it doesn't choose a correct adjacent corner and tempEdge turns out to be not chosen.
            //tempEdge need to be chosen in 100% situations
            //this is a very dirty workaround
            //watch 1133160 tour as an example
            if (!tempEdge) tempEdge = this.prev;

            j = new Joint(tempEdge, this);
            return j.getBoundCenter(false, true);
        } else if (adjCorners.length > 3) {
            var walls = this.chooseJointWallsInCrossing(adjCorners, true);
            var edges = walls.map(function(w) { return w.frontEdge || w.backEdge });
            if (hasEqualEndings(edges[0], this.prev)) j = new Joint(edges[1], this);
            else j = new Joint(edges[0], this);

            return j.getBoundCenter(false, true);
        }
    };

    this.getExteriorEnd = function() {
        var adjCorners = this.getEnd().adjacentCornersWithoutOrphan(), j, chosenEdge, isFake, adjs, interiorEdge;

        if (this.wall.orphan || !("next" in this) || adjCorners.length === 1) { //orphan wall
            adjs = this.getEnd().adjacentCorners();
            if (adjs.length > 1) {
                var wall = this.orphanChooseNearestWall(false, false);
                if (!wall) return this.exteriorEnd();

                interiorEdge = (wall.frontEdge || wall.backEdge);
                if (interiorEdge.room && this.wall.orphanBelongsTo === interiorEdge.room) {
                    chosenEdge = new HalfEdge(null, wall, !interiorEdge.front); //fake edge
                    isFake = true;
                } else if (interiorEdge.wall.orphan) {
                    if (doesOneEdgeContinuesAnother(this, interiorEdge)) chosenEdge = interiorEdge;
                    else chosenEdge = interiorEdge.getOppositeEdge();
                } else {
                    chosenEdge = interiorEdge;
                }
                j = new Joint(this, chosenEdge);
                var c = j.getBoundCenter(false, false);

                if (isFake) {
                    if (chosenEdge === wall.frontEdge) wall.frontEdge = null;
                    else wall.backEdge = null;
                }

                return c;
            }

            return this.exteriorEnd();
        } else if (adjCorners.length === 2) {
            var line1 = this.getWallBound(false);
            var line2 = this.next.getWallBound(false);
            var inter = Utils.linesIntersect(line1.x1, line1.y1, line1.x2, line1.y2, line2.x1, line2.y1, line2.x2, line2.y2);
            if (!inter) {
                inter = checkEndPoints(line1.x1, line1.y1, line1.x2, line1.y2, line2.x1, line2.y1, line2.x2, line2.y2);
                if (!inter) {
                    inter = {x: line1.x2, y: line1.y2, add_x: line2.x1, add_y: line2.y1};
                }
            }
            return inter;
        } else if (adjCorners.length === 3) {
            var tempWall, tempEdge;
            for (var index in adjCorners) {
                var cache = this.getEnd().wallToOrFrom(adjCorners[index]);
                if (cache !== this.wall && cache !== this.next.wall) {
                    tempWall = cache;
                    if (cache.orphan) {
                        //choose side of orphan
                        var wallTo = this.getEnd().wallTo(adjCorners[index]);
                        var wallFrom = this.getEnd().wallFrom(adjCorners[index]);
                        if (wallTo) {
                            tempEdge = tempWall.frontEdge;
                        } else if (wallFrom) {
                            tempEdge = tempWall.backEdge;
                        }
                    } else {
                        tempEdge = tempWall.frontEdge || tempWall.backEdge;
                    }
                }
            }

            //UPDATE: problem is in old walls structure, usually it can be fixed with removing/adding buggy walls
            //PROBLEM: sometimes in old tours it doesn't choose a correct adjacent corner and tempEdge tempEdge turns out to be not chosen.
            //tempEdge need to be chosen in 100% situations
            //this is a very dirty workaround
            //watch 1133160 tour as an example
            if (!tempEdge) tempEdge = this.next;

            j = new Joint(this, tempEdge);
            return j.getBoundCenter(false, false);
        } else if (adjCorners.length > 3) {
            var walls = this.chooseJointWallsInCrossing(adjCorners, false);
            var edges = walls.map(function(w) { return w.frontEdge || w.backEdge });

            if (hasEqualEndings(edges[0], this.next)) j = new Joint(edges[1], this);
            else j = new Joint(edges[0], this);

            return j.getBoundCenter(false, false);
        }
    };

    this.corners = function() {
        var stack = [this.getStart()].concat(this.getInteriorCorners()).concat([this.getEnd()]);
        if (this.wall.orphan) {
            stack = stack.concat(this.getExteriorCorners());
        } else if (this.wall.frontEdge && this.wall.backEdge) { //when both halfedges are present use only interiors
            stack = stack.concat(this.getOppositeEdge().getInteriorCorners());
        } else {
            stack = stack.concat(this.getExteriorCorners());
        }

        return stack;
    };

    /**
     * Get the same corners() excluding start and end line centers.
     * @return {*[]}
     */
    this.cornersWithoutCenters = function() {
        var stack = this.getInteriorCorners();
        if (this.wall.orphan) {
            stack = stack.concat(this.getExteriorCorners());
        } else if (this.wall.frontEdge && this.wall.backEdge) { //when both halfedges are present use only interiors
            stack = stack.concat(this.getOppositeEdge().getInteriorCorners());
        } else {
            stack = stack.concat(this.getExteriorCorners());
        }

        return stack;
    };

    this.getInteriorCorners = function() {
        var stack = [], start = this.getInteriorStart(), end = this.getInteriorEnd();
        if ("add_x" in start) stack.push({x: start.add_x, y: start.add_y});
        stack.push(start);
        stack.push(end);
        if ("add_x" in end) stack.push({x: end.add_x, y: end.add_y});

        return stack;
    };

    this.getExteriorCorners = function() {
        var stack = [], start = this.getExteriorStart(), end = this.getExteriorEnd();
        if ("add_x" in end) stack.push({x: end.add_x, y: end.add_y});
        stack.push(end);
        stack.push(start);
        if ("add_x" in start) stack.push({x: start.add_x, y: start.add_y});

        return stack;
    };

    /* Get coordinates of interior or exterior wall bound
     * Its a parallel line to the wall but moved out to distance of half-width of wall.
     * @param {boolean} do we need an interior or exterior wall bound
     */
    this.getWallBound = function(interior) {
        var s, e, sub, v, coef;
        coef = interior ? -1 : 1;
        v = new THREE.Vector3();
        s = v.clone().set(this.getStart().x, 0, this.getStart().y);
        e = v.clone().set(this.getEnd().x, 0, this.getEnd().y);
        sub = v.clone().subVectors(e, s);

        var perpendicular = sub.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), coef * Math.PI / 2);
        perpendicular.normalize();
        perpendicular.multiplyScalar(this.wall.getThickness() / 2);
        perpendicular.add(s);

        var endPerpendicular = v.clone().addVectors(perpendicular, sub);

        return {
            x1: perpendicular.x,
            y1: perpendicular.z,
            x2: endPerpendicular.x,
            y2: endPerpendicular.z
        };
    };

    this.chooseJointWallsInCrossing = function(adjCorners, isCenterInStart) { //todo adjCorners param -> this.getStart().adjCorners()
        var jointWall1, jointWall2, thisAngle, center = isCenterInStart ? this.getStart() : this.getEnd(),
            stackAngles = [], counter = 0, wallObj, wallIndex, w1index, w2index, foundIndex;

        for (var index in adjCorners) {
            var a = new THREE.Vector2().subVectors(
                new THREE.Vector2(adjCorners[index].x, adjCorners[index].y),
                new THREE.Vector2(center.x, center.y)
            ).angle();

            wallObj = {index: index, value: a, id: adjCorners[index].x+"_"+adjCorners[index].y};
            if (center.wallToOrFrom(adjCorners[index]) === this.wall) wallIndex = index;
            stackAngles.push(wallObj);

            counter++;
        }

        var stackAnglesCopy = [].concat(stackAngles); // clone
        stackAnglesCopy.sort(function (a, b) { return a.value - b.value; });

        for (var k in stackAnglesCopy) if (stackAnglesCopy[k].index === wallIndex) foundIndex = +k;

        w1index = foundIndex-1 >= 0 ? foundIndex-1 : stackAnglesCopy.length - 1;
        w2index = foundIndex+1 < stackAnglesCopy.length ? foundIndex+1 : 0;
        jointWall1 = center.wallToOrFrom(adjCorners[stackAnglesCopy[w1index].index]);
        jointWall2 = center.wallToOrFrom(adjCorners[stackAnglesCopy[w2index].index]);

        return [jointWall1, jointWall2];
    };

    /**
     * Choose nearest wall in joint among adjacent walls. It calculates angles between adj wall and takes a minimal angle
     * @param isInterior {boolean} interior or exterior edge
     * @param isStart {boolean} start or end
     * @return {Wall}
     */
    this.orphanChooseNearestWall = function (isInterior, isStart) {
        var wall = null, end, start, startVector, endVector, adj, angleRadians, minAngle = Infinity, adjWithMinAngle = null;
        var adjs = (isStart ? this.getStart() : this.getEnd()).adjacentCorners();
        end = new THREE.Vector2(this.getEnd().x, this.getEnd().y);
        start = new THREE.Vector2(this.getStart().x, this.getStart().y);
        startVector = new THREE.Vector2();
        if (isStart) startVector = startVector.subVectors(end, start);
        else startVector = startVector.subVectors(start, end);
        for (var i in adjs) {
            if (adjs[i] !== (isStart ? this.getEnd() : this.getStart())) {
                adj = new THREE.Vector2(adjs[i].x, adjs[i].y);
                endVector = new THREE.Vector2().subVectors(adj, end);
                angleRadians = (isInterior ^ isStart ? startVector.angle() - endVector.angle() : endVector.angle() - startVector.angle());
                if (angleRadians < 0) angleRadians += 2 * Math.PI;
                //console.log(angleRadians * 180 / Math.PI)
                if (angleRadians < minAngle) {
                    minAngle = angleRadians;
                    adjWithMinAngle = adjs[i];
                }
            }
        }
        if (adjWithMinAngle) {
            wall = (isStart ? this.getStart() : this.getEnd()).wallToOrFrom(adjWithMinAngle);
        }
        return wall;
    };

    // CCW angle from v1 to v2
    // v1 and v2 are HalfEdges
    this.halfAngleVector = function(v1, v2) {
        // make the best of things if we dont have prev or next
        if (!v1) {
            var v1startX = v2.getStart().x - (v2.getEnd().x - v2.getStart().x);
            var v1startY = v2.getStart().y - (v2.getEnd().y - v2.getStart().y);
            var v1endX = v2.getStart().x;
            var v1endY = v2.getStart().y;
        } else {
            var v1startX = v1.getStart().x;
            var v1startY = v1.getStart().y;
            var v1endX = v1.getEnd().x;
            var v1endY = v1.getEnd().y;
        }

        if (!v2) {
            var v2startX = v1.getEnd().x;
            var v2startY = v1.getEnd().y;
            var v2endX = v1.getEnd().x + (v1.getEnd().x - v1.getStart().x);
            var v2endY = v1.getEnd().y + (v1.getEnd().y - v1.getStart().y);
        } else {
            var v2startX = v2.getStart().x;
            var v2startY = v2.getStart().y;
            var v2endX = v2.getEnd().x;
            var v2endY = v2.getEnd().y;
        }

        var theta = Utils.angle2pi(
            v1startX- v1endX,
            v1startY - v1endY,
            v2endX - v1endX,
            v2endY - v1endY);
        var angle = theta / 2.0;
        // cosine and sine of half angle
        var cs = Math.cos(angle);
        var sn = Math.sin(angle);

        // rotate v2
        var v2dx = v2endX - v2startX;
        var v2dy = v2endY - v2startY;

        var vx = v2dx * cs - v2dy * sn;
        var vy = v2dx * sn + v2dy * cs;

        // normalize
        var scalar, desiredMag, mag, halfAngleVector;
        var orig = new THREE.Vector2();
        mag = orig.distanceTo(new THREE.Vector2(vx, vy));
        desiredMag = (this.offset) / sn;
        scalar = desiredMag / mag;
        halfAngleVector = {
            x: vx * scalar,
            y: vy * scalar
        };




        return halfAngleVector;
    };

    /* Actually when we say Half Angle, its not always really a half, e.g. when walls have different thickness - angle will differ.
     */
    this.getRealAngle = function(v1, v2, v1X, v1Y, v2X, v2Y) {
        var divisionCoefficient = 2.0, angle;
        if (v1 && v2 && v1.wall.bearing !== v2.wall.bearing) {
            var thicknessCoef = v1.wall.getThickness() / v2.wall.getThickness();
            var a = new THREE.Vector3(v1X, v1Y, 0);
            var b = new THREE.Vector3(v2X, v2Y, 0);
            var aPerpend = new THREE.Vector3(v1Y, -v1X, 0);
            var bPerpend = new THREE.Vector3(-v2Y, v2X, 0);
            aPerpend.multiplyScalar(v1.wall.getThickness() / 2 / a.length());
            bPerpend.multiplyScalar(v2.wall.getThickness() / 2 / b.length());

            //b.multiplyScalar(thicknessCoef);
            //angle = (new THREE.Vector3).addVectors(a, b).angleTo(b);

            var intersection = Utils.linesIntersect(aPerpend.x, aPerpend.y, a.x+aPerpend.x, a.y+aPerpend.y, bPerpend.x, bPerpend.y, b.x+bPerpend.y, b.y+bPerpend.x);
            var c = new THREE.Vector3(intersection.x, intersection.y, 0);
            angle = b.angleTo(c) % 6.28319; //360 radians
            if (angle < 0.2) angle = 0.2;
            console.log(
                v1.wall.getStartX()+";"+v1.wall.getStartY()+"|"+v1.wall.getEndX()+";"+v1.wall.getEndY()+"|"+v2.wall.getEndX()+";"+v2.wall.getEndY()+" "
                + new THREE.Vector3(intersection.x, intersection.y, 0).angleTo(b) * THREE.Math.RAD2DEG );
        } else {
            // CCW angle between edges
            var theta = Utils.angle2pi(v1X, v1Y, v2X, v2Y);
            angle = theta / divisionCoefficient;
        }
        return angle;
    }
};
if ( typeof exports !== 'undefined' ) module.exports = HalfEdge;