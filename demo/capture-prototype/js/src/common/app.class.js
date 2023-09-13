'use strict';

/** 
 * Main app class
 * @class
 */
const App = function () {
    this.keyInput = null;
    this.broadcast = null;
    this.viewSelector = null;

    this.dataHandling = null;

    this.floorModel = null;
    this.floorView = null;
    this.printView = null;
    this.imageView = null;
    this.floorController = null;

    this.editor3d = null;
    // this.sceneModel = null;
    // this.sceneController = null;

    this.measurements = null;

    this.cache = {};

    this.initialTab = 'view2d';

    /**
     * Initialize app subclasses
     */
    this.init = function () {
        window.app = this; // Only for debug

        //Todo: move all from window to app class
        this.keyInput = new KeyInput;
        this.broadcast = new Broadcast('app');
        this.viewSelector = new ViewSelector;

        this.measurements = new Measurements;
        this.editor3d = new Editor3D;

        this.keyInput.watch();

        window.viewSelector = this.viewSelector;
        this.dataHandling = window.dataHandling;

        //mergePlugin();
        this.dataHandling.init();

        // Hint: Disabled first old tab init, code may be removed soon 
        // window.pluginCell.initPano();
        // window.model3d.init();
        // window.pluginCell.init();
        // window.windows.init();
        // window.tourLoader.init();
        // window.panoSelector.init();

        this.floorModel = new FloorModel();
        this.floorView = new FloorView(this.floorModel);
        this.printView = new PrintView(this.floorModel);
        this.imageView = new ImageView(this.floorModel);
        this.floorController = new FloorController(this.floorModel, this.floorView, this.printView, this.imageView);
        this.floorController.init();

        // this.sceneModel = new SceneModel();
        // this.sceneController = new SceneController(this.sceneModel, this.floorController);

        // this.floorModel.hookUpSceneModel(this.sceneModel);
        this.floorModel.hookUpSceneModel(this.editor3d);

        this.viewSelector.init();

        //window.merging3d.init(this.floorController);
        window.pdfViewer.init(this.floorController);
        window.pngViewer.init(this.floorController);
        window.jpgViewer.init(this.floorController);

        window.messenger = new Messenger(this.floorModel);

        // Todo: change realtions between classes, to make single responsibility principle possible
        this.registerEvents();
        this.loadSettings();

        //fast steps to download plan and be ready to edit 2d
        /*setTimeout(function() {
                var rawFile = new XMLHttpRequest();
                //var json = '../json/riverbendranchoakley_utah.json';
                //var json = '../json/2boxes.json';
                var json = '../json/plans/lovran.json';
                rawFile.open("GET", json, true);
                rawFile.onreadystatechange = function ()
                {
                        if(rawFile.readyState === 4)
                        {
                                if(rawFile.status === 200 || rawFile.status == 0)
                                {
                                        $("#view2").parent().click();
                                        var json = JSON.parse(rawFile.responseText);
                                        this.floorModel.loadJSON(json);
                                }
                        }
                }.bind(this)
                rawFile.send(null);
        }.bind(this), 1000);*/
    };
    
    /**
     * Register event handlers for class subclasses
     */
    this.registerEvents = function () {
        this.performQueryData();

        /* 
        /* To prevent pass variables everywhere, just use callback, it much clearer 
        /* and that easiest to get and observe relations in code between classes.
        */

        /* Input events */
        this.keyInput.events.setOn('ANY', 'pass-to-pano-measurements', function (data) {
            this.measurements.watchInput(data);
            this.editor3d.watchInput(data);
            this.floorController.watchInput(data);
        }.bind(this));

        /* Broadcast events */
        this.broadcast.setOnMessage('newMeasurement', function (message) {
            this.floorController.measurementValues.addMeasurementValue(message);
        }.bind(this));

        /* View selector events */
        this.viewSelector.events.setOn('set-pano-measurements', 'init-measurements-tab', function () {
            this.editor3d.disable();
            this.floorController.disable();
            this.measurements.init(window.jsonData, this.dataHandling.params);
        }.bind(this));

        this.viewSelector.events.setOn('set-view2d', 'init-view2d-tab', function () {
            this.editor3d.disable();
            this.floorController.enable();

            if (this.cache.invisibleWalls) {
                this.floorModel.addWalls(this.cache.invisibleWalls);
                delete this.cache.invisibleWalls;
            }

            if (!this.floorModel.alreadyLoaded) {
                this.performQueryPlan();
            }

            this.floorController.nav.reloadPano(this.dataHandling.params["jsonUrl"], 'krpanoSWFObject3');
        }.bind(this));
        
        this.viewSelector.events.setOn('set-view3d', 'init-view3d-tab', function () {
            this.floorController.disable();
            
            if (window.jsonData) {
                this.editor3d.setTextureSizeFromTour(window.jsonData.tour);
            }

            if (this.dataHandling.params.removeWalls !== '0') {
                this.cache.invisibleWalls = this.floorModel.filterWalls(function (wall) {
                    return wall.bearing === wall.modes.INVISIBLE;
                });

                this.floorModel.removeWalls(this.cache.invisibleWalls);
            }

            this.editor3d
                .enable()
                .setDataParameters(window.jsonData, this.dataHandling.params)
                .syncWith2D(this.viewSelector.getCurrentFloor(), this.floorModel);

            if (window.jsonData) {
                this.editor3d
                    .loadModelsFromMaps(window.jsonData.tour.maps)
                    .setTextruesFromRooms(window.jsonData.tour.rooms, window.jsonData.tour.useCubic)
                    .updateFloorsSelector()
                    .setStructure();
            }
        }.bind(this));

        this.viewSelector.events.setOn('set-floor', 'set-floor', function (data) {
            var newParams = JSON.parse(JSON.stringify(this.dataHandling.params));

            newParams.floor = data.floor;

            var popover = new PopoverDialog(
                'center',
                100, 
                'Do you want upload current floor to server?',
                'Upload to Server'
            );
    
            popover.addButton("Yes", function () {
                this.floorController.nav.events.setOn('uploaded', 'floor-change', function () {
                    window.location.href = this.dataHandling.getNewUrl(newParams);
                }.bind(this));

                this.floorController.nav.upload();
            }.bind(this));

            popover.addButton("No", function () {
                window.location.href = this.dataHandling.getNewUrl(newParams);
            }.bind(this));

            popover.render();
        }.bind(this));

        /* Editor 3D events */
        this.editor3d.events.setOn('exportData', 'export', function (data) {
            // this.floorController.nav.upload(); // Todo: purify might delete 2d walls floor2D

            var exportInstance = new Export(this.floorModel, false);
            var camerasData = exportInstance.saveCamerasList();

            var request = new RequestBackend(
                this.editor3d.data.parameters.domain,
                this.editor3d.data.token
            );

            $.when(request.send3DCameras(
                this.editor3d.data.parameters.orderId,
                this.viewSelector.getCurrentFloor(),
                camerasData
            )).done(function () {
                console.log('%cSave cameras data ok.', 'color: green;');
                data.statuses.cameras = true;
                data.checkStatuses();
            });
        }.bind(this));

        this.editor3d.events.setOn('mergeRooms', 'merge', function (data) {
            this.floorModel.mergeIntersectedCornersCompletely();
        }.bind(this));

        /* Measurements events */
        this.measurements.events.setOn('exportTo2d', 'export', function (data) {
            this.editor3d.resetFloorStructure();
            
            this.viewSelector.setTab('view2d');
            this.floorModel.setCurrentState(data.data);

            if (data.use2dViewMerging) {
                this.floorModel.mergeIntersectedCornersCompletely();
            }

            // this.floorModel.transform(0, true);
            this.floorModel.update();
        }.bind(this));

        this.measurements.events.setOn('newMeasurement', 'sendData', function (data) {
            this.broadcast.sendMessage('newMeasurement', data);
        }.bind(this));
    };

    /**
     * change any configs / settings.
     */
    this.loadSettings = function() {
        if (this.dataHandling.isDocusketch()) {
            Wall.setDSDefaultThicknesses();
            Corner.prototype.tolerance = 10;
            Wall.prototype.maxClosenessToEdge = 7.62; //3inches
        }
    };

    /**
     * retrieve jsonData from tour. If not authorized - show login form and wait for token,
     * then try to retrieve again
     */
    this.performQueryData = function() {
        this.dataHandling.dataRequest = this.dataHandling.queryData();
        this.dataHandling.dataRequest.then(
            function () {
                if (~window.location.href.indexOf('openTab=measurements')) {
                    this.initialTab = 'pano-measurements';
                }

                if (window.jsonData) {
                    this.viewSelector.setAvalibleFloors(Object.keys(window.jsonData.tour.maps));
                    this.viewSelector.setCurrentFloor(this.dataHandling.params.floor);
                    this.viewSelector.enable();
                    this.viewSelector.setTab(this.initialTab);
                    this.editor3d.setStructureFromMaps(window.jsonData.tour.maps);
                    this.floorController.nav.reloadTitle(window.jsonData.tour.name);
                } else {
                    this.dataHandling.getTestJsonData().then(function () {
                        this.viewSelector.enable();
                        this.viewSelector.setTab(this.initialTab);
                    }.bind(this));
                }
                console.log('jsonDATA:', window.jsonData);
            }.bind(this),
            function () {
                var modal = new AuthModal(this.dataHandling.getDomain());
                modal.render();
                this.keyInput.unwatch();
                modal.events
                    .removeOn("successful_signin", "signin")
                    .setOn("successful_signin", "signin", function (token) {
                        this.dataHandling.params.authToken = token;
                        this.dataHandling.params.accessToken = token;
                        this.keyInput.watch();
                        this.performQueryData();
                    }.bind(this));
            }.bind(this)
        );
    };

    /**
     * retrieve floorplan json if its available. If not authorized - show login form and wait for token,
     * then try to retrieve again
     */
    this.performQueryPlan = function() {
        this.dataHandling.queryPlan(this.viewSelector.currentFloor, this.viewSelector.floors).then(
            function () {
                this.floorModel.alreadyLoaded = true;

                if (this.dataHandling.planJSON) {
                    this.floorModel.loadJSON(this.dataHandling.planJSON);
                    this.floorModel.checkCamerasAssociationsAsync();
                }
                if (this.dataHandling.underlyingLevelJSON) {
                    this.floorModel.handleUnderlyingLevel(this.dataHandling.underlyingLevelJSON);
                    this.floorView.draw();
                }
            }.bind(this),
            function(jqXHR) {
                if (jqXHR.status === 401) {
                    var modal = new AuthModal(this.dataHandling.getDomain());
                    modal.render();
                    this.keyInput.unwatch();
                    modal.events
                        .removeOn("successful_signin", "signin")
                        .setOn("successful_signin", "signin", function (token) {
                            this.dataHandling.params.authToken = token;
                            this.dataHandling.params.accessToken = token;
                            this.keyInput.watch();
                            this.performQueryPlan();
                        }.bind(this));
                }
            }.bind(this)
        );
    }
};