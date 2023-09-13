
'use strict';
var NavController = function(controller) {
    //modes
    var move = '.js-mode-move';
    var rotate = '.js-mode-rotate';
    var draw = '.js-mode-draw';
    var drawline = '.js-mode-drawline';
    var remove = '.js-mode-delete';

    //buttons
    var sToggleDoors = '.js-toggle-doors';

    //panels
    var sToolsPanel = '.tools';
    var sPreviewPanel = '.preview';
    var sPanoPanel = '.preview__pano';
    var sHeaderTitle = ".topnav__title";

    //units
    var sMetric = '.js-units-metric';
    var sImperial = '.js-units-imperial';
    var sImperial2 = '.js-units-imperial2';
    var sBothUnits = '.js-units-both';
    var sUnitsBtn = ".js-units-btn";

    var sSaveJson = '.js-save-json';
    var sUploadServer = '.js-upload-floorplan';
    this.sLoadSelector = '.js-load-json';
    var sImages = '.js-download-archive';
    var sMeasurements = '.js-download-measurements';
    var sSqMeasurements = '.js-download-square';
    var sCMeasurements = '.js-download-central';
    var sAllDimensions = '.js-download-all';

    //overlay selectors
    var sOverlaySettings = ".overlay-settings";
    var sOverlayOpacity = "#overlay_opacity";
    var sOverlayScale = "#overlay_scale";

    var sCanvasSelector = "#floorview";
    var canvasMove = "";
    var canvasRotate = "canvas_mode-rotate";
    var canvasDraw = "canvas_mode-draw";
    var canvasRemove = "canvas_mode-delete";

    var activeStyle = 'active';

    //icons navigation
    var sEmbedsPanel = '.iconsnav';
    var sEmbedsPanelItem = '.iconsnav__item';
    var sEmbedsPanelItemActive = '.iconsnav__item-active';
    var sEmbedsPanelLink = '.iconsnav__link';

    var sEmbedBtnSelector = '.js-embed-object';
    var sWindowBtnSelector = '.js-window-object';
    var sDoorBtnSelector = '.js-door-object';

    /**
     * flag indicating the next click on wall will add a door onto it
     * @type {boolean}
     */
    this.delayedDoorClick = false;
    /**
     * "door" or "window"
     * @type {string}
     */
    this.delayedType = "";
    /**
     * alert instance
     * @type {null|object}
     */
    this.delayedWindowAlert = null;

    this.fileTypes = ["json", /*"pdf", */"png", "jpeg", "jpg"];

    this.controller = controller;

    var scope = this;

    this.events = new EventsSystem('NavController');

    function init() {
        //apply draggable interface
        Draggable.apply(this, arguments);
        Resizable.apply(this, arguments);

        scope.initFileInput();
        scope.initFileHandlerFallback();
        scope.handlePreview();
        scope.handleToolsMenu();
        scope.handleToolsButtons();
        scope.handleIconsMenu();
        scope.handleUnitsChange();
        scope.handleOverlaySliders();
        scope.handleUpload();
        scope.handleDownloads();
    }

    this.handleToolsMenu = function() {
        scope.controller.modeChangeCallbacks.add(function(mode) {
            $(move+", "+rotate+", "+draw+", "+drawline+", "+remove).removeClass(activeStyle);
            if (mode === scope.controller.floormodel.modes.MOVE) {
                $(move).addClass(activeStyle);
                scope.switchCanvasClass();
            } else if (mode === scope.controller.floormodel.modes.ROTATE) {
                $(rotate).addClass(activeStyle);
                scope.switchCanvasClass(canvasRotate);
            } else if (mode === scope.controller.floormodel.modes.DRAW) {
                $(draw).addClass(activeStyle);
                scope.switchCanvasClass(canvasDraw);
            } else if (mode === scope.controller.floormodel.modes.DRAWLINE) {
                $(drawline).addClass(activeStyle);
                scope.switchCanvasClass(canvasDraw);
            } else if (mode === scope.controller.floormodel.modes.DELETE) {
                $(remove).addClass(activeStyle);
                scope.switchCanvasClass(canvasRemove);
            }
        });

        $(move).click(function(){
            scope.controller.setMode(scope.controller.floormodel.modes.MOVE);
        });

        $(rotate).click(function(){
            scope.controller.setMode(scope.controller.floormodel.modes.ROTATE);
        });

        $(draw).click(function(){
            scope.controller.setMode(scope.controller.floormodel.modes.DRAW);
        });

        $(drawline).click(function(){
            scope.controller.setMode(scope.controller.floormodel.modes.DRAWLINE);
        });

        $(remove).click(function(){
            scope.controller.setMode(scope.controller.floormodel.modes.DELETE);
        });
    };

    this.handleToolsButtons = function() {
        var positionConfig = {
            "OPENED": {
                active: false,
                value: 1,
                text: "Close doors"
            },
            "CLOSED": {
                active: true,
                value: 0,
                text: "Open doors"
            }
        };

        // open/close all doors in fp
        $(sToggleDoors).click(function() {
            var pBtn = this;
            controller.floormodel.doors.forEach(function (door) {
                door.openRate = positionConfig.CLOSED.active ? positionConfig.OPENED.value : positionConfig.CLOSED.value;
                controller.fireRedraw();
            });

            if (positionConfig.CLOSED.active) {
                positionConfig.CLOSED.active = false;
                positionConfig.OPENED.active = true;
                $(pBtn).find(".tools__title").text(positionConfig.OPENED.text);
            } else {
                positionConfig.CLOSED.active = true;
                positionConfig.OPENED.active = false;
                $(pBtn).find(".tools__title").text(positionConfig.CLOSED.text);
            }
        });
    };

    /**
     * construction and furniture elements
     */
    this.handleIconsMenu = function() {
        var imageOffsetX, imageOffsetY, dragType = "", doDragDoor = false, doDragWindow = false;

        $(sEmbedsPanel).on("mouseup", sEmbedBtnSelector, function() {
            var embed = controller.floormodel.newEmbedObject(0, 0, 0, $(this).data("type"));
            var selected = controller.floormodel.selectedObject;
            if (selected !== null && selected instanceof Room) { //to center of room
                var room = selected.getCenter();
                embed.moveTo(room.x, room.y);
            } else { //to center of screen
                embed.moveTo(
                    controller.view.convertBack(controller.view.originX) + controller.view.convertBack(controller.view.canvasElement.width) / 2,
                    controller.view.convertBack(controller.view.originY) + controller.view.convertBack(controller.view.canvasElement.height) / 2
                );
            }
            controller.floormodel.updated_rooms.fire();
        });

        $(sEmbedsPanel).on("dragstart", sEmbedBtnSelector, function(e) {
            var imageOffset = $(this).offset();
            imageOffsetX = e.originalEvent.clientX - imageOffset.left;
            imageOffsetY = e.originalEvent.clientY - imageOffset.top;
            dragType = $(this).data("type");
        }).on("dragstart", sDoorBtnSelector, function(e) {
            doDragDoor = true;
        }).on("dragstart", sWindowBtnSelector, function(e) {
            doDragWindow = true;
        });

        $(sCanvasSelector).on("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();

            //mouseX mouseY coords are not observed in mousemove event, when drag event is fired
            var event = e.originalEvent;
            var mouseX = (event.clientX - controller.canvasElement.offset().left) * controller.view.cmPerPixel +
                controller.view.originX * controller.view.cmPerPixel;
            var mouseY = (event.clientY - controller.canvasElement.offset().top) * controller.view.cmPerPixel +
                controller.view.originY * controller.view.cmPerPixel;

            if (dragType.length) {
                controller.floormodel.newEmbedObject(mouseX, mouseY, 0, dragType);
                controller.fireRedraw();
                dragType = "";
            }
            if (doDragDoor) {
                controller.floormodel.newDoorOrWindowToPoint("door", mouseX, mouseY);
                doDragDoor = false;
            }
            if (doDragWindow) {
                controller.floormodel.newDoorOrWindowToPoint("window", mouseX, mouseY);
                doDragWindow = false;
            }
        });

        $(sEmbedsPanel + ", " + sToolsPanel).on("click", sWindowBtnSelector, this.addDelayedWindow.bind(this));
        $(sEmbedsPanel + ", " + sToolsPanel).on("click", sDoorBtnSelector, this.addDelayedDoor.bind(this));

        $(sEmbedsPanelItem).on("click", function(e) {
            if ($(e.target).hasClass(sEmbedsPanelLink.substring(1))) {
                var activeClass = sEmbedsPanelItemActive.substring(1);
                if ($(this).hasClass(activeClass)) {
                    $(this).removeClass(activeClass);
                } else {
                    $(sEmbedsPanelItem).removeClass(activeClass);
                    $(this).addClass(sEmbedsPanelItemActive.substring(1));
                }
            }
        });
    };

    /**
     * setting door/window adding status to ready. Clicking the point on wall after that will set a new door/window.
     */
    this.addDelayedDoor = function () {
        this.delayedDoorClick = true;
        this.delayedType = 'door';
        this.delayedWindowAlert = new Alert("Click on the wall to place the door.", "", 0);
        this.delayedWindowAlert.render();
        this.controller.setMode(this.controller.floormodel.modes.MOVE);
    };
    this.addDelayedWindow = function () {
        this.delayedDoorClick = true;
        this.delayedType = 'window';
        this.delayedWindowAlert = new Alert("Click on the wall to place the window.", "", 0);
        this.delayedWindowAlert.render();
        this.controller.setMode(this.controller.floormodel.modes.MOVE);
    };
    this.skipDelayed = function () {
        this.delayedDoorClick = false;
        this.delayedWindowAlert.close();
    };

    this.switchCanvasClass = function(mode) {
        [canvasRotate, canvasDraw, canvasRemove].forEach(function(className) {
            $(sCanvasSelector).removeClass(className);
        });
        if (mode) $(sCanvasSelector).addClass(mode);
    };

    /**
     * Initializes file loading and drag'n'drop. Try to parse file and load to system
     */
    this.initFileInput = function() {
        var scope = this;
        var loadDropzone = new Dropzone(
            sToolsPanel,
            { url: "/upload", clickable: this.sLoadSelector, autoDiscover: false, autoProcessQueue: false }
        );
        loadDropzone.on("addedfile", function(file) {
            var fileType = null, reader = new FileReader();
            scope.fileTypes.forEach(function(type) {
                if (file.name.indexOf(type) > 0) {
                    fileType = type;
                }
            });
            if (fileType === null) {
                alert("Unsupported file type! Try "+scope.fileTypes.join(", "));
                return false;
            }

            reader.addEventListener("load", function(e) {
                try {
                    switch (fileType) {
                        case "json":
                            var json = JSON.parse(e.target.result);
                            controller.floormodel.loadJSON(json);
                            break;
                        case "pdf":
                        case "png":
                        case "jpeg":
                        case "jpg":
                            controller.floormodel.overlay = new Overlay(e.target.result, fileType);
                            controller.floormodel.overlay.updated = true;
                            scope.drawOverlaySettings();
                            controller.fireRedraw();
                            break;
                    }
                } catch (ex) {
                    alert('Error when trying to load json: ' + ex.stack);
                }
            });
            if (fileType === "json") reader.readAsText(file);
            else reader.readAsDataURL(file);
        });
    };

    /**
     * fallback for drag and drop
     */
    this.initFileHandlerFallback = function() {
        $(sCanvasSelector).on("dragenter dragover", function(e) {
            e.stopPropagation();
            e.preventDefault();
        });
    };

    /**
     * Helper function to show window with error
     * @param error {string}
     */
    function showError(error) {
        var text = "Got an error from server: " + error;
        var popover = new PopoverDialog("center", 100, text, "Error");
        popover.addButton("OK", function() {
            popover.close();
        });
        popover.render();
    }
    function showSuccess() {
        var popover = new PopoverDialog("center", 100, "Uploaded succesfully!", "Success");
        popover.addButton("OK", function() {
            popover.close();
        });
        popover.render();
    }

    this.handleUpload = function() {
        $(sUploadServer).click(this.upload.bind(this));
    };

    this.upload = function () { //upload floor to server
        var floors = [];
        var domainMatches = window.dataHandling.params.jsonUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        var domain = domainMatches && domainMatches[0].substring(0, domainMatches[0].length - 1);
        var floor = window.dataHandling.params.floor || null;
        var tourId = window.dataHandling.params.orderId || null;

        if ("jsonData" in window && domain) {
            if (floor) { //send data directly
                if (this.controller.floormodel.checkCamerasAssociations()) {
                    var send = this.sendData(domain, floor, tourId, null, true);

                    send.then(function () {
                        this.events.fire('uploaded', {floor: floor});
                    }.bind(this));
                } else {
                    showError('One of the cameras is not associated with rooms');
                }
            } else { //show modal where user will send data
                for (var floorId in window.jsonData.tour.maps) {
                    if (window.jsonData.tour.maps.hasOwnProperty(floorId)) floors.push("<option value='" + floorId + "'>" + floorId + "</option>");
                }
                var text = "Please, specify which floor is it? <select name='floor'>" + floors.join("") + "</select>";
                var popover = new PopoverDialog("center", 100, text, "Upload to Server");

                popover.addButton("Send", function () {
                    var send = this.sendData(domain, floor, tourId, popover, true);

                    send.then(function () {
                        this.events.fire('uploaded', {floor: false});
                    }.bind(this));
                }.bind(this));
                popover.render();
            }
        }
    };

    /** Send floorplan data to server:
     * 1. capture 2 images
     * 2. prepare an export of floorplan data
     * 3. send images
     * 4. send data
     *
     * @param {string} domain
     * @param {number} floorId
     * @param {number} tourId
     * @param {object} popover
     * @param {boolean} doShowWindows flag indicating whether to show or not any windows after fail/success
     */
    this.sendData = function(domain, floorId, tourId, popover, doShowWindows) {
        var dfd = $.Deferred();
        if (floorId === undefined || floorId === null) { //find from alertbox
            var $context = $(".alert");
            floorId = $context.find("[name=floor]").val();
        }
        if (!tourId) tourId = window.jsonData.tour.id; //deprecated

        var image = null;
        var image2 = null;
        var image3 = null;
        var image4 = null;
        $.when(window.pngViewer.render(false), window.jpgViewer.render(false))
            .then(function() {
                var dfd2 = new $.Deferred();
                image = window.pngViewer.dataUrl;
                image2 = window.jpgViewer.dataUrl;

                //if docusketch order -> also send images with measurements
                if (domain === "https://app.docusketch.com") {
                    $.when(window.pngViewer.render(false, {central: true}), window.jpgViewer.render(false, {central: true}))
                        .done(function() {
                            image3 = window.pngViewer.dataUrl;
                            image4 = window.jpgViewer.dataUrl;
                            dfd2.resolve();
                        });
                } else {
                    dfd2.resolve();
                }

                return dfd2.promise();
            }).done(function() {
                var exportInstance = new Export(scope.controller.floormodel);
                var requestData = exportInstance.toJSON();
                var hotspots = scope.controller.floormodel.calcCamerasPositions();
                var floorSquare = scope.controller.floormodel.getTotalSquare();
                var request1 = new RequestBackend(domain, window.dataHandling.params.authToken);
                var request2 = new RequestBackend(domain, window.dataHandling.params.authToken);
                console.log(tourId, floorId);
                console.log(image);
                console.log(requestData);
                console.log(hotspots);
                $.when(request1.sendImage(tourId, floorId, [image, image2, image3, image4])).done(function(response1) {
                    if (response1.type === "IMAGES_UPLOADED") {
                        $.when(request2.sendFloorData(tourId, floorId, requestData, hotspots, floorSquare)).done(function (response2) {
                            if (popover) popover.close();
                            if (doShowWindows) showSuccess();
                            dfd.resolve();
                        }).fail(function(jqXHR, textStatus, error) {
                            if (doShowWindows) showError(error);
                            dfd.reject();
                        }).always(function(response2) {
                            if (response2.type === "PANOS_NOT_FOUND") {
                                if (doShowWindows) showError('One of the cameras is not associated with rooms');
                                dfd.reject();
                            }
                        });
                    } else {
                        if (doShowWindows) showError("Images haven't been uploaded!");
                        dfd.reject();
                    }
                }).fail(function(jqXHR, textStatus, error) {
                    if (doShowWindows) showError(error);
                    dfd.reject();
                });
            }).fail(function(jqXHR, textStatus, error) {
                if (doShowWindows) showError(error);
                dfd.reject();
            });

        return dfd.promise();
    };

    this.handleDownloads = function() {
        $(sSaveJson).click(function() { //save json
            var exportInstance = new Export(scope.controller.floormodel, true);
            exportInstance.toJSON();
        });

        function makeArchiveWithTwoImages(options, name) {
            var zip = new JSZip();

            $.when(window.pngViewer.render(false, options)).done(function() {
                $.when(window.jpgViewer.render(false, options)).done(function() {
                    var pngImgData = window.pngViewer.dataUrl;
                    var jpgImgData = window.jpgViewer.dataUrl;

                    zip.file("1.png", pngImgData.substr(pngImgData.indexOf(',')+1), {base64: true});
                    zip.file("2.jpg", jpgImgData.substr(jpgImgData.indexOf(',')+1), {base64: true});
                    zip.generateAsync({type:"blob"})
                        .then(function(content) {
                            // see FileSaver.js
                            saveAs(content, name);
                        });
                });
            });
        }

        $(sImages).click(function() { //make an archive with png and jpg images
            makeArchiveWithTwoImages(undefined, "jpg_png.zip");
        });

        $(sMeasurements).click(function() { //make an archive with dimensions
            makeArchiveWithTwoImages({wall_measurements: true}, "measurements.zip");
        });

        $(sSqMeasurements).click(function() { //make an archive with squareas
            makeArchiveWithTwoImages({square: true}, "measurements.zip");
        });

        $(sCMeasurements).click(function() { //make an archive with dimensions
            makeArchiveWithTwoImages({central: true}, "measurements.zip");
        });

        $(sAllDimensions).click(function() { //make an archive with square and walls measurements
            makeArchiveWithTwoImages({wall_measurements: true, central: true}, "all.zip");
        });
    };

    /**
     * preview popup
     */
    this.handlePreview = function() {
        $(sPreviewPanel).on("load resize", function() {
            var newH = $(sPreviewPanel).height() - 36;
            $(sPanoPanel).height(newH);
        });
    };

    /**
     * Units nav control
     */
    this.handleUnitsChange = function() {
        var actStyleUnits = 'active';
        var eventsVars = [
            {name: 'metric', class: sMetric, unit: scope.controller.view.units.METRIC},
            {name: 'imperial', class: sImperial, unit: scope.controller.view.units.IMPERIAL},
            {name: 'imperial2', class: sImperial2, unit: scope.controller.view.units.IMPERIAL2},
            {name: 'both', class: sBothUnits, unit: scope.controller.view.units.BOTH}
        ];
        eventsVars.forEach(function(obj, i) {
            $(obj.class).on("click", function() {
                $(sMetric+", "+sImperial+","+sImperial2+", "+sBothUnits).removeClass(actStyleUnits);
                $(obj.class).addClass(actStyleUnits);
                var text = $(obj.class).text();
                $(sUnitsBtn).html(text + " <span class='caret'></span>");
                scope.controller.view.unitSystem = obj.unit;
                scope.controller.imageView.unitSystem = obj.unit;
                scope.controller.pdfView.unitSystem = obj.unit;
                scope.controller.fireRedraw();
                scope.controller.measurementValues.setUnitSystem(obj.name);
            });
        });
    };

    /* Overlay */
    this.drawOverlaySettings = function() {
        $(sOverlaySettings).addClass("overlay-settings_visible");
    };
    this.handleOverlaySliders = function() {
        $(sOverlayOpacity).on("change", function(e) {
            scope.controller.floormodel.overlay.setOpacity(e.target.valueAsNumber);
            scope.controller.fireRedraw();
        });
        $(sOverlayScale).on("change", function(e) {
            scope.controller.floormodel.overlay.setScale(e.target.valueAsNumber);
            scope.controller.fireRedraw();
        });
    };

    /**
     * Reload preview with krpano
     * @param  {string} url
     * @param  {string} selector
     */
    this.reloadPano = function (url, selector) {
        if (!selector) selector = 'krpanoSWFObject3';
        var sLink = ".preview__fullscreen";

        if (url) {
            var path = new URL(url);
            var urlWithParams = [path.origin + path.pathname];

            if (path.search.length > 1) {
                urlWithParams.push(path.search + "&");
            } else {
                urlWithParams.push("?");
            }

            urlWithParams = urlWithParams.concat(
                ["psm.showFloorPlan=false",
                    "&psm.floorplanCreationMode=true",
                    "&psm.showRotate=false",
                    "&psm.showLogo=false",
                    "&psm.showContact=false",
                    "&psm.showInfopointsList=false",
                    "&psm.showExposeInfo=false",
                    "&messagingEnabled=1",
                    "&psm.showFs=false",
                    "&forceDollHouse=0"]
            );

            $('#' + selector).html(
                "<iframe id='iframeTour' style='width: 100%; height:100%' src='" + urlWithParams.join("") + "'></iframe>"
            );

            urlWithParams[urlWithParams.length - 1] = "&psm.showFs=true";
            urlWithParams.push("&p.measurementTool=true");
            urlWithParams.push((path.host === "app.docusketch.com" ? "&corrector=true" : ""));

            var linkToMeasurementTab = window.location.href;
            if (!~linkToMeasurementTab.indexOf('openTab=measurements')) {
                linkToMeasurementTab += '&openTab=measurements';
            }

            $(sLink).attr("href", linkToMeasurementTab).removeClass("hide");
        } else {
            $('#' + selector).remove();

            embedpano({
                id: selector,
                xml: null,
                target: "2dpano",
                html5: "webgl+only",
                webglsettings: {
                    depth: true
                },
                passQueryParameters: true,
                wmode: "opaque",
                onready: function(krpano) {
                    var pathname = document.location.pathname;

                    if (document.location.pathname.indexOf(".html") !== -1) {
                        pathname = pathname.substring(0, pathname.lastIndexOf('/')) + "/";
                    }

                    var krpanoXML = new EJS({
                        url: document.location.origin + pathname + 'templates/sphere-small.ejs'
                    }).render(window.apartmentData);

                    krpano.call("loadxml(" + krpanoXML + ")");
                },
                onerror: function () {
                    alert('Server error!');
                },
                consolelog: true
            });
        }
    };

    this.reloadTitle = function(title) {
        $(sHeaderTitle).text(title);
    };

    init();
};