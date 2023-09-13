
'use strict';
/* Export floormodel stuff as json or xml.
 * @param {object}
 * @param {boolean} sendToBrowser flag indicates whether to allow to download file or not
 */
var Export = function(floormodel, sendToBrowser) {
    var scope = this;
    this.floormodel = floormodel;
    this.sendToBrowser = sendToBrowser;

    /* Saves current floorplan state to json file and send to browser
     * @return {string} json as a string
     */
    this.toJSON = function() {
        function isRealObject(value) {
            return typeof value === "object" && value !== null;
        }

        var scope = this;
        this.floormodel.sanitize();
        var jsonStr = JSON.stringify(
            this.floormodel.getCurrentState(),
            function(key, value) {
                if (typeof value === "function") return undefined;
                if (value instanceof HalfEdge) return undefined; //halfedges of walls will be recreated
                else {
                    //if (isRealObject(value) && "editable" in value) delete value.editable;
                    return value;
                }
            }
        );

        if (this.sendToBrowser) {
            var jsonBlob = new Blob([jsonStr], {type: 'text/plain;charset=utf-8'});
            var dataUrl = URL.createObjectURL(jsonBlob);
            var tourName = "floorplan";
            if ("jsonData" in window && "tour" in window.jsonData && "name" in window.jsonData.tour)
                tourName = window.jsonData.tour.name.toLowerCase().replace(/[-+()\s]/g, '');
            Utils.sendFileToBrowser(dataUrl, tourName + ".json");
        }

        return JSON.parse(jsonStr);
    };

    /* Saves current floorplan state to xml file and send to browser
     */
    this.toXML = function() {
        function json2xml(o, tab) {
            var callstack_limit = 6; //to avoid max callstack limit error
            var toXml = function(v, name, parent, ind, level) {
                if (level >= callstack_limit) {
                    return "";
                }

                var xml = "";
                if (v instanceof Array) {
                    xml += ind + "<" + name + ">";
                    for (var i=0, n=v.length; i<n; i++) {
                        xml += ind + toXml(v[i], name.substring(0, name.length - 1), null, ind + "\t", level + 1) + "\n";
                    }
                    xml += "</" + name + ">";
                }
                else if (v instanceof Float32Array) { // embed objects position/scale/rotate
                    xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
                }
                else if (typeof(v) == "object") {
                    var inst = null;
                    if (v !== null) inst = v.constructor;
                    switch (inst) {
                        case Wall:
                            xml += "<wall>";
                            xml += "<corner>["+[v.getStartX(), v.getStartY()].join(",")+"]</corner>";
                            xml += "<corner>["+[v.getEndX(), v.getEndY()].join(",")+"]</corner>";
                            xml += "<width>"+Wall.prototype.thicknesses[Utils.getKeyByValue(v.modes, v.bearing)]+"</width>";
                            xml += "</wall>";
                            break;
                        case Corner:
                            xml += "<corner>["+[v.x, v.y].join(",")+"]</corner>";
                            break;
                        case Door:
                            xml += "<door>";
                            xml += "<corner>["+[v.x1, v.y1].join(",")+"]</corner><corner>["+[v.x2, v.y2].join(",")+"]</corner>";
                            var type = "";
                            switch(v.type) {
                                case v.TYPE_EMPTY: type = "empty"; break;
                                case v.TYPE_WITH_PATH: type = "with path"; break;
                                case v.TYPE_SLIDING: type = "sliding"; break;
                                case v.TYPE_DOUBLE: type = "double"; break;
                                case v.TYPE_NEW_WITH_PATH: type = "New With path"; break;
                                case v.TYPE_NEW: type = "New"; break;
                            }
                            xml += "<type>"+type+"</type>";
                            if (v.type === v.TYPE_WITH_PATH || v.type === v.TYPE_NEW_WITH_PATH || v.type === v.TYPE_DOUBLE) xml += "<direction>"+v.direction+"</direction>";
                            if (v.type === v.TYPE_WITH_PATH || v.type === v.TYPE_NEW_WITH_PATH) xml += "<hinge>"+v.pathFrom+"</hinge>";
                            xml += "<height>"+v.height+"</height>";
                            xml += "</door>";
                            break;
                        case Window:
                            xml += "<window>";
                            xml += "<corner>["+[v.x1, v.y1].join(",")+"]</corner><corner>["+[v.x2, v.y2].join(",")+"]</corner>";
                            xml += "<level>"+v.heightFromFloor+"</level>";
                            xml += "<height>"+v.height+"</height>";
                            xml += "<depth>"+Wall.prototype.thicknesses[Utils.getKeyByValue(v.wall.modes, v.wall.bearing)]+"</depth>";
                            xml += "</window>";
                            break;
                        case Room:
                            xml += "<room>";
                            xml += "<corners>";
                            v.corners.forEach(function(corner) {
                                xml += "<corner>["+[corner.x, corner.y].join(",")+"]</corner>";
                            });
                            xml += "</corners>";
                            xml += "<walls>";
                            var edge = v.edgePointer;
                            if (edge) {
                                while (true) {
                                    xml += "<wall>";
                                    xml += "<corner>["+[edge.wall.getStartX(), edge.wall.getStartY()].join(",")+"]</corner>";
                                    xml += "<corner>["+[edge.wall.getEndX(), edge.wall.getEndY()].join(",")+"]</corner>";
                                    var width = (edge.wall.bearing === edge.wall.modes.INVISIBLE ? 0 : Wall.prototype.thicknesses[Utils.getKeyByValue(edge.wall.modes, edge.wall.bearing)]);
                                    xml += "<width>"+width+"</width>";
                                    xml += "</wall>";
                                    if (edge.next === v.edgePointer) {
                                        break;
                                    } else {
                                        edge = edge.next;
                                    }
                                }
                            }
                            xml += "</walls>";
                            xml += "<name>"+v.roomName+"</name>";
                            xml += "</room>";
                            break;
                        case HalfEdge:
                        case Placement:
                            break;
                        default:
                            var hasChild = false;
                            xml += ind + "<" + name + ">";
                            for (var propName in v) {
                                if (v.hasOwnProperty(propName)) {
                                    hasChild = true;
                                    xml += toXml(v[propName], propName, v, ind + "\t", level + 1);
                                }
                            }
                            //xml += hasChild ? ">" : "/>";
                            xml += "</" + name + ">";
                    }
                }
                else if (typeof v === "function") {
                    if ((name === "getStart" || name === "getEnd") && parent) {
                        var result = v.call(parent);
                        if ("id" in result) xml += ind + "<" + name + ">" + result.id +  "</" + name + ">";
                    }
                }
                else {
                    xml += ind + "<" + name + ">" + (v !== undefined ? v.toString() : "") +  "</" + name + ">";
                }
                return xml;
            };

            delete o["cameras"];
            delete o["embeds"];
            delete o["placements"];
            delete o["compass"];
            delete o["settings"];

            //add orphan walls to xml
            var orphanWalls = o["walls"].slice(0);
            for (var i=orphanWalls.length-1; i>=0; i--) {
                if (!orphanWalls[i].orphan) orphanWalls.splice(i, 1);
            }
            delete o["walls"];
            o["orphanWalls"] = orphanWalls;

            var xml = "<floorplan>";
            for (var m in o) {
                xml += toXml(o[m], m, null, "", 1);
            }
            xml += "</floorplan>";

            return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
        }

        var arItems = this.floormodel.getCurrentState();
        var jsonItems = json2xml(arItems);
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonItems);
        if (this.sendToBrowser) {
            Utils.sendFileToBrowser(dataStr, "floorplan.xml");
        }
        return jsonItems;
    };

    /* Save camera list to a json file in next format:
     * <pre><code>var rooms = {
     *  'model/2_01_0001(1).jpg' : {
     *      placement : 'camera_pos_dining',
     *      rotation : -0.365
     *  },
     *  ...
     * }</code></pre>
     * @param {boolean} sendToBrowser flag indicating whether to allow user to download a json file immediately
     */
    this.saveCamerasList = function() {
        var newJson = {}, sendToBrowserTemp = false;

        if (this.sendToBrowser) {
            sendToBrowserTemp = true;
            this.sendToBrowser = false;
        } //turn off temporary
        var json = this.toJSON();
        if (sendToBrowserTemp) { //and turn on when we get a current state
            this.sendToBrowser = true;
        }

        if (json["cameras"].length > 0) {
            var arHotspots = [];
            json["cameras"].forEach(function(camera) {
                newJson[camera.id] = {
                    placement: SceneModel.CAMERA_BOX_PREFIX + camera.id,
                    rotation: (camera.mergeAngle + 90) * THREE.Math.DEG2RAD,
                    rotation_in_degrees: camera.mergeAngle + 90
                };
                if (camera.id in window.jsonData.tour.rooms) {
                    newJson[camera.id].name = window.jsonData.tour.rooms[camera.id].name;
                    newJson[camera.id].src = window.jsonData.tour.rooms[camera.id].url;
                }

                arHotspots = detectHotspots(camera);
                if (arHotspots.length > 0) newJson[camera.id].hotspots = arHotspots;
            });
            this.detectArrows(newJson);
            this.optimizeArrows(newJson);
            this.detectStairArrows(newJson);
        }

        if (this.sendToBrowser) {
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(newJson));
            var tourName = "cameras";
            if ("jsonData" in window && "tour" in window.jsonData && "name" in window.jsonData.tour)
                tourName += "_"+window.jsonData.tour.name.toLowerCase().replace(/[-+()\s]/g, '');
            Utils.sendFileToBrowser(dataStr, tourName + ".json");
        }
        return newJson;
    };

    /* Helper function to find out which cameras are visible in current position, and which are in neibourgh rooms
     */
    function detectHotspots(currentCamera) {
        var arDoorsOnWall, divided, visibleCameras = [];
        scope.floormodel.cameras.forEach(function(camera) {
            if (camera.id !== currentCamera.id) {
                var hasIntersection = false; //is there a wall between cameras?
                scope.floormodel.walls.forEach(function(wall) {
                    if (wall.bearing === wall.modes.INVISIBLE) return false;

                    //choose empty passes and opened doors on a current wall
                    arDoorsOnWall = [];
                    scope.floormodel.doors.forEach(function(door) {
                        if (door.wall.id === wall.id &&
                            (door.type === door.TYPE_EMPTY || door.openRate >= 0.5)) { //lets treat half-opened door as an opened door
                            arDoorsOnWall.push(door);
                        }
                    });

                    if (arDoorsOnWall.length > 0) { //lets divide wall on segments
                        divided = divideWallOnSegments(wall, arDoorsOnWall);
                        divided.forEach(function(wallSegment) {
                            if (Utils.doSegmentsIntersect(
                                    currentCamera.x, currentCamera.y, camera.x, camera.y,
                                    wallSegment.start.x, wallSegment.start.y, wallSegment.end.x, wallSegment.end.y
                                )) hasIntersection = true;
                        });
                    } else { //no doors on this wall
                        if (Utils.doSegmentsIntersect(
                                currentCamera.x, currentCamera.y, camera.x, camera.y,
                                wall.getStartX(), wall.getStartY(), wall.getEndX(), wall.getEndY()
                            )) hasIntersection = true;
                    }
                });
                if (!hasIntersection) visibleCameras.push(camera.id);
            }
        });
        return visibleCameras;
    }

    /* Helper function to use only those parts of walls where there's no doors
     */
    function divideWallOnSegments(wall, doors) {
        var segments = [];
        if (doors.length> 1) doors.sort(function(a, b) {
            return a.startDistance < b.startDistance
        });

        var iter = 0;
        segments.push({
            start: {x: wall.getStartX(), y: wall.getStartY()}
        });
        doors.forEach(function(door) {
            segments[iter].end = {x: door.x1, y: door.y1};
            iter++;
            segments.push({
                start: {x: door.x2, y: door.y2}
            });
        });
        segments[iter].end = {x: wall.getEndX(), y: wall.getEndY()};
        return segments;
    }

    /* Find unreachable hotspots and put them looking to the doors of rooms where hotspot is situated
     * @param {JSON} json archive with hotspots
     */
    this.detectArrows = function (json) {
        var scope = this, roomsCamerasMap = {}, camerasRoomsMap = [], wallsRoomsMap = {}, rooms, bFound,
            firstRoomCameras, secondRoomCameras;

        //map cameras in rooms, walls to rooms
        scope.floormodel.cameras.forEach(function(camera) {
            camerasRoomsMap[camera.id] = camera.roomName;
            var room = scope.floormodel.getRoomByName(camera.roomName);
            if (room) {
                if (!roomsCamerasMap[room.roomName]) roomsCamerasMap[room.roomName] = [];
                roomsCamerasMap[room.roomName].push(camera);
                room.getWalls().forEach(function(wall) {
                    if (!wallsRoomsMap[wall.id]) wallsRoomsMap[wall.id] = [];
                    if (wallsRoomsMap[wall.id].indexOf(room) === -1) wallsRoomsMap[wall.id].push(room);
                });
            }
        });

        //traverse all doors in current view
        scope.floormodel.doors.forEach(function(door) {
            if (door.wall) {
                rooms = wallsRoomsMap[door.wall.id];
                if (rooms && rooms.length > 1) {
                    //when door connects 2 rooms
                    firstRoomCameras = roomsCamerasMap[rooms[0].roomName];
                    secondRoomCameras = roomsCamerasMap[rooms[1].roomName];

                    //if second room of door has hotspots
                    firstRoomCameras.forEach(function(cam1) {
                        secondRoomCameras.forEach(function(cam2) {
                            var pos1 = door.getArrowPosition(cam1.roomName, cam1);
                            var pos2 = door.getArrowPosition(cam2.roomName, cam2);
                            var rot;

                            var bcheckFirstCam = false;
                            if (!("hotspots" in json[cam1.id])) { //no hotspots at all
                                bcheckFirstCam = true;
                            } else {
                                bcheckFirstCam = true;
                                json[cam1.id].hotspots.forEach(function(spot) {
                                    if (camerasRoomsMap[spot] === cam2.roomName) bcheckFirstCam = false;
                                });
                            }
                            if (bcheckFirstCam) {
                                rot = new THREE.Vector2().subVectors(new THREE.Vector2(pos1.x, pos1.y), new THREE.Vector2(pos2.x, pos2.y)).angle() - Math.PI/2;

                                if (!json[cam1.id].arrows) json[cam1.id].arrows = [];
                                json[cam1.id].arrows.push({ //add arrow
                                    "name": door.id + "|" + rooms[0].roomName,
                                    "door_id": door.id,
                                    "destination_id": cam2.id,
                                    "destination_room": window.jsonData.tour.rooms[cam2.id].name,
                                    "placement": SceneModel.ARROW_BOX_PREFIX + door.id + "|" + rooms[0].roomName,
                                    "rotation": rot
                                });
                            }

                            //reverse
                            var bCheckSecondCam = false;
                            if (!("hotspots" in json[cam2.id])) {
                                bCheckSecondCam = true;
                            } else {
                                bCheckSecondCam = true;
                                json[cam2.id].hotspots.forEach(function(spot) {
                                    if (camerasRoomsMap[spot] === cam1.roomName) bCheckSecondCam = false;
                                });
                            }
                            if (bCheckSecondCam) {
                                rot = new THREE.Vector2().subVectors(new THREE.Vector2(pos2.x, pos2.y), new THREE.Vector2(pos1.x, pos1.y)).angle() - Math.PI/2;

                                if (!json[cam2.id].arrows) json[cam2.id].arrows = [];
                                json[cam2.id].arrows.push({
                                    "name": door.id + "|" + rooms[1].roomName,
                                    "door_id": door.id,
                                    "destination_id": cam1.id,
                                    "destination_room": window.jsonData.tour.rooms[cam1.id].name,
                                    "placement": SceneModel.ARROW_BOX_PREFIX + door.id + "|" + rooms[1].roomName,
                                    "rotation": rot
                                });
                            }
                        });
                    });
                }

                //check doors with "outside" flag
                if (door.leadsToRoom.length > 0) {
                    if (rooms.length === 1) {
                        firstRoomCameras = roomsCamerasMap[rooms[0].roomName];

                        //iterate cameras in this room and put arrows where door is visible
                        firstRoomCameras.forEach(function(camera) {
                            var pos1 = door.getArrowPosition(camera.roomName, camera);
                            var pos2 = door.getCenter();
                            var rot = new THREE.Vector2().subVectors(new THREE.Vector2(pos1.x, pos1.y), new THREE.Vector2(pos2.x, pos2.y)).angle() - Math.PI/2;

                            if (!json[camera.id].arrows) json[camera.id].arrows = [];
                            json[camera.id].arrows.push({
                                "name": door.id + "|" + camera.roomName,
                                "door_id": door.id,
                                "destination_id": door.leadsToRoom,
                                "destination_room": window.jsonData.tour.rooms[door.leadsToRoom].name,
                                "placement": SceneModel.ARROW_BOX_PREFIX + door.id + "|" + camera.roomName,
                                "rotation": rot
                            });
                        });
                    }
                }
            }
        });
    };

    /* Remove duplicated arrows
     */
    this.optimizeArrows = function (json) {
        function array_unique(arr) {
            var tmp_arr = [];
            for (var i = 0; i < arr.length; i++) {
                if (tmp_arr.indexOf(arr[i]) === -1) {
                    tmp_arr.push(arr[i]);
                }
            }
            return tmp_arr;
        }


        var scope = this, arrowsToRemove, bRemove;
        for (var cameraId in json) {
            if ("arrows" in json[cameraId]) {
                arrowsToRemove = [];

                //if in one room there is a pair of arrow and hotspot leading to one camera, remove arrow
                if ("hotspots" in json[cameraId]) {
                    json[cameraId].arrows.forEach(function (arrow, arrowIndex, arArrows) {
                        bRemove = false;
                        json[cameraId].hotspots.forEach(function (hotspot) {
                            if (arrow.destination_id === hotspot) {
                                bRemove = true;
                            }
                        });
                        if (bRemove) arArrows.splice(arrowIndex, 1);
                    });
                }

                //iterate pairs of arrows, and find duplicates
                json[cameraId].arrows.forEach(function(arrow1, arrow1Index) {
                    json[cameraId].arrows.forEach(function(arrow2, arrow2Index) {
                        if (arrow1Index !== arrow2Index && arrow1.name === arrow2.name) { //same name = goes in same room

                            //remove further hotspot, save nearest one
                            var door = scope.floormodel.getObjectById(arrow1.door_id);
                            var cam1 = scope.floormodel.getCameraById(arrow1.destination_id);
                            var cam2 = scope.floormodel.getCameraById(arrow2.destination_id);

                            if (door.distanceFrom(cam1.x, cam1.y) > door.distanceFrom(cam2.x, cam2.y)) arrowsToRemove.push(arrow1Index);
                            else arrowsToRemove.push(arrow2Index);
                        }
                    });
                });

                if (arrowsToRemove.length) {
                    arrowsToRemove = array_unique(arrowsToRemove);
                    arrowsToRemove.forEach(function(index) {
                        json[cameraId].arrows.splice(index, 1);
                    });
                }
            }
        }
    };

    /* Find special stairs which lead to another floor and check them in json file.
     * @param {JSON} json archive with hotspots
     */
    this.detectStairArrows = function(json) {
        var arDoorsOnWall, divided;
        scope.floormodel.cameras.forEach(function(cam) {
            scope.floormodel.embeds.forEach(function(embed) {
                if (embed.type.indexOf("stairs") === 0 && embed.leadsToRoom !== null && "getDirection3D" in embed) {
                    var c = embed.getCenter();
                    var hasIntersection = false; //is there a wall or closed door between camera and object?

                    scope.floormodel.walls.forEach(function (wall) {
                        if (wall.bearing === wall.modes.INVISIBLE) return false;

                        arDoorsOnWall = [];
                        scope.floormodel.doors.forEach(function(door) {
                            if (door.wall.id === wall.id &&
                                (door.type === door.TYPE_EMPTY || (door.type === door.TYPE_WITH_PATH && door.openRate >= 0.5) || (door.TYPE_NEW_WITH_PATH && door.openRate >= 0.5))) { //lets treat half-opened door as an opened door
                                arDoorsOnWall.push(door);
                            }
                        });

                        if (arDoorsOnWall.length > 0) { //lets divide wall on segments
                            divided = divideWallOnSegments(wall, arDoorsOnWall);
                            divided.forEach(function(wallSegment) {
                                if (Utils.doSegmentsIntersect(
                                        cam.x, cam.y, c.x, c.y,
                                        wallSegment.start.x, wallSegment.start.y, wallSegment.end.x, wallSegment.end.y
                                    )) hasIntersection = true;
                            });
                        } else { //no doors on this wall
                            if (Utils.doSegmentsIntersect(
                                    cam.x, cam.y, c.x, c.y,
                                    wall.getStartX(), wall.getStartY(), wall.getEndX(), wall.getEndY()
                                )) hasIntersection = true;
                        }
                    });

                    scope.floormodel.doors.forEach(function(door) {
                        if (door.type === door.TYPE_EMPTY || door.TYPE_WITH_PATH && door.openRate >= 0.5 || door.TYPE_NEW_WITH_PATH && door.openRate >= 0.5) return false;

                        if (Utils.doSegmentsIntersect(
                                cam.x, cam.y, c.x, c.y,
                                door.x1, door.y1, door.x2, door.y2
                            )) hasIntersection = true;
                    });

                    if (!hasIntersection){ //object is visible from this camera
                        var dir = embed.getDirection3D();
                        if (!json[cam.id].ladder_hotspots) json[cam.id].ladder_hotspots = [];
                        json[cam.id].ladder_hotspots.push({
                            "name": embed.id,
                            "destination_id": embed.leadsToRoom,
                            "destination_room": "",
                            "placement": {"x": embed.getCenter().x, "y": Camera.lens, "z": embed.getCenter().y},
                            "direction": {"x": dir.x, "y": dir.y, "z": dir.z}
                        });
                    }
                }
                return true;
            });
        });
    };
};