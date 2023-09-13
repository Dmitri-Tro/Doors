const Floor3D = function (floorNumber, texturesCache, textureSize) { // TODO: Rename to Level3D
    THREE.Group.call(this);

    this.loaded = null;
    this.name = 'Floor_' + floorNumber;
    this.floorNumber = floorNumber || 0;
    this.puzzle = new Puzzle3D(this);
    this.cutPlane = new FloorCutPlane3D();
    this.events = new EventsSystem('Floor3D-' + this.floorNumber);
    this.transformConfig = new TransformConfig('xyz', 'y', '', 'world');

    this.positionOffset = {
        enabled: false,
        inCenter: false,
        vector: new THREE.Vector3,
    };

    this.rooms = [];
    this.floorPlan2D = null;
    this.textureSize = textureSize || 256;
    this.texturesCache = texturesCache || {};
    this.floorCut = {
        lines: [],
        currentLine: null
    };

    this.groups = {
        cameras: new TransformGroup('cameras'),
    };

    this.materials = {
        transparent: new THREE.MeshLambertMaterial({color: 0xffff00, transparent: true, opacity: 0}),
        top: new THREE.MeshLambertMaterial({color: 0x272822}),
        ghost: new THREE.MeshLambertMaterial({color: 0xffffff, transparent: true, opacity: 0.33, depthWrite: false})
    };

    this.config = {
        wallsHeight: 250
    };

    Object.defineProperty(this, 'height', {
        get: function() { return this.config.wallsHeight; }.bind(this),
        set: function(newValue) { this.setDefaultWallsHeight(newValue); }.bind(this)
    });

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

    this.moveToCenter = function () { 
        if (!this.positionOffset.inCenter) {
            this.resetPositionOffset();
            
            var offsetVector = new THREE.Vector3();
            offsetVector.copy(this.position);
            offsetVector.negate();
            this.setPositionOffset(offsetVector);
            
            var box = this.getBoundingBox();
            var boxCenter = new THREE.Vector3;

            boxCenter.add(box.min);
            boxCenter.add(box.max);
    
            offsetVector.x -= boxCenter.x / 2;
            offsetVector.z -= boxCenter.z / 2;
            this.setPositionOffset(offsetVector);
    
            this.positionOffset.inCenter = true;
        }

        return this;
    }

    this.setPositionOffset = function (vector) {
        this.resetPositionOffset();

        this.positionOffset.vector.copy(vector);
        this.position.add(this.positionOffset.vector);
        this.positionOffset.enabled = true;

        return this;
    }

    this.resetPositionOffset = function () {
        if (this.positionOffset.enabled) {
            this.position.sub(this.positionOffset.vector);
            this.positionOffset.enabled = false;
            this.positionOffset.inCenter = false;
        }

        return this;
    }

    this.getBoundingBox = function (returnObject3D) {
        this.remove(this.cutPlane);
        this.floorCut.lines.forEach(function (line) {
            this.remove(line);
        }.bind(this));

        if (returnObject3D) {
            var box = new THREE.BoxHelper(this, 0x0000FF);
        } else {
            var box = new THREE.Box3().setFromObject(this);
        }

        this.add(this.cutPlane);
        this.floorCut.lines.forEach(function (line) {
            this.add(line);
        }.bind(this));

        return box;
    }

    this.clear = function () {
        while (this.children.length) {
            this.remove(this.children[0]);
        }

        this.add(this.puzzle);

        this.rooms = [];

        return this;
    }

    this.clearGroups = function () {
        Object.keys(this.groups).forEach(function (gKey) {
            this.groups[gKey].clear();
        }.bind(this));

        return this;
    }

    this.setViewMode = function (mode) {
        this.forEachInGroup('walls', function (wall3D) {
            wall3D.setViewMode(mode);
        });

        this.forEachInGroup('cameras', function (camera3D) {
            camera3D.setViewMode(mode);
        });

        return this;
    }

    this.getCorners = function () {
        if (this.groups.corners) {
            return Array.from(this.groups.corners.items);
        } else {
            return [];
        }
    }

    this.getWalls = function () {
        if (this.groups.walls) {
            return Array.from(this.groups.walls.items);
        } else {
            return [];
        }
    }

    this.showWalls = function () {
        this.forEachInGroup('walls', function (wall) {
            wall.visible = true;
        });

        return this;
    }

    this.hideWalls = function () {
        this.forEachInGroup('walls', function (wall) {
            wall.visible = false;
        });

        return this;
    }

    this.showCuts = function () {
        this.floorCut.lines.forEach(function (line) {
            line.visible = true;
        });

        // Todo: load from saved 

        return this;
    }

    this.hideCuts = function () {
        this.floorCut.lines.forEach(function (line) {
            line.visible = false;
        });

        // Todo: remove unsaved, return removed (which remove is unsaved);
        return this;
    }

    this.showCutPlane = function () {
        this.cutPlane.visible = true;
        return this;
    }

    this.hideCutPlane = function () {
        this.cutPlane.visible = false;
        return this;
    }

    this.getDoors = function () {
        if (this.groups.doors) {
            return Array.from(this.groups.doors.items);
        } else {
            return [];
        }
    }

    this.setFloorNumber = function (floorNumber) {
        this.floorNumber = floorNumber;
        return this;
    }

    this.getRooms = function () {
        return this.rooms;
    }

    this.addRoom = function () {
        var room = new Room3D;
        this.rooms.push(room);
        return room;
    }

    this.updateRooms = function () {
        this.rooms.forEach(function (room) {
            room.showColor();
        });

        return this;
    }

    this.showRooms = function () {
        this.rooms.forEach(function (room) {
            room.showColor();
        });

        return this;
    }

    this.hideRooms = function () {
        this.rooms.forEach(function (room) {
            room.hideColor();
        });

        return this;
    }

    this.removeRoom = function (id) {
        var foundRoom = this.rooms.find(function (room) {
            return room.getId() == id
        });
        var indexOfRoom = this.rooms.indexOf(foundRoom);

        if (~indexOfRoom) {
            this.rooms[indexOfRoom].beforeRemove();
            this.rooms.splice(indexOfRoom, 1);
        }

        return this;
    }

    this.addLine = function (vectors) {
        var material = new THREE.LineBasicMaterial({
            color: 0x0000ff
        });

        var geometry = new THREE.Geometry();
        geometry.vertices.push.apply(geometry.vertices, vectors);

        var line = new THREE.Line(geometry, material);
        this.add(line);
    }

    this.loadTextures = function () {
        // debugger
        this.forEachInGroup('cameras', function (item) {
            const rKey = item.cameraID;
            
            if (this.texturesCache[rKey]) {
                this.setCameraTexture(
                    rKey, 
                    this.texturesCache[rKey].url, 
                    this.texturesCache[rKey].cubeMap
                );
            }
        }.bind(this));

        return this;
    }

    this.raycastTextures = function () {
        if (!this.isEditable()) return;

        var raycaster = new THREE.Raycaster;
        var origin = new THREE.Vector3;
        var direction = new THREE.Vector3;
        var directionDown = new THREE.Vector3(0, -1, 0);

        this.groups.cameras.forEach(function (camera) {
            var alreadyRaycasted = [];

            camera.updateMatrixWorld();
            origin.setFromMatrixPosition(camera.matrixWorld);

            raycaster.set(origin, directionDown);

            this.groups.floors.forEach(function (floor) {
                floor.updateMatrixWorld();
            });

            var intersectedFloor = raycaster.intersectObjects(this.children);
            if (
                intersectedFloor.length > 0 &&
                intersectedFloor[0].object instanceof FlatSurface &&
                camera.shaderMaterial
            ) {
                intersectedFloor[0].object.setSideCameraMaterial(camera);
            }

            this.groups.walls.forEach(function (wall) {
                if (!wall.needRaycast) return;

                wall.updateMatrixWorld();
                direction.subVectors(wall.getRaycastPoint(), camera.position).normalize();

                raycaster.set(origin, direction);

                var intersected = raycaster.intersectObjects(this.children);
                var closest = null;

                intersected.forEach(function (intersect) {
                    if (
                        intersect.object instanceof Wall3D &&
                        (closest === null || intersect.distance < closest.distance)
                    ) {
                        closest = intersect;
                    }
                });

                if (
                    closest &&
                    camera.shaderMaterial &&
                    !~alreadyRaycasted.indexOf(closest.object)
                ) {
                    var closestCameraDistance = closest.object.getClosestCameraDistanceByFace(closest.faceIndex);
                    if (closestCameraDistance > closest.distance) {
                        alreadyRaycasted.push(closest.object);
                        closest.object.setSideCameraMaterialByFace(camera, closest.faceIndex);
                        closest.object.setClosestCameraByFace(closest.faceIndex, camera, closest.distance);

                        // Debug helper
                        // this.parent.add(new THREE.ArrowHelper(
                        //     raycaster.ray.direction,
                        //     raycaster.ray.origin,
                        //     closest.distance,
                        //     Math.random() * 0xffffff,
                        //     20,
                        //     5
                        //   )
                        // );
                    }
                }

            }.bind(this));
        }.bind(this));
    }

    this.setCameraTexture = function (id, texture, useCubemap) {
        var camera3D = this.findInGroup('cameras', function (item) {
            return item.cameraID === id;
        });

        if (camera3D) {
            camera3D.setTexture(texture, useCubemap);
        }

        return this;
    }

    this.setFloorFromPlan2D = function (floorPlan2D) {
        this.clear().clearGroups().add(this.cutPlane);
        this.loaded = 'floorPlan2D';

        this.floorPlan2D = floorPlan2D;
        var wallsRoomsMap = {};

        floorPlan2D.rooms.forEach(function (room2D) {
            var floorSurface3D = new FlatSurface();
            floorSurface3D.setFromRoom2D(room2D).getSideFaces();

            // Get map for arrows
            room2D.getWalls().forEach(function (wall2D) {
                if (!wallsRoomsMap[wall2D.id]) {
                    wallsRoomsMap[wall2D.id] = [];
                }

                wallsRoomsMap[wall2D.id].push(room2D);
            });

            this.add(floorSurface3D).addToGroups(floorSurface3D, ['floors']);
        }.bind(this));

        floorPlan2D.walls.forEach(function (wall2D) {
            if (wall2D.isVisible()) {
                var wall3D = new Wall3D();
                wall3D.setFromWall2D(wall2D);

                this.add(wall3D).addToGroups(wall3D, ['walls']);
            }
        }.bind(this));

        floorPlan2D.corners.forEach(function (corner2D) {
            var corner3D = new Corner3D;
            corner3D.setFromCorner2D(corner2D);
            corner3D.visible = false;

            const everyWall2D = function (wall2D, position) {
                var wall3D = this.findInGroup('walls', function (item) {
                    return item.wall2D === wall2D;
                });

                if (wall3D) {
                    corner3D.addWall(wall3D);
                    wall3D.setCorner(corner3D, position);
                }
            }.bind(this);
            
            corner2D.wallStarts.forEach(function (wall2D) {everyWall2D(wall2D, 'start')});
            corner2D.wallEnds.forEach(function (wall2D) {everyWall2D(wall2D, 'end')});

            this.forEachInGroup('floors', function (floor3D) {
                if (floor3D.room2D && ~floor3D.room2D.corners.indexOf(corner2D)) {
                    corner3D.addFloor(floor3D);
                }
            }.bind(this));

            corner3D.updateHeightFromWalls();

            this.add(corner3D).addToGroups(corner3D, ['corners']);
        }.bind(this));

        floorPlan2D.doors.forEach(function (door2D) {
            if (door2D.wall) {               
                var wall3D = this.findInGroup('walls', function (item) {
                    return item.wall2D === door2D.wall;
                });

                if (wall3D) { // if door not on invisible wall
                    var door3D = new Door3D;

                    door3D.setOpened(door2D.openRate > 0);
                    wall3D.addDoor(door3D);
                    door3D
                        .setFloor(this)
                        .setWall(wall3D)
                        .setFromDoor2D(door2D)
                        .setArrowsFromWallsRoomsMap2D(wallsRoomsMap);

                    this.addToGroups(door3D, ['doors']);
                }
            }
        }.bind(this));

        floorPlan2D.cameras.forEach(function (camera2D) {
            var camera3D = new Camera3D(undefined, this.texturesCache, this.textureSize);
            camera3D.setFromCamera2D(camera2D);

            this.add(camera3D).addToGroups(camera3D, ['cameras']);
        }.bind(this));

        if (this.position.x === 0 && this.position.y === 0 && this.position.z === 0) {
            this.position.y = this.floorNumber * (this.config.wallsHeight + 1);
            // Todo: find position with other floors (in editor3D class)
        }

        return this;
    }

    this.loadFloorFromUrl = function (objUrl) {
        if (this.loaded !== 'objFile') {
            this.clear();

            this.loaded = 'objFile';

            var materialsArray = Object.keys(this.materials).map(function (mKey) {
                return this.materials[mKey];
            }.bind(this));

            var loader = new THREE.OBJLoader;
            loader.load(objUrl, function (object) {
                object.children.forEach(function (child) {
                    if (child.name.includes('Wall') && !child.name.includes('WithoutHoles')) {
                        this.add(new Floor3DPart(child, materialsArray).setMaterialsIndexes(1, 2));
                    } else if (child.name.includes('Floor')) {
                        this.add(new Floor3DPart(child, materialsArray).setMaterialsIndexes(1, 2));
                    }
                }.bind(this));

                if (this.position.x === 0 && this.position.y === 0 && this.position.z === 0) {
                    this.position.y = this.floorNumber * (this.config.wallsHeight + 1);
                }

                this.setStructure();
            }.bind(this));
        }

        return this;
    }

    this.isEditable = function () {
        return this.loaded === 'floorPlan2D';
    }

    this.isClearable = function () {
        return this.loaded === 'floorPlan2D';
    }

    this.setDefaultWallsHeight = function (height) {
        height = parseFloat(height);

        if (!isNaN(height)) {
            this.config.wallsHeight = height;

            this.forEachInGroup('walls', function (wall) {
                wall.setDefault('height', this.config.wallsHeight).refresh();
            }.bind(this));

            this.forEachInGroup('floors', function (floor) {
                floor.setDefault('ceilingHeight', this.config.wallsHeight).refresh();
            }.bind(this));
        } else {
            console.warn('Height of walls need be a number!');
        }

        return this;
    }

    this.getParameters = function () {
        // Todo: move setHeightDebounced to this;
        const setHeightDebounced = _.debounce(this.setDefaultWallsHeight.bind(this), 500, {
            leading: false,
            trailing: true
        });

        return [new ControlsElement({
            id: this.name + '_height',
            label: 'Walls height:',
            type: 'input',
            options: {
                type: 'number'
            },
            value: this.config.wallsHeight,
            onChange: function (value) {
                setHeightDebounced(value);
            }.bind(this)
        })];
    }

    this.setCornersVisibility = function (value) {
        value = !!value;

        this.forEachInGroup('corners', function (corner3D) {
            corner3D.visible = value;
        });

        return this;
    }

    this.showDoorsControls = function () {
        this.forEachInGroup('doors', function (door3D) {
            door3D.showControls();
        });

        return this;
    }

    this.hideDoorControls = function () {
        this.forEachInGroup('doors', function (door3D) {
            door3D.hideControls();
        });

        return this;
    }

    this.itemInGroup = function (item, groupName) {
        return this.groups[groupName] && this.groups[groupName].hasItem(item);
    }

    this.addToGroup = function (item, groupName) {
        if (!this.groups[groupName]) {
            this.groups[groupName] = new TransformGroup(this.scene);
        }

        if (!this.itemInGroup(item, groupName)) {
            this.groups[groupName].addItem(item);
        } else if (showWarnings) {
            console.warn('Item already in group.', item, group);
        }

        return this;
    }

    this.getGroupItems = function (groupName) {
        if (this.groups[groupName]) {
            return this.groups[groupName].items;
        }

        return undefined;
    }

    this.removeFromGroup = function (item, groupName) {
        if (this.groups[groupName]) {
            this.groups[groupName].removeItem(item);
        }
        return this;
    }

    this.addToGroups = function (item, groups) {
        groups.forEach(function (groupName) {
            this.addToGroup(item, groupName);
        }.bind(this));

        return this;
    }

    this.findInGroup = function (groupName, callback) {
        if (this.groups[groupName]) {
            return this.groups[groupName].findItem(callback);
        }

        return undefined;
    }

    this.filterInGroup = function (groupName, callback) {
        if (this.groups[groupName]) {
            return this.groups[groupName].filterItems(callback);
        }

        return undefined;
    }

    this.forEachInGroup = function (groupName, callback) {
        if (this.groups[groupName]) {
            return this.groups[groupName].forEach(callback);
        }

        return this;
    }

    this.updateCamerasShaders = function () {
        this.forEachInGroup('cameras', function (item) {
            item.updateShader();
        });

        // todo: make better solution (find reason, why it broken sometimes)
        this.forEachInGroup('walls', function (item) {
            item.repairMaterials();
        });

        this.forEachInGroup('floors', function (item) {
            item.repairMaterials();
        });

        return this;
    }

    this.onTransform = function (mode) {
        if (~['translate', 'rotate'].indexOf(mode) && this.groups.cameras) {
            this.updateCamerasShaders();
        }
    }

    this.setFloorCutLine = function (event) {
        if (event && event.object instanceof FloorCutPlane3D) {         
            var position = new THREE.Vector3;
            position.copy(event.point);
            this.worldToLocal(position); 

            if (!this.floorCut.currentLine) {
                this.floorCut.currentLine = new FloorCutLine3D({color: 0xFF0000});
                this.add(this.floorCut.currentLine);
            }

            this.floorCut.currentLine.setPoint(position, true);

            if (this.floorCut.currentLine.isDone()) {
                this.floorCut.lines.push(this.floorCut.currentLine);
                this.floorCut.currentLine = null;
            }
        } else {
            if (this.floorCut.currentLine) {
                this.remove(this.floorCut.currentLine);
                this.floorCut.currentLine = null;
            }
        }

        return this;
    }

    this.updateFloorCutLine = function (event) {
        if (event.object instanceof FloorCutPlane3D) {
            var position = new THREE.Vector3;
            position.copy(event.point);
            this.worldToLocal(position); 

            if (this.floorCut.currentLine) {
                this.floorCut.currentLine.setPoint(position);
            }
        }

        return this;
    }

    this.removeFloorCutLine = function (line) {
        var lineIndex = this.floorCut.lines.indexOf(line);

        if (~lineIndex) {
            this.floorCut.lines.splice(lineIndex, 1);
            this.remove(line);
        }

        return this;
    }

    this.cutFloorsWithLines = function () {
        var getPolygonCuts = function (polygon, level) {
            if (!level) level = 0;

            var currentCuts = [];
            
            this.floorCut.lines.find(function (line) {
                var linePoints =  line.getPoints();
                
                try {
                    var cuts = PolyK.Slice(
                        polygon,
                        linePoints.sx,
                        linePoints.sy,
                        linePoints.ex,
                        linePoints.ey
                    );
                    
                    cuts = cuts.filter(function (cut) {
                        return PolyK.GetArea(cut) > 1500; // min Area
                    });

                    if (cuts.length > 1) {
                        line.used = true;

                        cuts.forEach(function (cut, cutIndex) {
                            var newCuts = getPolygonCuts(cut, level);

                            if (newCuts.length > 1) {
                                currentCuts.push.apply(currentCuts, newCuts);
                            } else {
                                currentCuts.push(cut);
                            }
                        });

                        return true;
                    }
                } catch (e) {
                    // Hint: Can crash, when we use a used line on level upper
                    // line.setColor(0xFF0000);
                    // console.warn('Something wrong!', polygon, linePoints, e);
                }
            });

            return currentCuts;
        }.bind(this);

        var remove = [];

        this.children.forEach(function (child, removeIndex) {
            if (child instanceof FlatSurface) {
                if (!child.isCut()) {
                    var polygon = [];
                    
                    child.visible = true;
                    child.replacedWithCut = false;
                    child.shape.curves.forEach(function (curve) {
                        polygon.push(curve.v1.x, curve.v1.y);
                    });

                    var polygonCuts = getPolygonCuts(polygon);
                    
                    if (polygonCuts.length > 1) {
                        child.replacedWithCut = true;
                        child.visible = false;
    
                        polygonCuts.forEach(function (c) {
                            var surface = new FlatSurface();
                            var shape = new THREE.Shape();
                            
                            shape.moveTo(c[0], c[1]);
    
                            for (var i = 2; i < c.length; i += 2) {
                                shape.lineTo(c[i], c[i + 1]);
                            }
                            
                            surface.setCuttedFrom(child).setFromShape(shape).getSideFaces();

                            if (child.side.projectionCamera) {
                                surface.setSideCameraMaterial(child.side.projectionCamera);
                            }

                            this.add(surface).addToGroups(surface, ['floors']);

                            var surfaceId = surface.getId();
                            if (
                                this.structure && 
                                this.structure.data && 
                                this.structure.data.floors &&
                                this.structure.data.floors[surfaceId]
                            ) {
                                surface.setStructure(this, this.structure.data.floors[surfaceId]);
                            }
                        }.bind(this));
                    }
    
                    console.log('polygonCuts', polygonCuts)
                } else {
                    remove.push(child);
                }
            }
        }.bind(this));
        
        remove.forEach(function (c) {
            this.remove(c);
        }.bind(this));

        this.floorCut.lines.forEach(function (line) {
            line.save();
        });

        return this;
    }

    this.puzzleLinkDoor = function (door3D) {
        this.puzzle.linkDoor(door3D);
        return this;
    }

    this.puzzleUnlinkDoor = function (door3D) {
        this.puzzle.unlinkDoor(door3D);
        return this;
    } 

    this.getPuzzleObject3D = function () {
        return this.puzzle.getObject3D();
    }

    this.getPuzzlePieces = function () {
        return this.puzzle.getPieces();
    }

    this.getPuzzlePieceByObject = function (object) {
        return this.puzzle.getPieceByObject(object);
    }

    this.getFile = function (type) {
        var exporter = null;
        
        switch (type) {
            case 'obj':
                exporter = new THREE.OBJExporter();
                break;
            case 'stl':
                exporter = new THREE.STLExporter();
                break;
            default:
                break;
        }

        if (!exporter) {
            console.error('Type "' + type + '" of export not supported!');
            return;
        }

        var temp = {
            position: this.position.clone(),
            rotation: this.rotation.clone()
        };

        this.position.set(0, 0, 0);
        this.rotation.set(0, 0, 0);

        var removeBefore = [];
        var removeAfter = [];

        this.children.forEach(function (child, index) {
            if (child instanceof Wall3D) {
                child.prepareForExport().getName();

                if (type === 'obj') {
                    var wallWithoutHoles = child.getCloneWithoutHoles();
                    if (wallWithoutHoles) {
                        this.add(wallWithoutHoles);
                        removeAfter.push(wallWithoutHoles);
                    }
                }
            } else if (child instanceof FlatSurface) {
                child.remove(child.ceiling);
                child.getName();

                if (child.replacedWithCut) {
                    removeBefore.push(this.children[index]);
                }
            } else if (child instanceof Camera3D) {
                var camMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)); // Hint: for player needs
                camMesh.name = 'camera_pos' + child.camera2D.id;
                camMesh.position.set(child.position.x, child.position.y, child.position.z);

                this.add(camMesh);
                removeAfter.push(camMesh);
                removeBefore.push(this.children[index]);
            } else {
                removeBefore.push(this.children[index]);
            }
        }.bind(this));

        this.updateMatrixWorld(true);

        removeBefore.forEach(function (child) {
            this.remove(child);
        }.bind(this));

        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                var exportFile = exporter.parse(this);

                this.position.copy(temp.position);
                this.rotation.copy(temp.rotation);
                this.updateMatrixWorld(true);

                removeAfter.forEach(function (child) {
                    this.remove(child);
                }.bind(this));
                removeBefore.forEach(function (child) { // Return objects
                    this.add(child);
                }.bind(this));

                this.children.forEach(function (child) {
                    if (child instanceof Wall3D) {
                        child.resetExportPrepared();
                    } else if (child instanceof FlatSurface) {
                        child.makeCeiling();
                    }
                });

                resolve(exportFile);
            }.bind(this), 1000)
        }.bind(this));
    }

    this.getStructure = function (raw) {
        this.resetPositionOffset();

        var structure = {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: this.getAngle()
        };

        if (this.isEditable()) {
            structure.data = {
                wallsHeight: this.config.wallsHeight,

                cameras: {},
                walls: {},
                floors: {},
                rooms: [],
                cuts: []
                // arrows between rooms
            };

            Object.keys(structure.data).forEach(function (dataKey) {
                const data = structure.data[dataKey];

                if (dataKey === 'rooms') {
                    this.rooms.forEach(function (room) {
                        structure.data.rooms.push(room.getStructure());
                    });
                } else if (dataKey === 'cuts') {
                    this.floorCut.lines.forEach(function (line) {
                        if (line.isSaved()) {
                            structure.data.cuts.push(line.getStructure());
                        }
                    });
                } else if (typeof(data) === 'object') {
                    this.forEachInGroup(dataKey, function (item) {
                        data[item.getId()] = item.getStructure();
                    });
                }
            }.bind(this));

            if (!raw) {
                structure.data = JSON.stringify(structure.data);
            }
        }

        return structure;
    }

    this.setStructure = function (structure) {
        this.resetPositionOffset();

        if (structure) {
            this.structure = structure;
        }

        if (!this.structure) {
            return;
        }

        this.position.x = this.structure.position.x;
        this.position.y = this.structure.position.y;
        this.position.z = this.structure.position.z;

        this.rotation.y = this.structure.rotation;

        if (this.structure.data) {
            if (typeof(this.structure.data) === 'string') {
                this.structure.data = JSON.parse(this.structure.data);
            }

            this.setDefaultWallsHeight(this.structure.data.wallsHeight);
            this.floorCut.lines.forEach(function (line) {
                this.remove(line);
            });
            this.floorCut.lines = [];

            Object.keys(this.structure.data).forEach(function (dataKey) {
                const itemsData = this.structure.data[dataKey];

                if (this.loaded === 'floorPlan2D') {
                    if (dataKey === 'rooms') {
                        this.rooms = [];
    
                        itemsData.forEach(function (itemStructure) {
                            this.addRoom().setStructure(this, itemStructure);
                        }.bind(this));
                    } else if (dataKey === 'cuts') {
                        itemsData.forEach(function (itemStructure) {
                            var cut = new FloorCutLine3D;
                            cut.setStructure(itemStructure);
                            this.floorCut.lines.push(cut);
                            this.add(cut);
                        }.bind(this));
                    } else if (dataKey === 'cameras' && window.notPassCameras === undefined) {
                        // pass cameras, force load from 2D floor
                    } else if (typeof(itemsData) === 'object') {
                        Object.keys(itemsData).forEach(function (itemKey) {
                            var itemStructure = itemsData[itemKey];
                            var foundItem = this.findInGroup(dataKey, function (item) {
                                return item.getId() === itemKey;
                            });
        
                            if (foundItem) {
                                foundItem.setStructure(this, itemStructure);
                            }
                        }.bind(this));
                    }
                } else if (this.loaded === 'objFile') {
                    if (dataKey === 'cameras') {
                        Object.keys(itemsData).forEach(function (cameraKey) {
                            var camera = itemsData[cameraKey];
                            var camera3D = this.findInGroup('cameras', function (c) { 
                                return c.cameraID === cameraKey 
                            });

                            if (!camera3D) {
                                camera3D = new Camera3D(cameraKey, this.texturesCache, this.textureSize);
                                this.add(camera3D).addToGroups(camera3D, ['cameras']);
                            }

                            camera3D.setStructure(null, {
                                position: camera.position,
                                rotation: camera.rotation
                            });
                        }.bind(this));
                    } else if (dataKey === 'walls') {
                        Object.keys(itemsData).forEach(function (wallKey) {
                            const wall = itemsData[wallKey];
                            const wallObject = this.getObjectByName(wall.name);
                    
                            if (wallObject) {
                              if (wallObject.geometry instanceof THREE.BufferGeometry) {
                                wallObject.geometry = new THREE.Geometry().fromBufferGeometry(wallObject.geometry);
                              }

                              wallObject.setStructure(this, 'wall', wall);
                            }
                        }.bind(this));
                    } else if (dataKey === 'floors') {
                        Object.keys(itemsData).forEach(function (floorKey) {
                            const floor = itemsData[floorKey];
                            const floorObject = this.getObjectByName(floor.name);
                    
                            if (floorObject) {
                              if (floorObject.geometry instanceof THREE.BufferGeometry) {
                                floorObject.geometry = new THREE.Geometry().fromBufferGeometry(floorObject.geometry);
                              }

                              floorObject.setStructure(this, 'floor', floor);
                            }
                        }.bind(this));
                    }
                }
            }.bind(this));

            this.cutFloorsWithLines();
        }

        return this;
    }
}

Floor3D.prototype = Object.create(THREE.Group.prototype);
Floor3D.prototype.constructor = Floor3D;