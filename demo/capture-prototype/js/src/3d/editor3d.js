'use strict';


/**
 * Main 3D view tab class
 * @class
 */
const Editor3D = function () {
    this.scene = null;
    this.data = new Editor3DData;
    this.controls = new Editor3DControls().init();
    this.events = new EventsSystem('Editor3D');
    this.container = document.querySelector('.editor3d');

    this.texturesCache = {};
    this.textureSize = 256;

    this.controls3D = {
        target: null,
        hoverTarget: null,
        transformTarget: null,
        parametersTarget: null,
        copyTarget: null,
        mode: 'elements',
        pressedKeys: [],
        transformMode: 'translate',
        selectedBrush: 0, // 0 - Transparent / 1 - Without texture
        selectedRoom: null,
        snap: {
            rotation: 15,
            lines: {},
            length: 25,
            visible: false,
            hideAlways: false
        },
        savedData: {
            floors: {},
            elements: {
                cornersEnabled: false,
                doorsControlsEnabled: false
            }
        }, 
        classes: {
            puzzle: [Wall3D, FlatSurface, Door3D, Puzzle3D],
            floors: [Wall3D, Floor3DPart],
            rooms: [Wall3D, FlatSurface],
            elements: [
                Wall3D,
                FlatSurface,
                Camera3DPointer,
                Door3D,
                Door3DControl,
                Corner3DLever,
                FloorCutPlane3D, 
                FloorCutLineLever3D
            ],
        },
        useParent: {
            floors: true,
            puzzle: false,
            rooms: false,
            elements: false
        }
    };

    this.enabled = false;
    this.needReset = false;
    this.editorFloor = 0;
    this.floors = {};

    this.config = {
        wallsHeight: 250
    };

    this.structure = {};

    Object.defineProperty(this, 'wallsHeight', { //default height for each wall
        get: function () {
            return this.config.wallsHeight;
        }.bind(this),
        set: function (height) {
            this.config.wallsHeight = height;
            this.setDefaultWallsHeight(this.config.wallsHeight);
        }.bind(this)
    });

    this.setDataParameters = function (data, urlParameters) {
        this.data
            .setParameters(urlParameters._origin, data.tour.id, urlParameters.orderId)
            .setToken(urlParameters.authToken);
        return this;
    }

    this.getEditorFloor = function () {
        return this.floors[this.editorFloor];
    }

    this.safeGetEditorFloor = function (callback) {
        const editorFloor = this.getEditorFloor();
        if (editorFloor) callback(editorFloor);
        return this;
    }

    this.enable = function () {
        if (!this.scene) {
            this.scene = new Scene3D;
            this.scene.mount().setRaycastClasses(this.controls3D.classes[this.controls3D.mode]);

            setInterval(function () {               
                this.safeGetEditorFloor(function (editorFloor) {
                    editorFloor.updateCamerasShaders();
                }.bind(this));
            }.bind(this), 1000);

            this.scene.events.setOn('objectHovered', 'set-target', function (event) {
                if (event.hovered) {
                    this.controls3D.hoverTarget = null;
                    const object = event.hovered.object;
                    var target = null;
    
                    if (typeof(object.getInteractionObject) === 'function') {
                        target = object.getInteractionObject(this.controls3D.mode);
                    } else {
                        // Todo: change to function in all objects 
                        target = ((
                            this.controls3D.useParent[this.controls3D.mode] || object.useParent
                        ) && object.useParent !== false) ? object.parent : object;
                    }
    
                    // console.log('Hovered:', event.hovered, target);
    
                    if (this.controls3D.mode === 'elements') {
                        this.getEditorFloor().updateFloorCutLine(event.hovered);
                    }
                }
            }.bind(this));
    
            this.scene.events.setOn('objectClicked', 'set-target', function (event) {
                if (event.clicked) {
                    this.controls3D.target = null;
                    const object = event.clicked.object;
                    const editorFloor = this.getEditorFloor();
                    var target = null;
                    
                    if (typeof(object.getInteractionObject) === 'function') {
                        target = object.getInteractionObject(this.controls3D.mode);
                    } else {
                        // Todo: change to function in all objects 
                        target = ((
                            this.controls3D.useParent[this.controls3D.mode] || object.useParent
                        ) && object.useParent !== false) ? object.parent : object;
                    }
    
                    console.log('Clicked:', event.clicked, target);
    
                    if (this.keysIsPressed(['ALT'])) {
                        this.controls3D.target = target;
                        if (this.controls3D.mode === 'elements') {
                            this
                                .setTransform(target)
                                .showParameters(target)
                                .setBrushFromObject(target, event.clicked.faceIndex);
                        } else if (this.controls3D.mode === 'floors') {
                            this.setTransform(target);
                        } else if (this.controls3D.mode === 'rooms') { // room mode
                            this.setRoomFromObject(target, event.clicked.faceIndex);
                        } else if (this.controls3D.mode === 'puzzle') {
                            this.showParameters(target);
                            this.setPuzzleActivePiece(editorFloor.getPuzzlePieceByObject(object));
                            editorFloor.puzzleLinkDoor(target);
                        }
                    }
    
                    if (this.keysIsPressed(['SHIFT'])) {
                        this.controls3D.copyTarget = target;
                        if (this.controls3D.mode === 'elements') {
                            if (this.checkControlAvalible('brush')) {
                                this.applyBrush(event.clicked);
                            } else if (this.checkControlAvalible('cut')) {
                                editorFloor.setFloorCutLine(event.clicked);
                            }
                        } else if (this.controls3D.mode === 'rooms') {
                            this.applyToRoom(event.clicked);
                        }
                    }
                } else {
                    if (this.controls3D.mode !== 'floors') {
                        this.hideParameters();
                    }
                }
            }.bind(this));
    
            this.scene.events.setOn('transformObject', 'trySnap', function (transformController) {
                this.snapObject(transformController);
            }.bind(this));
    
            this.scene.events.setOn('transformDragging', 'getValue', function (data) {
                this.updateSnapLinesWithObject(data.value, data.target.object).setSnapLinesVisibility(data.value);
    
                if (!data.value) {
                    this.getSnapLines();
                }
            }.bind(this));
    
            this.controls.events.setOn('button-group-change-editor3dTransform', 'set-transform', function (event) {
                const mode = typeof(event) === 'string' ? event : event.target.value;
                this.setControlsMode(mode);
            }.bind(this));
    
            /* Controls events */
            this.controls.events.setOn('button-group-change-editor3dTransformMode', 'set-treansform-mode', function (event) {
                const mode = event.target.value;
                this.setTransformMode(mode);
            }.bind(this));
    
            this.controls.events.setOn('click-uploadToServer', 'upload', function (event) {
                this.resetTransform().getFloorFile(this.editorFloor, 'obj').then(function (result) {
                    var file = result;
                    var json = this.getStructure(true);
    
                    var statuses = {
                        model: false,
                        structure: false,
                        cameras: false
                    };
    
                    var checkStatuses = function () {
                        var allStatusesOk = !Object.keys(statuses).find(function (sKey) {
                            return !statuses[sKey];
                        });
    
                        console.log('Load statuses:', statuses);
    
                        if (allStatusesOk) {
                            alert('Data successfully uploaded!');
                        }
                    }
    
                    this.data
                        .saveObjToServer(this.editorFloor, file, function () {
                            statuses.model = true;
                            checkStatuses();
                        }).saveJsonToServer(json, function () {
                            statuses.structure = true;
                            checkStatuses();
                        });
    
                    this.events.fire('exportData', {
                        json: json,
                        file: file,
                        statuses: statuses,
                        checkStatuses: checkStatuses
                    });
                }.bind(this));
            }.bind(this));
    
            this.controls.events.setOn('click-getGif', 'getGif', function (event) {
                this.getGif();
            }.bind(this));
    
            this.controls.events.setOn('click-downloadModelObj', 'download', function (event) {
                this.getFloorFile(this.editorFloor, 'obj').then(function (result) {
                    this.data.returnFile(result, jsonData.tour.name + ' Floor ' + this.editorFloor + ' Model.obj');
                }.bind(this));
            }.bind(this));
    
            this.controls.events.setOn('click-downloadModelStl', 'download', function (event) {
                this.getFloorFile(this.editorFloor, 'stl').then(function (result) {
                    this.data.returnFile(result, jsonData.tour.name + ' Floor ' + this.editorFloor + ' Model.stl');
                }.bind(this));
            }.bind(this));
    
            this.controls.events.setOn('click-downloadXml', 'download', function () {
                var exportInstance = new CommonExport(this.getEditorFloor().floorPlan2D, {wallsHeight: this.wallsHeight}, true);
                exportInstance.toXML();
            }.bind(this));
    
            this.controls.events.setOn('click-downloadPositions', 'download', function () {
                var cExport = new Export(this.getEditorFloor().floorPlan2D, true);
                cExport.saveCamerasList();
            }.bind(this));
    
            this.controls.events.setOn('click-addRoom', 'add-room', function (event) {
                var room = this.getEditorFloor().addRoom();
                this.controls3D.selectedRoom = room.getId();
                this.setRoomsControls();
            }.bind(this));
    
            this.controls.events.setOn('click-removeRoom', 'remove-room', function (event) {
                this.getEditorFloor().removeRoom(this.controls3D.selectedRoom);
                this.setRoomsControls();
            }.bind(this));
    
            this.controls.events.setOn('click-mergeRooms', 'merge', function (event) {
                this.resetTransform();
                this.events.fire('mergeRooms', {});
    
                setTimeout(function () {
                    this.safeGetEditorFloor(function (editorFloor) {
                        this.resetTransform();
        
                        editorFloor
                            .setFloorFromPlan2D(editorFloor.floorPlan2D)
                            .loadTextures()
                            .raycastTextures();
        
                        this.setPuzzleControls();
                    }.bind(this));
                }.bind(this), 500);
            }.bind(this));
    
            this.controls.events.setOn('click-assembleRooms', 'assemble', function (event) {
                this.getEditorFloor().puzzle.assembleRooms();
            }.bind(this));
    
            this.controls.events.setOn('click-mergeCorners', 'merge', function (event) {
                this.resetTransform();
                this.events.fire('mergeRooms', {});
    
                setTimeout(function () {
                    this.safeGetEditorFloor(function (editorFloor) {
                        this.resetTransform();
        
                        editorFloor
                            .setFloorFromPlan2D(editorFloor.floorPlan2D)
                            .loadTextures()
                            .raycastTextures();
        
                        this.enableElements().setPuzzleControls().getSnapLines();
                    }.bind(this));
                }.bind(this), 500);
            }.bind(this));
    
            this.controls.events.setOn('click-resetFloor', 'reset', function (event) {
                this.resetFloorStructure(this.editorFloor);
            }.bind(this));
    
            this.controls.events.setOn('accordeon-brush', 'brush-on', function (item) {
                if (!item.hidden) {
                    this.safeGetEditorFloor(function (editorFloor) {
                        editorFloor.showWalls();
                        editorFloor.hideCutPlane();
                    }.bind(this));
                    this.controls.hideAccordeon('cut');
                    this.getEditorFloor().setFloorCutLine(null);
                }
            }.bind(this));
    
            this.controls.events.setOn('accordeon-cut', 'cut-on', function (item) {
                if (item.hidden) {
                    this.safeGetEditorFloor(function (editorFloor) {
                        editorFloor.showWalls();
                        editorFloor.hideCutPlane();
                    }.bind(this));
                    this.getEditorFloor().setFloorCutLine(null);
                } else {
                    this.safeGetEditorFloor(function (editorFloor) {
                        editorFloor.hideWalls();
                        editorFloor.showCutPlane();
                    }.bind(this));
                    this.controls.hideAccordeon('brush');
                }
            }.bind(this));
        }

        this.scene.camera.position.set(1500, 1500, 1500);
        this.scene.camera.lookAt(0, 0, 0);

        this.enabled = true;
        this.setEditorControls()
            .updateSnap({translation: this.controls3D.snap.translation, rotation: this.controls3D.snap.rotation});

        this.controls3D.target = null;
        this.resetTransform();

        this.controls.events.fire('button-group-change-editor3dTransform', 'elements');
        this.syncControls();

        return this;
    }

    this.disable = function () {
        this.enabled = false;
        if (this.scene) {
            this.structure = this.getStructure();

            this.scene.unmount();

            Object.keys(this.floors).forEach(function (floorNumber) {
                const floor = this.floors[floorNumber];

                if (floor.isClearable()) {
                    delete this.floors[floorNumber];
                }
            }.bind(this));
        }

        return this;
    }

    this.syncControls = function () {
        this.controls.controls.editor3dTransform.setValue(this.controls3D.mode);
        this.controls.controls.editor3dTransformMode.setValue(this.controls3D.transformMode);

        return this;
    }

    this.syncWith2D = function (floorNumber, floorPlan2D) {
        floorNumber = parseInt(floorNumber);
        this.scene.clear();

        if (!this.floors[floorNumber]) {
            this.editorFloor = parseInt(floorNumber);
            this.floors[floorNumber] = 
                new Floor3D(floorNumber, this.texturesCache, this.textureSize)
                    .setDefaultWallsHeight(this.config.wallsHeight);
            this.scene.add(this.floors[floorNumber]);
        }

        this.floors[floorNumber].setFloorFromPlan2D(floorPlan2D);
        this.getSnapLines();

        if (this.controls3D.mode !== 'floors') {
            this.floors[floorNumber].moveToCenter();
        }

        return this;
    }

    this.loadModelsFromMaps = function (maps) {
        Object.keys(maps).forEach(function (mapKey) {
            mapKey = parseInt(mapKey);

            if (!this.floors[mapKey]) {
                this.data.getFloorModelLink(mapKey).then(function (resultUrl) {
                    this.floors[mapKey] = new Floor3D(mapKey, this.texturesCache, this.textureSize);
                    this.floors[mapKey].loadFloorFromUrl(resultUrl);
                    this.floors[mapKey].visible = false;
                    this.scene.add(this.floors[mapKey]);

                    this.setStructure().updateFloorsSelector();
                }.bind(this)).catch(function (reject) {
                });
            }
        }.bind(this));
        return this;
    }

    this.setEditorControls = function () {
        var editorControls = [
            new ControlsElement({
                id: 'showSnapLines',
                label: 'Show snap lines:',
                type: 'checkbox',
                value: !this.controls3D.snap.hideAlways,
                onChange: function (value) {
                    this.controls3D.snap.hideAlways = !value;
                }.bind(this)
            }), 
            new ControlsElement({
                id: 'rotationSnap',
                label: 'Rotation snap:', 
                type: 'input',
                value: this.controls3D.snap.rotation,
                onChange: function (value) {
                    value = parseFloat(value);

                    if (!isNaN(value)) {
                        this.updateSnap({rotation: value});
                    }
                }.bind(this)
            })
        ];

        this.controls.assemble('editor3d-editor-options', editorControls);

        return this;
    }

    this.setPuzzleActivePiece = function (piece) {
        if (piece) {
            this.controls.assembled['editor3d-puzzle-pieces'].forEach(function (cElement) {
                if (piece.id === cElement.id) {
                    cElement.setValue(!cElement.value, true);
                    cElement.onChange({value: cElement.value});
                }
            });
        }

        return this;
    }

    this.setPuzzleControls = function () {
       var puzzleControls = [];

        this.safeGetEditorFloor(function (editorFloor) {
            var pieces = editorFloor.getPuzzlePieces();
    
            puzzleControls.push.apply(puzzleControls, pieces.map(function (piece, index) {
                return new ControlsElement({
                    id: piece.id,
                    label: piece.parts.join(', ') + ':',
                    type: 'checkbox',
                    value: piece.enabled,
                    onChange: function (value) {
                        this.resetTransform();
                        piece.enabled = value;
    
                        var object3D = editorFloor.getPuzzleObject3D();
    
                        if (object3D) {
                            this.setTransform(object3D);
                        }
                    }.bind(this)
                });
            }.bind(this)));
        }.bind(this));

        this.controls.assemble('editor3d-puzzle-pieces', puzzleControls);

        return this;
    }

    this.setCutsControls = function () {
        var cutControls = [
            new ControlsElement({
                id: 'cutFloors',
                label: '<span class="glyphicon glyphicon-scissors"></span> Cut floors', 
                type: 'button',
                onClick: function (value) {
                    this.getEditorFloor().cutFloorsWithLines();
                }.bind(this)
            })
        ];

        this.controls.assemble('editor3d-cut-options', cutControls);

        return this;
    }

    this.setRoomsControls = function () {
        var roomsControls = [];

        this.safeGetEditorFloor(function (editorFloor) {
            const floor = editorFloor;

            var rooms = floor.getRooms();
            var selectedRoom = rooms.find(function (room) {
                return room.getId() === this.controls3D.selectedRoom;
            }.bind(this)); 
            var roomsOptions = Object.keys(rooms).map(function (rKey) {
                const room = rooms[rKey];
                
                return {
                    name: room.getName(),
                    value: room.getId()
                }
            });

            roomsControls.push(new ControlsElement({
                id: 'selected-room',
                label: 'Edit room:',
                // labelTemplate: label,
                type: 'select',
                options: roomsOptions,
                value: this.controls3D.selectedRoom,
                onChange: function (value) {
                    this.controls3D.selectedRoom = value;
                    this.setRoomsControls();
                }.bind(this)
            }));

            if (selectedRoom) {
                var unnamedCamerasIndex = 0;
                var camerasOptions = [];
                floor.forEachInGroup('cameras', function (camera) {
                    var cameraName = camera.getName();
                    camerasOptions.push({
                        name: cameraName !== 'undefined' ? cameraName : 'Camera ' + ++unnamedCamerasIndex,
                        value: camera.getId()
                    });
                });

                roomsControls.push(new ControlsElement({
                    id: 'selected-room-color',
                    label: 'Room color (only in editor):',
                    type: 'color',
                    value: '#' + selectedRoom.getColorHex(),
                    onChange: function (value) {
                        selectedRoom.setColorHex(value.replace('#', ''));
                        this.setRoomsControls();
                    }.bind(this)
                }), new ControlsElement({
                    id: 'selected-room-name',
                    label: 'Room name:',
                    type: 'input',
                    value: selectedRoom.getName(),
                    onChange: function (value) {
                        selectedRoom.setName(value);
                        this.setRoomsControls();
                    }.bind(this)
                }), new ControlsElement({
                    id: 'selected-room-camera',
                    label: 'Room camera:',
                    type: 'select',
                    value: selectedRoom.getCameraId(),
                    options: camerasOptions,
                    onChange: function (value) {
                        var camera = floor.findInGroup('cameras', function (camera) {
                            return camera.getId() === value;
                        });

                        selectedRoom.setMainCamera(camera);
                        this.setRoomsControls();
                    }.bind(this)
                }));

                this.getEditorFloor().updateRooms();
            }
        }.bind(this));

        this.controls.assemble('editor3d-selected-room', roomsControls);

        return this;
    }

    this.enableElements = function () {
        //.showCorners().showDoorsControls()
        var updateCorners = function () {
            if (this.controls3D.savedData.elements.cornersEnabled) {
                this.showCorners();
            } else {
                this.hideCorners();
            }
        }.bind(this);

        var updateDoorsControls = function () {
            if (this.controls3D.savedData.elements.doorsControlsEnabled) {
                this.showDoorsControls();
            } else {
                this.hideDoorsControls();
            }
        }.bind(this);

        var elementsControls = [
            new ControlsElement({
                id: 'corners-enabled',
                label: 'Corners visible:',
                type: 'checkbox',
                value: this.controls3D.savedData.elements.cornersEnabled,
                onChange: function (value) {
                    this.controls3D.savedData.elements.cornersEnabled = !!value;
                    updateCorners();
                }.bind(this)
            }), new ControlsElement({
                id: 'doors-controls-enabled',
                label: 'Doors controls visible:',
                type: 'checkbox',
                value: this.controls3D.savedData.elements.doorsControlsEnabled,
                onChange: function (value) {
                    this.controls3D.savedData.elements.doorsControlsEnabled = !!value;
                    updateDoorsControls();
                }.bind(this)
            })
        ];

        this.controls.assemble('editor3d-elements-parameters', elementsControls);

        updateCorners();
        updateDoorsControls();

        return this;
    }

    this.disableElements = function () {
        this.hideCorners().hideDoorsControls();
        return this;
    }

    this.setTextureSizeFromTour = function (tour) {
        var roomsLength = Object.keys(tour.rooms).length;

        if (roomsLength > 1000) {
            this.textureSize = 32;
        } else if (roomsLength > 500) {
            this.textureSize = 64;
        } else if (roomsLength > 250) {
            this.textureSize = 128;
        } else {
            this.textureSize = 256;
        }

        return this;
    }

    this.setTextruesFromRooms = function (rooms, useCubemap) {
        var brushOptions = new ControlsElement({
            label: 'Select brush:',
            // labelTemplate: 'Select brush:',//'Brush {{value}}',
            type: 'brush-select',
            value: 0,
            options: [
                {name: 'Transparent', value: 0, hideName: true, image: 'images/editor3d/transparent-brush.jpg'},
                {name: 'Without texture', value: 1, hideName: true, image: 'images/editor3d/nodata-brush.jpg'}
            ],
            onChange: function (value) {
                this.controls3D.selectedBrush = value;
            }.bind(this)
        });

        var roomIndex = 0;
        Object.keys(rooms).forEach(function (rKey) {
            const room = rooms[rKey];

            var cubicPattern = room.cubePatternTransition || room.cubePatternDesktop;
            useCubemap = useCubemap && cubicPattern;

            this.texturesCache[rKey] = {
                cubeMap: useCubemap,
                url: useCubemap ? cubicPattern : room.url
            };

            if (room.plan === this.editorFloor) {
                brushOptions.addOption(
                    room.name || ('Room ' + ++roomIndex),
                    rKey,
                    {image: useCubemap ? cubicPattern.replace('%s', 'f').replace(".JPG", ".jpg") : room.url}
                );
            }
        }.bind(this));

        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            floor.loadTextures().raycastTextures();
        }.bind(this));

        this.controls.assemble('editor3d-brush-options', [brushOptions]);
        this.controls3D.selectedBrush = 0;
        this.controls.assembled['editor3d-brush-options'][0].setValue(0);

        return this;
    }

    this.showParameters = function (object) {
        if (
            this.controls3D.parametersTarget &&
            typeof(this.controls3D.parametersTarget.onParametersHidden) === 'function'
        ) {
            this.controls3D.parametersTarget.onParametersHidden();
        }

        this.controls3D.parametersTarget = object;

        if (typeof(object.getParameters) === 'function') {
            var parameters = object.getParameters(
                this.controls3D.mode,
                this.getEditorFloor()
            );
            
            if (parameters) {
                this.controls.enableAccordeon('selected').assemble('editor3d-selected-parameters', parameters);
    
                if (typeof(object.onParametersShown) === 'function') {
                    object.onParametersShown();
                }
            }
        } else {
            this.controls.disableAccordeon('selected');
        }

        return this;
    }

    this.hideParameters = function () {
        this.controls.disableAccordeon('selected');

        if (
            this.controls3D.parametersTarget &&
            typeof(this.controls3D.parametersTarget.onParametersHidden) === 'function'
        ) {
            this.controls3D.parametersTarget.onParametersHidden();
        }

        this.controls3D.parametersTarget = null;

        return this;
    }

    this.showFloors = function () {
        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];

            if (this.controls3D.savedData.floors[fKey]) {
                floor.visible = true;
            } else {
                floor.visible = false;
            }
        }.bind(this));

        this.controls.assembled['editor3d-floors-options'].forEach(function (element) {
            element.setValue(this.controls3D.savedData.floors[element.id.replace('floor-', '')]);
        }.bind(this));

        return this;
    }

    this.hideFloors = function () {
        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            if (fKey != this.editorFloor) {
                floor.visible = false;
            } else {
                floor.visible = true;
            }
        }.bind(this));

        this.safeGetEditorFloor(function (editorFloor) {
            this.controls.assembled['editor3d-floors-options'].forEach(function (element) {
                if (element.floorNumber !== this.editorFloor) {
                    element.setValue(false);
                } else {
                    element.setValue(true);
                }
            }.bind(this));
        }.bind(this));

        return this;
    }

    this.showCorners = function () {
        Object.keys(this.floors).forEach(function (fKey) {
            this.floors[fKey].setCornersVisibility(true);

            this.floors[fKey].forEachInGroup('corners', function (corner3D) {
                corner3D.updateHeightFromWalls();
            }.bind(this));
        }.bind(this));

        return this;
    }

    this.hideCorners = function () {
        Object.keys(this.floors).forEach(function (fKey) {
            this.floors[fKey].setCornersVisibility(false);
        }.bind(this));

        return this;
    }

    this.showDoorsControls = function () {
        Object.keys(this.floors).forEach(function (fKey) {
            this.floors[fKey].showDoorsControls();
        }.bind(this));

        return this;
    }

    this.hideDoorsControls = function () {
        Object.keys(this.floors).forEach(function (fKey) {
            this.floors[fKey].hideDoorControls();
        }.bind(this));

        return this;
    }

    this.moveFloorsToCenter = function (axes) {
        var baseObject = new THREE.Object3D();

        this.scene.scene.children.forEach(function (child) {
            if (child instanceof Floor3D) {
                baseObject.add(child.getBoundingBox(true));
            }
        });

        var box = new THREE.Box3().setFromObject(baseObject);

        // debug things
        // var boxH = new THREE.BoxHelper(baseObject, 0x00FF00);
        // this.scene.scene.add(boxH);
        // this.scene.scene.add(baseObject);

        var moveVector = new THREE.Vector3();
        moveVector.add(box.min);
        moveVector.add(box.max);
        moveVector.multiplyScalar(0.5);

        this.scene.scene.children.forEach(function (child) {
            if (child instanceof Floor3D) {
                Object.keys(child.position).forEach(function (key) {
                    if (~axes.indexOf(key)) {
                        child.position[key] -= moveVector[key];
                    }
                });
            }
        });

        return this;
    }

    this.updateFloorsSelector = function () {
        var floorsSelectors = [];

        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            var label = (floor.isEditable() ? '🌕' : '🌑') + ' Floor ' + fKey + ':';

            if (this.controls3D.savedData.floors[fKey] === undefined) {
                this.controls3D.savedData.floors[fKey] = true;
            }

            floorsSelectors.push(new ControlsElement({
                id: 'floor-' + fKey,
                label: label,
                labelTemplate: label,
                type: 'checkbox',
                value: this.controls3D.savedData.floors[fKey],
                floorNumber: parseInt(fKey),
                onChange: function (value) {
                    if (floor) {
                        this.controls3D.savedData.floors[fKey] = value;
                        floor.visible = value;
                    }
                }.bind(this),
                onLabelClick: function () {
                    floorsSelectors.forEach(function (selector) {
                        if (selector.id === 'floor-' + fKey) {
                            selector.onChange({value: true});
                            selector.onSetValue(true);
                        } else {
                            selector.onChange({value: false});
                            selector.onSetValue(false);
                        }
                    });
                }.bind(this)
            }));
        }.bind(this));

        floorsSelectors.sort(function (selectorA, selectorB) {
            return parseInt(selectorA.floorNumber) < parseInt(selectorB.floorNumber);
        }).reverse();

        floorsSelectors.push(new ControlsElement({
            id: 'moveToCenterXY',
            label: 'Move to center XZ axes',
            type: 'button',
            onClick: function () {
                this.moveFloorsToCenter('xz');
            }.bind(this)
        }), new ControlsElement({
            id: 'moveToCenterZ',
            label: 'Move to center Y axis',
            type: 'button',
            onClick: function () {
                this.moveFloorsToCenter('y');
            }.bind(this)
        }));

        this.controls.assemble('editor3d-floors-options', floorsSelectors);

        return this;
    }

    this.setDefaultWallsHeight = function (height) {
        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            floor.setDefaultWallsHeight(height);
        }.bind(this))

        return this;
    }

    this.checkControlAvalible = function (key) {
        var checkByAccordeon = ['cut', 'brush'];

        if (~checkByAccordeon.indexOf(key)) {
            var accordeon = this.controls.getAccordeon(key);
            return accordeon ? !accordeon.hidden : false;
        } else { // No need check
            return true;
        }
    }

    this.setControlsMode = function (mode) {
        var reset = function () {
            this.controls
                .disable('editor3dTransformMode')
                .disableAccordeon('brush')
                .disableAccordeon('puzzle')
                .disableAccordeon('rooms')
                .disableAccordeon('floors')
                .disableAccordeon('elements')
                .disableAccordeon('cut')
            this
                .hideFloors()
                .setEditorControls()
                .updateFloorsSelector()
                .resetTransform()
                .disableElements()
                .hideParameters();
                
            this.safeGetEditorFloor(function (editorFloor) {
                editorFloor
                    .hideRooms()
                    .showWalls()
                    .hideCuts()
                    .hideCutPlane()
                    .setFloorCutLine(null)
                    .moveToCenter();
            }.bind(this));
        }.bind(this);

        this.controls3D.mode = mode;
        this.controls3D.target = null;
        this.scene.setRaycastClasses(this.controls3D.classes[mode]);
        
        reset();

        if (mode === 'floors') {
            this.showFloors();

            this.controls
                .enable('editor3dTransformMode')
                .enableAccordeon('floors');

            this.safeGetEditorFloor(function (editorFloor) {
                this.showParameters(editorFloor);
                editorFloor.resetPositionOffset();
            }.bind(this));
        } else if (mode === 'elements') {
            this.controls
                .enable('editor3dTransformMode')
                .enableAccordeon('elements')
                .enableAccordeon('brush', true) // Show by default
                .enableAccordeon('cut', false); // Hidden by default 
            this.enableElements()
                .setCutsControls();
                
            this.safeGetEditorFloor(function (editorFloor) {
                editorFloor.showCuts();
            }.bind(this));
        } else if (mode === 'puzzle') {
            this.controls
                .enable('editor3dTransformMode')
                .enableAccordeon('puzzle')
            this.setPuzzleControls();
        } else if (mode === 'rooms'){
            this.controls
                .enableAccordeon('rooms');
            this.resetTransform()
                .setRoomsControls();
            
            this.safeGetEditorFloor(function (editorFloor) {
                editorFloor.showRooms();
            }.bind(this));
        }

        return this;
    }

    this.setTransform = function (transformObject) {
        this.resetTransform();

        if (transformObject) {
            const transformMode = this.controls3D.transformMode;
            this.controls3D.transformTarget = transformObject;
            this.scene.attachTransform(transformObject).setTransformMode(transformMode);
            transformObject.transformConfig.applyToTransformController(this.scene.transformControl, transformMode);
        }

        return this;
    }

    this.setTransformMode = function (mode) {
        this.controls3D.transformMode = mode;
        if (this.controls3D.transformTarget) {
            this.scene.setTransformMode(this.controls3D.transformMode);
            this.controls3D.transformTarget.transformConfig.applyToTransformController(
                this.scene.transformControl, this.controls3D.transformMode
            );
        }

        return this;
    }

    this.toogleTransformMode = function () {
        this.setTransformMode(this.controls3D.transformMode === 'translate' ? 'rotate' : 'translate');
        this.syncControls();

        return this;
    }

    this.resetTransform = function (useOnResetTransformFunction) {
        this.scene.detachTransform();

        if (useOnResetTransformFunction === undefined) useOnResetTransformFunction = true;

        if (
            useOnResetTransformFunction &&
            this.controls3D.transformTarget && 
            typeof(this.controls3D.transformTarget.onResetTransform) === 'function'
        ) {
            this.controls3D.transformTarget.onResetTransform();
        }

        this.controls3D.transformTarget = null;

        return this;
    }

    this.applyBrush = function (clickedObject) {
        if (this.controls3D.selectedBrush === 0 || this.controls3D.selectedBrush === 1) {
            if ((typeof clickedObject.object.setSideDefaultMaterialByFace) === 'function') {
                clickedObject.object.setSideDefaultMaterialByFace(this.controls3D.selectedBrush, clickedObject.faceIndex);
            }
        } else {
            const camera = this.getEditorFloor().findInGroup('cameras', function (camera) {
                return camera.cameraID === this.controls3D.selectedBrush;
            }.bind(this));

            if (camera && clickedObject.object.setSideCameraMaterialByFace) {
                clickedObject.object.setSideCameraMaterialByFace(camera, clickedObject.faceIndex);
            }
        }

        return this;
    }

    this.applyToRoom = function (clickedObject) {
        var room = this.getEditorFloor().rooms.find(function (room) {
            return room.getId() === this.controls3D.selectedRoom;
        }.bind(this));

        if (room) {
            if (clickedObject.object instanceof Wall3D) {
                room.addWall(clickedObject.object, clickedObject.faceIndex);
            } else if (clickedObject.object instanceof FlatSurface) {
                room.addFloor(clickedObject.object);
            }

            this.getEditorFloor().updateRooms();
        }

        return this;
    }

    this.setBrushFromObject = function (target, faceIndex) {
        if (typeof(target.getMaterialByFace) === 'function') {
            var material = target.getMaterialByFace(faceIndex);
            if (material !== undefined) {
                this.controls3D.selectedBrush = material;
                this.controls.assembled['editor3d-brush-options'][0].setValue(material);
            }
        }

        return this;
    }

    this.setRoomFromObject = function (target, faceIndex) {
        if (typeof(target.getRoomByFace) === 'function') {
            var room = target.getRoomByFace(faceIndex);
            if (room !== undefined) {
                this.controls3D.selectedRoom = room;
                this.setRoomsControls();
            }
        }

        return this;
    }

    this.setViewMode = function (mode) {
        if (mode === 'player') {
            this.scene.zeroAxes.visible = false;
        } else if (mode === 'editor') {
            this.scene.zeroAxes.visible = true;
        }

        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            floor.setViewMode(mode);
        }.bind(this));

        return this;
    }

    this.getGif = function () {
        // https://github.com/jnordberg/gif.js
        var sizes = [];
        var maxHeight = null;
        var minHeight = null;

        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            
            if (!minHeight || minHeight > floor.position.y) {
                minHeight = floor.position.y;
            }

            if (!maxHeight || maxHeight < floor.position.y + floor.height) {
                maxHeight = floor.position.y + floor.height;
            }

            var box = new THREE.Box3().setFromObject(floor);
            var sphere = box.getBoundingSphere();

            var centerPoint = sphere.center;
            var floorSize = new THREE.Vector3(box.min.x, box.min.y, box.min.z).distanceTo(box.max);
            var centerOffset = new THREE.Vector3().distanceTo(centerPoint);

            sizes.push(floorSize + centerOffset);
        }.bind(this));

        sizes.push(Math.abs(minHeight - maxHeight) / 3 * 2);

        var maxSize = Math.max.apply(null, sizes);

        this.setControlsMode('floors');
        this.setViewMode('player');
        this.scene.renderer.setSize(600, 400);

        var gif = new GIF({
            workerScript: 'js/vendor/gif/gif.worker.js',
            workers: 2,
            quality: 10,
            background: '#000',
            transparent: 'rgba(0,0,0,0)'
        });

        var frames = 100;
        var animationTime = 5000;
        var cameraDistance = maxSize + 500;

        for (var index = 1; index <= frames; index++) {
            var frameShot = function () {
                var passIndex = index + 0;
                var isLastIndex = index === frames;
    
                setTimeout(function () {   
                    var angle = Math.PI * 2 * (passIndex / frames);

                    this.scene.camera.position.set(
                        cameraDistance * Math.sin(angle), 
                        cameraDistance / 3 * 2, 
                        cameraDistance * Math.cos(angle)
                    );
                    this.scene.camera.lookAt(0, 0, 0);
                    this.scene.render();

                    gif.addFrame(this.scene.renderer.domElement, {copy: true, delay: animationTime / frames});

                    if (isLastIndex) {
                        gif.render();
                        this.scene.onResize();
                        this.setViewMode('editor');
                    }
                }.bind(this), 25 * index);
            }.bind(this)

            frameShot();
        }

        gif.on('finished', function(blob) {
            window.open(URL.createObjectURL(blob));
        });
    }
    
    /**
     * Get snap lines
     */
    this.getSnapLines = function () {
        Object.keys(this.controls3D.snap.lines).forEach(function (id) {
            const line = this.controls3D.snap.lines[id];
            
            if (line.object) this.scene.remove(line.object);
            
            delete this.controls3D.snap.lines[id];
        }.bind(this));

        const editorFloor = this.getEditorFloor();
        var corners = editorFloor.getCorners();
        var walls = editorFloor.getWalls();

        var xs = [];
        var zs = [];

        corners.forEach(function (corner) {
            var cornerWorldPosition = corner.getWorldPosition();

            if (!~xs.indexOf(cornerWorldPosition.x)) {
                xs.push(cornerWorldPosition.x);
            }
            if (!~zs.indexOf(cornerWorldPosition.z)) {
                zs.push(cornerWorldPosition.z);
            }
        });

        xs.forEach(function (x, index) {
            this.controls3D.snap.lines['x_' + index] = {
                startPoint: new THREE.Vector3(x, 0, -10000),
                endPoint: new THREE.Vector3(x, 0, 10000),
            };
        }.bind(this));

        zs.forEach(function (z, index) {
            this.controls3D.snap.lines['z_' + index] = {
                startPoint: new THREE.Vector3(-10000, 0, z),
                endPoint: new THREE.Vector3(10000, 0, z),
            };
        }.bind(this));
        
        walls.forEach(function (wall) {
            var startPoint = wall.corners.start.object.getWorldPosition();
            var endPoint = wall.corners.end.object.getWorldPosition();

            if (startPoint.x === endPoint.x || startPoint.z === endPoint.z) {
                return;
            }

            var id = wall.getId();
            var ids = [
                id + '_main',
                id + '_perpendicularStart',
                id + '_perpendicularEnd'
            ];

            if (this.controls3D.snap.lines[ids[0]]) return;

            // var center = new THREE.Vector3();
            // center.add(startPoint);
            // center.add(endPoint);
            // center.divideScalar(2);

            this.controls3D.snap.lines[ids[0]] = {
                startPoint: startPoint,
                endPoint: endPoint,
                // center: center
            };

            this.controls3D.snap.lines[ids[1]] = {
                startPoint: startPoint.clone(),
                endPoint: startPoint.clone(),
                // center: startPoint.clone()
            };

            this.controls3D.snap.lines[ids[2]] = {
                startPoint: endPoint.clone(),
                endPoint: endPoint.clone(),
                // center: endPoint.clone()
            };

            var direction = new THREE.Vector3;
            direction.subVectors(this.controls3D.snap.lines[ids[0]].startPoint, this.controls3D.snap.lines[ids[0]].endPoint).normalize();

            var lineLenght = 10000;

            var angle = Math.atan2(
                this.controls3D.snap.lines[ids[0]].startPoint.z - this.controls3D.snap.lines[ids[0]].endPoint.z, 
                this.controls3D.snap.lines[ids[0]].startPoint.x - this.controls3D.snap.lines[ids[0]].endPoint.x
            ) - Math.PI;

            var addX = (Math.sin(angle) * lineLenght);
            var addZ = -(Math.cos(angle) * lineLenght);

            this.controls3D.snap.lines[ids[0]].startPoint.add(direction.clone().multiplyScalar(-lineLenght));
            this.controls3D.snap.lines[ids[0]].endPoint.add(direction.clone().multiplyScalar(lineLenght));

            this.controls3D.snap.lines[ids[1]].startPoint.x += addX;
            this.controls3D.snap.lines[ids[1]].startPoint.z += addZ;
            this.controls3D.snap.lines[ids[1]].endPoint.x -= addX;
            this.controls3D.snap.lines[ids[1]].endPoint.z -= addZ;

            this.controls3D.snap.lines[ids[2]].startPoint.x += addX;
            this.controls3D.snap.lines[ids[2]].startPoint.z += addZ;
            this.controls3D.snap.lines[ids[2]].endPoint.x -= addX;
            this.controls3D.snap.lines[ids[2]].endPoint.z -= addZ;
        }.bind(this));

        Object.keys(this.controls3D.snap.lines).forEach(function (id) {
            const line = this.controls3D.snap.lines[id];

            line.startPoint.y = 0;
            line.endPoint.y = 0;

            var lineGeometry = new THREE.Geometry();
            var lineMaterial = new THREE.LineBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0.25});

            lineGeometry.vertices.push(
                line.startPoint,
                line.endPoint
            );

            line.object = new THREE.Line(lineGeometry, lineMaterial);
            line.object.name = "SnapLine_" + id;
            line.object.clearable = true;
            line.object.visible = false;
            this.scene.add(line.object);
        }.bind(this));

        var pointS = new THREE.Vector3;
        var pointE = new THREE.Vector3;

        // find copies of lines TODO: find better method
        Object.keys(this.controls3D.snap.lines).forEach(function (id) {
            const line = this.controls3D.snap.lines[id];

            if (line !== undefined) {
                var copies = Object.keys(this.controls3D.snap.lines).filter(function (cId) {
                    if (cId === id) return false;

                    const cLine = this.controls3D.snap.lines[cId];

                    var ps = Utils.pointPerpendicularToLine(
                        line.startPoint.x,
                        line.startPoint.z,
                        cLine.startPoint.x,
                        cLine.startPoint.z,
                        cLine.endPoint.x,
                        cLine.endPoint.z
                    );
                    var pe = Utils.pointPerpendicularToLine(
                        line.endPoint.x,
                        line.endPoint.z,
                        cLine.startPoint.x,
                        cLine.startPoint.z,
                        cLine.endPoint.x,
                        cLine.endPoint.z
                    );
    
                    pointS.set(ps.x, 0, ps.y);
                    pointE.set(pe.x, 0, pe.y);

                    var dss = line.startPoint.distanceTo(pointS);
                    var dse = line.startPoint.distanceTo(pointE);
                    var des = line.endPoint.distanceTo(pointS);
                    var dee = line.endPoint.distanceTo(pointE);

                    return dss < 1 || dse < 1 || des < 1 || dee < 1;
                }.bind(this));

                copies.forEach(function (cKey) {
                    if (this.controls3D.snap.lines[cKey].object) {
                        this.scene.remove(this.controls3D.snap.lines[cKey].object);
                    }
                    delete this.controls3D.snap.lines[cKey];
                }.bind(this));
            }
        }.bind(this));

        return this;
    }

    this.updateSnapLinesWithObject = function (visible, object) {
        if (object instanceof Corner3D) {
            this.controls3D.snap.visible = visible;

            var positionY = object.getWorldPosition().y; 

            Object.keys(this.controls3D.snap.lines).forEach(function (lKey) {
                const snapLine = this.controls3D.snap.lines[lKey];
                snapLine.object.position.y = positionY;
            }.bind(this));
        } else if (object instanceof Puzzle3D) {
            this.controls3D.snap.visible = visible;

            if (object.corners[0]) {
                var positionY = object.corners[0].getWorldPosition().y; 
    
                Object.keys(this.controls3D.snap.lines).forEach(function (lKey) {
                    const snapLine = this.controls3D.snap.lines[lKey];
                    snapLine.object.position.y = positionY;
                }.bind(this));
            }
        }

        return this;
    }

    this.setSnapLinesVisibility = function (visible) {
        Object.keys(this.controls3D.snap.lines).forEach(function (lKey) {
            const snapLine = this.controls3D.snap.lines[lKey];
            snapLine.object.visible = visible && this.controls3D.snap.visible && !this.controls3D.snap.hideAlways;
        }.bind(this));

        return this;
    }

    this.getSnapPoint = function (point, axis, distance) {
        if (distance === undefined) distance = 50;

        point = new THREE.Vector3(point.x, 0, point.z);

        var closestDistance = distance;
        var snapPoint = null;
        var snapPoints = [];

        Object.keys(this.controls3D.snap.lines).forEach(function (lKey) {
            const snapLine = this.controls3D.snap.lines[lKey];

            if (axis === 'XZ') {
                var perpendicularPoint = Utils.pointPerpendicularToLine(
                    point.x,
                    point.z,
                    snapLine.startPoint.x,
                    snapLine.startPoint.z,
                    snapLine.endPoint.x,
                    snapLine.endPoint.z
                );

                var pointVector = new THREE.Vector3(perpendicularPoint.x, 0, perpendicularPoint.y);
                var pointDistance = point.distanceTo(pointVector);

                closestDistance = pointDistance < closestDistance ? pointDistance : closestDistance;

                if (pointDistance < distance) {
                    snapPoints.push({
                        line: snapLine,
                        distance: pointDistance,
                        point: pointVector
                    });
                }
            } else if (~['X', 'Z'].indexOf(axis)) {
                var line = {
                    startPoint: new THREE.Vector3,
                    endPoint: new THREE.Vector3
                } 

                if (axis === 'X') {
                    line.startPoint.set(-100, 0, point.z);
                    line.endPoint.set(100, 0, point.z);
                } else if (axis === 'Z') {
                    line.startPoint.set(point.x, 0, -100);
                    line.endPoint.set(point.x, 0, 100);
                }

                var axisIntersection = Utils.getIntersectionBetweenTwoLines(
                    line.startPoint.x, 
                    line.startPoint.z, 
                    line.endPoint.x, 
                    line.endPoint.z, 
                    snapLine.startPoint.x,
                    snapLine.startPoint.z,
                    snapLine.endPoint.x,
                    snapLine.endPoint.z
                );

                if (axisIntersection.x) {
                    var axisIntersectionVector = new THREE.Vector3(axisIntersection.x, 0, axisIntersection.y);
                    var axisIntersectionDistance = point.distanceTo(axisIntersectionVector);
    
                    if (axisIntersectionDistance < closestDistance) {
                        closestDistance = axisIntersectionDistance;

                        snapPoint = {
                            distance: axisIntersectionDistance,
                            point: axisIntersectionVector
                        };
                    }
                }
            }
        }.bind(this));

        if (snapPoints.length === 1) {
            snapPoint = snapPoints[0];
        } else if (snapPoints.length > 1) {
            snapPoints = _.sortBy(snapPoints, [function(o) {return o.distance;}]);

            var intersectionVector = new THREE.Vector3;
            var intersections = [];

            snapPoints.forEach(function (sPoint, index) {
                if (index === 0) return;

                var lineA = snapPoints[index - 1];
                var lineB = snapPoints[index];

                var intersection = Utils.getIntersectionBetweenTwoLines(
                    lineA.line.startPoint.x, 
                    lineA.line.startPoint.z, 
                    lineA.line.endPoint.x, 
                    lineA.line.endPoint.z, 
                    lineB.line.startPoint.x,
                    lineB.line.startPoint.z,
                    lineB.line.endPoint.x,
                    lineB.line.endPoint.z
                );
                
                if (intersection.x) { // not null
                    intersectionVector.set(intersection.x, 0, intersection.y);
                    var intersectionDistance = point.distanceTo(intersectionVector);
    
                    if (intersectionDistance < distance && intersectionDistance < closestDistance + distance / 2) {
                        intersections.push({
                            distance: intersectionDistance,
                            point: intersectionVector.clone()
                        });
                    }
                }
            });

            if (intersections.length > 0) {
                intersections = _.sortBy(intersections, [function(o) {return o.distance;}]);
                snapPoint = intersections[0];
            } else {
                snapPoint = snapPoints[0];
            }
        }

        return snapPoint;
    }

    this.snapObject = function (tfController) {
        if (!this.keysIsPressed(['CTRL'])) {
            if (tfController.object instanceof Corner3D && ~['X', 'Z', 'XZ'].indexOf(tfController.axis)) {
                var snap = this.getSnapPoint(
                    tfController.object.getWorldPosition(), 
                    tfController.axis, 
                    this.controls3D.snap.length
                );
                
                if (snap && snap.point) {
                    var originalY = tfController.object.position.y;

                    tfController.object.position.set(
                        snap.point.x,
                        0,
                        snap.point.z
                    );

                    tfController.object.parent.worldToLocal(tfController.object.position);
                    tfController.object.position.y = originalY;
                }
            } else if (tfController.object instanceof Floor3D && ~['Y'].indexOf(tfController.axis)) {
                var floorsInterval = 2.5;

                var floorUp = _.sortBy(this.floors, function (f) {
                    return Math.abs((f.position.y + this.controls3D.snap.length) -
                        (tfController.object.position.y + tfController.object.height));
                }.bind(this));
                var floorDown = _.sortBy(this.floors, function (f) {
                    return Math.abs((f.position.y + f.height) - 
                        tfController.object.position.y);
                }.bind(this));

                floorUp = floorUp.length > 0 ? floorUp[0] : null;
                floorDown = floorDown.length > 0 ? floorDown[0] : null;

                var distanceToUp = floorUp ? Math.abs(
                    floorUp.position.y - (tfController.object.position.y + tfController.object.height)
                ) : Infinity;
                var distanceToDown = floorDown ? Math.abs(
                    (floorDown.position.y + floorDown.height) - tfController.object.position.y
                ) : Infinity;

                if (distanceToUp < this.controls3D.snap.length && distanceToDown < this.controls3D.snap.length) {
                    if (distanceToUp < distanceToDown) {
                        tfController.object.position.y = 
                            floorUp.position.y - tfController.object.height - floorsInterval;
                    } else {
                        tfController.object.position.y = 
                            floorDown.position.y + floorDown.height + floorsInterval;
                    }
                } else if (distanceToUp < this.controls3D.snap.length) {
                    tfController.object.position.y = 
                        floorUp.position.y - tfController.object.height - floorsInterval;
                } else if (distanceToDown < this.controls3D.snap.length) {
                    tfController.object.position.y = 
                        floorDown.position.y + floorDown.height + floorsInterval;
                }

                tfController.object.onTransform(['translate']);
            } else if (tfController.object instanceof Puzzle3D && ~['X', 'Z', 'XZ'].indexOf(tfController.axis)) {
                var points = [];
                var closestPoint = null;

                tfController.object.corners.forEach(function (corner) {
                    var worldPosition = corner.getWorldPosition();

                    points.push({
                        corner: corner,
                        position: worldPosition,
                        snap: this.getSnapPoint(
                            worldPosition,
                            tfController.axis,
                            this.controls3D.snap.length
                        )
                    });
                }.bind(this));

                points.forEach(function (p, i) {
                    if (closestPoint === null && p.snap !== null) {
                        closestPoint = p;
                    } else if (closestPoint !== null && p.snap !== null && closestPoint.snap.distance > p.snap.distance) {
                        closestPoint = p;
                    }
                });

                if (closestPoint) {
                    var offset = new THREE.Vector3;

                    offset.copy(tfController.object.position);
                    offset.sub(closestPoint.position);
                    
                    tfController.object.position.copy(closestPoint.snap.point);
                    tfController.object.position.add(offset);
                    tfController.object.position.y = 0;
                }
            }
        }
    }

    this.updateSnap = function (option) {
        this.scene.transformControl.setTranslationSnap(
            null //option.translation === undefined ? this.controls3D.snap.translation : option.translation
        );
        this.scene.transformControl.setRotationSnap(THREE.Math.degToRad(
            option.rotation === undefined ? this.controls3D.snap.rotation : option.rotation
        ));

        return this;
    }

    this.keysIsPressed = function (keys) {
        var keysIsPressed = keys.length > 0;

        keys.find(function (key) {
            keysIsPressed = !!~this.controls3D.pressedKeys.indexOf(key);
            return !keysIsPressed;
        }.bind(this));

        return keysIsPressed;
    }

    /**
     * @param  {object} data
     * @returns {this}
     */
    this.watchInput = function (data) {
        if (this.enabled) {
            const pd = function () {
                data.event.preventDefault();
            }

            if (data.state === 'UP') {
                var keyIndex = this.controls3D.pressedKeys.indexOf(data.key);
                if (~keyIndex) {
                    this.controls3D.pressedKeys.splice(keyIndex, 1);
                }
            } else if (data.state === 'DOWN') {
                var keyIndex = this.controls3D.pressedKeys.indexOf(data.key);
                if (!~keyIndex) {
                    this.controls3D.pressedKeys.push(data.key);
                }
            }

            console.log('Pressed keys:', this.controls3D.pressedKeys);

            if (data.key === 'ALT') {
                pd();
            }
    
            if (data.state === 'DOWN' && data.key === 'SHIFT') {
                if (this.checkControlAvalible('brush')) {
                    this.container.classList.add('editor3d_cursor-brush');
                }
            } else if (data.key === 'SHIFT') {
                this.container.classList.remove('editor3d_cursor-brush');
            }
    
            if (data.state === 'DOWN' && data.key === 'ESCAPE') {
                this.controls3D.target = null;
                this.resetTransform();
                this.hideParameters();
            }

            if (data.state === 'DOWN' & data.key === 'TAB') {
                pd();
                this.toogleTransformMode();
            }
    
            if (data.state === 'DOWN' && data.key === 'CTRL') {
                pd();
                this
                    .updateSnap({translation: null, rotation: null})
                    .setSnapLinesVisibility(false);
            } else if (data.state === 'UP' && data.key === 'CTRL') {
                pd();
                this
                    .updateSnap({translation: this.controls3D.snap.translation, rotation: this.controls3D.snap.rotation})
                    .setSnapLinesVisibility(true);
            }
        }

        return this;
    }

    this.getFloorFile = function (floorNumber, type) {
        return this.floors[floorNumber || this.editorFloor].getFile(type);
    }

    this.resetFloorStructure = function (floorNumber) {
        if (floorNumber === undefined) floorNumber = this.editorFloor;

        if (this.floors[floorNumber]) {
            this.needReset = false;

            this.structure[floorNumber] = {
                rotation: 0,
                position: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            };
            this.floors[floorNumber]
                .setStructure(this.structure[floorNumber])
                .setFloorFromPlan2D(this.floors[floorNumber].floorPlan2D)
                .loadTextures()
                .raycastTextures();
        } else {
            this.needReset = true;
        }

        return this;
    }

    this.setStructureFromMaps = function (maps) {
        var structure = {};

        Object.keys(maps).forEach(function (mapKey) {
            const map = maps[mapKey];
            if (map.structure3D) {
                structure[mapKey] = map.structure3D;
            }
        });

        this.setStructure(structure);
        return this;
    }

    this.setStructure = function (structure, json) {
        if (structure) {
            if (json) {
                this.structure = JSON.parse(structure);
            } else {
                this.structure = structure;
            }
        }

        Object.keys(this.floors).forEach(function (fKey) {
            if (this.structure[fKey]) {
                if (fKey == this.editorFloor && this.needReset) {
                    this.resetFloorStructure();
                } else {
                    this.floors[fKey].setStructure(this.structure[fKey]).loadTextures();
    
                    for (var index = 0; index < 50; index++) { // Todo: Find better solution & move to floor3d class
                        setTimeout(function () {
                            if (this.floors[fKey]) {
                                this.floors[fKey].updateCamerasShaders();

                                if (fKey == this.editorFloor && this.controls3D.mode !== 'floors') {
                                    this.floors[fKey].moveToCenter();
                                }
                            }
                        }.bind(this), 100 * index);
                    }
                }
            }
        }.bind(this));

        this.safeGetEditorFloor(function (editorFloor) {
            if (this.controls3D.mode !== 'floors') {
                editorFloor.moveToCenter();
            }
        }.bind(this));

        return this;
    }

    this.getStructure = function (json, raw) {
        var structure = {};

        Object.keys(this.floors).forEach(function (fKey) {
            const floor = this.floors[fKey];
            structure[fKey] = floor.getStructure(raw);
        }.bind(this));

        this.structure = structure;

        if (json) {
            return JSON.stringify(structure);
        } else {
            return structure;
        }
    }
}