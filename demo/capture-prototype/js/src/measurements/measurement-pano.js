'use strict';

/** 
 * Class responsible to measurement pano
 * @class
 * @param  {string} selector id of html element
 * @todo Rooms ID to lowercase 
 */
const MeasurementPano = function (selector) {
    this.initialized = false;

    this.events = new EventsSystem('MeasurementPano');

    this.xml = '';
    this.pano = null;
    this.panoSelector = selector ? selector : 'measurement-pano'; // default selector

    this.floor = null;
    this.room = null;
    this.rooms = {};

    this.temp = { // temporary variables
        idNumber: 0,
        mouse: {},
        makePoints: [],
        movedHotspot: {},
        hoveredHotspot: {},
        clickedHotspot: {},
        update: {},
        glue: {
            connectedHotspots: []
        }
    };

    this.config = {
        showHoweredHotspot: true, // show hovered hotspots in console
        maxCornerPanoDiffX: 5,
        defaults: {
            cameraHeight: 150,
            ceilingHeight: 270,
            useValues: 'floor',
            useSizesIn: 'cm',
        },
        export: {
            roomData: [
                'useValues',
                'useSizesIn',
                'ceilingHeight',
                'cameraHeight',
            ]
        },
        identifiers: {
            alpha: 'Alpha',
            beta: 'Beta',
            gamma: 'Gamma',
            delta: 'Delta',
            epsilon: 'Epsilon',
            digamma: 'Digamma',
            zeta: 'Zeta',
            eta: 'Eta',
            theta: 'Theta',
            iota: 'Iota',
            kappa: 'Kappa',
            lambda: 'Lambda',
            mu: 'Mu',
            nu: 'Nu',
            xi: 'Xi',
            omicron: 'Omicron',
            pi: 'Pi',
            san: 'San',
            koppa: 'Koppa',
            rho: 'Rho',
            sigma: 'Sigma',
            tau: 'Tau',
            upsilon: 'Upsilon',
            phi: 'Phi',
            chi: 'Chi',
            psi: 'Psi',
            omega: 'Omega'
        }
    };

    this.images = {
        pointCeiling: 'images/pano/marker-blue.png',
        pointCeiling90: 'images/pano/marker-angle-blue.png',
        pointFloor: 'images/pano/marker.png',
        pointFloor90: 'images/pano/marker-angle.png',
        mergeIcon: 'images/pano/merge-icon.png',
        locked: 'images/pano/marker-locked.png',
        portal: 'images/pano/target.png',
        control: 'images/pano/marker-yellow.png',
        select: 'images/pano/selectbox.png',
        lineV: 'images/pano/lineV.png',
        lineH: 'images/pano/lineH.png'
    };

    this.clickMode = 'default';

    this.hotspots = {};
    this.types = {
        'corner': {
            order: 5,
            hoverable: true,
            clickable: true
        },
        'line': {
            order: 6,
            hoverable: true,
            clickable: true
        },
        'edge': {
            order: 2,
            hoverable: false,
            clickable: false
        },
        'wall': {
            order: 1,
            hoverable: true,
            clickable: true
        },
        'door': {
            order: 3,
            hoverable: true,
            clickable: true
        },
        'window': {
            order: 4,
            hoverable: true,
            clickable: true
        },
        'pointControl': {
            order: 5,
            hoverable: true,
            clickable: true
        },
        'tempPoint': {
            order: 5,
            hoverable: false,
            clickable: false
        },
        'text': {
            order: 4,
            hoverable: true,
            clickable: true
        },
        'link': {
            order: 10,
            hoverable: false,
            clickable: true
        },
        'glue': {
            order: 11,
            hoverable: true,
            clickable: true
        }
    };

    this.transitionPoints = {};

    this.oppositeDirections = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left'
    };

    this.topZOrder = 10; // top z order (uses when hotspot move)
    this.currentLine = null; // current edit line
    this.lineLength = 15; // last copied line length
    this.gridType = 'usual';

    /**
     * initialize pano and start watch events
     * @returns {this}
     */
    this.init = function () {
        if (this.initialized !== false) return this;
        
        this.initialized = 'in proccess';

        function ready () {
            this.pano = document.getElementById(this.panoSelector + '-pano');
            this.pano.set('control.usercontrol', 'mouse');
            this.watchMouse();
            this.initialized = true;
        }

        function error () {
            console.warn('MeasurementPano initialization failed.');
            this.initialized = false;
        }

        embedpano({
            id: this.panoSelector + '-pano',
            xml: "templates/sphere-small.xml",
            target: this.panoSelector,
            html5: "webgl+only",
            webglsettings:{
                depth: true
            },
            onready: ready.bind(this),
            onerror: error.bind(this),
            passQueryParameters: true,
            wmode: "opaque"
        });

        // disabled for now
        // this.pano.set("events.onloadcomplete", this.setPitchRollFromSceneImage.bind(this));

        return this;
    }

    /**
     * @returns {number}
     */
    this.getNewIdNumber = function () {
        return ++this.temp.idNumber;
    }
    
    /**
     * @param {number} number
     * @returns {this}
     */
    this.setHignestIdNumber = function (number) {
        this.temp.idNumber = Math.max(this.temp.idNumber, number);

        return this;
    }

    /**
     * @param {string} id
     * @returns {this}
     */
    this.setHignestIdNumberFromId = function (id) {
        var number = parseInt(id.split('_')[1]);

        if (!isNaN(number)) {
            this.setHignestIdNumber(number);
        }
        
        return this;
    }

    /**
     * @returns {this}
     */
    this.clearMeasurementsData = function () {
        this.hotspots = {};

        this.reDrawHotspotsInRoom();
        return this;
    }

    /**
     * Get data of floor
     * @param  {number} floor
     * @returns {object}
     */
    this.getMeasurementDataOfFloor = function (floor) {
        var floorRoomsKey = Object.keys(this.rooms).filter(function (key) {
            return this.rooms[key].floor === floor;
        }.bind(this));
        
        const data = {
            floor: floor,
            hotspots: {},
            rooms: {}
        };

        floorRoomsKey.forEach(function (key) {
            data.rooms[key] = {};

            Object.keys(this.rooms[key]).forEach(function (raKey) {
                if (~this.config.export.roomData.indexOf(raKey)) {
                    data.rooms[key][raKey] = this.rooms[key][raKey];
                }
            }.bind(this));
        }.bind(this));

        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];
            if (hotspot && floorRoomsKey.includes(hotspot.room)) { // and in this floor
                if (hotspot.type === 'corner') {
                    var saveCorner = {
                        edges: {}
                    };

                    Object.keys(hotspot).forEach(function (hKey) {
                        if (hKey !== 'edges' && hKey !== 'elementControls' && hKey !== 'glue') {
                            saveCorner[hKey] = hotspot[hKey];
                        }
                    });

                    Object.keys(hotspot.edges).forEach(function (eKey) {
                        if (hotspot.edges[eKey].id) {
                            saveCorner.edges[eKey] = hotspot.edges[eKey].id;
                        }
                    });

                    data.hotspots[key] = saveCorner;
                } else if (hotspot.type === 'door') {
                    var saveDoor = {};
                    
                    Object.keys(hotspot).forEach(function (hKey) {
                        if (hKey !== 'textHotspot' && hKey !== 'controls' && hKey !== 'elementControls') {
                            saveDoor[hKey] = hotspot[hKey];
                        }
                    });

                    data.hotspots[key] = saveDoor;
                } else if (hotspot.type === 'window') {
                    var saveWindow = {};

                    Object.keys(hotspot).forEach(function (hKey) {
                        if (hKey !== 'textHotspot' && hKey !== 'controls' && hKey !== 'elementControls') {
                            saveWindow[hKey] = hotspot[hKey];
                        }
                    });

                    data.hotspots[key] = saveWindow;
                } else if (hotspot.type === 'glue') {
                    var saveGlue = {};

                    Object.keys(hotspot).forEach(function (hKey) {
                        if (hKey !== 'textHotspot' && hKey !== 'elementControls') {
                            saveGlue[hKey] = hotspot[hKey];
                        }
                    });

                    Object.keys(hotspot.glueCorners).forEach(function (gKey) {
                        if (hotspot.glueCorners[gKey].id) {
                            saveGlue.glueCorners[gKey] = hotspot.glueCorners[gKey].id;
                        }
                    });

                    data.hotspots[key] = saveGlue;
                }
            }
        }.bind(this));

        return data;
    }

    /**
     * Get data of current floor
     * @returns {object}
     */
    this.getMeasurementDataOfCurrentFloor = function () {
        return this.getMeasurementDataOfFloor(this.floor);
    }

    /**
     * Set measurement data of floor
     * @param  {object} data
     * @returns {this}
     */
    this.setMeasurementDataOfFloor = function (data) {
        if (data !== null) {
            Object.keys(data.floorRooms).forEach(function (rKey) {
                if (this.rooms[rKey]) {
                    const room = data.floorRooms[rKey];

                    Object.keys(room).forEach(function (aKey) {
                        this.rooms[rKey][aKey] = room[aKey];
                    }.bind(this));
                } else {
                    console.warn('Room ' + rKey + ' not exists in original scene.');
                }
            }.bind(this));

            Object.keys(data.floorData).forEach(function (hKey) {
                const hotspot = data.floorData[hKey];
    
                if (this.rooms[hotspot.room]) {
                    this.setHignestIdNumberFromId(hotspot.id);

                    if (hotspot.type === 'corner') {
                        this.hotspots[hKey] = this.getNewCornerHotspot(hotspot.id, hotspot.ath, hotspot.atv, hotspot);
                    } else if (hotspot.type === 'door') {
                        this.addDoor(hotspot);
                    } else if (hotspot.type === 'window') {
                        this.addWindow(hotspot);
                    } else if (hotspot.type === 'glue') {
                        
                    }
                } else {
                    console.warn('Hotspot ' + hKey + ' need room!');
                }
            }.bind(this));
    
            Object.keys(data.floorData).forEach(function (hKey) {
                const hotspot = data.floorData[hKey];
    
                if (this.rooms[hotspot.room]) {
                    if (hotspot.type === 'corner') {
                        Object.keys(this.hotspots[hKey].edges).forEach(function (eKey) {
                            this.hotspots[hKey].edges[eKey] = this.hotspots[this.hotspots[hKey].edges[eKey]];
                        }.bind(this));
                    } else if (hotspot.type === 'glue') {
                        this.makeGlue(hotspot.glueCorners[0], hotspot.glueCorners[1], hotspot);
                    }
                }
            }.bind(this));
    
            this.reDrawHotspotsInRoom();
        }

        return this;
    }

    /**
     * Get rooms as options
     * @param  {array} exclude
     * @param {boolean} withEmpty
     * @returns {array} options
     */
    this.getRoomsOptions = function (exclude, withEmpty) {  
        var options = Object.keys(this.rooms).filter(function (key) {
            if (!Array.isArray(exclude) || !~exclude.indexOf(key)) {
                return true;
            }
        }).map(function (key) {
            return {
                name: this.rooms[key].title + ' (' + this.rooms[key].floor + ')',
                value: key
            }
        }.bind(this));

        if (withEmpty === true) {
            options.unshift({
                name: '',
                value: undefined
            });
        }

        options = options.sort(this.sortByName);

        return options;
    }
    
    /**
     * Set pitch and roll for hotspots in current room
     * @param  {number} pitch
     * @param  {number} roll
     * @returns {this}
     */
    this.addPitchRollHotspotsInRoom = function (pitch, roll) {
        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.type === 'corner' && hotspot.room === this.room) {
                var newPos = Utils.getPanoCoordinateWithPitchAndRoll({
                    ath: hotspot.x,
                    atv: hotspot.y
                }, pitch, roll);

                hotspot.x = newPos.ath;
                hotspot.y = newPos.atv;
            }
        }.bind(this));

        this
            .reDrawHotspotsInRoom()
            .reDrawEdgesInRoom();

        return this;
    }
    
    /**
     * Get rooms as options of room
     * @param  {string} room
     * @param  {boolean} withEmpty
     * @returns {object} options
     */
    this.getRoomsOptionsOfRoom = function (room, withEmpty) {
        const roomObject = this.rooms[room]; 
        var exclude = [room];

        return this.getRoomsOptions(exclude, withEmpty);
    }

    /**
     * Get identifiers as options
     * @param  {array} exclude
     * @returns {array} options
     */
    this.getIdentifiersOptions = function (exclude) {
        return Object.keys(this.config.identifiers).filter(function (key) {
            if (!Array.isArray(exclude) || !~exclude.indexOf(key)) {
                return true;
            }
        }).map(function (key) {
            return {
                name: this.config.identifiers[key],
                value: key
            }
        }.bind(this));
    }
    
    /**
     * Get used identifiers
     * @param  {string} type
     * @param  {string} room
     * @returns {array} used identifiers
     */
    this.getUsedIdentifiers = function (type, room, ignore) {
        if (!Array.isArray(ignore)) ignore = [];

        var usedIdentifiers = [];

        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.type === type && hotspot.room === room) {
                if (
                    hotspot.elementControls.elementId && 
                    !~usedIdentifiers.indexOf(hotspot.elementControls.elementId.value) &&
                    !~ignore.indexOf(hotspot.elementControls.elementId.value)
                ) {
                    usedIdentifiers.push(hotspot.elementControls.elementId.value);
                }
            }
        }.bind(this));

        return usedIdentifiers;
    }
    
    /**
     * Sort objects in array by names
     * @param  {object} a
     * @param  {object} b
     */
    this.sortByName = function (a, b) {
        if (a.name > b.name) {
            return 1;
        } else if (a.name < b.name) {
            return -1;
        }

        return 0;
    };

    /**
     * Clean rooms doors connections
     * @param  {string} roomA
     * @param  {string} roomB
     * @returns {this}
     */
    this.clearDoorsConnections = function (roomA, roomB) {
        Object.keys(this.hotspots).forEach(function (hKey) {
            const hotspot = this.hotspots[hKey];

            if (hotspot && hotspot.type === 'door') {
                if (
                    (hotspot.room === roomA && hotspot.to === roomB) || 
                    (hotspot.room == roomB && hotspot.to === roomA)
                ) {
                    hotspot.elementControls.to.onChange({value: undefined}); // reset
                }
            }
        }.bind(this));

        return this;
    }

    /**
     * Set current floor
     * @param  {number} floor
     * @returns {this}
     */
    this.setFloor = function (floor) {
        this.floor = parseInt(floor);

        return this;
    }
    
    /**
     * Set current room
     * @param  {string} room
     * @returns {this}
     */
    this.setRoom = function (room) {
        console.log('Set room ' + this.rooms[room].title, this.rooms[room]);

        this.room = room;

        return this;
    } 
    
    /**
     * Set pano xml
     * @param  {string} xml
     * @returns {this}
     */
    this.setXML = function (xml) {
        this.pano.call('loadxml(' + xml + ')');

        return this;
    }
    
    /**
     * Set pano image over loaded images
     * @param  {string} url
     * @returns {this}
     */
    this.setImage = function (url, pitch, roll) {
        this.pano.call("setimage(" + url + ", " + -pitch + "," + -roll + ");");
        this.pano.call("updateobject(true,true);");

        return this;
    }

    /**
     * Set scene from prepared scenes
     * @todo: Krpano has bug, sometimes load not right scene, need find fix
     * @param  {string} name
     * @returns {this}
     * 
     */
    this.setScene = function (name) {
        var validName = this.getValidRoomName(name);

        this.pano.call("loadscene(" + validName + ")");//, '', '', BLEND(1, easeInOutCubic))");

        return this;
    }

    /** 
     * Set (prepare) scenes from rooms object
     * @param  {object} scenes
     * @returns {this}
     */
    this.setScenes = function (scenes) {
        var scenesData = Object.keys(scenes).map(function (key) {
            this.rooms[key] = {
                id: key,
                floor: scenes[key].plan,
                title: scenes[key].name,
                name: this.getValidRoomName(key),
                url: scenes[key].url,
                urlMobile: scenes[key].urlMobile,
                doorLinks: [],
                glue: [],
                cameraHeight: scenes[key].cameraHeight || this.config.defaults.cameraHeight,
                ceilingHeight: scenes[key].ceilingHeight || this.config.defaults.ceilingHeight,
                useValues: this.config.defaults.useValues,
                useSizesIn: this.config.defaults.useSizesIn,
                pitch: scenes[key].pitch || 0,
                roll: scenes[key].roll || 0,
                yaw: scenes[key].yaw || 0
            };

            if (scenes[key].attachments) {
                scenes[key].attachments.forEach(function (attachment) {
                    var attachmentContent = attachment.content.find(function (content) {
                        return !!content.linkedRoom;
                    });
    
                    if (attachmentContent) {
                        var hotspotId = 'link_' + attachment.hotspotXMLName;

                        this.hotspots[hotspotId] = {
                            id: hotspotId,
                            room: key,
                            type: 'link',
                            to: attachmentContent.linkedRoom.replace(/.JPG$/i, '') + '.JPG',
                            x: attachment.xPos,
                            y: attachment.yPos,
                            overlapped: null,
                            deletable: false
                        };

                        this.rooms[key].doorLinks.push(this.hotspots[hotspotId]);
                    }
                }.bind(this));
            }

            var footInCm = 30.48;

            if (this.rooms[key].cameraHeight < 15) {
                this.rooms[key].cameraHeight *= footInCm;
                this.rooms[key].useSizesIn = 'ft';

                if (this.rooms[key].ceilingHeight < 100) {
                    this.rooms[key].ceilingHeight *= footInCm;
                }
            }

            return this.rooms[key];
        }.bind(this));

        var xml = new EJS({
            url: document.location.origin + document.location.pathname + 'templates/sphere-measurements.ejs'
        }).render({
            scenes: scenesData
        });

        this.xml = xml;
        this.setXML(this.xml);

        return this;
    }
    
    /**
     * Set walls lengths from 3d tab
     * @param  {object} walls
     * @returns {this}
     */
    this.setLengthsToWalls = function (walls) {
        walls.forEach(function (wall) {
            const corner = this.hotspots[wall.id];

            var cleanId = wall.id.replace(/_b$/, '');

            var applyAffix = this.rooms[corner.room].useValues !== 'ceiling' ? '_b' : '_t';
            var clearAffix = this.rooms[corner.room].useValues !== 'ceiling' ? '_t' : '_b';

            const applyCorner = this.hotspots[cleanId + applyAffix];
            const clearCorner = this.hotspots[cleanId + clearAffix];
            
            applyCorner.lengths = {
                raw: _.floor(wall.lengths.raw, 2),
                aligned: _.floor(wall.lengths.aligned, 2)
            };

            clearCorner.lengths = undefined;
        }.bind(this));

        this.reDrawEdgesInRoom([], false);

        return this;
    }
    
    /**
     * @param {number|string} key
     * @returns {*}
     */
    this.getCurrentRoomValue = function (key, fallback) {
        if (this.rooms[this.room] && this.rooms[this.room][key] !== undefined) {
            return this.rooms[this.room][key];
        } else {
            return fallback;
        }
    }

    /**
     * @param {number|string} key
     * @returns {this}
     */
    this.setCurrentRoomValue = function (key, value) {
        this.rooms[this.room][key] = value;
        return this;
    }

    /**
     * @returns {number}
     */
    this.getCurrentRoomCameraHeight = function () {
        if (this.room) {
            return this.rooms[this.room].cameraHeight;
        } else {
            return this.config.defaults.cameraHeight;
        }
    }

    /**
     * @param {number|string} value
     * @returns {this}
     */
    this.setCurrentRoomCameraHeight = function (value) {
        this.rooms[this.room].cameraHeight = parseFloat(value);
        return this;
    }

    
    /**
     * @param {number|string} value
     * @returns {this}
     */
    this.setRoomsCameraHeight = function (value) {
        Object.keys(this.rooms).forEach(function (rKey) {
            this.rooms[rKey].cameraHeight = parseFloat(value);
        }.bind(this));

        return this;
    }

    /**
     * @returns {number}
     */
    this.getCurrentRoomCeilingHeight = function () {
        if (this.room) {
            return this.rooms[this.room].ceilingHeight;
        } else {
            return this.config.defaults.ceilingHeight;
        }
    }

    /**
     * @param {number|string} value
     * @returns {this}
     */
    this.setCurrentRoomCeilingHeight = function (value) {
        this.rooms[this.room].ceilingHeight = parseFloat(value);
        return this;
    }

    /**
     * @returns {number}
     */
    this.getCurrentRoomUseValues = function () {
        if (this.room) {
            return this.rooms[this.room].useValues;
        } else {
            return this.config.defaults.useValues;
        }
    }

    /**
     * @param {number|string} value
     * @returns {this}
     */
    this.setCurrentRoomUseValues = function (value) {
        this.rooms[this.room].useValues = value;
        return this;
    }

    /**
     * @returns {number}
     */
    this.getCurrentRoomUseSizesIn = function () {
        if (this.room && this.rooms[this.room].useSizesIn !== undefined) {
            return this.rooms[this.room].useSizesIn;
        } else {
            return this.config.defaults.useSizesIn;
        }
    }

    /**
     * @param {number|string} value
     * @returns {this}
     */
    this.setCurrentRoomUseSizesIn = function (value) {
        this.rooms[this.room].useSizesIn = value;
        return this;
    }

    /**
     * @param {number|string} value
     * @returns {this}
     */
    this.setRoomsUseSizesIn = function (value) {
        Object.keys(this.rooms).forEach(function (rKey) {
            this.rooms[rKey].useSizesIn = value;
        }.bind(this));

        return this;
    }

    /**
     * Set current click mode
     * @param  {string} mode
     * @returns {this}
     */
    this.setClickMode = function (mode) {
        this.clickMode = mode;

        var crossCursor = ['corner', 'door', 'window'];

        if (~crossCursor.indexOf(this.clickMode)) {
            this.pano.set('cursors.standard', 'crosshair');
        } else {
            this.pano.set('cursors.standard', 'default');
        }

        if (mode === 'moveAll') {
            this.temp.movedHotspot.all = true;
        } else {
            this.temp.movedHotspot.all = false;
        }

        return this;
    }

    /**
     * Get valid current room name to use as id
     * @param  {string} roomName
     * @returns {string} valid room name
     */
    this.getValidRoomName = function (roomName) {
        return roomName.replace('.', '_DOT_').toLowerCase();
    }

    /**
     * Delete corner callback function
     * @param  {object} hotspot
     * @returns {this}
     */
    this.deleteCorner = function (hotspot) {
        var hotspot = this.hotspots[this.temp.hoveredHotspot.id];

        var glueToDelete = [];
        hotspot.glue.forEach(function (glue) {
            glueToDelete.push(glue.id);
        });
        
        glueToDelete.forEach(function (id) {
            this.deleteGlue(id);
        }.bind(this));

        if (hotspot.location === 'FLOOR') {
            hotspot = hotspot.edges.top;
        }

        var attachHotspotLeft = hotspot.edges.left;
        var attachHotspotRight = hotspot.edges.right;
        
        this.detachCorners([{
            id: hotspot.edges.left.id,
            direction: 'right',
        }, {
            id: hotspot.edges.right.id,
            direction: 'left',
        }, {
            id: hotspot.edges.bottom.edges.left.id,
            direction: 'right',
        }, {
            id: hotspot.edges.bottom.edges.right.id,
            direction: 'left',
        }]);

        this.attachCorners([{
            id: attachHotspotLeft.id,
            direction: 'right',
        },{
            id: attachHotspotLeft.edges.bottom.id,
            direction: 'right',
        }], attachHotspotRight.id);

        this.deleteHotspot(hotspot.edges.bottom.id);
        this.deleteHotspot(hotspot.id);

        this.removeInvalidGlue(hotspot.room);

        this.reDrawEdgesInRoom();

        return this;
    }

    /**
     * Move corner callback
     * @param  {number} ath
     * @param  {number} atv
     * @param  {object} hotspot
     * @returns {this}
     */
    this.moveCorner = function (ath, atv, hotspot, moveOnlyOne) {
        if (this.temp.movedHotspot.all && !moveOnlyOne) {
            var move = this.getDifferenceVector(this.temp.mouse.down, {ath: ath, atv: atv});
            this.moveAll(move, hotspot);
        } else {
            const oppositeHotspot = hotspot.edges[hotspot.location === 'FLOOR' ? 'top' : 'bottom'];

            hotspot.x = ath;
            hotspot.y = atv;
            hotspot.zOrder = this.topZOrder;

            var difference = this.getDifferenceBetweenAngles(hotspot.x, oppositeHotspot.x, true);

            if (Math.abs(difference) > this.config.maxCornerPanoDiffX) {
                var correction = difference - (Math.sign(difference) * this.config.maxCornerPanoDiffX);
                oppositeHotspot.x = oppositeHotspot.x - correction;
            }

            this.drawCorner(hotspot.id, hotspot);
            this.drawCorner(oppositeHotspot.id, oppositeHotspot);

            if (!moveOnlyOne) {
                // Move edges with corner
                // this.reDrawEdgesInRoom(); // Todo: optimize & 
            }
        }

        return this;
    };

    /**
     * Move edge callback
     * @param  {number} ath
     * @param  {number} atv
     * @param  {object} hotspot
     * @returns {this}
     */
    this.moveEdge = function (ath, atv, hotspot) {
        var move = this.getDifferenceVector(this.temp.mouse.down, {ath: ath, atv: atv});

        if (this.temp.movedHotspot.all) {
            this.moveAll(move, hotspot.start.hotspot, [hotspot]);
        } else {
            hotspot.start.hotspot.onMove(
                this.temp.movedHotspot.points[0].ath - move.ath,
                this.temp.movedHotspot.points[0].atv - move.atv
            );
            hotspot.end.hotspot.onMove(
                this.temp.movedHotspot.points[1].ath - move.ath,
                this.temp.movedHotspot.points[1].atv - move.atv
            );

            hotspot.start.x = hotspot.start.hotspot.x;
            hotspot.start.y = hotspot.start.hotspot.y;
            hotspot.end.x = hotspot.end.hotspot.x;
            hotspot.end.y = hotspot.end.hotspot.y;
        }

        this.drawLine(hotspot.id, hotspot);
    }

    /**
     * Move all Corner/Floor Points
     * @param {object} move
     * @param {object} mainHotspot
     * @param {array} ignoreEdges
     * @returns {this}
     */
    this.moveAll = function (move, mainHotspot, ignoreEdges) {
        if (Object.keys(this.temp.movedHotspot.allPositions).length === 0) {
            Object.keys(this.hotspots).forEach(function (hKey) {
                const hotspot = this.hotspots[hKey]; 

                if (
                    hotspot && 
                    hotspot.type === 'corner' &&
                    hotspot.room === mainHotspot.room && 
                    hotspot.location === mainHotspot.location
                ) {
                    this.temp.movedHotspot.allPositions[hKey] = {
                        x: hotspot.x,
                        y: hotspot.y
                    };
                }
            }.bind(this));
        }

        Object.keys(this.temp.movedHotspot.allPositions).forEach(function (pKey) {
            const position = this.temp.movedHotspot.allPositions[pKey];

            var newPosition = {
                x: position.x - move.ath,
                y: position.y - move.atv
            };

            this.moveCorner(newPosition.x, newPosition.y, this.hotspots[pKey], true);
        }.bind(this));

        // this.reDrawEdgesInRoom(ignoreEdges);

        return this;
    }

    /**
     * Get difference between two points on pano 
     * @param  {object} start
     * @param  {object} end
     * @returns {object} vector
     */
    this.getDifferenceVector = function (start, end) {
        var difference = {
            ath: start.ath - end.ath,
            atv: start.atv - end.atv
        };
        
        if (difference.ath > 180) {
            difference.ath = -(360 - difference.ath);
        } // else if (difference.ath < -180) {} else {}

        return difference;
    } 

    /**
     * Get corner hotspot
     * @param  {string} hotspotId
     * @param  {number} ath
     * @param  {number} atv
     * @param  {object} options
     */
    this.getNewCornerHotspot = function (hotspotId, ath, atv, options) {
        if (!hotspotId) hotspotId = 'corner_' + this.getNewIdNumber();

        var hotspot = {
            id: hotspotId,
            room: this.room,
            type: 'corner',
            x: ath,
            y: atv,
            visible: true,
            location: atv < 0 ? 'CEILING' : 'FLOOR',
            edges: {},
            glue: [],
            linkedTo: null,
            angle90: true,
            onMove: function (ath, atv) {
                this.moveCorner(ath, atv, hotspot);
            }.bind(this),
            ondelete: function () {
                this.deleteCorner(hotspot);
            }.bind(this),
            links: [], // links to another rooms / cameras
            elementControls: {
                visible: new ControlsElement({
                    id: 'visible',
                    label: 'Visible',
                    type: 'checkbox',
                    onChange: function (value) {
                        hotspot.elementControls.visible.value = value;
                        hotspot.visible = value;
                        this.drawCorner(hotspot.id, hotspot);
                    }.bind(this),
                    value: true,
                    active: true
                }),
                angle90: new ControlsElement({
                    id: 'angle90',
                    label: '90° angle',
                    type: 'checkbox',
                    onChange: function (value) {
                        hotspot.elementControls.angle90.value = value; // Todo: remove from here
                        hotspot.angle90 = value;

                        if (hotspot.edges.top) {
                            hotspot.edges.top.elementControls.angle90.value = value;
                            hotspot.edges.top.angle90 = value;

                            this.drawCorner(hotspot.edges.top.id, hotspot.edges.top);
                        } else if (hotspot.edges.bottom) {
                            hotspot.edges.bottom.elementControls.angle90.value = value;
                            hotspot.edges.bottom.angle90 = value;

                            this.drawCorner(hotspot.edges.bottom.id, hotspot.edges.bottom);
                        }

                        this.drawCorner(hotspot.id, hotspot);
                    }.bind(this),
                    value: true,
                    active: true
                }),
            }
        }

        if (typeof(options) === 'object') {
            Object.keys(options).forEach(function (key) {
                if (key !== 'elementControls') {
                    hotspot[key] = options[key];
                } else {//if (key === 'elementControls') {
                    Object.keys(options[key]).forEach(function (eKey) {
                        hotspot[key][eKey].value = options[key][eKey].value;
                        hotspot[hotspot[key][eKey].id] = options[key][eKey].value;
                    });
                }
            });
        }

        return hotspot;
    }

    /**
     * Swap left & right of hotspot
     * @param  {string} hotspot edge
     * @returns {this}
     */
    this.swapLeftRightOfCorner = function (hotspotId) {
        const hotspot = this.hotspots[hotspotId];

        if (hotspot && hotspot.type === 'edge' && hotspot.align === 'horisontal') {
            const start = hotspot.start.hotspot;
            const end = hotspot.end.hotspot;
            
            var temp = {
                x: start.x,
                y: start.y
            };

            start.x = end.x;
            start.y = end.y;

            end.x = temp.x;
            end.y = temp.y;

            if (start.edges.top) {
                temp = {
                    x: start.edges.top.x,
                    y: start.edges.top.y
                }

                start.edges.top.x = end.edges.top.x;
                start.edges.top.y = end.edges.top.y;

                end.edges.top.x = temp.x;
                end.edges.top.y = temp.y;
            } else if (start.edges.bottom) {
                temp = {
                    x: start.edges.bottom.x,
                    y: start.edges.bottom.y
                }

                start.edges.bottom.x = end.edges.bottom.x;
                start.edges.bottom.y = end.edges.bottom.y;

                end.edges.bottom.x = temp.x;
                end.edges.bottom.y = temp.y;
            }

            this
                .reDrawHotspotsInRoom()
                .reDrawEdgesInRoom();
        } else {
            console.warn(
                'Hotspot with id «' + hotspotId + '» not exists, or not of edge type, or align not horisontal.'
            );
        }

        return this;
    }

    /**
     * Set auto corner with coordinates
     * @param  {number} ath
     * @param  {number} atv
     * @returns {this}
     */
    this.setCornerAuto = function (ath, atv) {
        var hotspotId = 'corner_' + this.getNewIdNumber();

        var room = this.rooms[this.room];

        var topCornerAtv = 0;
        var bottomCornerAtv = 0;

        if (atv < 0) { // top
            topCornerAtv = atv;
            bottomCornerAtv = atv * -(room.cameraHeight / (room.ceilingHeight - room.cameraHeight));
        } else { // bottom
            topCornerAtv = atv * -((room.ceilingHeight - room.cameraHeight) / room.cameraHeight);
            bottomCornerAtv = atv;
        }

        var hotspotA = this.getNewCornerHotspot(hotspotId + '_t', ath, topCornerAtv);
        var hotspotB = this.getNewCornerHotspot(hotspotId + '_b', ath, bottomCornerAtv);

        this
            .drawCorner(hotspotA.id, hotspotA)
            .drawCorner(hotspotB.id, hotspotB);

        this
            .hotspots[hotspotA.id]
            .edges[hotspotA.location === 'FLOOR' ? 'top' : 'bottom'] = this.hotspots[hotspotB.id];
        this
            .hotspots[hotspotB.id]
            .edges[hotspotB.location === 'FLOOR' ? 'top' : 'bottom'] = this.hotspots[hotspotA.id];

        this
            .connectCorner(hotspotA.id)
            // .setCornerAngleAuto(hotspotA.id)
            .reDrawEdgesInRoom()

        return this;
    }

    this.setCornerAngleAuto = function (hotspotId) {
        const angleError = 20;
        const hotspot = this.hotspots[hotspotId];

        if (hotspot.edges.left !== hotspot && hotspot.edges.right !== hotspot) {
            var cartesianPoints = [
                Utils.coordsPanoTo3d(Utils.degToRad(hotspot.edges.left.x), Utils.degToRad(hotspot.edges.left.y), 150),
                Utils.coordsPanoTo3d(Utils.degToRad(hotspot.x), Utils.degToRad(hotspot.y), 150),
                Utils.coordsPanoTo3d(Utils.degToRad(hotspot.edges.right.x), Utils.degToRad(hotspot.edges.right.y), 150)
            ];
    
            var angleLeft = Utils.radToDeg(Utils.getRotationOfLine(
                cartesianPoints[0].x,
                cartesianPoints[1].x,
                cartesianPoints[0].z,
                cartesianPoints[1].z
            ));
            var angleRight = Utils.radToDeg(Utils.getRotationOfLine(
                cartesianPoints[1].x,
                cartesianPoints[2].x,
                cartesianPoints[1].z,
                cartesianPoints[2].z
            ));

            var angleOfCorner = Math.abs(angleLeft - angleRight);
    
            if (angleOfCorner > 180) {
                angleOfCorner = Math.abs(Utils.reflectAngle(angleLeft) - Utils.reflectAngle(angleRight));
            }
    
            angleOfCorner = 180 - angleOfCorner;
    
            if (angleOfCorner < 90 + angleError && angleOfCorner > 90 - angleError) {
                hotspot.elementControls.angle90.onChange({value: true});
            } else {
                hotspot.elementControls.angle90.onChange({value: false});
            }
        }

        return this;
    }
    
    /**
     * Connect corner with anothers near corners and makes edges between them
     * @param  {string} hotspotId hotspot id
     * @returns {this}
     */
    this.connectCorner = function (hotspotId) {
        var hotspot = this.hotspots[hotspotId]; 
        var nearCorners = this.findNearestCornersByHotspotId(hotspot.id);
        var attach = [];

        Object.keys(nearCorners).map(function (key) {
            var corner = {}
            
            if (nearCorners[key] && ~key.indexOf('Left')) {
                corner.id = nearCorners[key].id;
                corner.direction = 'right';
            } else if (nearCorners[key]) { // Right
                corner.id = nearCorners[key].id;
                corner.direction = 'left';
            }

            attach.push(corner);
        });

        this.detachCorners(attach);
        this.attachCorners(attach, hotspot.id);

        return this;
    }

    /**
     * Attach corners to eachother
     * @param  {array} corners list
     * @param  {string} corner corner to attach
     * @returns {this}
     */
    this.attachCorners = function (corners, corner) {
        var hotspot = this.hotspots[corner];
        var topHotspot = null;
        var bottomHotspot = null;

        if (hotspot.location === 'FLOOR') {
            topHotspot = hotspot.edges.top;
            bottomHotspot = hotspot;
        } else {
            topHotspot = hotspot;
            bottomHotspot = hotspot.edges.bottom;
        }

        if (Array.isArray(corners)) {
            corners.map(function (corner) {
                if (this.hotspots[corner.id].location === 'FLOOR') {
                    this.hotspots[corner.id].edges[corner.direction] = bottomHotspot;
                    bottomHotspot.edges[this.oppositeDirections[corner.direction]] = this.hotspots[corner.id];
                } else {
                    this.hotspots[corner.id].edges[corner.direction] = topHotspot;
                    topHotspot.edges[this.oppositeDirections[corner.direction]] = this.hotspots[corner.id];
                }
            }.bind(this));
        }

        return this;
    }

    /**
     * Detach list of corners
     * @param  {array} corners list
     * @returns {this}
     */
    this.detachCorners = function (corners) {
        if (Array.isArray(corners)) {
            corners.map(function (corner) {
                this.deleteConnections(corner.id, corner.direction);
            }.bind(this));
        }

        return this;
    }

    /**
     * Get difference in radians between angles
     * @param  {number} a in degrees -180 — 180
     * @param  {number} b in degrees -180 — 180
     * @returns {number} difference in radians
     */
    this.getDifferenceBetweenAngles = function (a, b, withDirection) {
        if (withDirection !== undefined) return this.getDifferenceBetweenAnglesWithDirection(a, b);

        const difference = Math.abs(a - b);
        return difference > 180 ? 360 - difference : difference;
    }

    /**
     * Get difference in radians between angles with direction
     * @param  {number} a in degrees -180 — 180
     * @param  {number} b in degrees -180 — 180
     * @returns {number} difference in radians
     */
    this.getDifferenceBetweenAnglesWithDirection = function (a, b) {
        const difference = (b - a + 180) % 360 - 180;
        return difference < -180 ? difference + 360 : difference;
    }

    /**
     * Get angle beetween min and max
     * @param  {number} min
     * @param  {number} max
     * @param  {number} angle
     */
    this.getAngleBetweenMinMax = function (min, max, angle) {
        const range = max - min;
        return angle > max ? angle - range : angle < min ? angle + range : angle;
    }
    
    /**
     * Find hotspot by another hotspot id
     * @param  {string} hotspotId
     * @returns {object} corners
     */
    this.findNearestCornersByHotspotId = function (hotspotId) {
        var hotspot = this.hotspots[hotspotId];

        if (hotspot.location === 'FLOOR') {
            hotspot = hotspot.edges.top;
        }

        return this.findNearestCorners(hotspot);
    }
    
    /**
     * Find nearest corners by coordinates
     * @param  {number} ath in degrees
     * @param  {number} atv in degrees 
     * @returns {object|null} corners
     */
    this.findNearestCornersByCoordinates = function (ath, atv) {
        // Create fake hotspot for findNearestCorners function
        var hotspot = {
            type: 'fake',
            x: ath,
            y: atv,
            location: 'CEILING',
            edges: {}
        }

        var corners = this.findNearestCorners(hotspot);

        if (corners.leftTop && corners.leftTop.type === 'fake') {
            Object.keys(corners).map(function (key) {
                corners[key] = null;
            });
        }
        
        return corners; 
    }

    /**
     * Find best corners to attach
     * @param  {string} hotspotId top corner
     * @returns {object} hotspots
     */
    this.findNearestCorners = function (hotspot) {
        const corners = {
            topLeft: null,
            topRight: null,
            bottomLeft: null,
            bottomRight: null
        }

        var minLeftDifference = Infinity;
        var minRightDifference = Infinity;

        if (!hotspot) return console.warn('findNearestCorners: Hotspot not exists!');

        // find top left first with best match
        Object.keys(this.hotspots).map(function (key) {
            const currHotspot = this.hotspots[key];

            if (currHotspot && currHotspot !== hotspot && currHotspot.room === this.room) {
                var difference = this.getDifferenceBetweenAngles(hotspot.x, currHotspot.x, true);

                if (hotspot.location === currHotspot.location) {
                    var absDifference = Math.abs(difference);
                    if (difference < 0) {
                        if (absDifference < minLeftDifference) {
                            minLeftDifference = absDifference;
                            corners.topLeft = currHotspot;
                        }
                    } else if (!corners.topLeft) { // difference > 0 (Try find left on right)
                        if (absDifference < minRightDifference) {
                            minRightDifference = absDifference;
                            corners.topLeft = currHotspot; // Connect with all round
                        }
                    }
                }
            }
        }.bind(this));

        if (corners.topLeft) {
            // var bestHotspot = this.findRealCornerReqursive(corners.topLeft, 'left');

            // if (bestHotspot) {
            //   // this.setHotspotImage(bestHotspot.id, this.images.locked); // Hint: debug
            //   corners.topLeft = bestHotspot;
            // }

            corners.bottomLeft = corners.topLeft.edges.bottom;

            corners.topRight = corners.topLeft.edges.right;
            corners.bottomRight = corners.bottomLeft.edges.right;
        } else {
            corners.topLeft = hotspot;
            corners.topRight = hotspot;
            corners.bottomLeft = hotspot.edges.bottom;
            corners.bottomRight = hotspot.edges.bottom;
        }

        return corners;
    }
    
    /**
     * Find real corner which 
     * @param  {object} hotspot
     * @param  {string} direction left / right
     * @param  {number|undefined} level need only for reqursive
     * @param  {number|undefined} initialX need only for reqursive
     * @returns {object} hotspot
     */
    this.findRealCornerReqursive = function (hotspot, direction, level, startHotspot) {
        if (level === undefined) level = 0;
        if (startHotspot === undefined) startHotspot = hotspot;
        
        var nextHotspot = hotspot.edges[direction === 'left' ? 'right' : 'left'];
        if (nextHotspot && startHotspot !== nextHotspot) {
            var edgeDiff = this.getDifferenceBetweenAngles(startHotspot.x, nextHotspot.x, true);
            if ((direction === 'left' && edgeDiff < 0) || (direction === 'right' && edgeDiff > 0)) {
                return this.findRealCornerReqursive(nextHotspot, direction, level + 1, startHotspot);  
            } else {
                return hotspot;
            }
        } else if (startHotspot === nextHotspot) {
            return startHotspot;
        } else {
            return hotspot;
        }
    };

    /**
     * Get corner connections with another corners
     * @param  {string} hotspotId
     * @returns {object} connections
     */
    this.getCornerConnections = function (hotspotId) {
        const connections = {
            top: null,
            bottom: null,
            left: null,
            right: null
        };

        /**
         * Connections structure:
         * \ ➡ ● ➡ ● ➡ \
         * /   ⬇   ⬇   /
         * \ ➡ ● ➡ ● ➡ \
         */

        const hotspot = this.hotspots[hotspotId];
        if (hotspot && hotspot.edges) {
            Object.keys(connections).map(function (key) {
                if (hotspot.edges[key]) {
                    connections[key] = hotspot.edges[key];
                }
            }.bind(this));
        }

        return connections;
    }

    /**
     * Draw corner on pano and put it to hotspots object
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @param  {object} options
     * @returns {this}
     */
    this.drawCorner = function (hotspotId, options) {
        if (typeof(options) !== 'object') return console.warn('Options must be object!');

        this.pano.call('addhotspot("' + hotspotId + '")');
        this.pano.set(
            'hotspot["' + hotspotId + '"].url', 
            this.images[
                'point' + 
                (options.location === 'FLOOR' ? 'Floor' : 'Ceiling') + 
                (options.angle90 === true ? '90' : '')
            ]
        );
        this.pano.set('hotspot["' + hotspotId + '"].alpha', options.visible ? 1.0 : 0.25);
        this.pano.set('hotspot["' + hotspotId + '"].ath', options.x);
        this.pano.set('hotspot["' + hotspotId + '"].atv', options.y);
        this.pano.set('hotspot["' + hotspotId + '"].zorder', options.zOrder ? options.zOrder : this.types.corner.order);
        this.pano.set('hotspot["' + hotspotId + '"].renderer', 'css3d');
        this.pano.set('hotspot["' + hotspotId + '"].onhover', function () {
            if (this.config.showHoweredHotspot) { // show hovered hotspot
                if (this.temp.hoveredHotspot.last !== hotspotId) {
                    console.log('Hovered:', this.hotspots[hotspotId]);
                    this.temp.hoveredHotspot.last = hotspotId;
                }
            }
            this.temp.hoveredHotspot.id = hotspotId;
        }.bind(this));
        this.pano.set('hotspot["' + hotspotId + '"].onout', function () {
            this.temp.hoveredHotspot.id = null;
        }.bind(this));
        this.pano.set('hotspot["' + hotspotId + '"].ondown', function () {
            event.preventDefault();
            this.handleMouseDown().setClickedHotspot(hotspotId);
        }.bind(this));

        this.hotspots[hotspotId] = options;

        return this;
    }
    
    /**
     * Draw link hotspot to other room 
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @param  {object} options
     * @returns {this}
     */
    this.drawLink = function (hotspotId, options) {
        if (typeof(options) !== 'object') return console.warn('Options must be object!');

        if (options.overlapped === null || options.overlapped === undefined) {
            var alternativeId = (options.to + '').replace(/\.JPG$/, '.jpg');

            if (this.rooms[alternativeId]) {
                options.to = alternativeId;
            }

            if (this.rooms[options.to]) {
                var text = this.rooms[options.to].title;
                options.text = text;
    
                this.pano.call('addhotspot(' + hotspotId + ')');
                this.pano.set('hotspot[' + hotspotId + '].type', 'text');
                this.pano.set('hotspot[' + hotspotId + '].keep', false);
                this.pano.set('hotspot[' + hotspotId + '].ath', options.x);
                this.pano.set('hotspot[' + hotspotId + '].atv', options.y);
                this.pano.set('hotspot[' + hotspotId + '].visible', true);
                this.pano.set('hotspot[' + hotspotId + '].enabled', true);
                this.pano.set('hotspot[' + hotspotId + '].zorder', options.zOrder ? options.zOrder : this.types.link.order);
                this.pano.set('hotspot[' + hotspotId + '].html', text);
                this.pano.set('hotspot[' + hotspotId + '].bgcolor', 0x337AB7);
                this.pano.set('hotspot[' + hotspotId + '].bgalpha', 1);
                this.pano.set('hotspot[' + hotspotId + '].venter', false);
                this.pano.set('hotspot[' + hotspotId + '].bgborder', 1);
                this.pano.set('hotspot[' + hotspotId + '].distorted', true);
                this.pano.set('hotspot[' + hotspotId + '].renderer', 'css3d');
                this.pano.set('hotspot[' + hotspotId + '].fillcolor', '0x337AB7');
                this.pano.set(
                    'hotspot[' + hotspotId + '].css', 
                    'font-family:Helvetica; font-size:16px; color:#ffffff; text-align: center;'
                );
    
                this.pano.set('hotspot[' + hotspotId + '].onhover', function () {
                    if (this.config.showHoweredHotspot) { // show hovered hotspot
                        if (this.temp.hoveredHotspot.last !== hotspotId) {
                            console.log('Hovered:', this.hotspots[hotspotId]);
                            this.temp.hoveredHotspot.last = hotspotId;
                        }
                    }
                    this.temp.hoveredHotspot.id = hotspotId;
                }.bind(this));
                this.pano.set('hotspot[' + hotspotId + '].onout', function () {
                    this.temp.hoveredHotspot.id = null;
                }.bind(this));
                this.pano.set('hotspot[' + hotspotId + '].ondown', function () {
                    event.preventDefault();
                    this.handleMouseDown().setClickedHotspot(hotspotId).handleMouseClick();
                }.bind(this));
            } else {
                console.warn('Room with id ' + options.to + ' not exists', this.rooms);
            }
        } else {
            this.pano.call('removehotspot(' + hotspotId + ')');
        }

        this.hotspots[hotspotId] = options;

        return this;
    }

    /**
     * Set image to pano hotspot
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @param  {string} image
     */
    this.setHotspotImage = function (hotspotId, image) {
        this.pano.set('hotspot["' + hotspotId + '"].url', image);

        return this;
    }

    /** 
     * Set hovered corner to FLOOR or CEILING location
     * @param  {string} location
     * @returns {this}
     */
    this.setHoveredCornerLocation = function (location) {
        if (this.temp.hoveredHotspot.id) {
            this.hotspots[this.temp.hoveredHotspot.id].location = location;

            this.drawCorner(this.temp.hoveredHotspot.id, this.hotspots[this.temp.hoveredHotspot.id]);
        }

        return this;
    }

    /** 
     * Toggle hovered corner visibility 
     * @returns {this}
     */
    this.toggleCornerHotspotVisibility = function () {
        if (this.temp.hoveredHotspot.id) {
            if (this.hotspots[this.temp.hoveredHotspot.id].type === 'corner') {
                this.hotspots[this.temp.hoveredHotspot.id].visible = 
                    !this.hotspots[this.temp.hoveredHotspot.id].visible;
    
                this.drawCorner(this.temp.hoveredHotspot.id, this.hotspots[this.temp.hoveredHotspot.id]);
            }
        }

        return this;
    }
    
    /** 
     * Delete hovered hotspot and his edges
     * @returns {this} 
     */
    this.deleteHoveredHotspot = function () {
        const hoveredHotspot = this.hotspots[this.temp.hoveredHotspot.id];
        
        if (hoveredHotspot && this.types[this.hotspots[this.temp.hoveredHotspot.id].type].hoverable) {
            if (typeof(hoveredHotspot.ondelete) === 'function') {
                hoveredHotspot.ondelete();
            } else {
                this.deleteHotspot(this.temp.hoveredHotspot.id);
            }
        }

        this.handleMouseDown();
        this.handleMouseUp();

        return this;
    }

    /**
     * Delete connections attached to hotspot 
     * @param  {string} hotspotId
     * @returns {this}
     */
    this.deleteConnections = function (hotspotId, direction) {
        const hotspot = this.hotspots[hotspotId];

        if (hotspot && hotspot.edges) {
            if (direction === undefined) {
                Object.keys(hotspot.edges).map(function (eKey) {
                    const nextHotspot = hotspot.edges[eKey];
                    if (nextHotspot) {
                        nextHotspot.edges[this.oppositeDirections[eKey]] = null;
                    }
                    hotspot.edges[eKey] = null;
                }.bind(this));
            } else if (direction === 'top') {
                const nextHotspot = hotspot.edges.top;
                if (nextHotspot) {
                    nextHotspot.edges.bottom = null;
                };

                hotspot.edges.top = null;
            } else if (direction === 'bottom') {
                const nextHotspot = hotspot.edges.bottom;
                if (nextHotspot) {
                    nextHotspot.edges.top = null;
                };

                hotspot.edges.bottom = null;
            } else if (direction === 'left') {
                const nextHotspot = hotspot.edges.left;
                if (nextHotspot) {
                    nextHotspot.edges.right = null;
                };

                hotspot.edges.left = null;
            } else if (direction === 'right') {
                const nextHotspot = hotspot.edges.right;
                if (nextHotspot) {
                    nextHotspot.edges.left = null;
                };

                hotspot.edges.right = null;
            }
        } else {
            console.warn('Hotspot with id ' + hotspotId + ' not exists!');
        }

        return this;
    }

    /**
     * Delete hotspot from class and pano
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @returns {this}
     */
    this.deleteHotspot = function (hotspotId) {
        this.hotspots[hotspotId] = null;

        if (hotspotId.match(/^text_/)) {
            this.pano.call('removehotspot(' + hotspotId + ')');
            this.pano.call('removehotspot(' + hotspotId.replace(/^text_/, '') + ')');
        } else {
            this.pano.call('removehotspot(' + hotspotId + ')');
            this.pano.call('removehotspot(text_' + hotspotId + ')');
        }

        this.pano.call('removehotspot(' + hotspotId + '_dash)');

        return this;
    }

    /**
     * Delete multiply hotspots with filters
     * @param  {object} options
     * @returns {this}
     */
    this.deleteHotspots = function (options) {
        var deleteIds = [];

        // Filter by room
        if (options && options.room) {
            deleteIds = Object.keys(this.hotspots).map(function (key) {
                if (this.hotspots[key] && this.hotspots[key].room === options.room) {
                    return key;
                }
            }.bind(this));
        } else { // delete all
            deleteIds = Object.keys(this.hotspots);
        }

        // Filter by type
        if (options && options.type) {
            deleteIds = deleteIds.map(function (key) {
                if (key !== undefined && this.hotspots[key].type === options.type) {
                    return key;
                }
            }.bind(this));
        }

        // Remove link from filtered
        deleteIds = deleteIds.map(function (key) {
            if (key !== undefined && this.hotspots[key] && this.hotspots[key].deletable !== false) {
                return key;
            }
        }.bind(this));

        deleteIds.map(function (key) {
            if (key !== undefined) {
                if (this.hotspots[key].type === 'corner') {
                    this.deleteConnections(key);
                }
                this.deleteHotspot(key);
            }
        }.bind(this));

        return this;
    }
    
    /**
     * Turn all hotspots in room
     * @param {number} angle in degrees
     * @returns {this}
     */
    this.turnRoomHotspots = function (angle) {
        Object.keys(this.hotspots).map(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.room === this.room) {
                hotspot.x = this.getAngleBetweenMinMax(-180, 180, hotspot.x + angle);
            }
        }.bind(this));

        this
            .reDrawHotspotsInRoom()
            .reDrawEdgesInRoom();

        return this;
    }

    /** 
     * Redraw corners and lines in current room
     * @returns {this}
     */
    this.reDrawHotspotsInRoom = function () {
        // console.log('%creDrawHotspotsInRoom', 'color: white; background-color: red');
        Object.keys(this.hotspots).map(function (key) {
            if (this.hotspots[key] && this.hotspots[key].room === this.room) {
                if (this.hotspots[key].type === 'corner') {
                    this.drawCorner(key, this.hotspots[key]);
                } else if (this.hotspots[key].type === 'line' || this.hotspots[key].type === 'edge') {
                    this.drawLine(key, this.hotspots[key]);
                } else if (this.hotspots[key].type === 'door' || this.hotspots[key].type === 'window') {
                    this.drawRectangleElement(this.hotspots[key].id, this.hotspots[key]);
                } else if (this.hotspots[key].type === 'link') {
                    this.drawLink(this.hotspots[key].id, this.hotspots[key]);
                } else if (this.hotspots[key].type === 'glue') {
                    this.drawGlue(this.hotspots[key].id, this.hotspots[key]);
                } else {
                    // console.log('Not redrawn:', this.hotspots[key]);
                }
            }
        }.bind(this));

        this.reDrawEdgesInRoom(); //Hint: can be optimized
        
        return this;
    }
    
    /**
     * Redraw all edges
     * @param {array} corners array of {string} keys
     * @returns {this}
     */
    this.reDrawEdgesInRoom = function (ignoreEdges, updateEvent) {
        if (updateEvent === undefined) updateEvent = true;
        if (!Array.isArray(ignoreEdges)) ignoreEdges = [];
        Object.keys(this.hotspots).map(function (key) {
            if (!~ignoreEdges.indexOf(this.hotspots[key]) && this.hotspots[key] && this.hotspots[key].type === 'edge') {
                this.deleteHotspot(key);
            }
        }.bind(this));

        Object.keys(this.hotspots).map(function (hKey) {
            const hotspot = this.hotspots[hKey];
            if (
                hotspot && 
                hotspot.room === this.room && 
                hotspot.edges &&
                hotspot.type === 'corner'
            ) {
                Object.keys(hotspot.edges).map(function (eKey) {
                    if (eKey === 'bottom' || eKey === 'right') { // Draw only bottom && right edges from corner
                        const nextHotspot = hotspot.edges[eKey];

                        var needIgnore = ignoreEdges.find(function (edge) {
                            if (edge.start.hotspot === hotspot && edge.end.hotspot === nextHotspot) {
                                return edge;
                            }
                        });

                        if (nextHotspot && !needIgnore) {
                            var hotspotId = 'edge_' + this.getNewIdNumber();
                            var drawHotspot = {
                                type: 'edge',
                                room: this.room,
                                start: {
                                    hotspot: hotspot,
                                    x: hotspot.x,
                                    y: hotspot.y
                                },
                                end: {
                                    hotspot: nextHotspot,
                                    x: nextHotspot.x,
                                    y: nextHotspot.y
                                },
                                color: eKey === 'bottom' ? 0x337AB7 : 0x00ff00,
                                align: eKey === 'bottom' ? 'vertical': 'horisontal',
                                onMove: function (ath, atv) {
                                    this.moveEdge(ath, atv, drawHotspot);
                                }.bind(this),
                            }

                            this.drawLine(hotspotId, drawHotspot);
                            if (eKey === 'right' && hotspot.lengths) {
                                drawHotspot.wallThickness = 15;
                                drawHotspot.elementControls = {
                                    wallThickness: new ControlsElement({
                                        id: 'wallThickness',
                                        label: 'Wall thickness, cm:',
                                        type: 'input',
                                        onChange: function (value) {
                                            value = parseFloat(value);

                                            if (!isNaN(value)) {
                                                if (hotspot.edges.top) {
                                                    drawHotspot.elementControls.wallThickness.value = value;
                                                    hotspot.wallThickness = value;
                                                } else if (hotspot.edges.bottom) {
                                                    drawHotspot.elementControls.wallThickness.value = value;
                                                    hotspot.edges.bottom.wallThickness = value;
                                                }
                                            }

                                            this.onUpdate();
                                        }.bind(this),
                                        value: (hotspot.edges.top ? hotspot.wallThickness : hotspot.edges.bottom.wallThickness) || 15,
                                        active: true
                                    }),
                                    applyWallThickness: new ControlsElement({
                                        id: 'applyWallThickness',
                                        label: 'Set thickness to ' + this.lineLength,
                                        type: 'button',
                                        onClick: function (value) {
                                            drawHotspot.elementControls.wallThickness.onChange({value: this.lineLength});
                                        }.bind(this),
                                        active: true
                                    })
                                }

                                this.addTextToElement(
                                    hotspotId, 
                                    this.getLengthTitle(hotspot.lengths, this.rooms[this.room].useSizesIn)
                                );
                            }
                        } else if (nextHotspot && needIgnore) {
                            this.drawLine(needIgnore.id, needIgnore);
                            if (eKey === 'right' && needIgnore.lengths) {
                                this.addTextToElement(
                                    needIgnore.id, 
                                    this.getLengthTitle(needIgnore.lengths, this.rooms[this.room].useSizesIn)
                                );
                            }
                        }
                    }
                }.bind(this)); 
            }
        }.bind(this));

        if (updateEvent) {
            this.onUpdate();
        }

        this.redrawlinesLengths();

        return this;
    }
    
    /**
     * Update lines lengths
     * @returns {this}
     */
    this.redrawlinesLengths = function () {
        Object.keys(this.hotspots).map(function (key) {
            if (this.hotspots[key] && this.hotspots[key].room === this.room) {
                if (this.hotspots[key].type === 'line') {
                    this.events.fire('askForLineLength', {
                        line: this.hotspots[key]
                    });
                }
            }
        }.bind(this));

        return this;
    }
    
    /**
     * Fire event, to update external classes
     * @returns {this}
     */
    this.onUpdate = function () {
        if (this.temp.update.timeout) {
            clearTimeout(this.temp.update.timeout);
        } 

        this.temp.update.timeout = setTimeout(function () {
            this.events.fire('update', {
                pano: this.getPanoData(),
                clicked: {
                    id: this.temp.clickedHotspot.id,
                    value: this.hotspots[this.temp.clickedHotspot.id]
                }
            });
        }.bind(this), 500);

        return this;
    }
    
    /**
     * Draw all possible walls
     * But unusable, becouse walls block pano drag events
     * @returns {this}
     */
    this.reDrawWalls = function () {   
        Object.keys(this.hotspots).map(function (key) {
            const hotspot = this.hotspots[key];
            if (
                hotspot && 
                hotspot.room === this.room
            ) {
                if (hotspot.edges && hotspot.type === 'corner' && hotspot.location === 'CEILING') {
                    var wall = this.hotspots['wall_' + hotspot.id + '_' + hotspot.edges.right.id];
                    var wall2 = this.hotspots['wall_' + hotspot.edges.right.id + '_' + hotspot.id];
                    if (!wall && !wall2) {
                        this.drawWall(hotspot);
                    }
                } else if (hotspot.type === 'wall') {
                    if (
                        hotspot.corners[0].edges.right !== null &&
                        this.hotspots[hotspot.corners[0].edges.right.id] !== null &&
                        this.hotspots[hotspot.corners[1].id] !== null,
                        hotspot.corners[0].edges.right !== hotspot.corners[1]
                    ) {
                        this.deleteHotspot(hotspot.id);
                    }
                }
            }
        }.bind(this));

        return this;
    }
    
    /**
     * Draw wall from start hotspot
     * @todo move to PanoElement class
     * @param {object} hotspot left top
     * @returns {this}
     */
    this.drawWall = function (hotspot) {
        if (hotspot.location !== 'CEILING') {
            hotspot = hotspot.edges.top;
        }

        var wall = {
            id: 'wall_' + hotspot.id + '_' + hotspot.edges.right.id,
            type: 'wall',
            room: this.room,
            corners: [
                hotspot,
                hotspot.edges.right,
                hotspot.edges.right.edges.bottom,
                hotspot.edges.bottom
            ]
        };

        var hotspotId = wall.id;

        this.pano.call('addhotspot(' + hotspotId + ')');

        this.pano.set('hotspot[' + hotspotId + '].keep', false);
        
        wall.corners.map(function (corner, index) {
            this.pano.set('hotspot[' + hotspotId + '].point[' + index + '].ath', corner.x);
            this.pano.set('hotspot[' + hotspotId + '].point[' + index + '].atv', corner.y);
        }.bind(this));

        this.pano.set('hotspot[' + hotspotId + '].fillcolor', 0x337AB7);
        this.pano.set('hotspot[' + hotspotId + '].fillalpha', 0.5);
        this.pano.set('hotspot[' + hotspotId + '].handcursor', false);
        this.pano.set('hotspot[' + hotspotId + '].bordercolor', 0x337AB7);
        this.pano.set('hotspot[' + hotspotId + '].borderwidth', 2);
        this.pano.set('hotspot[' + hotspotId + '].zorder', this.types.wall.order);

        // this.pano.set('hotspot["' + hotspotId + '"].onhover', function () {
        //   this.temp.hoveredHotspot.id = hotspotId;
        // }.bind(this));
        // this.pano.set('hotspot["' + hotspotId + '"].onout', function () {
        //   this.temp.hoveredHotspot.id = null;
        // }.bind(this));
        // this.pano.set('hotspot["' + hotspotId + '"].onclick', function () {
        //   this.setClickedHotspot(hotspotId);
        // }.bind(this));
        this.hotspots[hotspotId] = wall;

        return this;
    };

    /**
     * Return pano data, can be use for build 3d model
     * @returns {object} of walls, doors, windows
     */
    this.getPanoData = function () {
        const data = {
            rooms: JSON.parse(JSON.stringify(this.rooms)),
            corners: {},
            windows: {},
            doors: {},
            glue: {},
            hotspots: this.hotspots
        };

        Object.keys(data.rooms).forEach(function (key) {
            data.rooms[key].corners = {};
            data.rooms[key].windows = {};
            data.rooms[key].doors = {};
        });

        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];
            if (hotspot) {
                if (hotspot.type === 'corner') {
                    data.corners[key] = hotspot;
                    data.rooms[hotspot.room].corners[key] = hotspot;
                } else if (hotspot.type === 'window') {
                    data.windows[key] = hotspot;
                    data.rooms[hotspot.room].windows[key] = hotspot;
                } else if (hotspot.type === 'door') {
                    data.doors[key] = hotspot;
                    data.rooms[hotspot.room].doors[key] = hotspot;
                } else if (hotspot.type === 'glue') {
                    if (hotspot.glueWith) {
                        data.glue[hotspot.id] = {
                            room: hotspot.room,
                            glueWith: {
                                id: hotspot.glueWith,
                                room: this.hotspots[hotspot.glueWith].room,
                                rotationOffset: this.hotspots[hotspot.glueWith].rotationOffset,
                                forwardOffset: this.hotspots[hotspot.glueWith].forwardOffset,
                                sideOffset: this.hotspots[hotspot.glueWith].sideOffset,
                            },
                            rotationOffset: hotspot.rotationOffset,
                            forwardOffset: hotspot.forwardOffset,
                            sideOffset: hotspot.sideOffset,
                            corners: [
                                hotspot.glueCorners[0].id,
                                hotspot.glueCorners[1].id
                            ]
                        };
                    }
                }
            }
        }.bind(this));

        return data;
    }
    
    /**
     * Set grid visibility
     * @param  {boolean} value
     * @returns {this}
     */
    this.setGrid = function (visible, density) {
        if (density === undefined) density = 'dense';

        var linesOpacity = 0.50;
        var linesWidth = 3;
        var linesH = density === 'usual' ? 4 : 8;
        var linesV = density === 'usual' ? 3 : 5;
        var fixedLinesH = density === 'usual' ? 1 : 7;
        var fixedLinesV = density === 'usual' ? 1 : 7;

        var iterationsH = new Array(linesH).fill().map(function (v, i) {
            return i;
        });
        var iterationsV = new Array(linesV).fill().map(function (v, i) {
            return i;
        });
        var fixedIterationsH = new Array(fixedLinesH).fill().map(function (v, i) {
            return i;
        });
        var fixedIterationsV = new Array(fixedLinesV).fill().map(function (v, i) {
            return i;
        });

        if (visible) {
            iterationsH.forEach(function (indexH) {
                var x = (((360 / linesH)) * indexH) - 180;

                var id = 'gridLine_' + indexH;

                var hotspot = {
                    id: id,
                    keep: true,
                    type: 'line',
                    room: '*',
                    width: linesWidth,
                    opacity: linesOpacity,
                    start: {
                        x: x,
                        y: -85
                    },
                    end: {
                        x: x,
                        y: 85
                    },
                    color: 0xFF0000,
                }

                hotspot.onMove = function (ath, atv) {
                    var move = this.getDifferenceVector(this.temp.mouse.down, {ath: ath, atv: atv});                    

                    iterationsH.forEach(function (indexH) {
                        var id = 'gridLine_' + indexH;

                        var start = this.hotspots[id].start.x - move.ath;
                        var end = this.hotspots[id].end.x - move.ath;

                        this.pano.set('hotspot[' + id + '].point[0].ath', start);
                        this.pano.set('hotspot[' + id + '].point[1].ath', end);

                        iterationsV.forEach(function (indexV) {
                            var id1 = 'gridLine_' + indexH + '_' + indexV;
                            var id2 = 'gridLine_' + (indexH - 1 < 0 ? linesH - 1 : indexH -1) + '_' + indexV;
    
                            ['zero', 'up', 'down'].forEach(function (direction) {
                                const vHotspot1 = this.hotspots[id1 + '_' + direction];
                                const vHotspot2 = this.hotspots[id2 + '_' + direction];
                                
                                if (vHotspot1) {
                                    vHotspot1.start.x = start;
                                    vHotspot2.end.x = end;
            
                                    this.pano.set('hotspot[' + id1 + '_' + direction + '].point[0].ath', start);
                                    this.pano.set('hotspot[' + id2 + '_' + direction + '].point[1].ath', end);
                                }
                            }.bind(this));
                        }.bind(this));
                    }.bind(this));
                }.bind(this);

                hotspot.onMoveEnd = function () {
                    iterationsH.forEach(function (indexH) {
                        var id = 'gridLine_' + indexH;

                        this.hotspots[id].start.x = this.pano.get('hotspot[' + id + '].point[0].ath');
                        this.hotspots[id].end.x = this.pano.get('hotspot[' + id + '].point[1].ath');
                    }.bind(this));
                }.bind(this);

                this.drawLine(id, hotspot);
            }.bind(this));

            iterationsV.forEach(function (indexV) {
                if (indexV % 2 === 1) return;

                var y = (85 / linesV) * indexV;

                iterationsH.forEach(function (indexH) {
                    var drawLine = function (y, x1, x2, direction) {
                        var id = 'gridLine_' + indexH + '_' + indexV + '_' + direction;
    
                        var hotspot = {
                            id: id,
                            keep: true,
                            type: 'line',
                            room: '*',
                            width: linesWidth,
                            opacity: linesOpacity,
                            start: {
                                x: x1,
                                y: y
                            },
                            end: {
                                x: x2,
                                y: y
                            },
                            color: 0x000FF0,
                        };

                        hotspot.onMove = function (ath, atv) {
                            iterationsH.forEach(function (indexH) {
                                var id = 'gridLine_' + indexH + '_' + indexV + '_' + direction;
    
                                hotspot.start.y = atv;
                                hotspot.end.y = atv;
    
                                this.pano.set('hotspot[' + id + '].point[0].atv', atv);
                                this.pano.set('hotspot[' + id + '].point[1].atv', atv);
                            }.bind(this));
                        }.bind(this);

                        this.drawLine(id, hotspot);
                    }.bind(this);

                    var x1 = (((360 / linesH)) * indexH) - 180;
                    var x2 = (((360 / linesH)) * (indexH + 1)) - 180;

                    if (indexV === 0) {
                        drawLine(y, x1, x2, 'zero');
                    } else {
                        drawLine(-y, x1, x2, 'up');
                        drawLine(y, x1, x2, 'down');
                    }
                }.bind(this));
            }.bind(this));

            var addLayer = function (id, x, y, image) {
                this.pano.call('addlayer(' + id + ')');
                this.pano.set('layer[' + id + '].name', id);
                this.pano.set('layer[' + id + '].type', 'image');
                this.pano.set('layer[' + id + '].url', image);
                this.pano.set('layer[' + id + '].align', 'center');
                this.pano.set('layer[' + id + '].edge', 'center');
                this.pano.set('layer[' + id + '].zorder', '1000');
                this.pano.set('layer[' + id + '].x', x);
                this.pano.set('layer[' + id + '].y', y);
                this.pano.set('layer[' + id + '].keep', true);
                this.pano.set('layer[' + id + '].visible', true);
                this.pano.set('layer[' + id + '].enabled', true);
                this.pano.set('layer[' + id + '].handcursor', false);
            }.bind(this);

            fixedIterationsV.forEach(function (indexFV) {
                if (indexFV % 2 === 1) return;

                if (indexFV === 0) {
                    addLayer('lineV_' + indexFV, 0, 0, this.images.lineV);
                } else {
                    var x = (750 / fixedLinesV) * indexFV;

                    addLayer('lineV_' + indexFV + '_p', x, 0, this.images.lineV);
                    addLayer('lineV_' + indexFV + '_n', -x, 0, this.images.lineV);
                }

                return this;
            }.bind(this));

            fixedIterationsH.forEach(function (indexFH) {
                if (indexFH % 2 === 1) return;

                if (indexFH === 0) {
                    addLayer('lineH_' + indexFH, 0, 0, this.images.lineH);
                } else {
                    var y = (750 / fixedLinesH) * indexFH;

                    addLayer('lineH_' + indexFH + '_p', 0, y, this.images.lineH);
                    addLayer('lineH_' + indexFH + '_n', 0, -y, this.images.lineH);
                }

                return this;
            }.bind(this));
        } else {
            iterationsH.forEach(function (indexH) {
                var id = 'gridLine_' + indexH;
                this.deleteHotspot(id);
            }.bind(this));

            iterationsV.forEach(function (indexV) {
                iterationsH.forEach(function (indexH) {
                    var id = 'gridLine_' + indexH + '_' + indexV;

                    ['zero', 'up', 'down'].forEach(function (direction) {
                        this.deleteHotspot(id + '_' + direction);
                    }.bind(this));
                }.bind(this));
            }.bind(this));

            fixedIterationsV.forEach(function (indexFV) {
                if (indexFV % 2 === 1) return;

                if (indexFV === 0) {
                    this.pano.call('removelayer(lineV_' + indexFV + ')');
                } else {
                    this.pano.call('removelayer(lineV_' + indexFV + '_p)');
                    this.pano.call('removelayer(lineV_' + indexFV + '_n)');
                }

                return this;
            }.bind(this));

            fixedIterationsH.forEach(function (indexFH) {
                if (indexFH % 2 === 1) return;

                if (indexFH === 0) {
                    this.pano.call('removelayer(lineH_' + indexFH + ')');
                } else {
                    this.pano.call('removelayer(lineH_' + indexFH + '_p)');
                    this.pano.call('removelayer(lineH_' + indexFH + '_n)');
                }

                return this;
            }.bind(this));
        }

        return this;
    }

    /**
     * Draw line on pano with options and put it to hotspots object 
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @param  {object} options
     * @returns {this}
     */
    this.drawLine = function (hotspotId, options) {
        this.pano.call('addhotspot(' + hotspotId + ')');

        this.pano.set('hotspot[' + hotspotId + '].keep', options.keep || false);
        
        this.pano.set('hotspot[' + hotspotId + '].point[0].ath', options.start.x);
        this.pano.set('hotspot[' + hotspotId + '].point[0].atv', options.start.y);
        
        this.pano.set('hotspot[' + hotspotId + '].point[1].ath', options.end.x);
        this.pano.set('hotspot[' + hotspotId + '].point[1].atv', options.end.y);

        this.pano.set('hotspot[' + hotspotId + '].alpha', options.opacity || 1);
        
        this.pano.set('hotspot[' + hotspotId + '].bordercolor', options.color !== undefined ? options.color : 0xffffff);
        this.pano.set('hotspot[' + hotspotId + '].borderwidth', options.width || 2);
        this.pano.set(
            'hotspot[' + hotspotId + '].zorder', 
            options.zOrder === undefined ? this.types.line.order : options.zOrder
        );

        if (options.dashColor) {
            this.pano.call('addhotspot(' + hotspotId + '_dash)');

            this.pano.set('hotspot[' + hotspotId + '_dash].polyline', true); // polylines has stroke-dasharray in css
            this.pano.set('hotspot[' + hotspotId + '_dash].keep', false);
        
            this.pano.set('hotspot[' + hotspotId + '_dash].point[0].ath', options.start.x);
            this.pano.set('hotspot[' + hotspotId + '_dash].point[0].atv', options.start.y);
        
            this.pano.set('hotspot[' + hotspotId + '_dash].point[1].ath', options.end.x);
            this.pano.set('hotspot[' + hotspotId + '_dash].point[1].atv', options.end.y);

            this.pano.set('hotspot[' + hotspotId + '_dash].alpha', options.opacity || 1);

            this.pano.set('hotspot[' + hotspotId + '_dash].bordercolor', options.dashColor !== undefined ? options.dashColor : 0xff0000);
            this.pano.set('hotspot[' + hotspotId + '_dash].borderwidth', options.width || 2);

            this.pano.set(
                'hotspot[' + hotspotId + '_dash].zorder', 
                (options.zOrder === undefined ? this.types.line.order : options.zOrder) + 1
            );
        }

        this.pano.set('hotspot["' + hotspotId + '"].onhover', function () {
            if (this.config.showHoweredHotspot) { // show hovered hotspot
                if (this.temp.hoveredHotspot.last !== hotspotId) {
                    console.log('Hovered:', this.hotspots[hotspotId]);
                    this.temp.hoveredHotspot.last = hotspotId;
                }
            }
            this.temp.hoveredHotspot.id = hotspotId;
        }.bind(this));
        this.pano.set('hotspot["' + hotspotId + '"].onout', function () {
            this.temp.hoveredHotspot.id = null;
        }.bind(this));

        if (!options.ignoreMouseClick) {
            this.pano.set('hotspot["' + hotspotId + '"].ondown', function () {
                event.preventDefault();
                this.handleMouseDown().setClickedHotspot(hotspotId).handleMouseClick();
            }.bind(this));
        }

        if (!this.hotspots[hotspotId]) {
            this.hotspots[hotspotId] = options;
        } else {
            Object.keys(options).forEach(function (oKey) {
                this.hotspots[hotspotId][oKey] = options[oKey];
            }.bind(this));
        }

        return this;
    }
    
    /** 
     * Auto draw line with two clicks
     * @todo move to PanoElement class
     * @returns {this}
     */
    this.setLineAuto = function () {
        var hotspotId = null;

        if (
            !this.hotspots[this.currentLine] || 
            (this.hotspots[this.currentLine] && this.hotspots[this.currentLine].closed)
        ) {
            hotspotId = 'line_' + this.getNewIdNumber();
            var coordinates = this.getMouseCoordinates();
            
            var hotspot = {
                id: hotspotId,
                type: 'line',
                room: this.room,
                start: {
                    x: coordinates.ath,
                    y: coordinates.atv
                },
                end: {
                    x: coordinates.ath,
                    y: coordinates.atv
                },
                zOrder: this.types.line.order,
                closed: false,
                ignoreMouseClick: true,
                dashColor: 0xFF0000,
                onclick: function () {
                    if (hotspot.lengths && hotspot.lengths.aligned) {
                        this.lineLength = hotspot.lengths.aligned;
                    }
                }.bind(this)
            }

            this.drawLine(hotspotId, hotspot);

            this.currentLine = hotspotId;
        } else if (this.currentLine && !this.currentLine.closed) {
            hotspotId = this.currentLine;
            var coordinates = this.getMouseCoordinates();

            this.pano.set('hotspot[' + hotspotId + '].point[1].ath', coordinates.ath);
            this.pano.set('hotspot[' + hotspotId + '].point[1].atv', coordinates.atv);

            this.hotspots[hotspotId].closed = true;
            this.hotspots[hotspotId].end = {
                x: coordinates.ath,
                y: coordinates.atv 
            };

            this.events.fire('askForLineLength', {
                line: this.hotspots[hotspotId]
            });

            this.currentLine = null;
        }

        if (this.temp.hoveredHotspot) {
            var set = this.setGlue(this.temp.hoveredHotspot);
            if (set) {
                this.currentLine = null;
                this.deleteHotspot(hotspotId);
            }
        }

        return this;
    }
    
    /** 
     * Remove lines, which been started draw, but not ended
     * @returns {this}
     */
    this.removeOpenedLines = function () {
        this.resetGlue();

        this.currentLine = null;
        Object.keys(this.hotspots).map(function (key) {
            if (this.hotspots[key] && this.hotspots[key].type === 'line' && this.hotspots[key].closed === false) {
                this.deleteHotspot(key);
            }
        }.bind(this));

        return this;
    }
    
    /**
     * Get title for lengts
     * @param {object} lengths
     * @returns {string}
     */
    this.getLengthTitle = function (lengths, useSizesIn) {
        var raw = lengths.raw;
        var aligned = lengths.aligned;

        if (useSizesIn === 'ft') {
            raw /= 30.48;
            aligned /= 30.48;
        } else {
            raw /= 100;
            aligned /= 100;
        }

        raw = _.round(raw, 2);
        aligned = _.round(aligned, 2);

        if (raw === aligned) {
            return raw + ''; // krpano need string
        } else {
            return raw + '<br>' + aligned;
        }
    }
    
    /**
     * Set line length & add text
     * @returns {this}
     */
    this.setLineLength = function (data) {
        if (data.lengths.raw < 1) return this;

        const hotspot = this.hotspots[data.line.id];
        hotspot.lengths = data.lengths;

        if (hotspot.type === 'line' && !hotspot.measurementSent) {
            hotspot.measurementSent = true;

            this.events.fire('newMeasurement', {
                id: hotspot.id,
                lengths: data.lengths
            });
        };

        this.addTextToElement(
            hotspot.id, 
            this.getLengthTitle(data.lengths, this.rooms[data.line.room].useSizesIn)
        );

        return this;
    }
    
    /**
     * Set glue for merging
     * @param {object} hotspot
     * @returns {boolean} setted
     */
    this.setGlue = function (hotspot) {
        var set = false;

        if (this.hotspots[hotspot.id] && this.hotspots[hotspot.id].type === 'corner') {
            if (~this.temp.glue.connectedHotspots.indexOf(hotspot.id)) {
                this.resetGlue();
            } else if (this.temp.glue.connectedHotspots.length === 1) {
                set = true;
                this.temp.glue.connectedHotspots.push(hotspot.id);
                this.makeGlue(this.temp.glue.connectedHotspots[0], this.temp.glue.connectedHotspots[1]);
                this.resetGlue();
            } else {
                this.temp.glue.connectedHotspots.push(hotspot.id);
            }
        } else {
            this.resetGlue();
        }

        return set;
    }

    /**
     * Reset glue for merging
     * @returns {this}
     */
    this.resetGlue = function () {
        this.temp.glue.connectedHotspots = [];
        return this;
    }
    
    /**
     * Make glue for merging
     * @param {string} startHotspotId Corner
     * @param {string} endHotspot Corner
     * @param {string} endHotspot Corner
     * @returns {this}
     */
    this.makeGlue = function (startHotspotId, endHotspotId, options) {
        var startHotspot = this.hotspots[startHotspotId];
        var endHotspot = this.hotspots[endHotspotId]

        if (startHotspot.edges.top === endHotspot || startHotspot.edges.bottom === endHotspot) {
            console.warn('Not valid corners for make glue.');
            return this;
        }

        if (startHotspot.edges.top) startHotspot = startHotspot.edges.top;
        if (endHotspot.edges.top) endHotspot = endHotspot.edges.top;

        var hotspotId = options ? options.id : 'glue_' + this.getNewIdNumber();
        var glueCorners = [
            startHotspot,
            endHotspot,
            endHotspot.edges.bottom,
            startHotspot.edges.bottom
        ];

        var alreadyGlued = false;
        startHotspot.glue.forEach(function (glue) {
            if (~endHotspot.glue.indexOf(glue)) {
                alreadyGlued = true;
            }
        });

        if (alreadyGlued) {
            console.warn('This wall already glued.');
            return this;
        }

        var center = this.getCenterOfPolygon(glueCorners);

        var glueOptions = {
            room: this.room,
            x: center.x,
            y: center.y,
            glueCorners: glueCorners,
        }

        if (options) {
            Object.keys(options).forEach(function (oKey) {
                if (oKey !== 'glueCorners') {
                    glueOptions[oKey] = options[oKey];
                }
            });
        }

        this
            .drawGlue(hotspotId, glueOptions)
            .attachGlueToCorners(hotspotId)
            .glueRoom(this.room);
    }

    /**
     * @todo move to PanoElement class
     * @param  {string} id
     * @param  {object} options
     * @returns {this}
     */
    this.drawGlue = function (id, options) {
        if (!options) options = {};

        var glueWithOptions = this.getGlueWithOptions(id, options.room || this.room);

        var hotspot = {
            id: id,
            room: this.room,
            text: 'Glue «' + (Math.floor(1000 + (Math.random() * 8999)).toString(32)).toUpperCase() + '»',
            type: 'glue',
            x: 0,
            y: 0,
            visible: true,
            glueCorners: [],
            glueWith: null,
            rotationOffset: 0,
            forwardOffset: 0,
            sideOffset: 0,
            onMove: function (ath, atv) {
                return; // cannot move, moves with corners
            }.bind(this),
            ondelete: function () {
                this.deleteGlue(hotspot.id);
            }.bind(this),
            elementControls: {
                glueWith: new ControlsElement({
                    id: 'glueWith',
                    label: 'Glue with:',
                    type: 'select',
                    options: glueWithOptions,
                    onChange: function (value) {
                        if (value === 'null') value = null;

                        if (hotspot.glueWith) {
                            this.hotspots[hotspot.glueWith].elementControls.glueWith.value = null;
                            this.hotspots[hotspot.glueWith].glueWith = null;
                        }

                        if (value) {
                            this.hotspots[value].elementControls.glueWith.value = hotspot.id;
                            this.hotspots[value].glueWith = hotspot.id;
                        }

                        hotspot.elementControls.glueWith.value = value;
                        hotspot.glueWith = value;

                        this.updateGlueWithOptions(this.room);
                        this.onUpdate();
                    }.bind(this),
                    value: null,
                    active: true
                }),
                rotationOffset: new ControlsElement({
                    id: 'rotationOffset',
                    labelTemplate: 'Rotation offset: {{value}}',
                    type: 'range',
                    options: {
                        min: -30,
                        max: 30,
                        step: 0.1
                    },
                    onChange: function (value) {
                        hotspot.elementControls.rotationOffset.value = value;
                        hotspot.rotationOffset = value;

                        this.updateGlueWithOptions(this.room);
                        this.onUpdate();
                    }.bind(this),
                    value: null,
                    active: true
                }),
                forwardOffset: new ControlsElement({
                    id: 'forwardOffset',
                    labelTemplate: 'Forward offset: {{value}}',
                    type: 'range',
                    options: {
                        min: -300,
                        max: 300,
                        step: 0.1
                    },
                    onChange: function (value) {
                        hotspot.elementControls.forwardOffset.value = value;
                        hotspot.forwardOffset = value;

                        this.onUpdate();
                    }.bind(this),
                    value: null,
                    active: false
                }),
                sideOffset: new ControlsElement({
                    id: 'sideOffset',
                    labelTemplate: 'Side offset: {{value}}',
                    type: 'range',
                    options: {
                        min: -300,
                        max: 300,
                        step: 0.1
                    },
                    onChange: function (value) {
                        hotspot.elementControls.sideOffset.value = value;
                        hotspot.sideOffset = value;

                        this.onUpdate();
                    }.bind(this),
                    value: null,
                    active: false
                })
            }
        }
        
        if (options) {
            Object.keys(options).forEach(function (key) {
                if (key !== 'elementControls') {
                    hotspot[key] = options[key];
                }
            });

            if (options.elementControls) {
                Object.keys(options.elementControls).forEach(function (key) {
                    hotspot.elementControls[key].value = hotspot[options.elementControls[key].id];
                });
            }
        }

        if (hotspot.room === this.room) {
            this.pano.call('addhotspot("' + id + '")');
            // this.pano.set('hotspot[' + id + '].url', this.images.mergeIcon);
            this.pano.set('hotspot[' + id + '].ath', hotspot.x);
            this.pano.set('hotspot[' + id + '].atv', hotspot.y);
    
            this.pano.set('hotspot["' + id + '"].renderer', 'css3d');
            this.pano.set('hotspot["' + id + '"].onhover', function () {
                if (this.config.showHoweredHotspot) { // show hovered hotspot
                    if (this.temp.hoveredHotspot.last !== hotspot.id) {
                        console.log('Hovered:', this.hotspots[hotspot.id]);
                        this.temp.hoveredHotspot.last = hotspot.id;
                    }
                }
                this.temp.hoveredHotspot.id = hotspot.id;
            }.bind(this));
            this.pano.set('hotspot["' + id + '"].onout', function () {
                this.temp.hoveredHotspot.id = null;
            }.bind(this));
            this.pano.set('hotspot["' + id + '"].ondown', function () {
                event.preventDefault();
                this.handleMouseDown().setClickedHotspot(hotspot.id)
            }.bind(this));
    
            hotspot.glueCorners.map(function (corner, index) {
                this.pano.set('hotspot[' + id + '].point[' + index + '].ath', corner.x);
                this.pano.set('hotspot[' + id + '].point[' + index + '].atv', corner.y);
    
                return corner;
            }.bind(this));
        }

        this.hotspots[hotspot.id] = hotspot;

        if (hotspot.room === this.room) {
            this.addTextToElement(hotspot.id, hotspot.text);
        }

        return this;
    }

    /**
    * @returns {this}
    */
    this.reDrawGlueInRoom = function () {
        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.type === 'glue' && hotspot.room === this.room) {
                this.updateGluePosition(hotspot.id);
            }
        }.bind(this));

        return this;
    }

    /**
     * @param  {string} hotspotId
     * @returns {this}
     */
    this.updateGluePosition = function (hotspotId) {
        const hotspot = this.hotspots[hotspotId];

        if (hotspot && hotspot.glueCorners) {
            hotspot.glueCorners.forEach(function (corner, index) {
                this.pano.set('hotspot[' + hotspotId + '].point[' + index + '].ath', corner.x);
                this.pano.set('hotspot[' + hotspotId + '].point[' + index + '].atv', corner.y);
            }.bind(this));

            this.pano.call('hotspot[' + hotspotId + '].getcenter(hcAth, hcAtv)');

            hotspot.textHotspot.x = this.pano.get('hcAth');
            hotspot.textHotspot.y = this.pano.get('hcAtv');

            this.pano.set('hotspot[' + hotspot.textHotspot.id + '].ath', hotspot.textHotspot.x);
            this.pano.set('hotspot[' + hotspot.textHotspot.id + '].atv', hotspot.textHotspot.y);
        } else {
            console.warn('Hotspot with id:' + hotspotId + ' invalid');
        }

        return this;
    }

    /**
     * @param {string} id of glue hotspot
     * @param  {string} room
     * @returns {array}
     */
    this.getGlueWithOptions = function (id, room) {
        var options = [{
            name: '',
            value: null
        }];
        
        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (
                hotspot && 
                hotspot.type === 'glue' && 
                hotspot.room !== room &&
                (hotspot.glueWith === null || hotspot.glueWith === id)
            ) {
                options.push({
                    name: hotspot.text + ' in ' + this.rooms[hotspot.room].title + ' room',
                    value: hotspot.id
                });
            }
        }.bind(this));

        return options;
    }

    /**
     * @param  {string|undefined} room
     * @returns {array}
     */
    this.updateGlueWithOptions = function (room) {
        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (
                hotspot &&
                hotspot.type === 'glue' &&
                (!room || hotspot.room === room)
            ) {
                hotspot.elementControls.glueWith.options = this.getGlueWithOptions(hotspot.id, room || hotspot.room);
            }
        }.bind(this));

        return this;
    }

    /**
     * @param  {string} room
     * @returns {this}
     */
    this.glueRoom = function (room) {
        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.type === 'glue') {
                // Todo: change color of edges
            }
        }.bind(this));
        
        return this;
    }

    /**
     * Delete glue for merging
     * @param {string} hotspotId
     * @returns {this}
     */
    this.deleteGlue = function (hotspotId) {
        const hotspot = this.hotspots[hotspotId];

        hotspot.glueCorners.forEach(function (corner) {
            var indexOfGlueInCorner = corner.glue.indexOf(hotspot);

            corner.glue.splice(indexOfGlueInCorner, 1);
        });

        var indexOfGlueInRoom = this.rooms[hotspot.room].glue.indexOf(hotspot.id);
        this.rooms[hotspot.room].glue.splice(indexOfGlueInRoom, 1);

        if (hotspot.glueWith) {
            hotspot.elementControls.glueWith.onChange({value: null});
        }

        this.deleteHotspot(hotspot.textHotspot.id);
        this.deleteHotspot(hotspot.id);

        return this;
    }

    /**
     * Delete invalid glue for merging
     * @param {string|undefined} room
     * @returns {this}
     */
    this.removeInvalidGlue = function (room) {
        Object.keys(this.hotspots).forEach(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.type === 'glue' && (room === undefined || hotspot.room === room)) {
                var valid = this.checkGlue(hotspot.id);
                if (!valid) {
                    this.deleteGlue(hotspot.id);
                }
            }
        }.bind(this));
    }

    /**
     * Check glue is valid for merging
     * @param {string} hotspotId
     * @returns {boolean}
     */
    this.checkGlue = function (hotspotId) {
        const glue = this.hotspots[hotspotId];

        if (glue) {
            // check
        }

        return true;
    }

    /**
     * Check glue is valid for merging
     * @param {string} hotspotId
     * @returns {this}
     */
    this.attachGlueToCorners = function (hotspotId) {
        const hotspot = this.hotspots[hotspotId];

        if (hotspot) {
            hotspot.glueCorners.forEach(function (corner) {
                corner.glue.push(hotspot);
            });
        } else {
            console.warn('Can\'t attach glue ' + hotspotId + ' to corners');
        }

        return this;
    }

    /**
     * @param  {array} points
     * @returns {object}
     */
    this.getCenterOfPolygon = function (points) {
        this.pano.call('addhotspot(tempCenter)');

        points.forEach(function (point, index) {
            this.pano.set('hotspot[tempCenter].point[' + index + '].ath', point.x);
            this.pano.set('hotspot[tempCenter].point[' + index + '].atv', point.y);
        }.bind(this));

        this.pano.call('hotspot[tempCenter].getcenter(hcAth, hcAtv)');

        var center = {
            x: this.pano.get('hcAth'),
            y: this.pano.get('hcAtv')
        };

        this.pano.call('removehotspot(tempCenter)');

        return center;
    }

    /**
     * Set wall active with pano coordinates
     * @param {number} ath angle in radians
     * @param {number} atv angle in radians
     * @returns {this}
     */
    this.setActiveWall = function (ath, atv) {
        this.anchorHotspot = null;
        this.clearActiveWalls();

        var wall = this.findNearestCornersByCoordinates(ath, atv);
        if (wall.topLeft && wall.topLeft.type === 'corner') {
            var point = {
                x: ath,
                y: atv
            };
            if (true || this.pointOnWall(point, wall)) {
                this.anchorHotspot = wall.topLeft;
                // this.drawWall(wall.topLeft);
            }
        }

        return this;
    }

    /**
     * Clear all walls from pano
     * @returns {this}
     */
    this.clearActiveWalls = function () {
        Object.keys(this.hotspots).map(function (key) {
            const hotspot = this.hotspots[key];

            if (hotspot && hotspot.type === 'wall') {
                this.deleteHotspot(hotspot.id);
            }
        }.bind(this));

        this.anchorHotspot = null;

        return this;
    }

    /**
     * Create window with 4 steps
     * @returns {this}
     */
    this.createWindow = function (ath, atv) {
        if (this.temp.makePoints.length === 3) {
            var windowOptions = {
                points: this.temp.makePoints.map(function (point) {
                    return {x: point.x, y: point.y};
                })
            };

            windowOptions.points.push({x: ath, y: atv});

            this
                .addWindow(windowOptions)
                .removeTempPoints()
                .setClickMode('default')
                .onUpdate();
        } else {
            var hotspotId = 'tempPoint_' + this.getNewIdNumber();
            this.addTempPoint(hotspotId, ath, atv);
        }

        return this;
    }

    /**
     * Create door with 4 steps
     * @returns {this}
     */
    this.createDoor = function (ath, atv) {
        if (this.temp.makePoints.length === 3) {
            var doorOptions = {
                points: this.temp.makePoints.map(function (point) {
                    return {x: point.x, y: point.y};
                })
            };

            doorOptions.points.push({x: ath, y: atv});

            this
                .addDoor(doorOptions)
                .removeTempPoints()
                .setClickMode('default')
                .onUpdate();
        } else {
            var hotspotId = 'tempPoint_' + this.getNewIdNumber();
            this.addTempPoint(hotspotId, ath, atv);
        }

        return this;
    }
    
    /**
     * Get array of doors room to room
     * @param  {string} from
     * @param  {string} to
     * @returns {array} doors
     */
    this.getRoomToRoomDoors = function (from, to) {
        return Object.keys(this.hotspots).filter(function (key) {
            const hotspot = this.hotspots[key];
            if (hotspot && hotspot.type === 'door' && hotspot.room === from && hotspot.to === to) {
                return true;
            }
        }.bind(this)).map(function (key) {
            return this.hotspots[key];
        }.bind(this));
    }

    /**
     * Get door title string
     * @param  {object} door
     * @returns {string} name
     */
    this.getDoorTitle = function (door) {
        var name = door.elementControls.elementId.options.find(function (option) {
            return option.value === door.elementControls.elementId.value;
        }).name;

        var doorsToRoomCount = 3;
        var to = 
            door.elementControls.to.value && this.rooms[door.elementControls.to.value] ? 
            this.rooms[door.elementControls.to.value].title : 
            null;

        // if (to) {
        //   doorsToRoomCount = this.getRoomToRoomDoors(door.room, door.to).length;
        // }

        return 'Door' + (doorsToRoomCount > 1 ? ' «' + name + '»' : '') + (to ? '<br>to ' + to : '');
    }
    
    /**
     * Get window title string
     * @param  {object} window
     * @returns {string} name
     */
    this.getWindowTitle = function (window) {
        var name = window.elementControls.elementId.options.find(function (option) {
            return option.value === window.elementControls.elementId.value;
        }).name;

        return 'Window ' + '«' + name + '»';
    }
    
    /**
     * Get door types from global Door class
     * @returns {array}
     */
    this.getDoorTypes = function () {
        try {
            var door2d = new Door;
            var doorTypes = door2d.editable.type.variants;

            return doorTypes.map(function (type) {
                return {
                    name: type.label,
                    value: type.value
                }
            });
        } catch(err) {
            console.warn('Something wrong with global Door class, try check it to repair options...', err);
         return [{
                name: 'Default',
                value: undefined
            }]
        }
    }

    this.updateDoorOptionsInRoom = function (room, options) {
        if (!Array.isArray(options)) options = [];

        Object.keys(this.hotspots).forEach(function (hKey) {
            const hotspot = this.hotspots[hKey];

            if (hotspot && hotspot.type === 'door' && hotspot.room === room) {
                if (hotspot.elementControls) {
                    if (hotspot.elementControls.to && ~options.indexOf('to')) {
                        hotspot.elementControls.to.options = this.getRoomsOptionsOfRoom(hotspot.room, true);
                    }
                    if (hotspot.elementControls.elementId && ~options.indexOf('elementId')) {
                        var usedIds = this.getUsedIdentifiers('door', room, [hotspot.elementId]);
                        var idsOptions = this.getIdentifiersOptions(usedIds);

                        hotspot.elementControls.elementId.options = idsOptions;
                    }
                } else {
                    console.warn('Door not has elementControls, door is valid?', hotspot);
                }
            }
        }.bind(this));

        return this;
    };

    /**
     * Add door to choosed wall
     * @param  {object} corner anchor hotspot
     * @returns {this}
     */
    this.addDoor = function (options) {
        var center = this.getMouseCoordinates();

        center = {
            x: center.ath,
            y: center.atv
        };

        var doorSize = {
            x: 5,
            y: 10
        };

        var points = [
            {x: center.x - doorSize.x, y: center.y - doorSize.y},
            {x: center.x - doorSize.x, y: center.y + doorSize.y},
            {x: center.x + doorSize.x, y: center.y + doorSize.y},
            {x: center.x + doorSize.x, y: center.y - doorSize.y}
        ];

        var usedIds = this.getUsedIdentifiers('door', this.room);
        var idsOptions = this.getIdentifiersOptions(usedIds);
        var doorTypes = this.getDoorTypes();

        var doorOptions = {
            id: 'door_' + this.getNewIdNumber(),
            type: 'door',
            room: this.room,
            text: 'Door «' + idsOptions[0].name + '»',
            points: points,
            zOrder: this.types.door.order,
            controls: [],
            color: 0xFFFFFF,
            elementId: idsOptions[0].value,
            doorType: doorTypes[0].value,
            rotationOffset: 0,
            positionOffset: 0,
            overlap: null,
            ondelete: function () {
                if (doorOptions.overlap) {
                    const link = this.hotspots[doorOptions.overlap];
                    if (link) {
                        link.overlapped = null;
                        this.drawLink(link.id, link);
                    }
                }
                
                doorOptions.controls.forEach(function (control) {
                    this.deleteHotspot(control.id);
                }.bind(this));

                this.deleteHotspot(doorOptions.id);

                if (typeof(doorOptions.textHotspot) === 'object') {
                    this.deleteHotspot(doorOptions.textHotspot.id);
                }
            }.bind(this),
            elementControls: {
                type: new ControlsElement({
                    id: 'doorType',
                    label: 'Select type of door:',
                    type: 'select',
                    options: doorTypes,
                    onChange: function (value) {
                        doorOptions.elementControls.type.value = value;
                        doorOptions.doorType = value;
                    },
                    value: doorTypes[0].value,
                    active: true
                }),
                to: new ControlsElement({
                    id: 'to',
                    label: 'Select door destination:',
                    type: 'select',
                    options: this.getRoomsOptionsOfRoom(this.room, true),
                    onChange: function (value) {
                        doorOptions.to = value;
                        doorOptions.elementControls.to.value = value;
                        
                        doorOptions.text = this.getDoorTitle(doorOptions);
                        if (doorOptions.textHotspot) {
                            doorOptions.textHotspot.text = doorOptions.text;
                            this.pano.set('hotspot[' + doorOptions.textHotspot.id + '].html', doorOptions.text);
                        }
                        this.updateDoorOptionsInRoom(doorOptions.room, ['to']);
                        this.onUpdate();

                        const link = this.hotspots[doorOptions.overlap];
                        if ((link && link.to !== doorOptions.to) || doorOptions.to) {
                            doorOptions.overlap = null;
                            if (link) {
                                link.overlapped = null;
                                this.drawLink(link.id, link);
                            }

                            this.rooms[doorOptions.room].doorLinks.forEach(function (doorLink) {
                                if (
                                    doorOptions.to === doorLink.to && 
                                    Utils.isInsidePanoPolygon(doorLink.x, doorLink.y, doorOptions.points)
                                ) {
                                    doorOptions.overlap = doorLink.id;
                                    doorLink.overlapped = doorOptions.id;
                                    this.drawLink(doorLink.id, doorLink);
                                }
                            }.bind(this));
                        }
                    }.bind(this),
                    value: undefined,
                    active: true
                }),
                elementId: new ControlsElement({
                    id: 'elementId',
                    label: 'Select door identificator:',
                    type: 'select',
                    options: idsOptions,
                    onChange: function (value) {
                        doorOptions.elementId = value;
                        doorOptions.elementControls.elementId.value = value;

                        doorOptions.text = this.getDoorTitle(doorOptions);
                        doorOptions.textHotspot.text = doorOptions.text;

                        this.pano.set('hotspot[' + doorOptions.textHotspot.id + '].html', doorOptions.text);
                        this.updateDoorOptionsInRoom(doorOptions.room, ['elementId']);
                        this.onUpdate();
                    }.bind(this),
                    value: idsOptions[0].value,
                    active: function () {
                        return true;
                    }
                }),
                rotationOffset: new ControlsElement({
                    id: 'rotationOffset',
                    labelTemplate: 'Door rotation offset: {{value}}',
                    type: 'range',
                    options: {
                        min: -180,
                        max: 180,
                        step: 1
                    },
                    onChange: function (value) {
                        doorOptions.rotationOffset = value;
                        doorOptions.elementControls.rotationOffset.value = value;

                        this.onUpdate();
                    }.bind(this),
                    value: 0,
                    active: false
                }),
                positionOffset: new ControlsElement({
                    id: 'positionOffset',
                    labelTemplate: 'Door position offset: {{value}}',
                    type: 'range',
                    options: {
                        min: -1,
                        max: 1,
                        step: 0.01
                    },
                    onChange: function (value) {
                        doorOptions.positionOffset = value;
                        doorOptions.elementControls.positionOffset.value = value;

                        this.onUpdate();
                    }.bind(this),
                    value: 0,
                    active: function () {
                        return true;
                    }
                })
            }
        };

        if (options) {
            Object.keys(options).forEach(function (oKey) {
                doorOptions[oKey] = options[oKey];
            });

            Object.keys(doorOptions.elementControls).forEach(function (key) {
                doorOptions.elementControls[key].value = doorOptions[doorOptions.elementControls[key].id];
            });

            this.updateDoorOptionsInRoom(doorOptions.room, ['elementId', 'to']);
        }

        this.drawRectangleElement(doorOptions.id, doorOptions);
        this.rooms[doorOptions.room].doorLinks.forEach(function (doorLink) {
            if (!doorOptions.to && Utils.isInsidePanoPolygon(doorLink.x, doorLink.y, doorOptions.points)) {
                doorOptions.elementControls.to.onChange({value: doorLink.to});
                doorOptions.overlap = doorLink.id;
                doorLink.overlapped = doorOptions.id;
                this.drawLink(doorLink.id, doorLink);
            }
        }.bind(this));

        return this;
    }

    /**
     * Add window to choosed wall
     * @param  {object} corner anchor hotspot
     * @returns {this}
     */
    this.addWindow = function (options) {
        var center = this.getMouseCoordinates();

        center = {
            x: center.ath,
            y: center.atv
        };

        var windowSize = {
            x: 5,
            y: 5
        };

        var points = [
            {x: center.x - windowSize.x, y: center.y - windowSize.y},
            {x: center.x - windowSize.x, y: center.y + windowSize.y},
            {x: center.x + windowSize.x, y: center.y + windowSize.y},
            {x: center.x + windowSize.x, y: center.y - windowSize.y}
        ]

        var usedIds = this.getUsedIdentifiers('window', this.room);
        var idsOptions = this.getIdentifiersOptions(usedIds);

        var windowOptions = {
            id: 'window_' + this.getNewIdNumber(),
            type: 'window',
            room: this.room,
            text: 'Window «' + idsOptions[0].name + '»',
            points: points,
            zOrder: this.types.window.order,
            controls: [],
            color: 0x337AB7,
            elementId: idsOptions[0].value,
            ondelete: function () {
                windowOptions.controls.forEach(function (control) {
                    this.deleteHotspot(control.id);
                }.bind(this));

                this.deleteHotspot(windowOptions.id);

                if (typeof(windowOptions.textHotspot) === 'object') {
                    this.deleteHotspot(windowOptions.textHotspot.id);
                }
            }.bind(this),
            elementControls: {
                // type: new ControlsElement({
                //   id: 'type',
                //   label: 'Select type of window:',
                //   type: 'select',
                //   options: [{ // Todo: get types from constants
                //     name: 'open', value: 'open'
                //   },{
                //     name: 'closed', value: 'closed'
                //   }],
                //   onChange: function (value) {
                //     windowOptions['_type'] = value;
                //     windowOptions.elementControls.type.value = value;
                //   },
                //   value: 'open',
                //   active: false
                // }),
                elementId: new ControlsElement({
                    id: 'elementId',
                    label: 'Select window identificator:',
                    type: 'select',
                    options: idsOptions,
                    onChange: function (value) {
                        windowOptions.elementId = value;
                        windowOptions.elementControls.elementId.value = value;

                        windowOptions.text = this.getWindowTitle(windowOptions);
                        windowOptions.textHotspot.text = windowOptions.text;
                        this.pano.set('hotspot[' + windowOptions.textHotspot.id + '].html', windowOptions.text);
                        this.onUpdate();
                    }.bind(this),
                    value: idsOptions[0].value,
                    active: true
                })
            }
        };

        if (options) {
            Object.keys(options).forEach(function (oKey) {
                windowOptions[oKey] = options[oKey];
            });

            Object.keys(windowOptions.elementControls).forEach(function (key) {
                windowOptions.elementControls[key].value = windowOptions[windowOptions.elementControls[key].id];
            }); 
        }

        this.drawRectangleElement(windowOptions.id, windowOptions);

        return this;
    }
    
    /**
     * Complex method to make doors, windows, etc...
     * @returns {this}
     */
    this.addElement = function () {
        //todo: make
        return this;
    }

    /**
     * Create element from options
     * @todo move to PanoElement class
     * @param  {string} id
     * @param  {object} options
     * @returns {this}
     */
    this.drawRectangleElement = function (id, options) {
        if (options.room === this.room) {
            this.pano.call('addhotspot("' + id + '")');
            
            this.pano.set('hotspot[' + id + '].keep', false);
            this.pano.set('hotspot[' + id + '].fillcolor', options.color);
            this.pano.set('hotspot[' + id + '].fillalpha', 0.2);
            // this.pano.set('hotspot[' + id + '].handcursor', false);
            this.pano.set('hotspot[' + id + '].bordercolor', options.color);
            this.pano.set('hotspot[' + id + '].borderwidth', 2);
            this.pano.set('hotspot[' + id + '].zorder', options.zOrder);
    
            this.pano.set('hotspot["' + id + '"].onhover', function () {
                if (this.config.showHoweredHotspot) { // show hovered hotspot
                    if (this.temp.hoveredHotspot.last !== id) {
                        console.log('Hovered:', this.hotspots[id]);
                        this.temp.hoveredHotspot.last = id;
                    }
                }
                this.temp.hoveredHotspot.id = id;
            }.bind(this));
            this.pano.set('hotspot["' + id + '"].onout', function () {
                this.temp.hoveredHotspot.id = null;
            }.bind(this));
            this.pano.set('hotspot["' + id + '"].ondown', function () {
                this.setClickedHotspot(id);
            }.bind(this));

            this.hotspots[id] = options;

            options.points.forEach(function (point, index) {
                if (point.x > 180) {
                    point.x = -180 + (point.x - 180);
                } else if (point.x < -180) {
                    point.x = 180 + (point.x + 180);
                }

                this.pano.set('hotspot[' + id + '].point[' + index + '].ath', point.x);
                this.pano.set('hotspot[' + id + '].point[' + index + '].atv', point.y);
            
                this.addControlToPoint(id, index);
            }.bind(this));

            if (options.text) {
                this.addTextToElement(id, options.text);
            }
        } else {
            this.hotspots[id] = options;
        }

        return this;
    }
    
    /**
     * Add text hotspot to element
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @returns {this}
     */
    this.addTextToElement = function (hotspotId, text) {
        const hotspot = this.hotspots[hotspotId];

        this.pano.call('hotspot[' + hotspotId + '].getcenter(hcAth, hcAtv)');

        var center = {
            x: this.pano.get('hcAth'),
            y: this.pano.get('hcAtv')
        } 

        var textHotspot = {
            id: 'text_' + hotspotId,
            type: 'text',
            text: text,
            room: this.room,
            parent: hotspot,
            x: center.x,
            y: center.y,
            zOrder: this.types.text.order,
            ondelete: function () {
                this.deleteHotspot(hotspotId);
            }.bind(this),
            onclick: hotspot.onclick,
            elementControls: hotspot.elementControls
        };

        this.pano.call('addhotspot(' + textHotspot.id + ')');
        this.pano.set('hotspot[' + textHotspot.id + '].type', 'text');
        this.pano.set('hotspot[' + textHotspot.id + '].keep', false);
        this.pano.set('hotspot[' + textHotspot.id + '].visible', true);
        this.pano.set('hotspot[' + textHotspot.id + '].enabled', true);
        this.pano.set('hotspot[' + textHotspot.id + '].html', textHotspot.text);
        this.pano.set('hotspot[' + textHotspot.id + '].bgcolor', 0xffffff);
        this.pano.set('hotspot[' + textHotspot.id + '].bgalpha', 1);
        this.pano.set('hotspot[' + textHotspot.id + '].venter', false);
        this.pano.set('hotspot[' + textHotspot.id + '].bgborder', 1);
        this.pano.set('hotspot[' + textHotspot.id + '].distorted', true);
        this.pano.set('hotspot[' + textHotspot.id + '].renderer', "css3d");
        // this.pano.set('hotspot[' + textHotspot.id + '].align', "top");
        // this.pano.set('hotspot[' + textHotspot.id + '].edge', "top");
        this.pano.set('hotspot[' + textHotspot.id + '].ath', textHotspot.x);
        this.pano.set('hotspot[' + textHotspot.id + '].atv', textHotspot.y);
        this.pano.set('hotspot[' + textHotspot.id + '].fillcolor', "0x000000");
        this.pano.set('hotspot[' + textHotspot.id + '].zorder', textHotspot.zOrder);
        this.pano.set(
            'hotspot[' + textHotspot.id + '].css', 
            "font-family:Helvetica; font-size:12px; color:#000000; text-align: center;"
        );
        this.pano.set('hotspot["' + textHotspot.id + '"].onhover', function () {
            if (this.config.showHoweredHotspot) { // show hovered hotspot
                if (this.temp.hoveredHotspot.last !== textHotspot.id) {
                    console.log('Hovered:', this.hotspots[textHotspot.id]);
                    this.temp.hoveredHotspot.last = textHotspot.id;
                }
            }
            this.temp.hoveredHotspot.id = textHotspot.id;
        }.bind(this));
        this.pano.set('hotspot["' + textHotspot.id + '"].onout', function () {
            this.temp.hoveredHotspot.id = null;
        }.bind(this));
        this.pano.set('hotspot["' + textHotspot.id + '"].ondown', function () {
            event.preventDefault();
            this.handleMouseDown().setClickedHotspot(textHotspot.id);
        }.bind(this));
        
        this.hotspots[textHotspot.id] = textHotspot;
        hotspot.textHotspot = this.hotspots[textHotspot.id];

        return this;
    }
    
    /**
     * Add control to point
     * @todo move to PanoElement class
     * @param {string} hotspotId
     * @param {number} pointIndex
     * @param {string} hotspotId
     * @returns {this}
     */
    this.addControlToPoint = function (hotspotId, pointIndex) {
        const hotspot = this.hotspots[hotspotId];

        if (hotspot) {
            var point = this.pano.get('hotspot[' + hotspotId + '].point[' + pointIndex + ']');

            if (point) {
                var pointOptions = {
                    id: hotspotId + '_control_' + pointIndex,
                    type: 'pointControl',
                    room: this.room,
                    parent: hotspot,
                    point: pointIndex,
                    x: point.ath,
                    y: point.atv,
                    ondelete: function () {
                        pointOptions.parent.ondelete();
                    }.bind(this),
                    onMove: function (ath, atv) {
                        // var wallTopLeftCorner = pointOptions.parent.anchor; // Hint: now anchor disabled

                        // var wall = {
                        //   topLeft: wallTopLeftCorner,
                        //   topRight: wallTopLeftCorner.edges.right,
                        //   bottomLeft: wallTopLeftCorner.edges.bottom,
                        //   bottomRight: wallTopLeftCorner.edges.right.edges.bottom
                        // };

                        // if (true || this.pointOnWall({x: ath, y: atv}, wall)) { // Hint: move only on wall, but need function
                        hotspot.points[pointIndex].x = ath;
                        hotspot.points[pointIndex].y = atv;

                        this.hotspots[pointOptions.id].x = ath;
                        this.hotspots[pointOptions.id].y = atv;
                        
                        this.pano.set('hotspot[' + pointOptions.id + '].ath', ath);
                        this.pano.set('hotspot[' + pointOptions.id + '].atv', atv);
                        
                        this.pano.set('hotspot[' + hotspotId + '].point[' +  pointIndex + '].ath', ath);
                        this.pano.set('hotspot[' + hotspotId + '].point[' +  pointIndex + '].atv', atv);
                        
                        if (typeof(pointOptions.parent.textHotspot) === 'object') {
                            const text = pointOptions.parent.textHotspot;

                            this.pano.call('hotspot[' + hotspot.id + '].getcenter(hcAth, hcAtv)');

                            var newCenter = {
                                x: this.pano.get('hcAth'),
                                y: this.pano.get('hcAtv')
                            };

                            text.x = newCenter.x;
                            text.y = newCenter.y;

                            this.pano.set('hotspot[' + text.id + '].ath', newCenter.x);
                            this.pano.set('hotspot[' + text.id + '].atv', newCenter.y);
                        }
                        // }
                    }.bind(this)
                };

                this.pano.call('addhotspot("' + pointOptions.id + '")');
                this.pano.set('hotspot[' + pointOptions.id + '].url', this.images.control);
                this.pano.set('hotspot[' + pointOptions.id + '].ath', pointOptions.x);
                this.pano.set('hotspot[' + pointOptions.id + '].atv', pointOptions.y);

                this.pano.set('hotspot["' + pointOptions.id + '"].renderer', 'css3d');
                this.pano.set('hotspot["' + pointOptions.id + '"].onhover', function () {
                    if (this.config.showHoweredHotspot) { // show hovered hotspot
                        if (this.temp.hoveredHotspot.last !== pointOptions.id) {
                            console.log('Hovered:', this.hotspots[pointOptions.id]);
                            this.temp.hoveredHotspot.last = pointOptions.id;
                        }
                    }
                    this.temp.hoveredHotspot.id = pointOptions.id;
                }.bind(this));
                this.pano.set('hotspot["' + pointOptions.id + '"].onout', function () {
                    this.temp.hoveredHotspot.id = null;
                }.bind(this));
                this.pano.set('hotspot["' + pointOptions.id + '"].ondown', function () {
                    event.preventDefault();
                    this.handleMouseDown().setClickedHotspot(pointOptions.id);
                }.bind(this));

                this.hotspots[pointOptions.id] = pointOptions;
                if (hotspot.controls === undefined) {
                    hotspot.controls = [];
                }

                hotspot.controls.push(this.hotspots[pointOptions.id]);
            }
        } else {
            console.warn('addControlToPoint: hotspot not exist!');
        }

        return this;
    }

    /**
     * @todo move to PanoElement class
     * @param  {string} hotspotId
     * @param  {number} ath
     * @param  {number} atv
     */
    this.addTempPoint = function (hotspotId, ath, atv) {
        var pointOptions = {
            id: hotspotId,
            type: 'tempPoint',
            room: this.room,
            x: ath,
            y: atv,
        };

        this.pano.call('addhotspot("' + pointOptions.id + '")');
        this.pano.set('hotspot[' + pointOptions.id + '].url', this.images.control);
        this.pano.set('hotspot[' + pointOptions.id + '].ath', pointOptions.x);
        this.pano.set('hotspot[' + pointOptions.id + '].atv', pointOptions.y);
        this.pano.set('hotspot["' + pointOptions.id + '"].renderer', 'css3d');

        this.hotspots[hotspotId] = pointOptions;
        this.temp.makePoints.push(this.hotspots[hotspotId]);

        return pointOptions;
    }

    /**
     * Remove temp points
     * @returns {this}
     */
    this.removeTempPoints = function () {
        Object.keys(this.hotspots).forEach(function (hKey) {
            const hotspot = this.hotspots[hKey];

            if (hotspot && hotspot.type === 'tempPoint') {
                this.deleteHotspot(hotspot.id);
            }
        }.bind(this));

        this.temp.makePoints = [];

        return this;
    } 

    /**
     * Check point inside wall or not
     * @param  {object} point
     * @param  {object} wall
     */
    this.pointOnWall = function (point, wall) {
        var polygon = [
            {x: wall.topLeft.x, y: wall.topLeft.y},
            {x: wall.topRight.x, y: wall.topRight.y},
            {x: wall.bottomRight.x, y: wall.bottomRight.y},
            {x: wall.bottomLeft.x, y: wall.bottomLeft.y}
        ];

        return Utils.isInsidePanoPolygon(point.x, point.y, polygon);
    }
    
    /**
     * Try fire change location event, by clicked door 
     * @returns {this}
     */
    this.tryFireChangeLocationByClickedHotspot = function () {
        const hotspot = this.hotspots[this.temp.clickedHotspot.id];

        if (hotspot && hotspot.type === "door" && hotspot.to) {
            this.events.fire('set-location', {
                location: hotspot.to
            });
        } else if (hotspot && hotspot.type === "link" && hotspot.to) {
            this.events.fire('set-location', {
                location: hotspot.to
            });
        }

        return this;
    }
    
    /**
     * Set clicked hotspot
     * @param {string|object} clicked clicked Hotspot or id
     * @returns {this}
     */
    this.setClickedHotspot = function (clicked) {
        if (typeof(clicked) === 'object') {
            this.temp.clickedHotspot.id = clicked.id;
        } else {
            this.temp.clickedHotspot.id = clicked;
        }

        if (
            this.hotspots[this.temp.clickedHotspot.id] && 
            typeof(this.hotspots[this.temp.clickedHotspot.id].onclick) === 'function'
        ) {
            this.hotspots[this.temp.clickedHotspot.id].onclick();
        }

        return this;
    }

    /**
     * Handle mouse click with current click mode
     * @param  {number} ath
     * @param  {number} atv
     * @returns {this}
     */
    this.handleMouseClick = function (ath, atv) {
        var doubleClick = false;
        var currentClickTime = Date.now();

        if (currentClickTime - (this.temp.mouse.lastClickTime || 0) < 500) { // 500 ms standart delay
            doubleClick = true;
        }

        this.temp.mouse.lastClickTime = Date.now();

        if (this.clickMode === 'corner') {
            const hoveredHotspot = this.hotspots[this.temp.hoveredHotspot.id];
            if (hoveredHotspot && hoveredHotspot.type === 'corner') {
                hoveredHotspot.elementControls.angle90.onChange({value: !hoveredHotspot.angle90});
            } else {
                this.setCornerAuto(ath, atv);
            }
        } else if (this.clickMode === 'line') {
            this.setLineAuto();
        } else if (this.clickMode === 'window') {
            this.createWindow(ath, atv);
        } else if (this.clickMode === 'door') {
            this.createDoor(ath, atv);
        } else if (this.clickMode === 'element') {
            this.addElement();
        } else if (true || this.clickMode === 'default') {
            // this.setActiveWall(ath, atv);
        }

        if (doubleClick) {
            this.tryFireChangeLocationByClickedHotspot();
        }

        return this;
    }

    /** 
     * Handle mouse down with current click mode
     * @returns {this}
     */
    this.handleMouseDown = function () {
        this.temp.mouse.down = this.getMouseCoordinates();
        this.temp.movedHotspot.allPositions = {};
        
        this
            .startMoveHotspot();
            // .clearActiveWalls();

        this.temp.clickedHotspot.id = null;

        return this;
    }

    /** 
     * Handle mouse up with current click mode
     * @returns {this}
     */
    this.handleMouseUp = function () {
        this.stopMoveHotspot();

        this.events.fire('clicked', {
            id: this.temp.clickedHotspot.id,
            value: this.hotspots[this.temp.clickedHotspot.id]
        });

        return this;
    }

    /**
     * Handle mouse move and update screen
     * @param  {number} ath
     * @param  {number} atv
     * @returns {this}
     */
    this.handleMouseMove = function (ath, atv) {
        const movedHotspot = this.hotspots[this.temp.movedHotspot.id];

        if (movedHotspot) {
            if (typeof(movedHotspot.onMove) === 'function') {
                movedHotspot.onMove(ath, atv);
            }
        } else if (this.hotspots[this.currentLine] && !this.hotspots[this.currentLine].closed) { 
            // Todo: move to measurement line
            var hotspotId = this.currentLine;

            this.pano.set('hotspot[' + hotspotId + '].point[1].ath', ath);
            this.pano.set('hotspot[' + hotspotId + '].point[1].atv', atv);
            this.pano.set('hotspot[' + hotspotId + '_dash].point[1].ath', ath);
            this.pano.set('hotspot[' + hotspotId + '_dash].point[1].atv', atv);
        }

        this.pano.call("updatescreen()");

        return this;
    }

    /** 
     * Set hovered hotspot as moved
     * @returns {this}
     */
    this.startMoveHotspot = function () {
        if (this.temp.hoveredHotspot.id) {
            ++this.topZOrder; 
            this.temp.movedHotspot.id = this.temp.hoveredHotspot.id + '';

            this.temp.movedHotspot.ath = this.pano.get('hotspot[' + this.temp.movedHotspot.id + '].ath');
            this.temp.movedHotspot.atv = this.pano.get('hotspot[' + this.temp.movedHotspot.id + '].atv');

            var panoPoints = this.pano.get('hotspot[' + this.temp.movedHotspot.id + '].point');
            this.temp.movedHotspot.points = panoPoints ? panoPoints.getArray() : [];
        }

        return this;
    }
    
    /** 
     * Reset moved hotspot to null
     * @returns {this}
     */
    this.stopMoveHotspot = function () {
        if (this.temp.movedHotspot.id) {
            if (
                this.hotspots[this.temp.movedHotspot.id] && 
                (typeof this.hotspots[this.temp.movedHotspot.id].onMoveEnd) === 'function'
            )  {
                this.hotspots[this.temp.movedHotspot.id].onMoveEnd();
            }

            this
                .reDrawEdgesInRoom()
                .reDrawGlueInRoom();
        }

        this.temp.movedHotspot.id = null;

        return this;
    }
 
    /**
     * Get pano mouse coordinates
     * @returns {object} with positions ath & atv
     */
    this.getMouseCoordinates = function () {
        this.pano.call("screentosphere(mouse.x, mouse.y, mouseath, mouseatv);");

        var ath = parseFloat(this.pano.get("mouseath"));
        var atv = parseFloat(this.pano.get("mouseatv"));

        return {
            ath: ath,
            atv: atv
        }
    }

    /**
     * Get pano center coordinates
     * @returns {object} with positions ath & atv
     */
    this.getPanoCenterCoordinates = function (mouseCoords) {
        var ath = Utils.normalizeAngle(parseFloat(this.pano.get("view.hlookat")));
        var atv = parseFloat(this.pano.get("view.vlookat"));

        if (mouseCoords && ath > 180) {
            ath = -180 + (ath - 180);
        }

        return {
            ath: ath,
            atv: atv
        }
    }

    /** 
     * Register watch mouse events
     * @returns {this}
     */
    this.watchMouse = function () {
        this.pano.onclick = function () {
            var coordinates = this.getMouseCoordinates();
            console.log('%cPano mouse:', 'color: #007ffa;', 'h: ' + coordinates.ath, 'v: ' + coordinates.atv);
            this.handleMouseClick(coordinates.ath, coordinates.atv); 
        }.bind(this);

        this.pano.onmousedown = function (event) {
            event.preventDefault();
            this.handleMouseDown();
        }.bind(this);

        this.pano.onmouseup = function (event) {
            event.preventDefault();
            this.handleMouseUp();
            this.events.fire('mouseup', {
                center: this.getPanoCenterCoordinates()
            });
        }.bind(this);

        this.pano.onmousemove = function (event) {
            event.preventDefault();
            var coordinates = this.getMouseCoordinates();
            this.handleMouseMove(coordinates.ath, coordinates.atv);
            this.events.fire('mousemove', coordinates);
        }.bind(this);

        return this;
    }
    
    /**
     * Set camera pitch and roll for room
     * @param  {string} room
     * @param  {number} pitch
     * @param  {number} roll
     * @returns {this}
     */
    this.setCameraPitchRoll = function (pitch, roll, room) {
        if (!room) room = this.room;

        this.rooms[room].cameraPitch = pitch;
        this.rooms[room].cameraRoll = roll;

        return this;
    }

    /**
     * Set pitch and roll for room
     * @param  {string} room
     * @param  {number} pitch
     * @param  {number} roll
     * @returns {this}
     */
    this.setPitchRoll = function (pitch, roll, room) {
        if (!room) room = this.room;

        this.rooms[room].pitch = pitch;
        this.rooms[room].roll = roll;

        return this;
    }

    /**
     * Update pano pitch and roll for room
     * @param  {string} room
     * @returns {this}
     */
    this.updatePitchRoll = function (room) {
        if (!room) room = this.room;

        var pitch = (this.rooms[room].cameraPitch || 0) + (this.rooms[room].pitch || 0);
        var roll = (this.rooms[room].cameraRoll || 0) + (this.rooms[room].roll || 0);

        this.pano.set("image.prealign", (-pitch)+"|0|"+(-roll));
        this.pano.call("updatescreen();");

        return this;
    }

    this.setPitchRollFromSceneImage = function (room) {
        if (!room) room = this.room;

        var xml = this.pano.get("scene[" +  this.getValidRoomName(room) + "].content");
        if (xml.length > 0 && DOMParser) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(xml, "application/xml");
            var sphere = doc.querySelector('sphere[devices="desktop"]');
            var url = sphere ? sphere.getAttribute('url') : null;

            if (url) {
                //get pitch and roll settings from jpeg xmp data
                var image = new Image;

                var _this = this;

                image.onload = function () {
                    EXIF.enableXmp();
                    EXIF.getData(this, function() {
                        var pitch = 0;
                        var roll = 0;

                        try {
                            pitch = this.xmpdata["x:xmpmeta"]["rdf:RDF"]["rdf:Description"]["GPano:PosePitchDegrees"]["#text"];
                            roll = this.xmpdata["x:xmpmeta"]["rdf:RDF"]["rdf:Description"]["GPano:PoseRollDegrees"]["#text"];

                            console.log("Pitch and roll changed according to xmp image data.", pitch, roll);
                        } catch(e) {
                            // console.warn(e);
                        }

                        _this
                            .setCameraPitchRoll(pitch, roll, room)
                            .updatePitchRoll(room);
                    });
                }

                image.src = url;
            } else {
                console.warn('Can\'t get url from scene xml.');
            }
        }
    }

    /**
     * Process key events in class
     * @param  {object} data key events
     * @returns {this}
     */
    this.watchInput = function (data) {
        if (data.state === 'DOWN') {
            this.removeTempPoints();
            this.removeOpenedLines();
        }

        if (data.state === 'DOWN' && data.key === 'ALT') {
            this.setClickMode('corner');
        } else if (data.state === 'UP' && data.key === 'ALT') {
            this.setClickMode('default');

        } else if (data.state === 'DOWN' && data.key === 'SHIFT') {
            this.setClickMode('line');
        } else if (data.state === 'UP' && data.key === 'SHIFT') {
            this.setClickMode('default');
            this.removeOpenedLines();
        } else if (data.state === 'DOWN' && data.key === 'KEY_X') {
            this.setClickMode('moveAll');
        } else if (data.state === 'UP' && data.key === 'KEY_X') {
            this.setClickMode('default');

        } else if (data.state === 'DOWN' && data.key === 'KEY_D') {
            this.setClickMode('door');
        } else if (data.state === 'UP' && data.key === 'KEY_D') {
            // this.setClickMode('door');
 
        } else if (data.state === 'DOWN' && data.key === 'KEY_S') {
            this.swapLeftRightOfCorner(this.temp.hoveredHotspot.id);
        } else if (data.state === 'UP' && data.key === 'KEY_S') {

        } else if (data.state === 'DOWN' && data.key === 'KEY_W') {
            this.setClickMode('window');
        } else if (data.state === 'UP' && data.key === 'KEY_W') {
            // this.setClickMode('window');

        } else if (data.state === 'UP' && data.key === 'KEY_V') {
            this.toggleCornerHotspotVisibility();
        } else if (data.state === 'UP' && data.key === 'KEY_R') {
            this.deleteHoveredHotspot();
        } else if (data.state === 'DOWN' && data.key === 'KEY_R' && data.shift) {
            this.deleteHotspots({
                type: 'line',
                room: this.room
            });
        } else if (data.state === 'UP' && data.key === 'KEY_E') {
            this.setClickMode('element');
        } else if (data.state === 'UP' && data.key === 'ESCAPE') {
            this.setClickMode('default');
        } else {
            // this.setClickMode('default');
            // this.removeOpenedLines();
        }

        return this;
    }
}
