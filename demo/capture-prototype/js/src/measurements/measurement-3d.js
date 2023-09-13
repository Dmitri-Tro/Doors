/**
 * 3d viewer of collected data
 * @class
 * @param  {string} selector html element id
 */
const Measurement3d = function (selector) {
    this.initialized = false;
    this.selector = selector ? selector : 'measurement-3d';

    this.container = null;
    this.three = { // Three.js object
        lights: {},
        _walls: {}, // objects with keys contain «_» <- clears after data set
        _windows: {},
        _floors: {},
        _doors: {},
        _cameras: {}
    };

    this.config = {
        pointY: {
            title: '',
            active: false,
            value: 0.0001
        },
        wallDepth: {
            title: '',
            active: false,
            value: 15
        },
        doorDepth: {
            title: '',
            active: false,
            value: 6
        },
        windowDepth: {
            title: '',
            active: false,
            value: 6
        },
        defaultCameraHeight: {
            titile: '',
            active: false,
            value: 150,
        },
        defaultCeilingHeight: {
            title: '',
            active: false,
            value: 270
        },
        pitchRollAutoAlign: {
            title: 'Pitch roll auto align',
            active: true,
            value: true
        },
        pitchRollAutoAlignStep: {
            title: 'Pitch roll auto align step',
            active: true,
            value: 0.1
        },

        exportMergeDistance: {
            title: 'Merge corner distance',
            active: false,
            value: 30
        },
        exportAlignWallsAngle: {
            title: 'Align walls angle',
            active: false,
            value: 15,
            min: 0,
            max: 45
        },
        exportRemoveUnderscore: {
            title: 'Remove underscore values',
            active: false,
            value: true
        },
        exportRepairData: {
            title: 'Repair',
            active: false,
            value: true
        },
        exportUse2dViewMerging: {
            title: 'Use 2d View merging',
            active: true,
            value: false
        },
        _showElementVectors: {
            title: '',
            active: false,
            value: false
        }, // values with keys contain «_» <- uses for debug visual
        _showFoundedWallsLinks: {
            title: '',
            active: false,
            value: false
        },
        _showCornersBuilding: {
            title: '',
            active: false,
            value: false
        },
        _showElementCenterPoints: {
            title: '',
            active: false,
            value: false
        },
        _showElementIntersections: {
            title: '',
            active: false,
            value: false
        },
        _showMergeAttached: {
            title: '',
            active: false,
            value: false
        },
        _ignoreInvalid: {
            title: '',
            active: false,
            value: false
        }
    };

    this.pano = {
        center: {
            ath: 0,
            atv: 0
        }
    };

    // Mouse cursor (Three.js object)
    this.mouseCursor = null;

    // Data for bulding
    this.room = null;
    this.attachedRoom = null;
    this.rooms = {};
    this.gluedRooms = {};

    this.materials = {
        wall: new THREE.MeshLambertMaterial({color: 0xffffff, side: THREE.DoubleSide}),
        // floor: new THREE.MeshLambertMaterial({color: 0xA1A1A1, side: THREE.DoubleSide})
        floor: new THREE.MeshLambertMaterial({color: 0xff0000, side: THREE.DoubleSide}),
        door: new THREE.MeshLambertMaterial({color: 0x333333, side: THREE.DoubleSide}),
        window: new THREE.MeshLambertMaterial({color: 0x337AB7, side: THREE.DoubleSide})
    };

    this.events = new EventsSystem('Measurement3d');
    
    /**
     * Initialize 3d viewer
     * @returns {this}
     */
    this.init = function () {
        if (this.initialized !== false) return this;

        this.container = document.getElementById(selector);

        this.three.scene = new THREE.Scene();

        this.three.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50000);
        this.three.camera.position.x = -500;
        this.three.camera.position.y = 1500;
        this.three.camera.position.z = 0;
        this.three.camera.lookAt(new THREE.Vector3());
        this.three.scene.add(this.three.camera);

        this.three.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.three.scene.add(this.three.lights.ambient);
        this.three.lights.pointLight = new THREE.PointLight(0xffffff, 0.4);
        this.three.camera.add(this.three.lights.pointLight);

        this.three.renderer = new THREE.WebGLRenderer({alpha: true});
        // this.three.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.three.renderer.setSize(250, 250);
        this.container.append(this.three.renderer.domElement);

        this.three.controls = new THREE.OrbitControls(this.three.camera, this.three.renderer.domElement);
        this.three.controls.maxPolarAngle = Math.PI / 2.1;

        // this.three.scene.add(new THREE.AxesHelper(1000));
        this.three.scene.add(new THREE.GridHelper(50000, 500, 0x808080, 0x202020));

        this.animate();

        this.initialized = true;

        return this;
    }
    
    /**
     * Show all visal debug
     * @returns {this}
     */
    this.showVisualDebug = function () {
        Object.keys(this.config).forEach(function (cKey) {
            if (cKey.indexOf('_') === 0) {
                const config = this.config[cKey];

                if (typeof(config.value) === 'boolean') {
                    this.config[cKey].value = true;
                }
            }
        }.bind(this));

        this.config.pointY.value = Utils.degToRad(8);

        return this;
    }

    this.getExportOptions = function () {
        var exportOptrions = {};

        Object.keys(this.config).forEach(function (key) {
            const config = this.config[key]; 

            if (key.startsWith('export')) {
                if (typeof(config.value) === 'boolean') {
                    exportOptrions[key] = new ControlsElement({
                        id: key,
                        type: 'checkbox',
                        label: config.title,
                        onChange: function (value) {
                            exportOptrions.value = value;
                            config.value = value;
                        },
                        value: config.value,
                        active: config.active
                    })
                } else if (typeof(config.value) === 'number') {
                    exportOptrions[key] = new ControlsElement({
                        id: key,
                        type: 'input',
                        options: {
                            type: 'number',
                            min: config.min || 0,
                            max: config.max || 10000
                        },
                        label: config.title,
                        onChange: function (value) {
                            exportOptrions.value = parseFloat(value);
                            config.value = parseFloat(value);
                        },
                        value: config.value,
                        active: config.active
                    })
                }
            }
        }.bind(this));

        return exportOptrions;
    }

    /**
     * Animate frame
     * @returns {this}
     */
    this.animate = function () {
        requestAnimationFrame(this.animate.bind(this));
        this.render();

        return this;
    }
    
    /**
     * Render frame
     * @returns {this}
     */
    this.render = function () {
        if (this.three.renderer) {
            this.three.renderer.render(this.three.scene, this.three.camera);
        }

        return this;
    }
    
    /**
     * Set current room
     * @param  {string} room
     * @returns {this}
     */
    this.setRoom = function (room) {
        this.room = room;
        this.attachedRoom = room;

        return this;
    }
    
    /**
     * Set camera height
     * @param  {number} height
     * @returns {this}
     */
    this.setCameraHeight = function (height) {
        this.config.defaultCameraHeight.value = parseFloat(height);

        return this;
    }

    /**
     * Set wall height
     * @param  {number} height
     * @returns {this}
     */
    this.setWallHeight = function (height) {
        this.config.defaultCeilingHeight.value = parseFloat(height);

        return this;
    }
    
    /**
     * Clear scene
     * @returns {this}
     */
    this.clearScene = function () {
        Object.keys(this.three).forEach(function (tKey) {
            if (tKey.charAt(0) === '_') {
                Object.keys(this.three[tKey]).forEach(function (oKey) {
                    this.three.scene.remove(this.three[tKey][oKey]);
                }.bind(this));

                this.three[tKey] = {};
            }
        }.bind(this));

        var removeDublicatesStack = [];
        this.three.scene.children.forEach(function (child) {
            if (~child.name.indexOf('wall_')) {
                removeDublicatesStack.push(function () {
                    console.warn('Removed dublicate: ', child.name);
                    this.three.scene.remove(child); 
                }.bind(this));
            } 
        }.bind(this));

        removeDublicatesStack.forEach(function (f) {f();})

        return this;
    }
    
    /**
     * Get view point height from room options
     * @param  {object} room 
     */
    this.getViewPointHeight = function (room) {
        if (room) {
            var cameraH = room.cameraHeight || this.config.defaultCameraHeight.value;
            var ceilingH = room.ceilingHeight || this.config.defaultCeilingHeight.value;
            return room.useValues !== 'ceiling' ? cameraH : -Math.abs(cameraH - ceilingH);
        } else {
            return this.config.defaultCameraHeight.value;
        }
    }.bind(this)

    /**
     * Get walls from pano coordinates to 3d coordinates
     * @param  {object} pano data
     * @returns {this}
     */
    this.setDataFromPano = function (pano) {
        if (!this.room) {
            console.warn('Entry room not defined!');
            return this;
        }

        /**
         * Method functions
        */

        console.log('View point height:', this.getViewPointHeight(pano.rooms[this.room]));

        const findStartCorner = function (room) {
            return Object.keys(pano.rooms[room].corners).find(function (key) {
                if (pano.rooms[room].corners[key].location === 'FLOOR') return true;
            });
        }

        const getWallsRecursive = function (corner, walls, builded) {
            if (!Array.isArray(walls)) walls = [];
            if (builded === undefined) builded = [];

            var pitchCorrect = 0;
            var rollCorrect = 0;

            if (
                corner && 
                corner.location === 'FLOOR' && 
                !~builded.indexOf(corner.id)
            ) {
                builded.push(corner.id);

                var corners = {
                    c1: corner,
                    c2: corner.edges.top,
                    c3: corner.edges.right,
                    c4: corner.edges.right.edges.top
                };

                var wall = {
                    id: corners.c1.id,
                    room: corner.room,
                    angle: corner.angle90,
                    thickness: corner.wallThickness,
                    corners: [{
                            id: corners.c1.id,
                            // panoCorner: corners.c1,
                            coordinates: [corners.c1.x, corners.c1.y]
                        }, {
                            id: corners.c2.id,
                            // panoCorner: corners.c2,
                            coordinates: [corners.c2.x, corners.c2.y]
                        }, {
                            id: corners.c3.id,
                            // panoCorner: c3,
                            coordinates: [corners.c3.x, corners.c3.y]
                        }, {
                            id: corners.c4.id,
                            // panoCorner: c4,
                            coordinates: [corners.c4.x, corners.c4.y]
                        }
                    ]
                };

                var anyAngleWall = walls.find(function (wall) {
                    return wall.angle;
                });

                // Hint: True for getting length before alignment
                if (!this.config.pitchRollAutoAlign.value || walls.length < 3 || !anyAngleWall || true) { 
                    wall.start3d = new THREE.Vector3();
                    wall.end3d = new THREE.Vector3();

                    var viewPointHeight = this.getViewPointHeight(pano.rooms[corner.room]);
                    var usedCorners = pano.rooms[corner.room].useValues !== 'ceiling' ? ['c1', 'c3'] : ['c2', 'c4'];
                    var addToY = pano.rooms[corner.room].useValues !== 'ceiling' ? 0 : 0;

                    wall.start3d.set.apply(wall.start3d, Object.values(Utils.coordsPanoTo3d(
                        Utils.degToRad(corners[usedCorners[0]].x),
                        Utils.degToRad(corners[usedCorners[0]].y + addToY),
                        viewPointHeight
                    )));
                    wall.end3d.set.apply(wall.end3d, Object.values(Utils.coordsPanoTo3d(
                        Utils.degToRad(corners[usedCorners[1]].x),
                        Utils.degToRad(corners[usedCorners[1]].y + addToY),
                        viewPointHeight
                    )));

                    wall.lengths = {};
                    wall.lengths.aligned = wall.lengths.raw = wall.start3d.distanceTo(wall.end3d); 
                }

                walls.push(wall);

                return getWallsRecursive(corner.edges.right, walls, builded);
            } else { // Get pitch roll error
                if (this.config.pitchRollAutoAlign.value && walls.length > 2) {
                    const findError = function (pitch, roll) {
                        var walls3d = [];

                        walls.forEach(function (wall) {
                            var usedCorners = pano.rooms[wall.room].useValues === 'floor' ? [0, 2] : [1, 3];

                            var start = Utils.getPanoCoordinateWithPitchAndRoll({
                                ath: wall.corners[usedCorners[0]].coordinates[0],
                                atv: wall.corners[usedCorners[0]].coordinates[1]
                            }, pitch, roll);

                            var end = Utils.getPanoCoordinateWithPitchAndRoll({
                                ath: wall.corners[usedCorners[1]].coordinates[0],
                                atv: wall.corners[usedCorners[1]].coordinates[1]
                            }, pitch, roll);

                            var start3d = new THREE.Vector3();
                            var end3d = new THREE.Vector3();

                            var viewPointHeight = this.getViewPointHeight(pano.rooms[wall.room]);

                            start3d.set.apply(start3d, Object.values(Utils.coordsPanoTo3d(
                                Utils.degToRad(start.ath),
                                Utils.degToRad(start.atv),
                                viewPointHeight
                            )));
                            end3d.set.apply(end3d, Object.values(Utils.coordsPanoTo3d(
                                Utils.degToRad(end.ath),
                                Utils.degToRad(end.atv),
                                viewPointHeight
                            )));

                            var wall3d = {
                                findError: wall.angle,
                                start3d: start3d,
                                end3d: end3d
                            };

                            walls3d.push(wall3d);
                        }.bind(this));

                        var error = 0;

                        walls3d.forEach(function (wall3d, index) {
                            if (wall3d.findError) {
                                var prevWall3d = walls3d[index === 0 ? walls3d.length - 1 : index - 1];
                                var angles = {
                                    prev: Utils.radToDeg(
                                        Utils.getRotationOfLine(
                                            prevWall3d.start3d.x, 
                                            prevWall3d.end3d.x, 
                                            prevWall3d.start3d.z, 
                                            prevWall3d.end3d.z
                                        )
                                    ),
                                    curr: Utils.radToDeg(
                                        Utils.getRotationOfLine(
                                            wall3d.start3d.x, 
                                            wall3d.end3d.x, 
                                            wall3d.start3d.z, 
                                            wall3d.end3d.z
                                        )
                                    )
                                };
    
                                var rotation = angles.prev - angles.curr;
                                rotation = Utils.normalizeAngle(rotation);

                                var closestToAngle90 = Math.abs(rotation % 90);

                                error += Math.min(closestToAngle90, Math.abs(90 - closestToAngle90));
                            }
                        });

                        return {
                            error: error,
                            walls3d: walls3d
                        }
                    }.bind(this);

                    const findBest = function (step) {
                        // find direction first
                        var directions = {
                            ppr0: [step, 0],
                            pprp: [step, step],
                            p0rp: [0, step],
                            pmrp: [-step, step],
                            pmr0: [-step, 0],
                            pmrm: [-step, -step],
                            p0rm: [0, -step],
                            pprm: [step, -step],

                            p0r0: [0, 0] // center
                        };
                        var directionsKeys = Object.keys(directions);

                        var errorsValues = {};
                        directionsKeys.forEach(function (key) {
                            const direction = directions[key];
                            errorsValues[key] = findError(direction[0], direction[1]);
                        });

                        var minError = Infinity;
                        var bestDirection = {};
                        
                        directionsKeys.forEach(function (key, index) {
                            const errorValue = errorsValues[key];

                            if (errorValue.error < minError) {
                                minError = errorValue.error;
                                bestDirection.key = key;
                                bestDirection.index = index;
                            }
                        });

                        // Go with this direction
                        var best = null;
                        if (bestDirection.key !== 'p0r0') {
                            var directionLeftKey = directionsKeys[
                                    bestDirection.index - 1 < 0 ?
                                    directionsKeys.length - 2 : // ignore center
                                    bestDirection.index - 1
                                ];
                            var directionRightKey = directionsKeys[
                                    bestDirection.index + 1 > directionsKeys.length - 2 ? // ignore center
                                    0 :
                                    bestDirection.index + 1
                                ];

                            var current = {
                                pitch: 0,
                                roll: 0,
                                best: errorsValues[bestDirection.key]
                            };

                            var findNext = true;
                            do {
                                var results = [{
                                        pitch: current.pitch + directions[directionLeftKey][0],
                                        roll: current.roll + directions[directionLeftKey][1],
                                        result: findError(
                                            current.pitch + directions[directionLeftKey][0], 
                                            current.roll + directions[directionLeftKey][1]
                                        )
                                    }, {
                                        pitch: current.pitch + directions[bestDirection.key][0],
                                        roll: current.roll + directions[bestDirection.key][1],
                                        result: findError(
                                            current.pitch + directions[bestDirection.key][0], 
                                            current.roll + directions[bestDirection.key][1]
                                        )
                                    }, {
                                        pitch: current.pitch + directions[directionRightKey][0],
                                        roll: current.roll + directions[directionRightKey][1],
                                        result: findError(
                                            current.pitch + directions[directionRightKey][0], 
                                            current.roll + directions[directionRightKey][1]
                                        )
                                    }
                                ];

                                var anyResultBetter = false;
                                results.forEach(function (result) {
                                    if (result.result.error <= current.best.error) {
                                        current.pitch = result.pitch;
                                        current.roll = result.roll;
                                        current.best = result.result;

                                        anyResultBetter = true;
                                    }
                                });

                                if (!anyResultBetter) findNext = false;
                            } while (findNext);

                            // console.log('Pitch & Roll of room', current);

                            rollCorrect = current.roll;
                            pitchCorrect = current.pitch;
                            best = current.best;
                        } else {
                            best = errorsValues[bestDirection.key];
                        }

                        return best;
                    }

                    var anyAngleWall = walls.find(function (wall) {
                        return wall.angle;
                    });

                    if (anyAngleWall) {
                        var best = findBest(this.config.pitchRollAutoAlignStep.value);
     
                        walls.forEach(function (wall, index) {
                            wall.start3d = best.walls3d[index].start3d;
                            wall.end3d = best.walls3d[index].end3d;
                        });
                    }
                }

                if (true) { // Todo: make condition for auto pitch roll
                    var wallsAngles = {};

                    walls.forEach(function (wall) {
                        var wallRotation = Utils.getRotationOfLine(
                            wall.start3d.x,
                            wall.end3d.x,
                            wall.start3d.z,
                            wall.end3d.z
                        );

                        var absWallRotation = wallRotation;
                        if (wallRotation > Math.PI) {
                            absWallRotation -= Math.PI;
                        }

                        var wallAngle = {
                            rot: Utils.radToDeg(wallRotation),
                            abs: Utils.radToDeg(absWallRotation)
                        };

                        wallsAngles[wall.id] = wallAngle;
                    });

                    // Hint: Maybe anchor wall need posibility change manualy
                    var anchorWall = walls.find(function (wall, index) {
                        var prevWall = walls[index - 1 < 0 ? walls.length - 1 : index - 1];
                        var nextWall = walls[index + 1 > walls.length - 1 ? 0 : index + 1];

                        return prevWall.angle && wall.angle && nextWall.angle;
                    });

                    if (anchorWall) {
                        var perpendicularAngles = [
                            Utils.normalizeAngle(wallsAngles[anchorWall.id].abs),
                            Utils.normalizeAngle(wallsAngles[anchorWall.id].abs + 90),
                            Utils.normalizeAngle(wallsAngles[anchorWall.id].abs + 180),
                            Utils.normalizeAngle(wallsAngles[anchorWall.id].abs + 270)
                        ];

                        walls.forEach(function (wall, index) {
                            // var prevWall = walls[index - 1 < 0 ? walls.length - 1 : index - 1];
                            var nextWall = walls[index + 1 > walls.length - 1 ? 0 : index + 1];

                            if (wall.id !== anchorWall.id && wall.angle && nextWall.angle) {
                                var centerOfWall = new THREE.Vector3(
                                    (wall.start3d.x + wall.end3d.x) / 2,
                                    0,
                                    (wall.start3d.z + wall.end3d.z) / 2
                                );

                                var closestTo = Utils.getClosestAngle(wallsAngles[wall.id].rot, perpendicularAngles);
                                var wallRotate = closestTo - wallsAngles[wall.id].rot;

                                var newStart = Utils.rotateAroundPivot(
                                    wall.start3d.x,
                                    wall.start3d.z,
                                    wallRotate,
                                    centerOfWall.x,
                                    centerOfWall.z
                                );

                                var newEnd = Utils.rotateAroundPivot(
                                    wall.end3d.x,
                                    wall.end3d.z,
                                    wallRotate,
                                    centerOfWall.x,
                                    centerOfWall.z
                                );

                                wall.start3d.x = newStart.x;
                                wall.start3d.z = newStart.y;
                                wall.end3d.x = newEnd.x;
                                wall.end3d.z = newEnd.y;
                            }

                            walls.forEach(function (wall, index) {
                                // var prevWall = walls[index - 1 < 0 ? walls.length - 1 : index - 1];
                                var nextWall = walls[index + 1 > walls.length - 1 ? 0 : index + 1];

                                var intersection = Utils.getIntersectionBetweenTwoLines(
                                    wall.start3d.x, 
                                    wall.start3d.z,
                                    wall.end3d.x, 
                                    wall.end3d.z,
                
                                    nextWall.start3d.x, 
                                    nextWall.start3d.z,
                                    nextWall.end3d.x, 
                                    nextWall.end3d.z
                                );

                                wall.end3d.x = intersection.x;
                                wall.end3d.z = intersection.y;
                                nextWall.start3d.x = intersection.x;
                                nextWall.start3d.z = intersection.y;

                                wall.lengths.aligned = wall.start3d.distanceTo(wall.end3d);
                                nextWall.lengths.aligned = nextWall.start3d.distanceTo(nextWall.end3d);
                            });
                        }.bind(this));
                    }
                }

                return {
                    walls: walls,
                    pitch: pitchCorrect,
                    roll: rollCorrect
                };
            }
        }.bind(this);

        const getNewRoom = function (corner) {
            var newRoom = {
                id: corner.room,
                title: pano.rooms[corner.room].title,
                visible: true,
                cameras: {},
                walls: [],
                doors: {},
                windows: {},
                elements: {}, // all elements of scene (doors, windows, etc...)
                glue: {},
                gluedTo: null,
                gluedRooms: [],
                attachedTo: pano.rooms[corner.room].attachedTo,
                attachments: pano.rooms[corner.room].attachments,
                cameraHeight: pano.rooms[corner.room].cameraHeight || this.config.defaultCameraHeight.value,
                ceilingHeight: pano.rooms[corner.room].ceilingHeight || this.config.defaultCeilingHeight.value 
            };

            newRoom.cameras[corner.room] = {
                title: pano.rooms[corner.room].title,
                position: new THREE.Vector3(0, pano.rooms[corner.room].cameraHeight || 150, 0),
                rotation: 0
            };

            Object.keys(pano.rooms[corner.room].doors).forEach(function (dKey) {
                const door = pano.rooms[corner.room].doors[dKey];
                
                newRoom.doors[dKey] = {
                    id: door.id,
                    type: 'door',
                    room: door.room,
                    to: door.to !== '' ? door.to : undefined,
                    elementId: door.elementId,
                    doorType: door.doorType,
                    points: JSON.parse(JSON.stringify(door.points)),
                    position3d: undefined,
                    cameraPoint: door.room,
                    positionOffset: parseFloat(door.positionOffset)
                };

                newRoom.elements[dKey] = newRoom.doors[dKey];
            });

            Object.keys(pano.rooms[corner.room].windows).forEach(function (wKey) {
                const windowElement = pano.rooms[corner.room].windows[wKey];
                
                newRoom.windows[wKey] = {
                    id: windowElement.id,
                    type: 'window',
                    room: windowElement.room,
                    // to: windowElement.to,
                    elementId: windowElement.elementId,
                    points: JSON.parse(JSON.stringify(windowElement.points)),
                    position3d: undefined,
                    cameraPoint: windowElement.room
                };

                newRoom.elements[wKey] = newRoom.windows[wKey];
            });

            // Object.keys(pano.rooms[corner.room].elements).forEach(function (eKey) {
            //   const element = pano.rooms[corner.room].elements[eKey];
                
            //   newRoom.elements[eKey] = {
            //     id: element.id,
            //     type: element.type,
            //     room: element.room,
            //     to: element.to,
            //     elementId: element.elementId,
            //     points: JSON.parse(JSON.stringify(element.points)),
            //     position3d: undefined,
            //     cameraPoint: element.room
            //   };
            // });

            Object.keys(pano.glue).forEach(function (gKey) {
                const glue = pano.glue[gKey];

                if (glue.room === corner.room) {
                    newRoom.glue[gKey] = {}; 
                    Object.keys(pano.glue[gKey]).forEach(function (gaKey) {
                        newRoom.glue[gKey][gaKey] = pano.glue[gKey][gaKey];
                    });
                }
            });

            return newRoom;
        }.bind(this);

        const createRoom = function (room, ignoreOld) {
            var corner = null;
            if (pano.rooms[room]) {
                corner = pano.rooms[room].corners[findStartCorner(room)];
            } else {
                console.warn('Room not exists in pano!', room, pano.rooms);
            }
            if (corner && (!this.rooms[room] || ignoreOld)) {
                this.rooms[room] = getNewRoom(corner);
            }

            return corner;
        }.bind(this);

        const getRoom = function (room, withWalls, ignoreOld) {
            if (!this.rooms[room] || ignoreOld) {
                var corner = createRoom(room, ignoreOld);
                if (corner) {
                    if (withWalls) {
                        var result = getWallsRecursive(corner);
                        this.rooms[room].walls = result.walls;
                        this.rooms[room].pitchCorrect = result.pitch;
                        this.rooms[room].rollCorrect = result.roll;
                    }

                    makeWallsConsiderWidth(room);

                    var valid = this.checkRoomValid(room);
                    if (!valid) {
                        console.warn('Can\'t create room ' + room + ', is invalid.');
                        delete this.rooms[room];
                        return;
                    } else {
                        Object.keys(this.rooms[room].doors).forEach(function (elementId) {
                            const element = this.rooms[room].doors[elementId];
                            this.getElement3dPosition(element, this.rooms[room].walls);
                        }.bind(this));
                        Object.keys(this.rooms[room].windows).forEach(function (elementId) {
                            const element = this.rooms[room].windows[elementId];
                            this.getElement3dPosition(element, this.rooms[room].walls);
                        }.bind(this));

                        alignRoomByLongestWall(room);

                        if (Object.keys(this.rooms[room].glue).length) {
                            glueRoomWithOthers(room);
                        }
                    }
                } else {
                    console.warn('Can\'t create room ' + room + '.');
                    return;
                }
            }

            return this.rooms[room];
        }.bind(this);

        const clearUnusedElements = function (room) {
            const wallsIds = this.rooms[room].walls.map(function (wall) {
                return wall.id.replace(/_.$/, '');
            });

            const clearUnused = function (elementId, type) {
                const element = this.rooms[room][type][elementId];

                if (
                    !element.wall ||
                    !~wallsIds.indexOf(element.wall.replace(/_.$/, '')) || 
                    !~wallsIds.indexOf(element.wallNext.replace(/_.$/, ''))
                ) {
                    delete this.rooms[room].elements[element.id];
                    delete this.rooms[room][type][element.id];
                }
            }.bind(this);

            Object.keys(this.rooms[room].doors).forEach(function (e) {clearUnused(e, 'doors')});
            Object.keys(this.rooms[room].windows).forEach(function (e) {clearUnused(e, 'windows')});
        }.bind(this);

        const glueReqursive = function (room) {
            Object.keys(this.rooms[room].glue).forEach(function (gKey) {
                const glue = this.rooms[room].glue[gKey];

                var glued = false;
                var sourceLength = this.rooms[room].walls.length;
                var targetLength = 0;

                if (!this.rooms[glue.glueWith.room]) {
                    getRoom(glue.glueWith.room, true, false);
                    const glueRoom = this.rooms[glue.glueWith.room];

                    if (glueRoom) {
                        glued = true;
                        targetLength = glueRoom.walls.length;

                        const sourceWallsIds = this.rooms[room].walls.map(function (wall) {
                            return wall.id.replace(/_.$/, '');
                        });
                        const targetWallsIds = glueRoom.walls.map(function (wall) {
                            return wall.id.replace(/_.$/, '');
                        });

                        this.rooms[room].gluedRooms.push(room);
                        this.rooms[room].gluedRooms.concat(glueRoom.gluedRooms);
                        glueRoom.gluedTo = room;

                        // rotate glued walls and elements
                        var sourceWallIndexes = glue.corners.map(function (corner) {
                            return corner ? sourceWallsIds.indexOf(corner.replace(/_.$/, '')) : '';
                        }.bind(this));
                        var targetWallIndexes = glueRoom.glue[glue.glueWith.id].corners.map(function (corner) {
                            return corner ? targetWallsIds.indexOf(corner.replace(/_.$/, '')) : '';
                        }.bind(this));

                        if (
                            sourceWallIndexes[0] !== -1 && 
                            sourceWallIndexes[1] !== -1 &&
                            targetWallIndexes[0] !== -1 &&
                            targetWallIndexes[1] !== -1 &&
                            this.rooms[room].walls[sourceWallIndexes[0]] &&
                            this.rooms[room].walls[sourceWallIndexes[1]] &&
                            glueRoom.walls[targetWallIndexes[0]] &&
                            glueRoom.walls[targetWallIndexes[1]]
                        ) {
                            var sourceRoomMiddle = Utils.getPointBetweenVectorsByPercentage(
                                this.rooms[room].walls[sourceWallIndexes[0]].start3d,
                                this.rooms[room].walls[sourceWallIndexes[1]] ? 
                                    this.rooms[room].walls[sourceWallIndexes[1]].start3d :
                                    this.rooms[room].walls[sourceWallIndexes[0]].end3d,
                                0.5
                            );
                            var targetRoomMiddle = Utils.getPointBetweenVectorsByPercentage(
                                glueRoom.walls[targetWallIndexes[0]].start3d, 
                                glueRoom.walls[targetWallIndexes[1]].start3d, 
                                0.5
                            );
    
                            // get vector between rooms
                            var moveRoomVector = sourceRoomMiddle.clone().sub(targetRoomMiddle);
                            
                            var sourceRoomRotation = Utils.radToDeg(
                                Utils.getRotationOfLine(
                                    this.rooms[room].walls[sourceWallIndexes[0]].start3d.x, 
                                    this.rooms[room].walls[sourceWallIndexes[1]] ? 
                                        this.rooms[room].walls[sourceWallIndexes[1]].start3d.x :
                                        this.rooms[room].walls[sourceWallIndexes[0]].end3d.x,
                                    this.rooms[room].walls[sourceWallIndexes[0]].start3d.z, 
                                    this.rooms[room].walls[sourceWallIndexes[1]] ? 
                                        this.rooms[room].walls[sourceWallIndexes[1]].start3d.z :
                                        this.rooms[room].walls[sourceWallIndexes[0]].end3d.z
                                )
                            );
                            var targetRoomRotation = Utils.radToDeg(
                                Utils.getRotationOfLine(
                                    glueRoom.walls[targetWallIndexes[0]].start3d.x, 
                                    glueRoom.walls[targetWallIndexes[1]].start3d.x, 
                                    glueRoom.walls[targetWallIndexes[0]].start3d.z, 
                                    glueRoom.walls[targetWallIndexes[1]].start3d.z
                                )
                            );
    
                            var rotationPoint = targetRoomMiddle;
                            var rotation = 
                                sourceRoomRotation - 
                                targetRoomRotation + 
                                180 + 
                                glue.rotationOffset - 
                                glue.glueWith.rotationOffset;
                            rotation = Utils.normalizeAngle(rotation);

                            var rotationInRadians = Utils.degToRad(rotation) - Math.PI + (window.rot || 0);

                            var addX = (Math.sin(rotationInRadians) * (glue.sideOffset - glue.glueWith.sideOffset));
                            var addZ = (Math.cos(rotationInRadians) * (glue.sideOffset - glue.glueWith.sideOffset));

                            addX += 
                                (Math.sin(rotationInRadians + Math.PI / 2) * 
                                (glue.forwardOffset - glue.glueWith.forwardOffset));
                            addZ += 
                                (Math.cos(rotationInRadians + Math.PI / 2) * 
                                (glue.forwardOffset - glue.glueWith.forwardOffset));

                            moveRoomVector.add(new THREE.Vector3(addX, 0, addZ));

                            this
                                .rotateRoomWalls(glueRoom.id, rotation, rotationPoint)
                                .moveRoomWalls(glueRoom.id, moveRoomVector)
                                .setRoomCamerasNewPosition(
                                    glueRoom.id,
                                    moveRoomVector,
                                    rotation,
                                    rotationPoint
                                ).setRoomElementsNewPosition(
                                    glueRoom.id,
                                    moveRoomVector,
                                    rotation,
                                    rotationPoint,
                                    true
                                );
    
                            // assign to main
                            Object.assign(this.rooms[room].cameras, glueRoom.cameras);
                            Object.assign(this.rooms[room].elements, glueRoom.elements);
                            Object.assign(this.rooms[room].doors, glueRoom.doors);
                            Object.assign(this.rooms[room].windows, glueRoom.windows);
                            Object.assign(this.rooms[room].glue, glueRoom.glue);
    
                            var parts = null;
    
                            if (Math.abs(targetWallIndexes[1] - targetWallIndexes[0]) > 1) {
                                parts = [
                                    glueRoom.walls,
                                    []
                                ];
                            } else {
                                parts = [
                                    glueRoom.walls.slice(0, targetWallIndexes[0]),
                                    glueRoom.walls.slice(targetWallIndexes[1], glueRoom.walls.length)
                                ];
                            }
    
                            var newGlueWalls = [].concat(parts[1]).concat(parts[0]);
                            var args = [sourceWallIndexes[0], 1].concat(newGlueWalls);
                            this.rooms[room].walls.splice.apply(this.rooms[room].walls, args);
                            this.rooms[room].walls.forEach(function (wall, i) {
                                wall.room = room;
                            });
                            
                            Object.keys(this.rooms[room].elements).forEach(function (elKey) {
                                const element = this.rooms[room].elements[elKey];
                                if (!element.oldRoom) element.oldRoom = element.room;
                                element.room = room;
                            }.bind(this));
    
                            glueRoom.walls = [];
                        }
                    }

                    this.gluedRooms[glue.glueWith.room] = this.rooms[glue.glueWith.room];
                }
            }.bind(this));
        }.bind(this);

        const glueRoomWithOthers = function (room) {
            if (this.rooms[room] && this.rooms[room].glue) {
                var piece = getMainPieceOfRoom(room);
                if (piece) {
                    this.rooms[room].walls = piece;
                    clearUnusedElements(room);

                    glueReqursive(room);

                    this.rooms[room].walls.forEach(function (wall) {
                        this.syncWallWithOther(wall, false, true);
                    }.bind(this));
                }
            }

            return;
        }.bind(this);

        const getMainPieceOfRoom = function (room) {
            // Clone walls to cut off glued
            var mainPiece = this.rooms[room].walls.map(function (wall) {
                return wall;
            });

            Object.keys(this.rooms[room].glue).forEach(function (gKey) {
                const glue = this.rooms[room].glue[gKey];
                
                if (glue.corners &&  glue.corners[0] && glue.corners[1]) {
                    const pieces = [[], []];

                    var glueCorners = glue.corners.map(function (cornerId) {
                        return cornerId.replace(/_.$/, '');
                    });
    
                    var wallsIds = mainPiece.map(function (wall) {
                        return wall.id.replace(/_.$/, '');
                    });
                    
                    var indexesValid = true;
                    var indexes = glueCorners.map(function (cornerId) {
                        var index = wallsIds.indexOf(cornerId); 
                        if (~index) {
                            return index;
                        } else {
                            indexesValid = false;
                        }
                    }).sort(function (a, b) {
                        return a - b;
                    });
    
                    if (indexesValid) {
                        mainPiece.forEach(function (wall, index) {
                            if (index === indexes[0]) {
                                pieces[0].push(mainPiece[index]);
                                pieces[1].push(mainPiece[index]);
                            } else if (index === indexes[1]) {
                                pieces[0].push(mainPiece[index]);
                                pieces[1].push(mainPiece[index]);
                            } else if (index > indexes[0] && index < indexes[1]) {
                                pieces[0].push(mainPiece[index]);
                            } else if (index < indexes[0] || index > indexes[1]) {
                                pieces[1].push(mainPiece[index]);
                            } 
                        });
                    } else {
                        console.warn('Glue positions not valid!', room, indexes);
                    }
    
                    var pointsLists = pieces.map(function (piece) {
                        return piece.map(function (wall) {
                            return {
                                x: wall.start3d.x,
                                y: wall.start3d.z
                            };
                        });
                    });
    
                    pointsLists.forEach(function (pointList, index) {
                        if (Utils.isPointInsidePolygon(0, 0, pointList)) {
                            mainPiece = pieces[index];
                        }
                    });
                }
            }.bind(this));

            return mainPiece;
        }.bind(this);

        const getGluedTo = function (room) {
            if (!this.rooms[room]) {
                return room;
            }

            var glueRoom = this.rooms[room].gluedTo;

            if (glueRoom) {
                return getGluedTo(glueRoom);
            } else {
                return room;
            }
        }.bind(this);

        const connectRoomsDoorToDoorRecursive = function (room, connectedRooms) {
            if (pano.rooms[room].attachedTo) {
                room = pano.rooms[room].attachedTo;
            }

            if (connectedRooms === undefined) connectedRooms = [];

            if (~connectedRooms.indexOf(room)) return connectedRooms;
            connectedRooms.push(room);

            room = getGluedTo(room);
 
            if (!getRoom(room, true, false)) {
                return;
            }

            Object.keys(this.rooms[room].doors).forEach(function (dKey) {
                const door = this.rooms[room].doors[dKey];
                var doorTo = getGluedTo(door.to);

                if (doorTo && pano.rooms[doorTo] && pano.rooms[doorTo].attachedTo) {
                    doorTo = pano.rooms[doorTo].attachedTo;
                }

                if (doorTo && !this.rooms[doorTo]) {
                    if (!getRoom(doorTo, true, true)) {
                        return;
                    }
                }

                if (doorTo && this.rooms[doorTo] && !~connectedRooms.indexOf(doorTo)) {
                    var anotherDoorKey = Object.keys(this.rooms[doorTo].doors).find(function (adKey) {
                        var anotherDoorTo = getGluedTo(this.rooms[doorTo].doors[adKey].to);

                        if (anotherDoorTo === room) {
                            return true;
                        }
                    }.bind(this));

                    var anotherDoor = this.rooms[doorTo].doors[anotherDoorKey];

                    if (anotherDoor) { 
                        var connect = this.doorToDoor(door, anotherDoor);

                        if (connect !== null) {
                            anotherDoor.connectedTo = door.id;

                            this.setRoomCamerasNewPosition(
                                doorTo,
                                connect.vector,
                                connect.rotation,
                                connect.rotationPoint
                            );
                            
                            this.setRoomElementsNewPosition(
                                doorTo,
                                connect.vector,
                                connect.rotation,
                                connect.rotationPoint,
                                true
                            );

                            connectedRooms = connectRoomsDoorToDoorRecursive(doorTo, connectedRooms);
                        } else {
                            console.warn('Cannot connect door to door');
                            return;
                        }
                    }
                }
            }.bind(this));

            return connectedRooms;
        }.bind(this);

        const makeRooms = function (startRoom) {
            var connected = [];

            // Find corner to start draw
            var startCornerId = findStartCorner(startRoom);
            var startCorner = pano.rooms[startRoom].corners[startCornerId];

            if (startCorner) {
                connected = connectRoomsDoorToDoorRecursive(startRoom) || [];

                connected.forEach(function (rKey) {
                    if (this.rooms[rKey]) {
                        const room = this.rooms[rKey];

                        Object.keys(room.elements).forEach(function (eKey) {
                            const element = room.elements[eKey];

                            if (!element.wall && !element.position3d) {
                                this.getElement3dPosition(
                                    element, 
                                    undefined, 
                                    element.cameraPoint,
                                    undefined, 
                                    this.getViewPointHeight(this.rooms[rKey])
                                );
                            }
                        }.bind(this));
                    }
                }.bind(this));
            }

            return connected;
        }.bind(this);

        const alignRoomByLongestWall = function (room) {
            var sortedWalls = Array.from(this.rooms[room].walls).sort(function (wallA, wallB) {
                if (wallA.lengths.aligned > wallB.lengths.aligned) {
                    return 1;
                }
                if (wallA.lengths.aligned < wallB.lengths.aligned) {
                    return -1;
                }
                return 0;
            }).reverse();

            var longestWall = sortedWalls[0];

            var rotation = -Utils.radToDeg(
                Utils.getRotationOfLine(
                    longestWall.start3d.x, 
                    longestWall.end3d.x, 
                    longestWall.start3d.z, 
                    longestWall.end3d.z
                )
            );

            this
                .rotateRoomWalls(room, rotation)
                .setRoomCamerasNewPosition(
                    room,
                    undefined,
                    rotation
                ).setRoomElementsNewPosition(
                    room,
                    undefined,
                    rotation,
                    undefined,
                    true
                );
        }.bind(this);

        const makeWallsConsiderWidth = function (roomKey) {
            const getVector = function (directionAngle) {
                return {
                    direction: new THREE.Vector2(
                        Math.cos(directionAngle),
                        Math.sin(directionAngle)
                    )
                };
            }

            const cornerMoveWithWidths = function (prevCorner, corner, nextCorner, prevWallWidth, nextWallWidth) {
                if (prevWallWidth === undefined || prevWallWidth === 0) prevWallWidth = 15;
                if (nextWallWidth === undefined || nextWallWidth === 0) nextWallWidth = 15;

                var newCoordinates = new THREE.Vector2(
                    corner.x,
                    corner.y
                );

                var angles = {
                    prev: _.round(Utils.radToDeg(
                        Utils.getRotationOfLine(
                            prevCorner.x, 
                            corner.x, 
                            prevCorner.y, 
                            corner.y
                        )
                    ), 3),
                    next: _.round(Utils.radToDeg(
                        Utils.getRotationOfLine(
                            corner.x, 
                            nextCorner.x, 
                            corner.y, 
                            nextCorner.y
                        )
                    ), 3)
                };

                Object.keys(angles).forEach(function (aKey) {
                    if (angles[aKey] >= 360) {
                        angles[aKey] -= 360; 
                    }
                });

                var prevHalfWallWidth = prevWallWidth / 2;
                var nextHalfWallWidth = nextWallWidth / 2;

                var prevDirectionVector = getVector(angles.prev * THREE.Math.DEG2RAD).direction;
                var nextDirectionVector = getVector(angles.next * THREE.Math.DEG2RAD).direction;

                var prevAddVector = new THREE.Vector2(prevHalfWallWidth, prevHalfWallWidth).multiply(prevDirectionVector);
                var nextAddVector = new THREE.Vector2(nextHalfWallWidth, nextHalfWallWidth).multiply(nextDirectionVector);

                var complexAddVector = new THREE.Vector2();
                complexAddVector.add(prevAddVector);
                complexAddVector.add(nextAddVector);
                complexAddVector.negate();

                newCoordinates.add(complexAddVector);

                return newCoordinates;
            }

            const room = this.rooms[roomKey];

            var wallsConsiderWidth = [];
            room.walls.forEach(function (wall, index) {
                var prevWall = room.walls[index - 1 < 0 ? room.walls.length - 1 : index - 1];
                var nextWall = room.walls[index + 1 === room.walls.length ? 0 : index + 1];

                wallsConsiderWidth.push(cornerMoveWithWidths({
                        x: prevWall.start3d.x,
                        y: prevWall.start3d.z,
                    }, {
                        x: wall.start3d.x,
                        y: wall.start3d.z,
                    }, {
                        x: nextWall.start3d.x,
                        y: nextWall.start3d.z,
                    }, prevWall.thickness, wall.thickness)
                );
            });

            wallsConsiderWidth.forEach(function (coordinates, index) {
                var wall = room.walls[index];
                var prevWall = room.walls[index - 1 < 0 ? room.walls.length - 1 : index - 1];

                prevWall.end3d.x = coordinates.x;
                prevWall.end3d.z = coordinates.y;
                wall.start3d.x = coordinates.x;
                wall.start3d.z = coordinates.y;
            });
        }.bind(this);

        /**
         * Method Code
        */

        Object.keys(this.rooms).forEach(function (rKey) {
            delete this.rooms[rKey];
        }.bind(this));

        Object.keys(this.gluedRooms).forEach(function (rKey) {
            delete this.gluedRooms[rKey];
        }.bind(this));

        console.log('%cPano data:', 'color: #A01AA5', pano);

        if (pano.rooms[this.room].attachedTo) {
            this.attachedRoom = this.room + '';
            this.room = pano.rooms[this.room].attachedTo;
        }

        var roomsOfFloor = Object.keys(pano.rooms).filter(function (rKey) {
            return pano.rooms[rKey].floor === pano.rooms[this.room].floor;
        }.bind(this));
        
        var moveGroups = [makeRooms(this.room)];
        roomsOfFloor.forEach(function (rKey) {
            if (!this.rooms[rKey]) {
                moveGroups.push(makeRooms(rKey));
            } else if (this.rooms[rKey] && !this.gluedRooms[rKey] && !moveGroups.find(function (group) {
                return ~group.indexOf(rKey); 
            })) {
                moveGroups.push(makeRooms(rKey));
            }
        }.bind(this));

        if (moveGroups.length > 0) {
            var moveGroupVector = new THREE.Vector3;

            var offsets = {
                left: 0,
                right: 0
            };

            moveGroups.forEach(function (group, index) {
                var groupCoordinates = {
                    min: Infinity,
                    max: -Infinity
                };

                group.forEach(function (rKey, i) {
                    var room = this.rooms[rKey];

                    room.walls.forEach(function (wall) {
                        if (wall.start3d.x > groupCoordinates.max) {
                            groupCoordinates.max = wall.start3d.x;
                        }
                        
                        if (wall.end3d.x > groupCoordinates.max) {
                            groupCoordinates.max = wall.end3d.x;
                        }
                        
                        if (wall.start3d.x < groupCoordinates.min) {
                            groupCoordinates.min = wall.start3d.x;
                        }

                        if (wall.end3d.x < groupCoordinates.min) {
                            groupCoordinates.min = wall.end3d.x;
                        }
                    });
                }.bind(this));

                // var groupSize = groupCoordinates.max - groupCoordinates.min;

                if (index === 0) {
                    offsets.left -= -groupCoordinates.min;
                    offsets.right += groupCoordinates.max;
                } else {
                    var isLeft = index % 2 === 0;

                    if (isLeft) {
                        offsets.left -= groupCoordinates.max + 100;
                    } else {
                        offsets.right += -groupCoordinates.min + 100;
                    }

                    moveGroupVector.set(
                        isLeft ? offsets.left : offsets.right, 
                        0,
                        0
                    ); 

                    if (isLeft) {
                        offsets.left -= -groupCoordinates.min;
                    } else {
                        offsets.right += groupCoordinates.max;
                    }

                    group.forEach(function (rKey) {
                        var moveRoomVector = moveGroupVector.clone();

                        this
                            .moveRoomWalls(rKey, moveGroupVector)
                            .setRoomCamerasNewPosition(rKey, moveRoomVector)
                            .setRoomElementsNewPosition(
                                rKey,
                                moveRoomVector,
                                undefined,
                                undefined,
                                true
                            );
                    }.bind(this));
                }
            }.bind(this));
        }

        this.events.fire('updated', {walls: this.getWalls()});

        return this;
    }

    /**
     * Get walls
     * @returns {this}
     */
    this.getWalls = function () {
        walls = [];
        
        Object.keys(this.rooms).forEach(function (rKey) {
            walls.push.apply(walls, this.rooms[rKey].walls);
        }.bind(this));

        return walls;
    }
    
    /**
     * Get length
     * @param  {object} line
     * @param  {object} pano
     */
    this.getLengthOfLine = function (line, pano) {
        if (line.start) {
            var viewPointHeight = this.getViewPointHeight(pano.rooms[line.room]);
    
            var start3d  = new THREE.Vector3();
            var end3d  = new THREE.Vector3();
    
            start3d.set.apply(start3d, Object.values(Utils.coordsPanoTo3d(
                Utils.degToRad(line.start.x),
                Utils.degToRad(line.start.y),
                viewPointHeight
            )));
            end3d.set.apply(end3d, Object.values(Utils.coordsPanoTo3d(
                Utils.degToRad(line.end.x),
                Utils.degToRad(line.end.y),
                viewPointHeight
            )));

            var rawLength = start3d.distanceTo(end3d)

            var result = {
                line: line,
                lengths: {
                    raw: rawLength,
                    aligned: rawLength
                }
            };

            if (this.rooms[line.room]) {
                var pitch = this.rooms[line.room].pitchCorrect;
                var roll = this.rooms[line.room].rollCorrect;

                var startCorrected = Utils.getPanoCoordinateWithPitchAndRoll({
                    ath: line.start.x,
                    atv: line.start.y
                }, pitch, roll);
        
                var endCorrected = Utils.getPanoCoordinateWithPitchAndRoll({
                    ath: line.end.x,
                    atv: line.end.y
                }, pitch, roll);

                var start3dCorrected  = new THREE.Vector3();
                var end3dCorrected  = new THREE.Vector3();
        
                start3dCorrected.set.apply(start3dCorrected, Object.values(Utils.coordsPanoTo3d(
                    Utils.degToRad(startCorrected.ath),
                    Utils.degToRad(startCorrected.atv),
                    viewPointHeight
                )));
                end3dCorrected.set.apply(end3dCorrected, Object.values(Utils.coordsPanoTo3d(
                    Utils.degToRad(endCorrected.ath),
                    Utils.degToRad(endCorrected.atv),
                    viewPointHeight
                )));

                result.lengths.aligned = start3dCorrected.distanceTo(end3dCorrected);
            }
            
            this.events.fire('returnLineLength', result);
            return result;
        }
    }

    /**
     * Sync prev and next walls start/end coordinates to center wall
     * @param  {string} wall
     * @returns {this}
     */
    this.syncPrevNextWall = function (wall) {
        var indexOfwall = this.rooms[wall.room].walls.indexOf(wall);
        var prev = indexOfwall === 0 ? this.rooms[wall.room].walls.length - 1 : indexOfwall - 1;
        var next = indexOfwall === this.rooms[wall.room].walls.length - 1 ? 0 : indexOfwall + 1;

        this.rooms[wall.room].walls[prev].end3d = new THREE.Vector3(
            wall.end3d.x,
            wall.end3d.y,
            wall.end3d.z
        );
        this.rooms[wall.room].walls[next].start3d = new THREE.Vector3(
            wall.start3d.x,
            wall.start3d.y,
            wall.start3d.z
        );

        return this;
    };

    /**
     * Sync wall to start/end coordinates
     * @param  {string} wall
     * @param  {boolean} prevEnd
     * @param  {boolean} nextStart
     * @returns {this}
     */
    this.syncWallWithOther = function (wall, prevEnd, nextStart) {
        var indexOfwall = this.rooms[wall.room].walls.indexOf(wall);

        if (prevEnd) {
            var prev = indexOfwall === 0 ? this.rooms[wall.room].walls.length - 1 : indexOfwall - 1;
            
            if (this.rooms[wall.room].walls[prev]) {
                wall.start3d = new THREE.Vector3(
                    this.rooms[wall.room].walls[prev].end3d.x,
                    this.rooms[wall.room].walls[prev].end3d.y,
                    this.rooms[wall.room].walls[prev].end3d.z
                );
            } else {
                console.warn('Can\'t find prev wall of', wall);
            }
        }

        if (nextStart) {
            var next = indexOfwall === this.rooms[wall.room].walls.length - 1 ? 0 : indexOfwall + 1;

            if (this.rooms[wall.room].walls[next]) {
                wall.end3d = new THREE.Vector3(
                    this.rooms[wall.room].walls[next].start3d.x,
                    this.rooms[wall.room].walls[next].start3d.y,
                    this.rooms[wall.room].walls[next].start3d.z
                );
            } else {
                console.warn('Can\'t find next wall of', wall);
            }
        }
    }

    /**
     * Get medium vector of vectors array
     * @param  {array} vectors array of THREE.Vector3
     * @return {object} THREE.Vector3
     */
    this.getMediumVector = function (vectors) {
        const aplusb = function (a, b) {
            return a[this] + b[this];
        };

        return new THREE.Vector3(
            vectors.reduce(aplusb.bind('x')) / vectors.length,
            vectors.reduce(aplusb.bind('y')) / vectors.length,
            vectors.reduce(aplusb.bind('z')) / vectors.length
        );
    };

    /**
     * Get points of element in 3d
     * @param  {object} element
     * @returns {object}
     */
    this.getElementPointsIn3d = function (element, cameraHeight) {
        if (!cameraHeight) cameraHeight = this.config.defaultCameraHeight.value;

        const sortByLeftRight = function (pointA, pointB) {
            return pointA.x - pointB.x;
        };

        var topBottom = element.points.sort(function (pointA, pointB) {
            return pointA.y - pointB.y;
        });

        // var leftRightTop = [topBottom[0], topBottom[1]].sort(sortByLeftRight);
        var leftRightBottom = [topBottom[2], topBottom[3]].sort(sortByLeftRight);

        var invertedLeftRight = Math.abs(leftRightBottom[0].x - leftRightBottom[1].x) > 180;

        var points = {
            // topLeft: invertedLeftRight ? leftRightTop[1] : leftRightTop[0],
            // topRight: invertedLeftRight ? leftRightTop[0] : leftRightTop[1],
            bottomLeft: invertedLeftRight ? leftRightBottom[1] : leftRightBottom[0],
            bottomRight: invertedLeftRight ? leftRightBottom[0] : leftRightBottom[1]
        };

        Object.keys(points).forEach(function (pKey) {
            var point = points[pKey];

            var coords3d = Utils.coordsPanoTo3d(
                Utils.degToRad(point.x), 
                this.config.pointY.value,
                cameraHeight
            );

            points[pKey] = {
                coords2d: point,
                coords3d: new THREE.Vector3(coords3d.x, coords3d.y, coords3d.z)
            }
        }.bind(this));

        // Get 3d vectors of doors bottoms
        vectors3D = [
            points.bottomLeft.coords3d,
            points.bottomRight.coords3d,
            Utils.getPointBetweenVectorsByPercentage( // Middle point
                points.bottomLeft.coords3d,
                points.bottomRight.coords3d,
                element.positionOffset ? (element.positionOffset + 1) / 2 : 0.5
            ),
            // Utils.getPointBetweenVectorsByPercentage(
            //   points.topRight.coords3d,
            //   points.bottomRight.coords3d,
            //   0.5
            // )
        ];

        if (this.config._showElementVectors.value) {
            this.showTestPoint(element.id + '_vec0', vectors3D[0], 0xfff000);
            this.showTestPoint(element.id + '_vec1', vectors3D[1], 0x0fff00);
            this.showTestPoint(element.id + '_vec2', vectors3D[2], 0x00fff0);
        }

        return {
            points: points,
            vectors3D: vectors3D
        }
    }

    /**
     * Get element 3d postion
     * @param  {object} element
     * @returns {object} position
     */
    this.getElement3dPosition = function (element, walls, center, vectors3D, cameraHeight) {
        if (!cameraHeight) cameraHeight = this.config.defaultCameraHeight.value;

        var middleValue = element.positionOffset ? (element.positionOffset + 1) / 2 : 0.5;

        if (element.vectors3D !== undefined && vectors3D === undefined) {
            vectors3D = element.vectors3D;
        } else if (vectors3D === undefined) {
            var pointsCoordinates = this.getElementPointsIn3d(element, cameraHeight);

            vectors3D = pointsCoordinates.vectors3D;
        }

        if (typeof(center) === 'string') {
            if (this.rooms[element.room] && this.rooms[element.room].cameras[center]) {
                center = this.rooms[element.room].cameras[center].position;
            } else {
                console.warn('Can\'t set center of projection for element.');
                center = new THREE.Vector3;
            }
        } if (typeof(center) === 'object') {
            // center = center; - just use argument
        } else if (center === undefined) {
            center = new THREE.Vector3;
        } else {
            console.warn('Wrong type of center ')
            center = new THREE.Vector3;
        };

        if (walls === undefined) walls = element.walls || this.rooms[element.room].walls;

        if (this.config._showElementCenterPoints.value) {
            this.showTestPoint(element.room + '_' + element.cameraPoint, center, 0xF9CC9D, 25);
        }

        /** 
         * Get intersections between wall and element
         * 
         *   A            B
         *   *            *
         *    \          /
         *     \ C    D /
         *     _*______*_
         *    |  \    /  |
         *    |   \  /   |
         *    |    \/    |
         *    |    * E   |
         * 
         * A - vectors3D[0]; // Start
         * B - vectors3D[1]; // End
         * C - intersectionElement[0]; // Start
         * D - intersectionElement[1]; // End
         * E - [0, 0]; // Center (camera) Point
         */

        var fullIntersections = {};
        var centerIntersections = {};
        var wallsWithKeys = {};

        walls.forEach(function (wall) {
            wallsWithKeys[wall.id] = wall;

            var intersectionElement = [
                Utils.getIntersectionBetweenTwoLines(
                    wall.start3d.x, 
                    wall.start3d.z,
                    wall.end3d.x, 
                    wall.end3d.z,
                    center.x,
                    center.z,
                    vectors3D[0].x,
                    vectors3D[0].z
                ), 
                Utils.getIntersectionBetweenTwoLines(
                    wall.start3d.x, 
                    wall.start3d.z,
                    wall.end3d.x, 
                    wall.end3d.z,
                    center.x,
                    center.z,
                    vectors3D[1].x,
                    vectors3D[1].z
                ),
                Utils.getIntersectionBetweenTwoLines(
                    wall.start3d.x, 
                    wall.start3d.z,
                    wall.end3d.x, 
                    wall.end3d.z,
                    center.x,
                    center.z,
                    vectors3D[2].x,
                    vectors3D[2].z
                )
            ];

            if (
                intersectionElement[0].onLine1 && 
                intersectionElement[0].onLine2 && 
                intersectionElement[1].onLine1 && 
                intersectionElement[1].onLine2
            ) {
                fullIntersections[wall.id] = intersectionElement;
            } else if (
                intersectionElement[2].onLine1 && 
                intersectionElement[2].onLine2
            ) {
                centerIntersections[wall.id] = intersectionElement;
            }
        });

        var fullIntersectionsKeys = Object.keys(fullIntersections);
        var fullIntersectionsLength = fullIntersectionsKeys.length;

        var centerIntersectionsKeys = Object.keys(centerIntersections);
        var centerIntersectionsLength = centerIntersectionsKeys.length;

        var pointStart = new THREE.Vector3(0, 0, 0);
        var pointEnd = new THREE.Vector3(0, 0, 0);
        var pointMiddle = new THREE.Vector3(0, 0, 0);
        var wallIntersctionId = undefined;

        if (fullIntersectionsLength === 1) {
            var intersection = fullIntersections[fullIntersectionsKeys[0]];

            pointStart = new THREE.Vector3(intersection[0].x, 0, intersection[0].y);
            pointEnd = new THREE.Vector3(intersection[1].x, 0, intersection[1].y);
            pointMiddle = Utils.getPointBetweenVectorsByPercentage(pointStart, pointEnd, middleValue);

            wallIntersctionId = fullIntersectionsKeys[0];
        } else if (fullIntersectionsLength > 1) {
            var minLenght = Infinity;

            fullIntersectionsKeys.forEach (function (iKey) {
                const intersection = fullIntersections[iKey];

                intStart = new THREE.Vector3(intersection[0].x, 0, intersection[0].y);
                intEnd = new THREE.Vector3(intersection[1].x, 0, intersection[1].y);
                intMiddle = Utils.getPointBetweenVectorsByPercentage(intStart, intEnd, middleValue);

                length = Math.hypot(center.x - intMiddle.x, center.z - intMiddle.z);

                if (length < minLenght) {
                    minLenght = length;

                    pointStart = intStart;
                    pointEnd = intEnd;
                    pointMiddle = intMiddle;

                    wallIntersctionId = fullIntersectionsKeys[iKey];
                }
            });
        } else if (centerIntersectionsLength === 1) {
            var intersection = centerIntersections[centerIntersectionsKeys[0]];

            var wallLine = null;

            if (intersection[0].onLine1 && intersection[0].onLine2) {
                pointStart = new THREE.Vector3(intersection[0].x, 0, intersection[0].y);
            } else {
                wallLine = new THREE.Line3(
                    wallsWithKeys[centerIntersectionsKeys[0]].start3d,
                    wallsWithKeys[centerIntersectionsKeys[0]].end3d
                );

                pointStart = wallLine.closestPointToPoint(
                    new THREE.Vector3(intersection[0].x, 0, intersection[0].y),
                    true
                );
            }

            if (intersection[1].onLine1 && intersection[1].onLine2) {
                pointEnd = new THREE.Vector3(intersection[1].x, 0, intersection[1].y);
            } else {
                if (!wallLine) {
                    wallLine = new THREE.Line3(
                        wallsWithKeys[centerIntersectionsKeys[0]].start3d,
                        wallsWithKeys[centerIntersectionsKeys[0]].end3d
                    );
                }

                pointEnd = wallLine.closestPointToPoint(
                    new THREE.Vector3(intersection[1].x, 0, intersection[1].y),
                    true
                );
            }

            pointMiddle = Utils.getPointBetweenVectorsByPercentage(pointStart, pointEnd, middleValue);

            wallIntersctionId = centerIntersectionsKeys[0];
        } else if (centerIntersectionsLength > 1) {
            var minLenght = Infinity;

            centerIntersectionsKeys.forEach (function (iKey) {
                const intersection = centerIntersections[iKey];

                var wallLine = null;

                if (intersection[0].onLine1 && intersection[0].onLine2) {
                    intStart = new THREE.Vector3(intersection[0].x, 0, intersection[0].y);
                } else {
                    wallLine = new THREE.Line3(
                        wallsWithKeys[iKey].start3d,
                        wallsWithKeys[iKey].end3d
                    );

                    intStart = wallLine.closestPointToPoint(
                        new THREE.Vector3(intersection[0].x, 0, intersection[0].y),
                        true
                    );
                }

                if (intersection[1].onLine1 && intersection[1].onLine2) {
                    intEnd = new THREE.Vector3(intersection[1].x, 0, intersection[1].y);
                } else {
                    if (!wallLine) {
                        wallLine = new THREE.Line3(
                            wallsWithKeys[iKey].start3d,
                            wallsWithKeys[iKey].end3d
                        );
                    }

                    intEnd = wallLine.closestPointToPoint(
                        new THREE.Vector3(intersection[1].x, 0, intersection[1].y),
                        true
                    );
                }

                intMiddle = Utils.getPointBetweenVectorsByPercentage(intStart, intEnd, middleValue);

                length = Math.hypot(center.x - intMiddle.x, center.z - intMiddle.z);

                if (length < minLenght) {
                    minLenght = length;

                    pointStart = intStart;
                    pointEnd = intEnd;
                    pointMiddle = intMiddle;

                    wallIntersctionId = centerIntersectionsKeys[iKey];
                }
            });
        } else { // not has full or center intersections
            console.warn('Element can\'t be attached to wall, not has valid intersections.', element);

            return null;
        }

        if (this.config._showElementIntersections.value) {
            this.showTestPoint(element.id + 'sp', pointStart, 0x000FFF);
            this.showTestPoint(element.id + 'ep', pointEnd, 0x00FFF0);
        }

        element.position3d = {
            start: pointStart,
            end: pointEnd,
            middle: pointMiddle
        };

        var wallsIds = walls.map(function (wall) {
            return wall.id;
        });

        element.wall = wallIntersctionId;

        var indexOfwall = wallsIds.indexOf(wallIntersctionId);
        var next = indexOfwall === walls.length - 1 ? 0 : indexOfwall + 1;

        element.wallNext = walls[next].id;

        return {
            start: pointStart,
            end: pointEnd,
            middle: pointMiddle,
            wall: wallIntersctionId
        };
    }

    /**
     * Set new position of door for new door position
     * @param  {string} room
     * @param  {object} vector
     * @param  {number} rotation
     * @param  {object} rotationPoint
     * @param  {boolean} updatePosition
     * @returns {this}
     */
    this.setRoomElementsNewPosition = function (room, moveRoomVector, rotation, rotationPoint, updatePostiton) {
        if (moveRoomVector === undefined) moveRoomVector = new THREE.Vector3;
        if (rotation === undefined) rotation = 0;
        if (rotationPoint === undefined) rotationPoint = new THREE.Vector3;

        Object.keys(this.rooms[room].elements).forEach(function (eKey) {
            const element = this.rooms[room].elements[eKey];

            if (!element.vectors3D) {
                var elementCoordinates = this.getElementPointsIn3d(element, this.getViewPointHeight(this.rooms[element.room]));
            } else {
                var elementCoordinates = {
                    vectors3D: element.vectors3D
                };
            }

            elementCoordinates.vectors3D.forEach(function (vector, index) {
                var newXZ = Utils.rotateAroundPivot(
                    vector.x,
                    vector.z,
                    rotation,
                    rotationPoint.x,
                    rotationPoint.z
                );

                elementCoordinates.vectors3D[index] = new THREE.Vector3(
                    newXZ.x + moveRoomVector.x, 
                    0, 
                    newXZ.y + moveRoomVector.z
                );
            }.bind(this));

            if (element.position3d && updatePostiton) {
                Object.keys(element.position3d).forEach(function (pKey) {
                    const position = element.position3d[pKey];

                    var newXZ = Utils.rotateAroundPivot(
                        position.x,
                        position.z,
                        rotation,
                        rotationPoint.x,
                        rotationPoint.z
                    );

                    position.x = newXZ.x + moveRoomVector.x;
                    position.z = newXZ.y + moveRoomVector.z;
                });
            }
            
            this.rooms[room].elements[eKey].vectors3D = elementCoordinates.vectors3D;

            if (this.config._showElementVectors.value) {
                this.showTestPoint(element.id + '_vec0', vectors3D[0], 0xfff000);
                this.showTestPoint(element.id + '_vec1', vectors3D[1], 0x0fff00);
            }
        }.bind(this));

        return this;
    }

    /**
     * Set new position of door for new door position
     * @param  {string} room
     * @param  {object} vector
     * @param  {number} rotation
     * @param  {object} rotationPoint
     */
    this.setRoomCamerasNewPosition = function (room, vector, rotation, rotationPoint) {
        if (vector === undefined) vector = new THREE.Vector3;
        if (rotation === undefined) rotation = 0;
        if (rotationPoint === undefined) rotationPoint = new THREE.Vector3;

        Object.keys(this.rooms[room].cameras).forEach(function (cKey) {
            const camera = this.rooms[room].cameras[cKey];

            // Rotate and move
            var newXZ = Utils.rotateAroundPivot(
                camera.position.x,
                camera.position.z,
                rotation,
                rotationPoint.x,
                rotationPoint.z
            );

            camera.rotation += rotation;

            camera.position.x = newXZ.x + vector.x;
            camera.position.z = newXZ.y + vector.z;

            if (this.config._showElementCenterPoints.value) {
                this.showTestPoint(room + '_' + cKey, camera.position, 0xF9CC9D, 25);
            }
        }.bind(this));

        return this;
    }
    
    /**
     * @param  {string|object} room
     * @returns {boolean} is Valid
     */
    this.checkRoomValid = function (room) {
        if (this.config._ignoreInvalid.value) {
            return true;
        }
        
        if (typeof(room) === 'string') {
            room = this.rooms[room];
        }

        var invalidity = Object.keys(room.walls).find(function (wKey) {
            const mainWall = room.walls[wKey];

            var foundedIntersection = Object.keys(room.walls).find(function (owKey) {
                const otherWall = room.walls[owKey];

                if (mainWall === otherWall) return false;

                var intersection = Utils.getIntersectionBetweenTwoLines(
                    mainWall.start3d.x, 
                    mainWall.start3d.z,
                    mainWall.end3d.x, 
                    mainWall.end3d.z,

                    otherWall.start3d.x, 
                    otherWall.start3d.z,
                    otherWall.end3d.x, 
                    otherWall.end3d.z
                );

                return intersection.onLine1 && intersection.onLine2; 
            });

            return foundedIntersection;
        });

        return !invalidity;
    }
    
    /**
     * Remove values from object with start underscore in keys 
     * @param {object} start object
     * @returns {object}
     */
    this.removeUnderscoreValuesRecursive = function (start, maxDepth, depth) {
        if (depth === undefined) depth = 0;
        if (maxDepth === undefined) maxDepth = Infinity;

        if (depth > maxDepth) {
            return start;
        }

        if (start !== null && start !== undefined) {
            Object.keys(start).forEach(function (key) {
                // console.log(start, key, typeof(start), typeof(key));
                if (typeof(key) !== 'object') {
                    if (key.indexOf('_') === 0) {
                        delete start[key];
                    } else if (typeof(start[key]) === 'object') {
                        this.removeUnderscoreValuesRecursive(start[key], maxDepth, depth + 1);
                    }
                }
            }.bind(this));
        }

        return start;
    }

    /**
     * Render walls and others
     * @returns {this}
     */
    this.draw3d = function () {
        Object.keys(this.rooms).forEach(function (rKey) {
            const room = this.rooms[rKey];

            if (room.walls && room.walls.length > 2) { // Todo: move .gluedTo (destroy room before) 
                var floorShape = new THREE.Shape();

                room.walls.forEach(function (wall, index) {
                    if (index === 0) {
                        floorShape.moveTo(wall.start3d.x, wall.start3d.z);
                        floorShape.lineTo(wall.start3d.x, wall.start3d.z);
                    } else {
                        floorShape.lineTo(wall.start3d.x, wall.start3d.z);
                    }

                    if (this.config._showCornersBuilding.value) {
                        setTimeout(function () {
                            this.showTestPoint(wall.id, wall.start3d, 0x0000ff, 20, 0.5);
                            console.log('%cShapeTo:', 'color: #00ee00', wall.start3d.x, wall.start3d.z, wall);
                        }.bind(this), (index + 1) * 1000);
                    }

                    var wallShape = new THREE.Shape();

                    var wallAngle = Math.atan2(wall.start3d.z - wall.end3d.z, wall.start3d.x - wall.end3d.x) - Math.PI;

                    var addX = (Math.sin(wallAngle) * ((wall.thickness || this.config.wallDepth.value) / 2));
                    var addZ = -(Math.cos(wallAngle) * ((wall.thickness || this.config.wallDepth.value) / 2));

                    wallShape.moveTo(
                        wall.start3d.x - addX, 
                        wall.start3d.z - addZ
                    );
                    
                    wallShape.lineTo(
                        wall.start3d.x + addX, 
                        wall.start3d.z + addZ
                    );

                    wallShape.lineTo(
                        wall.end3d.x + addX,
                        wall.end3d.z + addZ
                    );

                    wallShape.lineTo(
                        wall.end3d.x - addX,
                        wall.end3d.z - addZ
                    );

                    var wallGeometry = new THREE.ExtrudeBufferGeometry(wallShape, {
                        steps: 1,
                        depth: this.config.defaultCeilingHeight.value,
                        bevelEnabled: false
                    });

                    var wallMaterial = this.materials.wall.clone();

                    var wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

                    wallMesh.name = 'wall_' + wall.id;

                    wallMesh.rotation.x = Math.PI / 2;
                    wallMesh.position.y = this.config.defaultCeilingHeight.value;

                    this.three._walls[wall.id] = wallMesh;
                    this.three.scene.add(this.three._walls[wall.id]);
                }.bind(this));

                Object.keys(room.doors).forEach(function (dKey) {
                    const door = room.doors[dKey];
                    const wall = room.walls.find(function (w) {
                        return w.id === door.wall;
                    }) || {};

                    if (!door.position3d) return;

                    var doorShape = new THREE.Shape();

                    var doorAngle = Math.atan2(
                        door.position3d.start.z - door.position3d.end.z, 
                        door.position3d.start.x - door.position3d.end.x
                    ) - Math.PI;

                    var addX = (Math.sin(doorAngle) * ((wall.thickness || this.config.doorDepth.value) / 2 + 5));
                    var addZ = -(Math.cos(doorAngle) * ((wall.thickness || this.config.doorDepth.value) / 2 + 5));

                    doorShape.moveTo(
                        door.position3d.start.x - addX, 
                        door.position3d.start.z - addZ
                    );
                    
                    doorShape.lineTo(
                        door.position3d.start.x + addX, 
                        door.position3d.start.z + addZ
                    );

                    doorShape.lineTo(
                        door.position3d.end.x + addX,
                        door.position3d.end.z + addZ
                    );

                    doorShape.lineTo(
                        door.position3d.end.x - addX,
                        door.position3d.end.z - addZ
                    );

                    var doorGeometry = new THREE.ExtrudeBufferGeometry(doorShape, {
                        steps: 1,
                        depth: this.config.defaultCeilingHeight.value - 30,
                        bevelEnabled: false
                    });

                    var doorMaterial = this.materials.door.clone();

                    var doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);

                    doorMesh.name = 'door_' + door.id;

                    doorMesh.rotation.x = Math.PI / 2;
                    doorMesh.position.y = this.config.defaultCeilingHeight.value - 30;

                    this.three._doors[door.id] = doorMesh;
                    this.three.scene.add(this.three._doors[door.id]);
                }.bind(this));

                Object.keys(room.windows).forEach(function (wKey) {
                    const window = room.windows[wKey];
                    const wall = room.walls.find(function (w) {
                        return w.id === window.wall;
                    }) || {};

                    if (!window.position3d) return;

                    var windowShape = new THREE.Shape();

                    var windowAngle = Math.atan2(
                        window.position3d.start.z - window.position3d.end.z, 
                        window.position3d.start.x - window.position3d.end.x
                    ) - Math.PI;

                    var addX = (Math.sin(windowAngle) * ((wall.thickness || this.config.windowDepth.value) / 2 + 5));
                    var addZ = -(Math.cos(windowAngle) * ((wall.thickness || this.config.windowDepth.value) / 2 + 5));

                    windowShape.moveTo(
                        window.position3d.start.x - addX, 
                        window.position3d.start.z - addZ
                    );
                    
                    windowShape.lineTo(
                        window.position3d.start.x + addX, 
                        window.position3d.start.z + addZ
                    );

                    windowShape.lineTo(
                        window.position3d.end.x + addX,
                        window.position3d.end.z + addZ
                    );

                    windowShape.lineTo(
                        window.position3d.end.x - addX,
                        window.position3d.end.z - addZ
                    );

                    var windowGeometry = new THREE.ExtrudeBufferGeometry(windowShape, {
                        steps: 1,
                        depth: this.config.defaultCeilingHeight.value - 60,
                        bevelEnabled: false
                    });

                    var windowMaterial = this.materials.window.clone();

                    var windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

                    windowMesh.name = 'window_' + window.id;

                    windowMesh.rotation.x = Math.PI / 2;
                    windowMesh.position.y = this.config.defaultCeilingHeight.value - 30;

                    this.three._windows[window.id] = windowMesh;
                    this.three.scene.add(this.three._windows[window.id]);
                }.bind(this));

                var floorGeometry = new THREE.ShapeGeometry(floorShape);
                var floorMaterial = this.materials.floor.clone();
                floorMaterial.color.setHex(0xffffff * Math.random());
                var floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
                floorMesh.name = 'floor_' + rKey;
        
                floorMesh.rotation.x = Math.PI / 2;
                floorMesh.position.y = 5;

                this.three._floors[rKey] = floorMesh;
                this.three.scene.add(this.three._floors[rKey]);
            }

            Object.keys(room.cameras).forEach(function (cKey) {
                const camera = room.cameras[cKey];

                var geometry = new THREE.ConeGeometry(15, 50, 6);
                var material = new THREE.MeshLambertMaterial({color: 0x0000ff});
                var cone = new THREE.Mesh(geometry, material);

                cone.position.set(camera.position.x, camera.position.y, camera.position.z);
                cone.rotation.x = Math.PI / 2;
                cone.rotation.z = Utils.degToRad(camera.rotation) + -Math.PI / 2;

                this.three._cameras[room.id + '_' + cKey] = cone;
                this.three.scene.add(cone);
            }.bind(this)); 
        }.bind(this));

        return this;
    }
    
    /**
     * Create sphere to visualize coordinates
     * @param  {string} id
     * @param  {object} position
     * @param  {number} color
     */
    this.showTestPoint = function (id, position, color, radius, opacity) {
        var geometry = new THREE.SphereGeometry(radius === undefined ? 12 : radius, 8, 8);
        var material = new THREE.MeshBasicMaterial({
            color: color !== undefined ? color : 0xffffff * Math.random(),
            opacity: opacity === undefined ? 0.5 : opacity,
            transparent: true
        });

        var test = new THREE.Mesh(geometry, material);
        test.add(new THREE.AxesHelper(1000));
        this.three.scene.add(test);

        test.position.set(position.x, position.y, position.z);

        if (!this.three._tests) {
            this.three._tests = {};
        }

        if (this.three._tests[id]) {
            this.three.scene.remove(this.three._tests[id]);
        }

        this.three._tests[id] = test;
        
        return this;
    }

    /**
     * Create cone to visualize coordinates
     * @param  {string} id
     * @param  {object} position
     * @param  {number} color
     */
    this.showTestPointer = function (id, position, rotation, color) {
        var lineMaterial = new THREE.LineBasicMaterial({
            color: color ? color : 0x000000
        });
        var lineGeometry = new THREE.Geometry();
        lineGeometry.vertices.push(
            new THREE.Vector3(100, 0, 0),
            new THREE.Vector3(0, 0, 0)
        );
        var line = new THREE.Line(lineGeometry, lineMaterial);
        
        var coneGeometry = new THREE.ConeGeometry(5, 24, 4);
        var sphereGeometry = new THREE.SphereGeometry(5, 6, 6);
        var material = new THREE.MeshBasicMaterial({color: color ? color : 0x000000});

        var cone = new THREE.Mesh(coneGeometry, material);
        var sphere = new THREE.Mesh(sphereGeometry, material);

        cone.rotation.z = -Math.PI / 2;
        cone.position.set(100, 0, 0) // first verticle

        line.add(cone);
        line.add(sphere);

        // test.add(new THREE.AxesHelper(1000));
        this.three.scene.add(line);

        line.position.set(position.x, position.y, position.z);
        line.rotation.set(rotation.x, rotation.y, rotation.z);

        if (!this.three._tests) {
            this.three._tests = {};
        }

        if (this.three._tests[id]) {
            this.three.scene.remove(this.three._tests[id]);
        }

        this.three._tests[id] = line;
        
        return this;
    }
    
    /**
     * Move room with room coordinates
     * @param  {object} startDoor
     * @param  {object} endDoor
     * @returns {object} vector & rotation
     */
    this.doorToDoor = function (startDoor, endDoor) {
        var startDoorPosition3d = this.getElement3dPosition(
            startDoor,
            undefined,
            startDoor.cameraPoint, 
            undefined,
            this.getViewPointHeight(this.rooms[startDoor.room])
        );
        var endDoorPosition3d = this.getElement3dPosition(
            endDoor,
            undefined,
            endDoor.cameraPoint,
            undefined,
            this.getViewPointHeight(this.rooms[endDoor.room])
        );

        if (startDoorPosition3d !== null && endDoorPosition3d !== null) {
            // get vector between doors
            var moveRoomVector = startDoorPosition3d.middle.clone().sub(endDoorPosition3d.middle);

            // get rotation between doors
            var startDoorRotation = Utils.radToDeg(
                Utils.getRotationOfLine(
                    startDoorPosition3d.start.x, 
                    startDoorPosition3d.end.x, 
                    startDoorPosition3d.start.z, 
                    startDoorPosition3d.end.z
                )
            );
            var endDoorRotation = Utils.radToDeg(
                Utils.getRotationOfLine(
                    endDoorPosition3d.end.x, 
                    endDoorPosition3d.start.x, 
                    endDoorPosition3d.end.z, 
                    endDoorPosition3d.start.z
                )
            );

            var rotationPoint = endDoorPosition3d.middle;
            var rotation = startDoorRotation - endDoorRotation;
            rotation = Utils.normalizeAngle(rotation);

            this.rotateRoomWalls(endDoor.room, rotation, rotationPoint).moveRoomWalls(endDoor.room, moveRoomVector);

            return {
                vector: moveRoomVector.clone(),
                rotation: rotation,
                rotationPoint: rotationPoint.clone()
            }
        } else {
            return null;
        }
    }

    /**
     * Move room walls
     * @param  {string} room
     * @param  {object} moveRoomVector
     * @returns {this}
     */
    this.moveRoomWalls = function (room, moveRoomVector) {
        this.rooms[room].walls.forEach(function (wall) {
            wall.start3d.x = wall.start3d.x + moveRoomVector.x;
            wall.start3d.z = wall.start3d.z + moveRoomVector.z;

            wall.end3d.x = wall.end3d.x + moveRoomVector.x;
            wall.end3d.z = wall.end3d.z + moveRoomVector.z;
        }.bind(this));

        return this;
    }

    /**
     * @param  {string} room
     * @param  {number} rotation
     * @param  {object} rotationPoint
     * @returns {this}
     */
    this.rotateRoomWalls = function (room, rotation, rotationPoint) {
        if (rotationPoint === undefined) rotationPoint = new THREE.Vector3;

        rotation = Utils.normalizeAngle(rotation);

        this.rooms[room].walls.forEach(function (wall) {
            var newStartXZ = Utils.rotateAroundPivot(
                wall.start3d.x, 
                wall.start3d.z, 
                rotation,
                rotationPoint.x, 
                rotationPoint.z
            );

            var newEndXZ = Utils.rotateAroundPivot(
                wall.end3d.x, 
                wall.end3d.z, 
                rotation,
                rotationPoint.x, 
                rotationPoint.z
            );

            wall.start3d.x = newStartXZ.x;
            wall.start3d.z = newStartXZ.y;

            wall.end3d.x = newEndXZ.x;
            wall.end3d.z = newEndXZ.y;
        }.bind(this));

        return this;
    }

    /**
     * Show cursor on 3d
     * @param  {number} ath
     * @param  {number} atv
     * @returns {this}
     */
    this.setMousePoint = function (ath, atv) {
        var position = Utils.coordsPanoTo3d(
            Utils.degToRad(ath),
            Utils.degToRad(atv),
            this.getViewPointHeight(this.rooms[this.room])// this.config.defaultCameraHeight.value
        );

        if (this.rooms[this.room] && this.rooms[this.room].cameras[this.attachedRoom]) {
            const camera = this.rooms[this.room].cameras[this.attachedRoom];

            var newXZ = Utils.rotateAroundPivot(
                position.x,
                position.z,
                camera.rotation,
                0,
                0
            );

            position.x = newXZ.x + camera.position.x;
            position.z = newXZ.y + camera.position.z;
        }

        if (!this.mouseCursor) {
            var geometry = new THREE.SphereGeometry(30, 15, 15);
            var material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                opacity: 0.5,
                transparent: true
            });
            
            this.mouseCursor = new THREE.Mesh(geometry, material);
            this.three.scene.add(this.mouseCursor);
        }

        this.mouseCursor.position.set(position.x, position.y, position.z);
        
        return this;
    }
    
    /**
     * Set pano center
     * @param  {number} ath
     * @param  {number} atv
     */
    this.setPanoCenter = function (ath, atv) {
        this.pano.center = {
            ath: ath,
            atv: atv
        };

        if (this.pano.pointerTimeout) {
            clearTimeout(this.pano.pointerTimeout);
        }

        this.pano.pointerTimeout = setTimeout(function () {
            this.showTestPointer(
                'panoCenter', 
                new THREE.Vector3(0, 150, 0),
                new THREE.Vector3(
                    0,
                    Utils.degToRad(-this.pano.center.ath),
                    Utils.degToRad(-this.pano.center.atv)
                ),
                0xFF0000,
                20,
                100,
                0.9
            );
        }.bind(this), 100);

        return this;
    }

    /**
     * Get export data in needed format
     * @return {object} data
     */
    this.getExport2dData = function () {
        var rotation = Utils.normalizeAngle(-this.pano.center.ath - 90);

        if (this.rooms[this.room] && this.rooms[this.room].cameras[this.attachedRoom]) {
            rotation -= this.rooms[this.room].cameras[this.attachedRoom].rotation;
        }

        const removeWall = function (data, wall, connectStartEnd) {
            wall._removed = true;

            var wallIndex = data.walls.indexOf(wall);
            var wallStartsIndex = wall._startCorner.wallStarts.indexOf(wall);
            var wallEndsIndex = wall._endCorner.wallEnds.indexOf(wall);

            data.walls.splice(wallIndex, 1);
            wall._startCorner.wallStarts.splice(wallStartsIndex, 1);
            wall._endCorner.wallEnds.splice(wallEndsIndex, 1);

            if (connectStartEnd === true) {
                wall._startCorner.wallStarts.concat(wall._endCorner.wallStarts);
                wall._startCorner.wallEnds.concat(wall._endCorner.wallEnds);

                wall._endCorner.wallStarts.forEach(function (w) {
                    w._startCorner = wall._startCorner;
                });
                wall._endCorner.wallEnds.forEach(function (w) {
                    w._endCorner = wall._startCorner;
                });

                wall._endCorner._rooms.forEach(function (room) {
                    var endCornerRoomIndex = room.corners.indexOf(wall._endCorner);

                    room.corners.splice(endCornerRoomIndex, 1);

                    if (!~wall._startCorner._rooms.indexOf(room)) {
                        wall._startCorner._rooms.push(room);
                        room.corners.push(wall._startCorner);
                    }
                });

                var endCornerIndex = data.corners.indexOf(wall._endCorner);
                data.corners.splice(endCornerIndex, 1);
            }

            return data;
        }

        const attachElementToClosestWall = function (element, data) {
            // var centerOfElement = new THREE.Vector3((element.x1 + element.x2) / 2, 0, (element.y1 + element.y2) / 2);
            var elementLine = new THREE.Line3(
                new THREE.Vector3(element.x1, 0, element.y1),
                new THREE.Vector3(element.x2, 0, element.y2)
            );

            var closest = {
                length: -1,
                wallLine: null,
                wall: null,
                // distance: Infinity
            };

            if (false && element._walls) { // Todo: test behaivor
                element._walls.forEach(function (wall) {
                    if (!wall._removed) {
                        var wallLength = Math.hypot(
                            wall._startCorner.x - wall._endCorner.x, 
                            wall._startCorner.y, - wall._endCorner.y
                        );

                        if (wallLength > 50) {
                            var wallLine = new THREE.Line3(
                                new THREE.Vector3(wall._startCorner.x, 0, wall._startCorner.y),
                                new THREE.Vector3(wall._endCorner.x, 0, wall._endCorner.y)
                            );

                            var closestStart = wallLine.closestPointToPoint(elementLine.start, true);
                            var closestEnd = wallLine.closestPointToPoint(elementLine.end, true);
                            var length = Math.hypot(
                                closestStart.x - closestEnd.x, 
                                closestStart.z, - closestEnd.z
                            );
    
                            if (length > closest.length) { // Todo: Get better condition
                                console.log('closest.length', length, closest.length)

                                closest.start = closestStart,
                                closest.end = closestEnd;
                                closest.wallLine = wallLine;
                                closest.wall = wall;
                                closest.length = length;
                            }
                        }
                    }
                });
            }

            element.wall = closest.wall || element.wall;

            if (!closest.wallLine) {
                closest.wallLine = new THREE.Line3(
                    new THREE.Vector3(element.wall._startCorner.x, 0, element.wall._startCorner.y),
                    new THREE.Vector3(element.wall._endCorner.x, 0, element.wall._endCorner.y)
                );
            };

            if (!closest.start) {
                closest.start = new THREE.Vector3;
                closest.end = new THREE.Vector3;

                closest.wallLine.closestPointToPoint(elementLine.start, true, closest.start);
                closest.wallLine.closestPointToPoint(elementLine.end, true, closest.end);
            }

            closest.line = new THREE.Line3(closest.start, closest.end);

            if (closest.line.distance() < 1) {
                element.x1 = closest.wallLine.start.x;
                element.y1 = closest.wallLine.start.z;
                element.x2 = closest.wallLine.end.x;
                element.y2 = closest.wallLine.end.z;
            } else {
                element.x1 = closest.start.x;
                element.y1 = closest.start.z;
                element.x2 = closest.end.x;
                element.y2 = closest.end.z;
            }

            return element;
        }

        const repairData = function (data) {
            data.walls.forEach(function (wall) {
                if (wall._removed) return;

                var wallLength = Math.hypot(
                    wall._startCorner.x - wall._endCorner.x, 
                    wall._startCorner.y - wall._endCorner.y
                );

                if (wallLength < 1) {
                    removeWall(data, wall);
                } else {
                    data.walls.forEach(function (anotherWall) {
                        if (
                            wall !== anotherWall && ((
                                    wall._startCorner === anotherWall._startCorner && 
                                    wall._endCorner === anotherWall._endCorner
                                ) || (
                                    wall._startCorner === anotherWall._endCorner && 
                                    wall._endCorner === anotherWall._startCorner
                                ) || (
                                    anotherWall._startCorner === anotherWall._endCorner
                            ))
                        ) {
                            data.doors.forEach(function (door, index) {
                                var indexOfWall = door._walls ? door._walls.indexOf(anotherWall) : -1;
                                if (~indexOfWall) {
                                    door._walls[indexOfWall] = wall;
                                } else if (door.wall === anotherWall) {
                                    door.wall = wall;
                                }
                            });

                            data.windows.forEach(function (window) {
                                var indexOfWall = window._walls ? window._walls.indexOf(anotherWall) : -1;
                                if (~indexOfWall) {
                                    window._walls[indexOfWall] = wall;
                                } else if (window.wall === anotherWall) {
                                    window.wall = wall;
                                }
                            });

                            removeWall(data, anotherWall);
                        }
                    });
                }
            });

            data.corners.forEach(function (corner, index) {
                if (corner.wallStarts.length === 0 && corner.wallEnds.length === 0) {
                    corner._rooms.forEach(function (room) {
                        var indexOfCornerInRoom = room.corners.indexOf(corner);

                        if (~indexOfCornerInRoom) {
                            room.corners.splice(indexOfCornerInRoom, 1);
                        }
                    });

                    data.corners.splice(index, 1);
                }
            });

            data.doors.forEach(function (door) {
                attachElementToClosestWall(door, data);
            });

            data.windows.forEach(function (window) {
                attachElementToClosestWall(window, data);
            });

            return data;
        }

        var data = {
            walls: [],
            corners: [],
            rooms: [],
            doors: [],
            windows: [],
            cameras: [],
            // embeds: [],
            // placements: {},
            // compass: {
            //   angle: 0,
            //   canvasId: "floorview",
            //   padding: 15,
            //   compassWidth: 128,
            //   compassHeight: 128,
            //   tempAngle: 0,
            //   tempX: 0,
            //   tempY: 0
            // }
        };
        
        Object.keys(this.rooms).forEach(function (rKey) {
            const room = this.rooms[rKey];

            if (Object.keys(room.walls).length < 3) return;

            var exportRoom = {
                corners: [],
                interiorCorners: [], // Todo: Get for what IC needs 
                roomName: room.title,
                isRoomNameShown: true
            };

            Object.keys(room.cameras).forEach(function (cKey) {
                const camera = room.cameras[cKey];

                var exportCamera = {
                    id: cKey,
                    x: camera.position.x,
                    y: camera.position.z,
                    height: camera.position.y,
                    angle: camera.rotation,
                    mergeAngle: camera.rotation,
                    roomName: room.title,
                    visibleName: camera.title
                };

                data.cameras.push(exportCamera);
            }.bind(this));

            Object.keys(room.walls).forEach(function (wKey, wIndex) {
                const wall = room.walls[wKey];

                var exportCorner = data.corners.find(function (corner) {
                    return Math.ceil(corner.x) === Math.ceil(wall.start3d.x) && 
                        Math.ceil(corner.y) === Math.ceil(wall.start3d.z);
                });

                if (!exportCorner) {
                    exportCorner = {
                        id: Utils.guid(),
                        _wall: wall.id,
                        _wallIndex: wIndex,
                        _rooms: [],
                        x: wall.start3d.x,
                        y: wall.start3d.z,
                        wallStarts: [],
                        wallEnds: []
                    };

                    delete exportCorner.floorplan;
                }

                exportCorner._rooms.push(exportRoom);
                exportRoom.corners.push(exportCorner);
                data.corners.push(exportCorner);
            }.bind(this));

            exportRoom.corners.forEach(function (corner, index) {
                var nextCorner = exportRoom.corners[index + 1 === exportRoom.corners.length ? 0 : index + 1];

                var exportWall = {
                    id: Utils.guid(),
                    _id: corner._wall,
                    _doors: [],
                    _startCorner: corner,
                    _endCorner: nextCorner
                };

                if (room.walls[corner._wallIndex] && room.walls[corner._wallIndex].thickness) {
                    exportWall.bearing = 4; // custom type
                    exportWall.thickness = room.walls[corner._wallIndex].thickness;
                }

                corner.wallStarts.push(exportWall);
                nextCorner.wallEnds.push(exportWall);
                data.walls.push(exportWall);

                Object.keys(room.doors).forEach(function (dKey) {
                    const door = room.doors[dKey];

                    if (door.connectedTo) return;

                    if (corner._wall === door.wall && door.position3d) {
                        var exportDoor = {
                            id: Utils.guid(),
                            x1: door.position3d.start.x,
                            y1: door.position3d.start.z,
                            x2: door.position3d.end.x,
                            y2: door.position3d.end.z,
                            wall: exportWall,
                            type: parseInt(door.doorType)
                        };

                        exportWall._doors.push(exportDoor);
                        data.doors.push(exportDoor);
                    }

                }.bind(this));

                Object.keys(room.windows).forEach(function (wKey) {
                    const window = room.windows[wKey];

                    if (window.connectedTo) return;
                    if (corner._wall === window.wall && window.position3d) {
                        var exportWindow = {
                            id: Utils.guid(),
                            _id: window.id,
                            x1: window.position3d.start.x,
                            y1: window.position3d.start.z,
                            x2: window.position3d.end.x,
                            y2: window.position3d.end.z,
                            wall: exportWall
                            // type: 2 //Todo: get from options
                        };

                        data.windows.push(exportWindow);
                    }

                }.bind(this));

                exportRoom.interiorCorners.push({
                    x: corner.x,
                    y: corner.y,
                    seg1: true,
                    seg2: true
                });
            }.bind(this));

            data.rooms.push(exportRoom);
        }.bind(this));

        if (this.config.exportRepairData.value && false) { // disabled
            repairData(data);
        }

        if (this.config.exportRemoveUnderscore.value) {
            this.removeUnderscoreValuesRecursive(data, 5);
        }

        console.log('%cData 3D:', 'background-color: #9E1AA3; color: #FFFFFF;', this.rooms);
        console.log('%cExport:', 'background-color: #1155CC; color: #FFFFFF;', data);

        return data;
    }
}