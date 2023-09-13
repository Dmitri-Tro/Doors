
'use strict';
var FloorController = function(floormodel, view, pdfView, imageView) {

    this.floormodel = floormodel;
    /** */
    this.mode = 0;
    this.enabled = false;
    /** */

    /* flag shows if compass is rotated */
    this.activeCompass = false;

    /** drawing mode "cursor" coordinates. Cursor can sometimes stick to the wall */
    this.targetX = 0;
    this.targetY = 0;
    /** first corner of the wall in drawing state */
    this.lastNode = null;
    this.drawnWall = new DrawnWall(floormodel);
    /** */
    this.modeChangeCallbacks = $.Callbacks();

    /** mousedown indicator */
    this.mouseDown = false;
    /** mousemove indicator */
    this.mouseMoved = false;

    /** in ThreeJS coords */
    this.mouseX = 0;
    this.mouseY = 0;

    this.rotateAngle = false;

    this.canvasElement = $("#" + view.canvas);
    this.view = view;
    this.normalView = view;
    this.pdfView = pdfView;
    this.imageView = imageView;
    this.nav = new NavController(this);
    this.propsNav = new PropsController(this);
    this.measurementValues = new MeasurementValues(this);

    /* currently selected */
    this.selectedObject = null;

    /* distance for stick effect */
    this.snapTolerance = 20;
    this.snapToleranceObjects = 10;

    this.init = function() {
        var scope = this;
        this.view = this.normalView;
        this.setMode(this.floormodel.modes.MOVE);
        this.canvasElement.mousedown(function (event) {
            scope.mousedown(event);
        });
        this.canvasElement.mousemove(function (event) {
            scope.mousemove(event);
        });
        this.canvasElement.mouseup(function () {
            scope.mouseup();
        });
        this.canvasElement.mouseleave(function () {
            scope.mouseleave();
        });
        this.canvasElement.dblclick(function (event) {
            scope.dblclick(event);
        });
        this.handleScroll();
        this.handleEscapeKey();
        this.handleObjectsSmartRotating();
        this.handleActiveCameraRotating();
        this.handleScalingFromUrl();
        this.handleDislocatingFromUrl();
        $(window).on("load.floorController resize.floorController", function() {
            scope.view.reset();
            scope.view.draw();
        }).trigger("load.floorController");
        this.floormodel.fireOnUpdatedRooms(scope.view.draw.bind(scope.view));
        this.handleColorFromUrl();
        if (window.dataHandling.params.debug !== "1") this.handleUnload();
        this.handleRedirectButton();
    };

    this.enable = function () {
        this.enabled = true;
    };

    this.disable = function () {
        this.enabled = false;
    };

    this.handleRedirectButton = function() {
        $(".redirect").attr("href", '/fp/'+document.location.search);
    };

    this.fireRedraw = function() {
        this.view.draw();
    };

    this.switchView = function(view) {
        if (view in this) {
            this.view = this[view];
            this.imageView.cachedImages = this.normalView.cachedImages; //cached images must be valid across views

            this.view.reset();
            this.view.draw();
        }
    };

    // modes
    this.isInMoveMode = function() { return this.mode === this.floormodel.modes.MOVE };
    this.isInDrawMode = function() { return this.mode === this.floormodel.modes.DRAW };
    this.isInRotateMode = function() { return this.mode === this.floormodel.modes.ROTATE };
    this.isInDeleteMode = function() { return this.mode === this.floormodel.modes.DELETE };
    this.isInDrawLineMode = function() { return this.mode === this.floormodel.modes.DRAWLINE };

    /* MOUSE EVENTS */
    /* mousedown handler */
    this.mousedown = function (event) {
        this.mouseDown = true;
        this.mouseMoved = false;
        this.view.lastX = this.view.rawMouseX;
        this.view.lastY = this.view.rawMouseY;
        // delete
        if (this.isInDeleteMode()) {
            if (this.floormodel.activeObject) {
                this.floormodel.removeObject(this.floormodel.activeObject);
                this.view.draw();
            } else if (this.floormodel.activeLine) {
                this.floormodel.removeObject(this.floormodel.activeLine);
                this.view.draw();
            } else if (this.floormodel.activeCamera = this.floormodel.overlappedCamera(this.mouseX, this.mouseY)) {
                this.floormodel.removeObject(this.floormodel.activeCamera);
                this.view.draw();
            } else if (this.floormodel.activeDoor) {
                this.floormodel.removeObject(this.floormodel.activeDoor);
                this.view.draw();
            } else if (this.floormodel.activeCorner) {
                this.floormodel.activeCorner.removeAll();
            }
            else if (this.floormodel.activeWall) {
                this.floormodel.activeWall.remove();
            }
            else {
                this.setMode(this.floormodel.modes.MOVE);
            }
        }
        //selecting
        if (this.isInMoveMode()) {
            if (this.floormodel.activeDimension = this.floormodel.overlappedDimension(this.mouseX, this.mouseY)) {}
            else if (this.floormodel.activeCameraIndicator = this.floormodel.overlappedCameraIndicator(this.mouseX, this.mouseY)) {}
            else if (this.floormodel.activeObject && this.floormodel.activeObject.rotateHovered) {
                this.floormodel.activeObject.rotateStartPoint = {x: this.mouseX, y: this.mouseY};
                this.floormodel.activeObject.rotateInitialAngle = Number(this.floormodel.activeObject.angle);
            }
            else if (this.floormodel.activeDoor) this.setSelected(this.floormodel.activeDoor);
            else if (this.floormodel.activeWall) {
                if (this.nav.delayedDoorClick) {
                    var obj;
                    if (obj = this.floormodel.newDoorOrWindowToPoint(this.nav.delayedType, this.mouseX, this.mouseY)) {
                        this.nav.delayedWindowAlert.close();
                        this.setSelected(obj);
                    }
                    this.nav.delayedDoorClick = false;
                } else {
                    this.setSelected(this.floormodel.activeWall);
                }
            }
            else if (this.floormodel.activeRoomName = this.floormodel.overlappedRoomName(this.mouseX, this.mouseY)) {}
            else if (this.floormodel.activeCamera = this.floormodel.overlappedCamera(this.mouseX, this.mouseY)) {
                window.messenger.send({action: "camerachange", hotspot: this.floormodel.activeCamera.id});
                //also switch room in which camera is situated
                this.floormodel.activeRoom = this.floormodel.getRoomByName(this.floormodel.activeCamera.roomName);
                this.setSelected(this.floormodel.activeRoom);
            }
            else if (this.floormodel.activeObject) {
                if (this.floormodel.activeObject instanceof EmbedStairs
                    || this.floormodel.activeObject instanceof EmbedStairsCaracole
                    || this.floormodel.activeObject instanceof EmbedStairsSquare
                    || this.floormodel.activeObject instanceof EmbedCube) {
                    this.setSelected(this.floormodel.activeObject);
                } else
                    this.setSelected(null);
            }
            else if (this.floormodel.activeRoom = this.floormodel.overlappedRoom(this.mouseX, this.mouseY)) {
                this.setSelected(this.floormodel.activeRoom);
                this.view.draw(); //active rooms
            }
            else this.setSelected(null);
        }
        if (this.isInRotateMode()) {
            this.rotateAngle = Math.atan2(this.mouseY, this.mouseX);
        }
    };

    /* mousemove handler */
    this.mousemove = function (event) {
        this.mouseMoved = true;
        // update mouse
        this.view.rawMouseX = event.clientX;
        this.view.rawMouseY = event.clientY;
        this.mouseX = (event.clientX - this.canvasElement.offset().left) * this.view.cmPerPixel + this.view.originX * this.view.cmPerPixel;
        this.mouseY = (event.clientY - this.canvasElement.offset().top) * this.view.cmPerPixel + this.view.originY * this.view.cmPerPixel;

        // update target (snapped position of actual mouse)
        if (this.isInDrawMode() ||
            this.mode == this.floormodel.modes.DRAWLINE ||
            (this.isInMoveMode() && this.mouseDown)) {
            this.updateCursorPosition(event);
        }
        // update object target
        if (this.mode != this.floormodel.modes.DRAW && !this.mouseDown) {
            var hoverCorner = this.floormodel.overlappedCorner(this.mouseX, this.mouseY);
            var hoverDoor = this.floormodel.overlappedDoor(this.mouseX, this.mouseY, 20);
            this.floormodel.activeLine = this.floormodel.overlappedLine(this.mouseX, this.mouseY);
            if (!this.floormodel.activeLine) var hoverWall = this.floormodel.overlappedWall(this.mouseX, this.mouseY);
            var hoverObject = this.floormodel.overlappedObject(this.mouseX, this.mouseY, 12);
            this.activeCompass = this.floormodel.compass.overlapped(this.view.rawMouseX, this.view.rawMouseY, this.canvasElement.height());

            var draw = false;

            if (this.floormodel.overlappedCameraIndicator(this.mouseX, this.mouseY)) draw = true;

            if (hoverCorner != this.floormodel.activeCorner) {
                this.floormodel.activeCorner = hoverCorner;
                draw = true;
            }
            // corner takes precendence
            if (this.floormodel.activeCorner == null) {
                if (hoverWall != this.floormodel.activeWall) {
                    this.floormodel.activeWall = hoverWall;
                    draw = true;
                }
            }
            else {
                this.floormodel.activeWall = null;
            }

            //set hover door
            if (hoverDoor !== null) {
                this.floormodel.activeDoor = hoverDoor;
                draw = true;
            } else {
                this.floormodel.activeDoor = null;
                //draw = true;
            }

            this.changeCursorsOnObjectHover(hoverObject);
            if (hoverObject != this.floormodel.activeObject) {
                this.floormodel.activeObject = hoverObject;
                draw = true;
            }
            if (draw) {
                this.view.draw();
            }
        }
        // panning
        if (this.mode !== this.floormodel.modes.ROTATE && this.mouseDown &&
            !this.floormodel.activeCorner &&
            !this.floormodel.activeWall &&
            !this.floormodel.activeLine &&
            !this.floormodel.activeDoor &&
            !this.floormodel.activeObject &&
            !this.floormodel.activeRoomName &&
            !this.floormodel.activeCamera &&
            !this.floormodel.activeDimension &&
            !this.floormodel.activeCameraIndicator &&
            !this.activeCompass) {

            this.view.panOrigin(this.view.lastX - this.view.rawMouseX, this.view.lastY - this.view.rawMouseY);
            this.view.lastX = this.view.rawMouseX;
            this.view.lastY = this.view.rawMouseY;
            this.view.draw();
        }
        // dragging
        if (this.isInMoveMode() && this.mouseDown) {
            if (this.floormodel.activeRoomName) {
                var p = this.floormodel.activeRoomName.getPlacement();
                p.visibleNamePosition = {x: this.mouseX, y: this.mouseY};
            } else if (this.floormodel.activeDimension) {
                var roomObj = this.floormodel.getRoomByName(this.floormodel.activeDimension.room.roomName);
                if (Utils.isPointInsidePolygon(this.mouseX, this.mouseY, roomObj.corners)) {
                    this.floormodel.activeDimension.move(this.mouseX, this.mouseY);
                }
            } else if (this.floormodel.activeCameraIndicator) {
                var activeCam = this.floormodel.getActiveCamera();
                var rotX = this.mouseX - activeCam.x;
                var rotY = this.mouseY - activeCam.y;
                var cursorAngle = Math.atan2(rotY, rotX) * 180/Math.PI;
                var step = activeCam.angle - cursorAngle;

                activeCam.mergeAngle = Utils.normalizeAngle(activeCam.mergeAngle - step);
                var initialAngle = Utils.normalizeAngle(activeCam.angle - activeCam.mergeAngle);
                activeCam.setAngle(initialAngle - step);

                this.fireRedraw();
            } else if (this.floormodel.activeCorner) {
                this.floormodel.activeCorner.move(this.mouseX, this.mouseY);
                if (!event.ctrlKey) this.floormodel.activeCorner.snapToAxis(this.snapTolerance);
                //this.floormodel.update();
            } else if (this.floormodel.activeDoor) {
                if (this.floormodel.activeDoor.startHovered) { //resize door by moving start bound
                    this.floormodel.activeDoor.move((this.view.rawMouseX - this.view.lastX) * this.view.cmPerPixel, (this.view.rawMouseY - this.view.lastY) * this.view.cmPerPixel, "start");
                    this.propsNav.update();
                } else if (this.floormodel.activeDoor.endHovered) { //resize door by moving end bound
                    this.floormodel.activeDoor.move((this.view.rawMouseX - this.view.lastX) * this.view.cmPerPixel, (this.view.rawMouseY - this.view.lastY) * this.view.cmPerPixel, "end");
                    this.propsNav.update();
                } else { //move door
                    this.floormodel.activeDoor.move((this.view.rawMouseX - this.view.lastX) * this.view.cmPerPixel, (this.view.rawMouseY - this.view.lastY) * this.view.cmPerPixel);
                }
                this.view.lastX = this.view.rawMouseX;
                this.view.lastY = this.view.rawMouseY;
            } else if (this.floormodel.activeCamera) {
                var room = this.floormodel.getRoomByName(this.floormodel.activeCamera.roomName);
                if (Utils.isPointInsidePolygon(this.mouseX, this.mouseY, room.corners)) {
                    this.floormodel.activeCamera.x = this.mouseX;
                    this.floormodel.activeCamera.y = this.mouseY;
                }
            } else if (this.floormodel.activeObject) { //embed object
                if (this.floormodel.activeObject.scaleHovered) {
                    this.floormodel.activeObject.scaleFromPoint(this.mouseX, this.mouseY);
                } else if (this.floormodel.activeObject.scaleXHovered) {
                    this.floormodel.activeObject.scaleXFromPoint(this.mouseX, this.mouseY);
                } else if (this.floormodel.activeObject.scaleYHovered) {
                    this.floormodel.activeObject.scaleYFromPoint(this.mouseX, this.mouseY);
                } else if (this.floormodel.activeObject.rotateHovered) {
                    this.floormodel.activeObject.rotateFromPoint(this.mouseX, this.mouseY);
                    if (!event.ctrlKey) this.floormodel.activeObject.snapAngle();
                } else { //move
                    this.floormodel.activeObject.moveBy((this.view.rawMouseX - this.view.lastX) * this.view.cmPerPixel, (this.view.rawMouseY - this.view.lastY) * this.view.cmPerPixel);
                    if (!event.ctrlKey) this.floormodel.activeObject.snapToWall(this.floormodel.rooms, this.snapToleranceObjects);
                }
                this.view.lastX = this.view.rawMouseX;
                this.view.lastY = this.view.rawMouseY;
            } else if (this.floormodel.activeLine) {
                this.floormodel.activeLine.relativeMove((this.view.rawMouseX - this.view.lastX) * this.view.cmPerPixel, (this.view.rawMouseY - this.view.lastY) * this.view.cmPerPixel);
                this.floormodel.activeLine.snapToAxis(this.snapTolerance);
                this.view.lastX = this.view.rawMouseX;
                this.view.lastY = this.view.rawMouseY;
            } else if (this.floormodel.activeWall) {
                this.floormodel.activeWall.relativeMove((this.view.rawMouseX - this.view.lastX) * this.view.cmPerPixel, (this.view.rawMouseY - this.view.lastY) * this.view.cmPerPixel);
                this.floormodel.activeWall.snapToAxis(this.snapTolerance);
                this.view.lastX = this.view.rawMouseX;
                this.view.lastY = this.view.rawMouseY;
            } else if (this.activeCompass) {
                var centerX = this.floormodel.compass.leftPadding + this.floormodel.compass.compassWidth / 2*this.view.pixelsPerCm;
                var centerY = this.canvasElement.height() - this.floormodel.compass.bottomPadding - this.floormodel.compass.compassHeight / 2 * this.view.pixelsPerCm;
                this.floormodel.compass.calcAngle(
                    this.view.lastX - centerX,
                    this.view.lastY - centerY,
                    this.view.rawMouseX - centerX,
                    this.view.rawMouseY - centerY
                );
            }
            this.view.draw();
        }
        //rotating around origin
        if (this.isInRotateMode() && this.mouseDown) {
            var angle = 0;
            if (this.rotateAngle !== false) {
                angle = Math.atan2(this.mouseY, this.mouseX) - this.rotateAngle;
            } else {
                angle = Math.atan2(this.mouseY, this.mouseX);
            }
            this.rotateAngle = Math.atan2(this.mouseY, this.mouseX);
            if (angle !== 0) this.floormodel.transform(angle);
            this.view.draw();
        }
        this.mouseMoved = false;
    };

    /* mouseup handler */
    this.mouseup = function () {
        this.mouseDown = false;
        this.floormodel.activeRoom = null;
        this.floormodel.activeRoomName = false;
        this.floormodel.activeCamera = null;
        this.floormodel.activeDimension = false;
        // drawing
        if (this.isInDrawMode() && !this.mouseMoved) {
            var node = new Corner(this.floormodel, this.targetX, this.targetY);
            if (this.lastNode != null) {
                var centerPointOfLine = this.drawnWall.save();

                if ((centerPointOfLine !== null && centerPointOfLine.mergeWithIntersected(true)) || this.drawnWall.hasIntersections()) {
                    this.drawnWall.build();
                    this.setMode(this.floormodel.modes.MOVE);
                }
            }
            this.lastNode = node;
        }
        if (this.mode === this.floormodel.modes.DRAWLINE) {
            if (this.lastNode) {
                this.floormodel.newLine(
                    this.lastNode,
                    new Dot(this.targetX, this.targetY)
                );
                this.lastNode = null;
            }
            else this.lastNode = new Dot(this.targetX, this.targetY);
        }
    };

    /* mouseleave handler */
    this.mouseleave = function () {
        this.mouseDown = false;
        this.floormodel.activeRoomName = false;
    };

    /* doubleclick handler */
    this.dblclick = function (event) {
        var scope = this;
        if (this.isInMoveMode()) {
            this.mouseX = (event.clientX - this.canvasElement.offset().left) * this.view.cmPerPixel + this.view.originX * this.view.cmPerPixel;
            this.mouseY = (event.clientY - this.canvasElement.offset().top) * this.view.cmPerPixel + this.view.originY * this.view.cmPerPixel;
            var hoverWall = this.floormodel.overlappedWall(this.mouseX, this.mouseY, 20);
            var popover;
            if (hoverWall != null) {
                var copy = Object.assign({}, this);
                hoverWall.divide(copy.mouseX, copy.mouseY, scope.floormodel);
                scope.floormodel.update();
                this.view.draw();
            }
        }
        if (this.isInDrawMode()) {
            this.drawnWall.build();
            scope.setMode(scope.floormodel.modes.MOVE);
        }
    };

    /* Wheel handler. Zoom in and out */
    this.handleScroll = function() {
        var scope = this;
        this.canvasElement.on("DOMMouseScroll mousewheel", function(event) {
            var bChanged = false, defaultScale = scope.view.scalePercentage;
            if( event.originalEvent.detail > 0 || event.originalEvent.wheelDelta < 0 ) { //alternative options for wheelData: wheelDeltaX & wheelDeltaY
                //scroll down
                if (scope.view.pixelsPerFoot > scope.view.pixelsPerFootRange[0]) {
                    scope.view.scalePercentage -= 25;
                    bChanged = true;
                }
            } else {
                //scroll up
                if (scope.view.pixelsPerFoot < scope.view.pixelsPerFootRange[1]) {
                    scope.view.scalePercentage += 25;
                    bChanged = true;
                }
            }

            if (bChanged) {
                var tempX = -scope.view.originX - scope.view.rawMouseX; //take diff
                var tempY = -scope.view.originY - scope.view.rawMouseY;
                tempX = tempX * scope.view.scalePercentage / defaultScale;
                tempY = tempY * scope.view.scalePercentage / defaultScale;
                scope.view.originX = -(tempX + scope.view.rawMouseX);
                scope.view.originY = -(tempY + scope.view.rawMouseY);

                scope.view.calculateProportions();
                scope.view.draw();
            }

            return false; //prevent page fom scrolling
        });
    };
    /* MOUSE EVENTS */

    /* escape btn handler */
    this.handleEscapeKey = function () {
        var scope = this;
        $(document).keyup(function (e) {
            if (e.keyCode === 27) {
                scope.setMode(scope.floormodel.modes.MOVE);
            }
        });
    };

    /* Rotating objects paralelly to random wall.
     */
    this.handleObjectsSmartRotating = function () {
        var scope = this, KEY_R = 82;
        $(document).keyup(function (e) {
            if (e.keyCode === KEY_R) { //R
                if (scope.floormodel.activeObject) {
                    scope.floormodel.activeObject.rotateToRandomRoomAngle(scope.floormodel.rooms);
                    scope.fireRedraw();
                }
                if (scope.isInRotateMode()) {
                    var arAngles = [];

                    //get all walls angles
                    for (var key in scope.floormodel.walls) {
                        arAngles.push(scope.floormodel.walls[key].angle());
                    }
                    arAngles.sort(function(a, b) {
                        return a - b;
                    });

                    //take next wall 360
                    var closenessTo90, closenessTo180, closenessTo270, overallCloseness, minValue = Infinity;
                    for (var key in arAngles) {
                        closenessTo90 = Math.abs(arAngles[key] - Math.PI / 2) || Infinity;
                        closenessTo180 = Math.abs(arAngles[key] - Math.PI) || Infinity;
                        closenessTo270 = Math.abs(arAngles[key] - 2 * Math.PI) || Infinity;
                        overallCloseness = Math.min(closenessTo90, closenessTo180, closenessTo270);
                        if (overallCloseness < minValue && overallCloseness > Math.PI / 180) {
                            minValue = overallCloseness;
                        }
                    }

                    scope.floormodel.transform(minValue);
                    scope.view.draw();
                }
            }
        });
    };

    /* Rotating active camera with {} keyboard buttons.
     */
    this.handleActiveCameraRotating = function () {
        var scope = this, initialAngle = null, KEY_OPEN_BRACKET = 219, KEY_CLOSE_BRACKET = 221;
        $(document).keyup(function (e) {
            var step = 5, smallStep = 1, activeCam = null;
            if (e.keyCode === KEY_OPEN_BRACKET) {
                if (activeCam = scope.floormodel.getActiveCamera()) {
                    activeCam.mergeAngle = Utils.normalizeAngle(activeCam.mergeAngle - (e.ctrlKey ? smallStep : step));
                    initialAngle = Utils.normalizeAngle(activeCam.angle - activeCam.mergeAngle);
                    activeCam.setAngle(initialAngle - (e.ctrlKey ? smallStep : step));
                    scope.fireRedraw();
                }
            } else if (e.keyCode === KEY_CLOSE_BRACKET) {
                if (activeCam = scope.floormodel.getActiveCamera()) {
                    activeCam.mergeAngle = Utils.normalizeAngle(activeCam.mergeAngle + (e.ctrlKey ? smallStep : step));
                    initialAngle = Utils.normalizeAngle(activeCam.angle - activeCam.mergeAngle);
                    activeCam.setAngle(initialAngle + (e.ctrlKey ? smallStep : step));
                    scope.fireRedraw();
                }
            }
        });
    };

    /* Scale floorplan objects, if "scale" param defined in url
     */
    this.handleScalingFromUrl = function () {
        if ("scale" in window.dataHandling.params && window.dataHandling.params.scale > 0) { //without #
            var scaleVal = parseFloat(window.dataHandling.params.scale);
            this.floormodel.scale(scaleVal);
        }
    };

    /* Move floorplan objects, if dislocateXdislocateY params defined in url
     */
    this.handleDislocatingFromUrl = function () {
        var scope = this;
        if ("dislocateX" in window.dataHandling.params && window.dataHandling.params.dislocateX.length > 0 &&
            "dislocateY" in window.dataHandling.params && window.dataHandling.params.dislocateY.length > 0) {
            setTimeout(function() { //todo replace setTimeout
                var dx = parseFloat(window.dataHandling.params.dislocateX);
                var dy = parseFloat(window.dataHandling.params.dislocateY);
                scope.floormodel.dislocate(dx, dy);
            }, 2000);
        }
    };

    /**
     * Controls cursor position. Sometimes in drawing mode when wall is snapped to 90deg, app will show snapped cursor position
     */
    this.updateCursorPosition = function (e) {
        if (this.isInDrawMode() || this.isInDrawLineMode()) {
            if (this.lastNode) {
                if (e && !e.ctrlKey) {
                    //snap to 15 degrees around
                    var DEGREE_RATIO = 15;
                    var DIVERGENCE = 5;
                    var point, snappedAngle;

                    var angle = Math.atan2(this.mouseY-this.lastNode.y, this.mouseX-this.lastNode.x);
                    if ( angle < 0 ) angle += 2 * Math.PI;
                    var a = angle * THREE.Math.RAD2DEG;

                    //snap to 15 degrees
                    if (a % DEGREE_RATIO < DIVERGENCE || a % DEGREE_RATIO > DEGREE_RATIO-DIVERGENCE) {
                        snappedAngle = Math.round(a/DEGREE_RATIO)*DEGREE_RATIO * THREE.Math.DEG2RAD;
                        point = Utils.pointPerpendicularToLine(
                            this.mouseX, this.mouseY,
                            this.lastNode.x, this.lastNode.y,
                            this.lastNode.x + Math.cos(snappedAngle), this.lastNode.y + Math.sin(snappedAngle)
                        );
                        this.targetX = point.x;
                        this.targetY = point.y;
                    } else {
                        this.targetX = this.mouseX;
                        this.targetY = this.mouseY;
                    }
                } else {
                    this.targetX = this.mouseX;
                    this.targetY = this.mouseY;
                }

                //calculate new line coordinates
                var drawShiftedToLeft = null;
                if (e && e.shiftKey) drawShiftedToLeft = true;
                if (e && e.altKey) drawShiftedToLeft = false;
                this.drawnWall.shift(this.lastNode, {x: this.targetX, y: this.targetY}, drawShiftedToLeft);
            } else {
                if (e && !e.ctrlKey) {
                    //also snap to wall
                    var mouseCorner = new Corner(this.floormodel, this.mouseX, this.mouseY), c, w, edge, arCorners;
                    if (c = mouseCorner.mergeWithCorner(true)) {
                        if (e && (e.altKey || e.shiftKey)) {
                            var arWalls = c.wallStarts.concat(c.wallEnds), min = Infinity, minCorner = null, dist, searchedCorner;
                            //watch out all wall
                            for (var index in arWalls) {
                                edge = arWalls[index].frontEdge || arWalls[index].backEdge;
                                for (var k in arCorners = edge.cornersWithoutCenters()) {
                                    searchedCorner = new Corner(null, arCorners[k].x, arCorners[k].y);
                                    if ((dist = searchedCorner.distanceFrom(this.mouseX, this.mouseY)) < min) {
                                        min = dist;
                                        minCorner = searchedCorner;
                                    }
                                }
                            }
                            if (minCorner !== null) {
                                this.targetX = minCorner.x;
                                this.targetY = minCorner.y;
                            }
                        } else {
                            this.targetX = c.x;
                            this.targetY = c.y;
                        }
                    } else if (w = mouseCorner.mergeWithWall(true)) {
                        if (edge = w.frontEdge || w.backEdge) {
                            var is = edge.getInteriorStart();
                            var ie = edge.getInteriorEnd();
                            var es = edge.getExteriorStart();
                            var ee = edge.getExteriorEnd();
                            var point1 = Utils.pointPerpendicularToLine(this.mouseX, this.mouseY, is.x, is.y, ie.x, ie.y);
                            var point2 = Utils.pointPerpendicularToLine(this.mouseX, this.mouseY, es.x, es.y, ee.x, ee.y);
                            var point1Corner = new Corner(null, point1.x, point1.y);
                            var point2Corner = new Corner(null, point2.x, point2.y);

                            if (point1Corner.distanceFrom(this.mouseX, this.mouseY) < point2Corner.distanceFrom(this.mouseX, this.mouseY)) {
                                point = point1Corner;
                            } else {
                                point = point2Corner;
                            }

                            this.targetX = point.x;
                            this.targetY = point.y;
                        } else {
                            this.targetX = this.mouseX;
                            this.targetY = this.mouseY;
                        }
                    }
                    else {
                        this.targetX = this.mouseX;
                        this.targetY = this.mouseY;
                    }
                } else {
                    this.targetX = this.mouseX;
                    this.targetY = this.mouseY;
                }
            }
        }
        else {
            this.targetX = this.mouseX;
            this.targetY = this.mouseY;
        }
        this.view.draw({targetX: this.targetX, targetY: this.targetY, lastNode: this.lastNode, drawnWall: this.drawnWall});
    };

    /* Set some object in selected state and show/close properties panel */
    this.setSelected = function(object) {
        if (object !== null) {
            this.floormodel.selectedObject = object;
            this.propsNav.selectedObject = object;
            this.propsNav.showSelectionPanel(object);
        } else {
            this.propsNav.closeSelectionPanel();
            this.floormodel.selectedObject = null;
        }
    };

    /* system can put color of walls from "color" get param. //todo refactor this if more params would be handled */
    this.handleColorFromUrl = function() {
        if ("color" in window.dataHandling.params && window.dataHandling.params.color.length === 6) { //without #
            this.imageView.edgeColor = "#" + window.dataHandling.params.color;
        }
    };

    /** handle window close */
    this.handleUnload = function() {
        $(window).on("beforeunload", function() {
            var hasModifications = true; //TODO
            if (hasModifications) return "Are you sure you want to leave?";
        });
    };

    /* Change cursor to eresize/sresize/seresize when mouse is over scale buttons */
    this.changeCursorsOnObjectHover = function(hoverObject) {
        if (hoverObject !== null) {
            this.view.changeCursor();
            if (hoverObject.scaleXHovered) {
                this.view.changeCursor("canvas_eresize");
            } else if (hoverObject.scaleYHovered) {
                this.view.changeCursor("canvas_sresize");
            } else if (hoverObject.scaleHovered) {
                this.view.changeCursor("canvas_seresize");
            }
        } else {
            this.view.changeCursor();
        }
    };

    /* Set mode
     * @param {number} mode One of the constants defined in floormodel.modes
     */
    this.setMode = function (mode) {
        this.floormodel.setMode(mode);
        this.lastNode = null;
        this.drawnWall = new DrawnWall(floormodel);
        this.mode = mode;
        this.modeChangeCallbacks.fire(mode);
        this.updateCursorPosition();
    };

    /**
     * Set length for drawn wall and save
     * @param {number}
     */
    this.setDrawnWallLength = function (length, shiftLeftOrRight) {
        if (this.lastNode && this.isInDrawMode()) {
            var angle = Math.atan2(this.targetY - this.lastNode.y, this.targetX - this.lastNode.x);
            if (angle < 0) angle += 2 * Math.PI;

            this.targetX = this.lastNode.x + Math.cos(angle) * length;
            this.targetY = this.lastNode.y + Math.sin(angle) * length;

            this.drawnWall.shift(
                this.lastNode, 
                {x: this.targetX, y: this.targetY},
                shiftLeftOrRight
            );

            this.view.draw({
                targetX: this.targetX,
                targetY: this.targetY, 
                lastNode: this.lastNode, 
                drawnWall: this.drawnWall
            });
            
            var node = new Corner(this.floormodel, this.targetX, this.targetY);
            
            if (this.lastNode != null) {
                var centerPointOfLine = this.drawnWall.save();

                if (
                    (centerPointOfLine !== null && centerPointOfLine.mergeWithIntersected(true)) || 
                    this.drawnWall.hasIntersections()
                ) {
                    this.drawnWall.build();
                    this.setMode(this.floormodel.modes.MOVE);
                }
            } else {
                this.drawnWall.save();
            }

            this.lastNode = node;
        }
    };

    /**
     * Watch input and run events
     * @param {object}
     */
    this.watchInput = function (data) {
        if (this.enabled) {
            switch (data.state) {
                case 'DOWN':
                    var key = parseInt(data.key.split('_')[1]);
    
                    if (!isNaN(key)) {
                        var measurementData = this.measurementValues.getMeasurementValueByNumber(key);
    
                        if (measurementData) {
                            data.event.preventDefault();
                            this.setDrawnWallLength(measurementData.lengths.raw, data.shift ? true : data.alt ? false : null);
                        }
                    }
                    break;
                case "UP":
                    switch (data.key) {
                        case "KEY_V": this.setMode(this.floormodel.modes.MOVE); break;
                        case "KEY_S": this.setMode(this.floormodel.modes.DRAW); break;
                        case "KEY_E": this.setMode(this.floormodel.modes.DELETE); break;
    
                        case "KEY_D": this.nav.addDelayedDoor(); break;
                        case "KEY_W": this.nav.addDelayedWindow(); break;
                        case "ESCAPE": if (this.nav.delayedDoorClick) this.nav.skipDelayed(); break;
                    }
                    break;
            }
        }
    };
};