
/**
 * Main measurements tab class
 * @class
 */
const Measurements = function (showLogs) {
    this.initialized = false;

    this._pano = null;
    this._data = null;
    this._magnifierPano = null;
    this._panoSlider = null;
    this._3d = null;
    this._controls = null;
    this._classesHelper = null;

    this.events = new EventsSystem('Measurements');
    this.showLogs = true;

    /**
     * @param  {object} data
     * @returns {this}
     */
    this.init = function (data, urlParameters) {
        if (this.initialized) return this;

        this._pano = new MeasurementPano('krpano-measurements');
        this._3d = new Measurement3d('krpano-measurements-3d');
        this._data = new MeasurementData('krpano-measurements-load', 'krpano-measurements-save');
        this._magnifierPano = new MagnifierPano('krpano-measurements-magnifier');
        this._panoSlider = new CarouselPanoSelector('krpano-measurements-slider');
        this._controls = new MeasurementControls;
        this._classesHelper = new MeasurementClassesHelper;

        this._pano.init().setScenes(data.tour.rooms);
        this._magnifierPano.init();
        this._data.init(urlParameters._origin, data.tour.id, urlParameters.orderId).setToken(urlParameters.authToken);
        this._3d.init();
        this._panoSlider.init(data);
        this._controls.init().assemble('measurement-export-options', this._3d.getExportOptions());

        this.registerEvents();

        if (urlParameters.jsonUrl) {
            Object.keys(data.tour.maps).forEach(function (key) {
                this._data.loadFloorFromServer(key).then(function (data) {
                    this._pano.setMeasurementDataOfFloor(data);
    
                    this.updateCurrentLocationControls();
                }.bind(this));
            }.bind(this));
        }

        this.initialized = true;

        return this;
    }

    /**
     * @return {this}
     */
    this.updateCurrentLocationControls = function () {
        const ft = 30.48;

        var cameraHeight = this._pano.getCurrentRoomCameraHeight();
        var useSizesIn = this._pano.getCurrentRoomUseSizesIn();
        // var ceilingHeight = this._pano.getCurrentRoomCeilingHeight();
        // var useCeilingHeight = this._pano.getCurrentRoomUseValues() === 'ceiling';

        var locationsControls = [
            new ControlsElement({
                id: 'cameraHeightInput',
                label: 'Camera height, ' + (useSizesIn === 'ft' ? 'ft' : 'm') + ':',
                type: 'input',
                width: '100%',
                options: {
                    type: 'number',
                    step: useSizesIn === 'ft' ? 0.01 : 0.01,
                },
                inputWidth: 'medium',
                value: useSizesIn === 'ft' ? cameraHeight / ft : cameraHeight / 100,
                onChange: function (value) {
                    if (useSizesIn === 'ft') {
                        value *= ft;
                    } else {
                        value *= 100;
                    }

                    if (value < 25) {
                        alert('Camera have height less than 25 centimeters (10 inches), please check camera height.');
                    }

                    if (value < 0) {
                        value = 0.1;
                    }

                    this._pano
                        .setCurrentRoomCameraHeight(value)
                        .onUpdate();

                    cameraHeight = value; 
                }.bind(this)
            }),
            new ControlsElement({
                id: 'sizeIn',
                label: 'Use sizes in feets:',
                type: 'checkbox',
                value: useSizesIn === 'ft',
                onChange: function (value) {
                    useSizesIn = value ? 'ft' : 'cm';
                    
                    this._pano
                        .setRoomsUseSizesIn(useSizesIn)
                        .onUpdate();

                    this.updateCurrentLocationControls();
                }.bind(this)
            }),
            new ControlsElement({
                id: 'copyToAll',
                label: 'Use this camera height for all rooms',
                type: 'button',
                onClick: function (value) {
                    if (confirm('Are you sure?')) {
                        this._pano
                            .setRoomsCameraHeight(cameraHeight)
                            .setRoomsUseSizesIn(useSizesIn)
                            .onUpdate();
                    }
                }.bind(this)
            }),
            // new ControlsElement({
            //     id: 'line-1',
            //     type: 'line'
            // })
        ];

        var pitchRollControlls = [
            new ControlsElement({
                id: 'roomPitch',
                label: 'Pitch:',
                type: 'input',
                width: '50%',
                options: {
                    type: 'number',
                    step: 0.1,
                },
                inputWidth: 'small',
                value: this._pano.getCurrentRoomValue('pitch'),
                onChange: function (value) {
                    // this._pano.addPitchRollHotspotsInRoom(this._pano.getCurrentRoomValue('pitch') - value, 0);

                    this._pano
                        .setCurrentRoomValue('pitch', parseFloat(value))
                        .updatePitchRoll()
                        .reDrawHotspotsInRoom();
        
                    this._magnifierPano.updatePitchRoll(
                        this._pano.getCurrentRoomValue('pitch'),
                        this._pano.getCurrentRoomValue('roll')
                    );
                }.bind(this)
            }),
            new ControlsElement({
                id: 'roomRoll',
                label: 'Roll:',
                type: 'input',
                width: '50%',
                options: {
                    type: 'number',
                    step: 0.1,
                },
                inputWidth: 'small',
                value: this._pano.getCurrentRoomValue('roll'),
                onChange: function (value) {
                    // this._pano.addPitchRollHotspotsInRoom(0, this._pano.getCurrentRoomValue('roll') - value);

                    this._pano
                        .setCurrentRoomValue('roll', parseFloat(value))
                        .updatePitchRoll()
                        .reDrawHotspotsInRoom();
        
                    this._magnifierPano.updatePitchRoll(
                        this._pano.getCurrentRoomValue('pitch'),
                        this._pano.getCurrentRoomValue('roll')
                    );
                }.bind(this)
            }),
            new ControlsElement({
                id: 'savePitchRoll',
                label: 'Grid:',
                type: 'button-group',
                options: [{
                    name: 'Usual',
                    value: 'usual'
                }, {
                    name: 'Dense',
                    value: 'dense'
                }],
                value: this._pano.gridType,
                width: '100%',
                onClick: function (value) {
                    this._pano.gridType = value;
                    this._pano.setGrid(false, 'dense').setGrid(true, value);
                }.bind(this)
            }),
            new ControlsElement({
                id: 'savePitchRoll',
                label: 'Save pitch & roll',
                type: 'button',
                onClick: function (value) {
                    this._data.savePitchAndRoll({
                        pitch: this._pano.getCurrentRoomValue('pitch'),
                        roll: this._pano.getCurrentRoomValue('roll'),
                        pano: this._pano.room
                    });
                }.bind(this)
            })
        ];

        this._controls.assemble("measurements-room-options", locationsControls);
        this._controls.assemble("measurements-room-pitch-roll", pitchRollControlls);

        return this;
    }.bind(this);
    
    /**
     * @return {this}
     */
    this.registerEvents = function () {
        /* Measurement pano events */
        this._pano.events.setOn('mousemove', 'update-magnifier', function (data) {
            this._magnifierPano.setPosition(data.ath, data.atv);
            this._3d.setMousePoint(data.ath, data.atv);
        }.bind(this));

        this._pano.events.setOn('mouseup', 'update-3d', function (data) {
            this._3d.setPanoCenter(data.center.ath, data.center.atv);
        }.bind(this));

        this._pano.events.setOn('update', '3d-model-build', function (data) {
            this._3d
                .clearScene()
                .setDataFromPano(data.pano)
                .draw3d();

            if (data.clicked.id && data.clicked.value && data.clicked.value.elementControls) {
                this._controls.assemble('measurement-element', data.clicked.value.elementControls);
                this._controls.enableAccordeon('element');
            } else {
                this._controls.disableAccordeon('element');
            }
        }.bind(this));

        this._pano.events.setOn('clicked', 'hide-selector', function (data) {
            if (data.id !== null && data.value && data.value.elementControls) {
                this._controls.assemble('measurement-element', data.value.elementControls);
                this._controls.enableAccordeon('element');
            } else  {
                this._controls.disableAccordeon('element');
            }
        }.bind(this));

        this._pano.events.setOn('set-location', 'set-location', function (data) {
            this._panoSlider
                .setRoom(data.location)
                .getFloorFromRoom(data.location)
                .fireUpdate();
        }.bind(this));

        this._pano.events.setOn('askForLineLength', 'ask-for-line-length', function (data) {
            this._3d.getLengthOfLine(data.line, this._pano);
        }.bind(this));

        this._pano.events.setOn('newMeasurement', 'measurement', function (data) {
            this.events.fire('newMeasurement', data);
        }.bind(this));

        /* Measurement 3d events */
        this._3d.events.setOn('updated', 'show-measurements', function (data) {
            this._pano.setLengthsToWalls(data.walls);
        }.bind(this));

        this._3d.events.setOn('returnLineLength', 'return-line-length', function (data) {
            this._pano.setLineLength(data);
        }.bind(this));

        /* Measurement pano slider events */
        this._panoSlider.events.setOn('updated', 'set-pano-image', function (data) {
            this._pano
                .setFloor(data.floor)
                .setRoom(data.room)
                .setImage(
                    data.roomUrl, 
                    this._pano.rooms[data.room].pitch, 
                    this._pano.rooms[data.room].roll
                );
                // .setScene(data.room);
            this._magnifierPano.setImage(
                data.roomUrl, 
                this._pano.rooms[data.room].pitch, 
                this._pano.rooms[data.room].roll
            );
            this._3d
                .setRoom(data.room)
                .clearScene();

            this.updateCurrentLocationControls();
            this._pano.reDrawHotspotsInRoom();
        }.bind(this));

        /* Measurement controls */
        this._controls.events.setOn('click-exportTo2d', 'export', function (data) {
            this.events.fire('exportTo2d', {
                data: this._3d.getExport2dData(),
                use2dViewMerging: this._3d.config.exportUse2dViewMerging.value
            });

            this._data.saveToServer(this._pano.getMeasurementDataOfCurrentFloor());
        }.bind(this));

        this._controls.events.setOn('accordeon-calibration', 'acc-upd', function (item) {
            this._pano.setGrid(!item.hidden, item.hidden ? 'dense' : 'usual');
        }.bind(this));

        return this;
    }
    
    /**
     * @param  {object} data
     * @returns {this}
     */
    this.watchInput = function (data) {
        if (this.initialized) {
            this._pano.watchInput(data);
        }

        return this;
    }
}