const Puzzle3D = function (floor3D) {
    THREE.Object3D.call(this);

    this.floor3D = floor3D;
    this.transformConfig = new TransformConfig('xz', 'y', '', 'world');
    this.pieces = [];

    this.useParent = false;

    this.positionOffset = new THREE.Vector3;

    this.walls = [];
    this.corners = [];
    this.cameras = [];
    this.floors = [];
    this.doors = [];

    this.linkedDoors = [];
    this.doorsLinking = [];

    this.getAngle = function () {
        if (this.rotation.x > 0) {
            return Math.PI + this.rotation.y;
        } else if (this.rotation.x < 0) {
            return Math.PI - this.rotation.y;
        } else if (this.rotation.y < 0) {
            return (Math.PI * 2) + (this.rotation.y % (Math.PI * 2));
        } else {
            return this.rotation.y % (Math.PI * 2);
        }
    }

    this.getInteractionObject = function (mode, event) {
        if (mode === '') {

        } else {
            return this;
        }
    }

    this.getObject3D = function () {
        this.reset();

        this.pieces.forEach(function (piece) {
            piece.rooms.forEach(function (room) {
                if (piece.enabled) {
                    this.floors.push(room.floor);
                    this.add(room.floor);
                }

                room.corners.forEach(function (corner3D) {
                    corner3D.visible = piece.enabled;
                    if (piece.enabled && !~this.corners.indexOf(corner3D)) {
                        this.corners.push(corner3D);
                        this.add(corner3D);

                        corner3D.walls.forEach(function (wall3D) {
                            if (!~this.walls.indexOf(wall3D)) {
                                this.walls.push(wall3D);
                                this.add(wall3D);
                            }
                        }.bind(this));
                    }
                }.bind(this));

                room.cameras.forEach(function (camera3D) {
                    if (piece.enabled && !~this.cameras.indexOf(camera3D)) {
                        camera3D.setPointerColor(0x3EB052);
                        this.cameras.push(camera3D);
                        this.add(camera3D);
                    } else {
                        camera3D.resetPointerColor();
                    }
                }.bind(this));
            }.bind(this));
        }.bind(this));

        if (this.corners.length) {
            this.positionOffset.set(0, 0, 0);

            this.corners.forEach(function (corner) {
                if (corner instanceof Corner3D) {
                    this.positionOffset.add(corner.position);
                }
            }.bind(this));

            this.positionOffset.divideScalar(this.corners.length);
            this.positionOffset.y = 0;
            this.position.copy(this.positionOffset);

            this.children.forEach(function (child) {
                child.position.sub(this.positionOffset);
            }.bind(this));

            return this;
        } else {
            this.positionOffset.set(0, 0, 0);
            return null;
        }
    }

    this.reset = function () {
        this.updateMatrixWorld();

        var localPosition = new THREE.Vector3;
        var worldPosition = new THREE.Vector3;

        var doors = {}; // for return door positions after moving
        this.walls.forEach(function (wall) {
            wall.attached.doors.forEach(function (door) {
                localPosition.copy(door.controls.start.position);
                door.localToWorld(localPosition);
                worldPosition.copy(localPosition);
                this.floor3D.worldToLocal(worldPosition);

                door.door2D.x1 = worldPosition.x;
                door.door2D.y1 = worldPosition.z;

                localPosition.copy(door.controls.end.position);
                door.localToWorld(localPosition);
                worldPosition.copy(localPosition);
                this.floor3D.worldToLocal(worldPosition);

                door.door2D.x2 = worldPosition.x;
                door.door2D.y2 = worldPosition.z;

                doors[door.getId()] = {
                    x1: door.door2D.x1,
                    y1: door.door2D.y1,
                    x2: door.door2D.x2,
                    y2: door.door2D.y2
                };
            }.bind(this));

            this.floor3D.add(wall);
        }.bind(this));

        this.corners.forEach(function (corner) {
            localPosition.copy(corner.position);
            this.localToWorld(localPosition);
            worldPosition.copy(localPosition);
            this.floor3D.worldToLocal(worldPosition);

            corner.position.copy(worldPosition);
            corner.onTransform();

            this.floor3D.add(corner);
        }.bind(this));
        this.cameras.forEach(function (camera) {
            localPosition.copy(camera.position);
            this.localToWorld(localPosition);
            worldPosition.copy(localPosition);
            this.floor3D.worldToLocal(worldPosition);

            camera.position.copy(worldPosition);
            camera.rotation.set(
                camera.rotation.x, 
                (this.getAngle() + camera.rotation.y) % (Math.PI * 2), 
                camera.rotation.z 
            );

            this.floor3D.add(camera);

            camera.onTransform();
        }.bind(this));
        this.floors.forEach(function (floor) {
            this.floor3D.add(floor);
            floor.position.set(0, 0, 0);
        }.bind(this));

        this.walls.forEach(function (wall) {
            this.floor3D.add(wall);

            wall.attached.doors.forEach(function (door) {
                var id = door.getId();

                door.door2D.x1 = doors[id].x1;
                door.door2D.y1 = doors[id].y1;
                door.door2D.x2 = doors[id].x2;
                door.door2D.y2 = doors[id].y2;
                door.refresh();
            });

            if (wall.attached.doors.length > 0) {
                wall.refresh();
            }
        }.bind(this));

        this.walls = [];
        this.corners = [];
        this.cameras = [];
        this.floors = [];

        this.position.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.positionOffset.set(0, 0, 0);

        return this;
    }

    this.pieceIncludesCorners = function (piece, corners) {
        return !!piece.rooms.find(function (room) {
            return !!corners.find(function (corner) {
                return ~room.corners.indexOf(corner);
            });
        });
    }

    this.getPieces = function () {
        this.pieces = [];
        var rooms = [];

        this.floor3D.forEachInGroup('floors', function (floor3D) {
            if (!floor3D.isCut()) {
                var room = {
                    id: floor3D.getId(),
                    floor: floor3D,
                    cuts: [],
                    inPiece: false,
                    corners: [],
                    cameras: []
                };
                
                rooms.push(room);
    
                this.floor3D.forEachInGroup('cameras', function (camera3D) {
                    if (camera3D.aboveFloor(floor3D)) {
                        room.cameras.push(camera3D);
                    }
                }.bind(this));
    
                this.floor3D.forEachInGroup('corners', function (corner3D) {
                    if (corner3D.hasFloor(floor3D)) {
                        room.corners.push(corner3D);
                    }
                }.bind(this));
            } else {
                var roomCuttedFrom = rooms.find(function (room) {
                    return room.floor === floor3D.cuttedFrom;
                });

                roomCuttedFrom.cuts.push(floor3D);

                // Todo: remove cuts after move, and make visible parent cut floot (.replacedWithCut)
            }
        }.bind(this));

        const getRoomsForPiece = function (piece, rooms) {
            var inPieceRoom = rooms.find(function (room) {
                return !room.inPiece && this.pieceIncludesCorners(piece, room.corners);
            }.bind(this));

            if (inPieceRoom) {
                inPieceRoom.inPiece = true;
                piece.rooms.push(inPieceRoom);
                piece.parts.push(this.compressTitle(inPieceRoom.floor.getTitle()));
                return getRoomsForPiece(piece, rooms);
            } else {
                return;
            }
        }.bind(this);

        rooms.forEach(function (room) {
            var piece = null;
            
            if (!room.inPiece) {
                room.inPiece = true;

                piece = {
                    id: _.uniqueId('piece_'),
                    enabled: false,
                    rooms: [room],
                    parts: [this.compressTitle(room.floor.getTitle())]
                };

                this.pieces.push(piece);

                getRoomsForPiece(piece, rooms);
            }
        }.bind(this));

        return this.pieces;
    }

    this.compressTitle = function (title) {
        return title;
        // return title.length > 5 ? title.substr(0, 3).trim() + '-' + title.substr(title.length - 3, 3).trim() : title;
    }

    this.getPieceByObject = function (object) {
        return this.pieces.find(function (piece) {
            return piece.rooms.find(function (room) {
                if (object === room.floor) {
                    return true;
                } else if (object instanceof Wall3D) {
                    return Object.keys(object.corners).find(function (cKey) {
                        const corner = object.corners[cKey].object;
                        return ~room.corners.indexOf(corner);
                    });
                }
            });
        });
    }

    this.getPieceOfDoor = function (door3D) {
        var doorCorners = Object.keys(door3D.wall3D.corners).map(function (cKey) {
            return door3D.wall3D.corners[cKey].object;
        });

        var doorPiece = this.pieces.find(function (piece) {
            return this.pieceIncludesCorners(piece, doorCorners);
        }.bind(this));

        return doorPiece;
    }

    this.getPieceLinkMap = function (piece) {
        var linksMap = [];
        var piecesMap = [];

        const getNextLinks = function (piece) {
            if (!~piecesMap.indexOf(piece)) {
                piecesMap.push(piece);

                var pieceLinks = this.linkedDoors.filter(function (link) {
                    return ~link.pieces.indexOf(piece);
                });

                pieceLinks.forEach(function (link) {
                    if (!~linksMap.indexOf(link)) {
                        linksMap.push(link);
                        link.pieces.forEach(function (p) {
                            getNextLinks(p);
                        });
                    } 
                });
            }
        }.bind(this)
        
        getNextLinks(piece);

        return {
            links: linksMap,
            pieces: piecesMap
        };
    }

    this.linkDoor = function (door3D) {
        if (door3D instanceof Door3D) {
            var doorIndex = this.doorsLinking.indexOf(door3D);

            if (~doorIndex) {
                door3D.resetColor();
                this.doorsLinking.splice(doorIndex, 1);
                return this;
            }

            if (door3D.canLink()) {
                if (this.doorsLinking.length === 0) {
                    this.doorsLinking.push(door3D);
                } else {
                    var doorPieceA = this.getPieceOfDoor(this.doorsLinking[0]);
                    var doorPieceB = this.getPieceOfDoor(door3D);

                    if (doorPieceA === doorPieceB) {
                        return this;
                    }

                    var mapsA = this.getPieceLinkMap(doorPieceA);
                    var mapsB = this.getPieceLinkMap(doorPieceB);

                    var piecesIsLinked = mapsA.pieces.some(function (p) {
                        return mapsB.pieces.includes(p);
                    });

                    if (piecesIsLinked) {
                        return this;
                    }

                    this.doorsLinking.push(door3D);
                }
            } else {
                this.unlinkDoor(door3D);
                return this;
            }
    
            if (this.doorsLinking.length === 1) {
                door3D.setColor(0xFFFFFF * Math.random())
            } else {
                const firstDoor = this.doorsLinking[0];
                const secondDoor = this.doorsLinking[1];

                firstDoor.linkedDoor = secondDoor;
                secondDoor.linkedDoor = firstDoor;

                const color = firstDoor.getColor();

                secondDoor.setColor(color);

                var material = new THREE.LineBasicMaterial({color: color});
                var geometry = new THREE.Geometry();

                geometry.vertices.push(
                    firstDoor.getLinkAngleAndPosition().position,
                    secondDoor.getLinkAngleAndPosition().position,
                );

                var line = new THREE.Line(geometry, material);

                this.linkedDoors.push({
                    line: line,
                    color: color,
                    pieces: [doorPieceA, doorPieceB],
                    doors: [firstDoor, secondDoor]
                });

                firstDoor.events.setOn('update', 'linkLineUpdate', this.updateLinkDoorsLines.bind(this));
                secondDoor.events.setOn('update', 'linkLineUpdate', this.updateLinkDoorsLines.bind(this));

                this.floor3D.add(line);

                this.doorsLinking = [];
            }
        }

        return this;
    }

    this.updateLinkDoorsLines = function () {
        this.linkedDoors.forEach(function (link) {
            link.line.geometry.vertices[0].copy(link.doors[0].getLinkAngleAndPosition().position);
            link.line.geometry.vertices[1].copy(link.doors[1].getLinkAngleAndPosition().position);
            link.line.geometry.verticesNeedUpdate = true;
        });

        return this;
    }

    this.unlinkDoor = function (door3D) {
        var linkIndex = null;
        var link = this.linkedDoors.find(function (link, index) {
            linkIndex = index;
            return ~link.doors.indexOf(door3D);
        });

        if (link) {
            this.floor3D.remove(link.line);
            link.doors.forEach(function (door) {
                door.resetColor();
                door.linkedDoor = null;
                door.events.removeOn('update', 'linkLineUpdate');
            });

            this.linkedDoors.splice(linkIndex, 1);
        }

        return this;
    }

    this.assembleRooms = function () {
        this.reset();

        var piecesAssembled = [];
        var wallsRefresh = [];

        this.pieces.forEach(function (piece) {
            if (~piecesAssembled.indexOf(piece)) return;

            piecesAssembled.push(piece);

            var map = this.getPieceLinkMap(piece);

            map.links.forEach(function (link) {
                var moveIndex = ~piecesAssembled.indexOf(link.pieces[0]) ? 1 : 0;
                var baseIndex = Math.abs(moveIndex - 1);
                var movePiece = link.pieces[moveIndex];

                if (~piecesAssembled.indexOf(movePiece)) {
                    console.warn('Check pieces, piece already assembled:', piecesAssembled, movePiece);
                }

                piecesAssembled.push(movePiece);

                this.pieces.forEach(function (p) {
                    p.enabled = p === movePiece;
                });
    
                var object3D = this.getObject3D();
    
                if (object3D) {
                    const baseDoor = link.doors[baseIndex];
                    const moveDoor = link.doors[moveIndex];

                    if (baseDoor.wall3D.width !== moveDoor.wall3D.width) {
                        const defaultWidth = 15;

                        if (baseDoor.wall3D.width !== defaultWidth && moveDoor.wall3D.width !== defaultWidth) {
                            // baseDoor.wall3D.highlight();
                            // moveDoor.wall3D.highlight();

                            var setMax = confirm(
                                "Walls between pieces: \"" + 
                                piece.parts.join(', ') + 
                                "\" and \"" + 
                                movePiece.parts.join(', ') + 
                                "\" have min wall thickness - [" +
                                Math.min(baseDoor.wall3D.width, moveDoor.wall3D.width) + 
                                "] and max - [" + 
                                Math.max(baseDoor.wall3D.width, moveDoor.wall3D.width) +
                                "], set max thickness?"
                            );

                            baseDoor.wall3D.setWidth(Math[setMax ? 'max' : 'min'](
                                baseDoor.wall3D.width, moveDoor.wall3D.width
                            ));
                            moveDoor.wall3D.setWidth(Math[setMax ? 'max' : 'min'](
                                baseDoor.wall3D.width, moveDoor.wall3D.width
                            ));

                            // baseDoor.wall3D.unHighlight();
                            // moveDoor.wall3D.unHighlight();

                            if (!~wallsRefresh.indexOf(baseDoor.wall3D)) {
                                wallsRefresh.push(baseDoor.wall3D);
                            }
                        } else if (baseDoor.wall3D.width !== defaultWidth) {
                            moveDoor.wall3D.setWidth(baseDoor.wall3D.width);
                        } else if (moveDoor.wall3D.width !== defaultWidth) {
                            baseDoor.wall3D.setWidth(moveDoor.wall3D.width);

                            if (!~wallsRefresh.indexOf(baseDoor.wall3D)) {
                                wallsRefresh.push(baseDoor.wall3D);
                            }
                        }
                    }

                    var doorDataA = baseDoor.getLinkAngleAndPosition();
                    var doorDataB = moveDoor.getLinkAngleAndPosition();
        
                    var puzzleRotation = (doorDataB.angle - doorDataA.angle) + Math.PI;
                    object3D.rotation.y = puzzleRotation;
    
                    doorDataA = baseDoor.getLinkAngleAndPosition();
                    doorDataB = moveDoor.getLinkAngleAndPosition();
    
                    var position = new THREE.Vector3;
        
                    position.copy(doorDataA.position);
                    position.sub(doorDataB.position);
    
                    object3D.position.add(position);
                    
                    link.doors.forEach(function (door) {
                        door.resetColor();
                        door.linkedDoor = null;
                    });
                    
                    this.floor3D.remove(link.line);

                    baseDoor.wall3D.refresh();
                }
            }.bind(this));
        }.bind(this));

        this.pieces.forEach(function (piece) {
            piece.enabled = false;
        });

        this.linkedDoors = [];

        wallsRefresh.forEach(function (wall) {
            wall.refresh();
        });

        this.reset();

        return this;
    }

    this.onTransform = function () {
        this.cameras.forEach(function (camera) {
            camera.updateShader();
        }.bind(this));

        this.updateLinkDoorsLines()
    }

    this.onResetTransform = function () {
        this.reset();
    }
}

Puzzle3D.prototype = Object.create(THREE.Object3D.prototype);
Puzzle3D.prototype.constructor = Puzzle3D;