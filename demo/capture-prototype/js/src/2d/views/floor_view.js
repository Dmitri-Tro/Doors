'use strict';
var FloorView = function (floormodel) {
        this.floormodel = floormodel;

        this.canvas = "floorview";
        this.canvasElement = document.getElementById(this.canvas);
        this.context = this.canvasElement.getContext('2d', {alpha: false});

        /* measurements */
        const cmPerFoot = 30.48;
        this.pixelsPerFootDefault = 15.0;
        this.pixelsPerFoot = this.pixelsPerFootDefault;
        this.scalePercentage = 100;
        this.pixelsPerFootRange = [5, 100];
        this.calculateProportions = function () {
            this.pixelsPerFoot = 15.0 * this.scalePercentage / 100;
            this.cmPerPixel = cmPerFoot * (1.0 / this.pixelsPerFoot);
            this.pixelsPerCm = 1.0 / this.cmPerPixel;
        };
        this.calculateProportions();

        this.units = {
            "METRIC": 1, //meters
            "IMPERIAL": 2, //feets 12"7'
            "IMPERIAL2": 3, //12.58ft
            "BOTH": 4
        };
        this.unitSystem = this.units.METRIC;

        // grid parameters
        this.gridSpacing = 15; // pixels
        this.gridWidth = 1;
        this.gridColor = "#f6f6f6";

        // room config
        this.roomColor = "#f9f9f9";
        this.roomColorBalcony = "#f9f6cf";

        // wall config
        this.wallColor = "#dddddd";
        this.wallColorHover = "#54a563";
        this.wallWidth = Wall.prototype.thicknesses.NORMAL;
        this.wallWidthHover = Wall.prototype.thicknesses.NORMAL + 2;
        this.wallThickWidth = Wall.prototype.thicknesses.THICK;
        this.wallThickWidthHover = Wall.prototype.thicknesses.THICK + 2;
        this.wallThinWidth = Wall.prototype.thicknesses.THIN;
        this.wallThinWidthHover = Wall.prototype.thicknesses.THIN + 2;
        this.edgeColor = "#888888";
        this.edgeColorHover = "#008cba";
        this.edgeWidth = 1;
        this.deleteColor = "#f0ad4e";
        this.lineColor = "#888888";

        // corner config
        this.cornerRadius = 3;
        this.cornerRadiusHover = 7;
        this.cornerColor = "#cbcbcb";
        this.cornerColorHover = "#65c178";

        /* origin */
        this.originX = 0;
        this.originY = 0;
        this.originColor = "#f0f0f0";
        this.originLineWidth = 1;
        this.originBoundary = 10000;

        /* ruler */
        this.rulerFontFamily = 'arial';
        this.rulerFontSize = '11px';
        this.rulerStrokeWidth = 1;
        this.rulerWidth = 200;
        this.rulerHeight = 20;
        this.rulerBgColor = "rgba(200,200,200,0.2)";
        this.rulerTextColor = "#999999";

        /* camera */
        this.cameraPathLength = 50;
        this.cameraPointRadius = 4;
        this.cameraColor = "#337ab7";
        this.cameraColorHighlighted = "#c10e18";

        /* door */
        this.doorColor = "#c2c2c2";
        this.doorWidth = 20;
        this.windowColor = "#a1b3ce";

        /* embeds */
        this.embedBoxWidth = 2 * this.pixelsPerCm;

        /* compass */
        this.compassLeftPadding = this.floormodel.compass.leftPadding;
        this.compassBottomPadding = this.floormodel.compass.bottomPadding;
        this.compassWidth = this.floormodel.compass.compassWidth;
        this.compassHeight = this.floormodel.compass.compassHeight;
        this.compassImg = new Image();
        this.compassImg.src = this.floormodel.compass.src;

        /* image overlay */
        this.overlayImg = new Image();

        /* measurements */
        this.measureColor = "#668866";
        this.measureColorAlt = "#cd0d8c";

        /** mouse position at last click */
        this.lastX = 0;
        this.lastY = 0;

        /* temporary mouse coords */
        this.rawMouseX = 0;
        this.rawMouseY = 0;

        /* store resources which are not cacheable in browser (base64 images, etc) */
        this.cachedImages = {};

        this.isIE = isIE(); //save to variable

        /** */
        this.draw = function (options) {
            var _this = this;
            this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            this.context.fillStyle = "rgba(255, 255, 255, 1)";
            this.context.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);

            /* grid layer */
            this.drawGrid();
            this.drawOrigin();
            if (this.floormodel.underlyingOverlay) this.drawUnderlyingLevel();

            /* objects layer */
            this.floormodel.getRooms().forEach(function (room) {
                _this.drawRoom(room);
            });
            this.floormodel.getWalls().forEach(function (wall) {
                if (!wall.orphan) _this.drawWall(wall);
            });
            this.floormodel.getWalls().forEach(function (wall) {
                if (wall.orphan) _this.drawWall(wall);
            });
            this.floormodel.getLines().forEach(function (line) {
                _this.drawLineObject(line);
            });
            this.floormodel.getCorners().forEach(function (corner) {
                _this.drawCorner(corner);
                //_this.drawLabel({x: corner.x, y: corner.y-20}, "("+parseInt(corner.x, 10)+";"+parseInt(corner.y, 10)+")");
            });
            this.floormodel.getDoors().forEach(function (door) {
                _this.drawDoor(door);
            });
            this.floormodel.getWindows().forEach(function (window) {
                _this.drawWindow(window);
            });
            this.floormodel.getEmbeds().forEach(function (embed) {
                _this.drawObject(embed);
            });
            this.floormodel.getCameras().forEach(function (camera) {
                _this.drawCamera(camera);
            });

            /* helpers layer */
            if (this.floormodel.overlay) this.drawBottomOverlay();
            this.drawRuler();
            this.drawCompass();
            this.drawCursor(options);
            this.drawWallLabels();
            this.drawRoomNames();

            this.drawRoomDimensions();
        };

        /* Draw central dimensions inside room
         */
        this.drawRoomDimensions = function () {
            var _this = this;
            var defaultCanvasScale = 15, fontSize = 14;

            this.floormodel.getRooms().forEach(function (room) {
                if (room.getPlacement().areDimensionsShown === true && _this.pixelsPerFoot >= defaultCanvasScale) {
                    var position = room.getRoomNamePosition();
                    var unitsPosition = {x: position.x, y: position.y + 32};
                    var metersPosition = {x: position.x, y: position.y + 64};
                    var dimensions = room.getDimensions();
                    var unitsFormatted = dimensions[0] + " x " + dimensions[1]; //TODO use prepareDimension();
                    var metersFormatted = "(" + dimensions[2] + " x " + dimensions[3] + ")";
                    if (_this.unitSystem === _this.units.METRIC) {
                        _this.drawLabel(metersPosition, metersFormatted, fontSize);
                    } else if (_this.unitSystem === _this.units.IMPERIAL || _this.unitSystem === _this.units.IMPERIAL2) {
                        _this.drawLabel(unitsPosition, unitsFormatted, fontSize);
                    } else { //BOTH
                        _this.drawLabel(unitsPosition, unitsFormatted, fontSize);
                        _this.drawLabel(metersPosition, metersFormatted, fontSize);
                    }

                    _this.drawLine(
                        _this.convertX(dimensions[4].x),
                        _this.convertY(dimensions[4].z),
                        _this.convertX(dimensions[5].x),
                        _this.convertY(dimensions[5].z),
                        1,
                        "rgba(0,0,0,1)"
                    );
                    _this.drawLine(
                        _this.convertX(dimensions[6].x),
                        _this.convertY(dimensions[6].z),
                        _this.convertX(dimensions[7].x),
                        _this.convertY(dimensions[7].z),
                        1,
                        "rgba(0,0,0,1)"
                    );

                    _this.drawArrow(dimensions[4].x, dimensions[4].z, dimensions[5].x, dimensions[5].z, 30);
                    _this.drawArrow(dimensions[5].x, dimensions[5].z, dimensions[4].x, dimensions[4].z, 30);
                    _this.drawArrow(dimensions[6].x, dimensions[6].z, dimensions[7].x, dimensions[7].z, 30);
                    _this.drawArrow(dimensions[7].x, dimensions[7].z, dimensions[6].x, dimensions[6].z, 30);
                }
            });
        };

        this.drawArrow = function (fromx, fromy, tox, toy, len) {
            var headlen = 15; //arrow side petal length
            var margin = 20; //its a value to move arrow from center of line, to look neat
            var angle = Math.atan2(this.convertY(toy) - this.convertY(fromy), this.convertX(tox) - this.convertX(fromx));
            var distance = Math.sqrt(Math.pow(tox - fromx, 2) + Math.pow(toy - fromy, 2));
            var lenPercentage = len / distance;
            var shiftedStartX = lenPercentage * fromx + (1 - lenPercentage) * tox;
            var shiftedStartY = lenPercentage * fromy + (1 - lenPercentage) * toy;
            var shiftedEndX = tox;
            var shiftedEndY = toy;

            //draw white background wrapper at first
            if (this.constructor.name === "ImageView") {
                this.context.strokeStyle = "#fff";
                this.context.lineWidth = 3;
                this.context.beginPath();
                this.context.moveTo(this.convertX(shiftedStartX), this.convertY(shiftedStartY));
                this.context.lineTo(this.convertX(shiftedEndX), this.convertY(shiftedEndY));
                this.context.lineTo(this.convertX(shiftedEndX - headlen * Math.cos(angle - Math.PI / 6)), this.convertY(shiftedEndY - headlen * Math.sin(angle - Math.PI / 6)));
                this.context.moveTo(this.convertX(shiftedEndX), this.convertY(shiftedEndY));
                this.context.lineTo(this.convertX(shiftedEndX - headlen * Math.cos(angle + Math.PI / 6)), this.convertY(shiftedEndY - headlen * Math.sin(angle + Math.PI / 6)));
                this.context.stroke();
            }

            //then draw arrow itself
            this.context.strokeStyle = "#000";
            this.context.lineWidth = 1;
            this.context.beginPath();
            this.context.moveTo(this.convertX(shiftedStartX), this.convertY(shiftedStartY));
            this.context.lineTo(this.convertX(shiftedEndX), this.convertY(shiftedEndY));
            this.context.lineTo(this.convertX(shiftedEndX - headlen * Math.cos(angle - Math.PI / 8)), this.convertY(shiftedEndY - headlen * Math.sin(angle - Math.PI / 8)));
            this.context.moveTo(this.convertX(shiftedEndX), this.convertY(shiftedEndY));
            this.context.lineTo(this.convertX(shiftedEndX - headlen * Math.cos(angle + Math.PI / 8)), this.convertY(shiftedEndY - headlen * Math.sin(angle + Math.PI / 8)));
            this.context.stroke();
        };

        /** */
        this.drawWall = function (wall) {
            var color = this.wallColor;
            var width = this.convertMeasure(this.wallWidth);
            if (wall.bearing === wall.modes.THICK) width = this.convertMeasure(this.wallThickWidth);
            if (wall.bearing === wall.modes.THIN || wall.bearing === wall.modes.INVISIBLE) width = this.convertMeasure(this.wallThinWidth);
            if (wall.frontEdge) {
                this.drawEdge(wall.frontEdge, false, wall.bearing === wall.modes.INVISIBLE);
            }
            if (wall.backEdge) {
                this.drawEdge(wall.backEdge, false, wall.bearing === wall.modes.INVISIBLE);
            }

            if (wall.bearing === wall.modes.INVISIBLE) {
                this.context.setLineDash([5, 10]);
                this.drawLine(
                    this.convertX(wall.getStartX()),
                    this.convertY(wall.getStartY()),
                    this.convertX(wall.getEndX()),
                    this.convertY(wall.getEndY()),
                    width,
                    this.roomColor
                );
                this.context.setLineDash([]);
            }
        };

        this.drawEdge = function (edge, hover, empty) {
            var _this = this;
            var color = this.edgeColor;
            if (hover && this.floormodel.mode == this.floormodel.modes.DELETE) {
                color = this.deleteColor;
            } else if (hover) {
                color = this.edgeColorHover;
            }

            //wall body
            var corners = edge.corners(), cornersX = [], cornersY = [];
            for (var key in corners) {
                cornersX.push(_this.convertX(corners[key].x));
                cornersY.push(_this.convertY(corners[key].y));
            }
            this.drawPolygon(
                cornersX,
                cornersY,
                true,
                this.wallColor,
                false
            );

            //wall bound
            var inters = edge.getInteriorCorners(), exters = edge.getExteriorCorners();
            for (var key in inters) {
                if (inters[+key + 1]) this.drawLine(
                    this.convertX(inters[+key].x),
                    this.convertY(inters[+key].y),
                    this.convertX(inters[+key + 1].x),
                    this.convertY(inters[+key + 1].y),
                    1,
                    color
                );
            }
            if (!(edge.wall.backEdge && edge.wall.frontEdge)) {
                for (var key in exters) {
                    if (exters[+key + 1]) this.drawLine(
                        this.convertX(exters[+key].x),
                        this.convertY(exters[+key].y),
                        this.convertX(exters[+key + 1].x),
                        this.convertY(exters[+key + 1].y),
                        1,
                        color
                    );
                }
            }
        };

        this.drawLineObject = function (line) {
            this.context.lineCap = "round";
            this.drawLine(
                this.convertX(line.getStart().x),
                this.convertY(line.getStart().y),
                this.convertX(line.getEnd().x),
                this.convertY(line.getEnd().y),
                5,
                this.lineColor
            );
            this.context.lineCap = "butt"; //default
        };

        this.drawRoom = function (room) {
            var _this = this;
            var placement = room.getPlacement();
            this.drawPolygon(
                $.map(room.corners, function (corner) {
                    return _this.convertX(corner.x);
                }),
                $.map(room.corners, function (corner) {
                    return _this.convertY(corner.y);
                }),
                true,
                (!placement || placement.isUsualRoom() ? this.roomColor : this.roomColorBalcony)
            );
        };

        this.drawRoomNames = function () {
            var _this = this;
            this.floormodel.getRooms().forEach(function (room) {
                if (room.getVisibleName()) {
                    var position = room.getRoomNamePosition();
                    _this.drawLabel(position, room.getVisibleName(), 14);
                }

                if (room === _this.floormodel.activeRoom) _this.drawRoomMeasurements(room);
            });
        };

        /* draw walls measurements and room's inline. only for active room */
        this.drawRoomMeasurements = function (room) {
            var edge = room.edgePointer;
            while (true) {
                var w = edge.wall;
                var c = w.getCenter();
                var start = edge.getInteriorStart();
                var end = edge.getInteriorEnd();
                this.drawLine(
                    this.convertX(start.x),
                    this.convertY(start.y),
                    this.convertX(end.x),
                    this.convertY(end.y),
                    2,
                    this.measureColor
                );
                this.drawLabel(c, this.prepareDimension(edge.interiorDistance()), 13, "#567956");

                if (edge.next === room.edgePointer) {
                    break;
                } else {
                    edge = edge.next;
                }
            }
        };

        this.drawCamera = function (camera) {
            if (camera) {
                if (camera.isActive) {
                    var xArr = [-this.cameraPointRadius * 2, -this.cameraPointRadius - this.cameraPathLength, this.cameraPointRadius + this.cameraPathLength, this.cameraPointRadius * 2];
                    var yArr = [0, this.cameraPathLength, this.cameraPathLength, 0];

                    this.context.strokeWidth = 0;
                    this.context.save(); //rotating
                    this.context.translate(this.convertX(camera.x), this.convertY(camera.y));
                    this.context.rotate((camera.angle - 90) * Math.PI / 180); //-90 because by default camera looks down
                    var gradient = "rgba(51, 122, 183, 0.5)";
                    this.drawPolygon(
                        xArr,
                        yArr,
                        true,
                        gradient,
                        false
                    );
                    this.context.restore();

                    var indicator = camera.getIndicatorPoint();
                    this.drawLine(this.convertX(camera.x), this.convertY(camera.y), this.convertX(indicator.x), this.convertY(indicator.y), 1, gradient);
                    this.drawCircle(this.convertX(indicator.x), this.convertY(indicator.y), this.cameraPointRadius,
                        camera.indicatorHighlighted ? this.cameraColorHighlighted : this.cameraColor);
                }
                this.drawCircle(this.convertX(camera.x), this.convertY(camera.y), this.cameraPointRadius * 2, camera.highlighted ? this.cameraColorHighlighted : this.cameraColor);
            }
        };

        this.drawRuler = function () {
            var paddingRight = 85;
            var paddingBottom = 26;
            var rulerPositionX = this.canvasElement.width - this.rulerWidth - paddingRight;
            var rulerPositionY = this.canvasElement.height - this.rulerHeight - paddingBottom;
            var bgHeight = this.rulerHeight + 10;
            var bgStart = rulerPositionX - 5;
            var bgEnd = rulerPositionX + this.rulerWidth + 5;

            this.drawLine(bgStart, rulerPositionY + this.rulerHeight / 2, bgEnd, rulerPositionY + this.rulerHeight / 2, bgHeight, this.rulerBgColor);

            this.context.strokeStyle = this.rulerTextColor;
            this.context.fillStyle = this.rulerTextColor;
            this.context.textBaseline = "alphabetic";
            this.context.textAlign = "left";
            this.context.font = this.rulerFontSize + ' ' + this.rulerFontFamily;
            this.context.lineWidth = this.rulerStrokeWidth;
            this.context.beginPath();
            this.context.moveTo(200, 200);

            var pointLength = 0,
                label = '',
                delta = 0,
                draw = false,
                lineLengthMax = 0,
                lineLengthMed = this.rulerHeight / 4,
                lineLengthMin = this.rulerHeight / 1.7,
                longLineDefaultStep = 100, longLineStep = 100,
                middleLineDefaultStep = 50, middleLineStep = 50,
                shortLineDefaultStep = 10, shortLineStep = 10;

            if (shortLineDefaultStep * this.pixelsPerCm < 2) { //on small zoom improve ruler's usability
                longLineStep = 400;
                middleLineStep = 200;
                shortLineStep = 40;
            } else if (shortLineDefaultStep * this.pixelsPerCm < 4) { //if step is too narrow
                longLineStep = 200;
                middleLineStep = 100;
                shortLineStep = 20;
            }

            //this.pixelsPerCm
            for (var pos = 0; pos < (this.rulerWidth * this.cmPerPixel); pos += 1) {
                delta = pos;
                draw = false;
                label = '';

                if (delta % longLineStep === 0) {
                    pointLength = lineLengthMax;
                    if (delta !== Math.floor(this.rulerWidth * this.cmPerPixel / 100) * 100) label = Math.round(Math.abs(delta) / 100) + "m"; //do not render last
                    draw = true;
                } else if (delta % middleLineStep === 0) {
                    pointLength = lineLengthMed;
                    draw = true;
                } else if (delta % shortLineStep === 0) {
                    pointLength = lineLengthMin;
                    draw = true;
                }
                if (draw) {
                    this.context.moveTo(pos * this.pixelsPerCm + rulerPositionX + 0.5, this.rulerHeight + rulerPositionY + 0.5);
                    this.context.lineTo(pos * this.pixelsPerCm + rulerPositionX + 0.5, pointLength + rulerPositionY + 0.5);
                    this.context.fillText(label, pos * this.pixelsPerCm + rulerPositionX + 1.5, (this.rulerHeight / 2) + rulerPositionY - 2);
                }
            }
            this.context.stroke();
        };

        this.drawCompass = function () {
            var angle = 0;
            if (this.floormodel.compass) angle = this.floormodel.compass.angle;

            var scope = this;

            function drawWithRotate() {
                scope.context.save();
                scope.context.translate(
                    scope.compassLeftPadding + scope.compassWidth / 2,
                    scope.canvasElement.height - scope.compassBottomPadding - scope.compassHeight / 2
                );
                scope.context.rotate(angle * Math.PI / 180);
                scope.context.drawImage(scope.compassImg, -scope.compassHeight / 2, -scope.compassWidth / 2);
                scope.context.restore();
            }

            if (this.compassImg.complete) {
                drawWithRotate();
            } else {
                this.compassImg.onload = drawWithRotate;
            }
        };

        this.drawDoor = function (door) {

            const color = 'rgba(191,126,122,0.75)'
            const _this = this
            let iconStartX
            let iconStartY
            // угол 0 и стандартная ширина = 80
            // const imageData = JSON.parse(`[{"doorType": "slider"},{"translatedPath":[[9164.494145405783,683.4355587002551],[0,683.4355587002561],[0,1.1152464570742395e-12],[9164.494145405783,0],[9164.494145405783,683.4355587002551]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{}}},{"translatedPath":[[9105.298939534108,629.6217351805499],[57.40141175435346,629.6217351805511],[57.40141175435346,53.81382351970628],[9105.298939534108,53.813823519705174],[9105.298939534108,629.6217351805499]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{}}},{"translatedPath":[[8195.845322051091,629.62173518055],[966.85502923737,629.6217351805509],[966.85502923737,53.813823519706204],[8195.845322051091,53.813823519705245],[8195.845322051091,629.62173518055]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{}}},{"translatedPath":[[14099.22176216274,1472.7049703225973],[4934.727616756958,1472.7049703225982],[4934.727616756958,789.2694116223431],[14099.22176216274,789.2694116223421],[14099.22176216274,1472.7049703225973]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{},"8":{}}},{"translatedPath":[[14040.026556291064,1418.8911468028923],[4992.129028511312,1418.8911468028932],[4992.129028511312,843.0832351420485],[14040.026556291064,843.0832351420474],[14040.026556291064,1418.8911468028923]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{},"8":{}}},{"translatedPath":[[13130.572938808049,1418.8911468028923],[5901.58264599433,1418.8911468028932],[5901.58264599433,843.0832351420484],[13130.572938808049,843.0832351420476],[13130.572938808049,1418.8911468028923]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{},"8":{}}}]`);
            // const imageData = JSON.parse(`[{"doorType": "typeWithPath"},{"translatedPath":[[85.73695681703651,27.23716583241141],[85.45540295156829,26.925173711216907,84.97346390256865,26.90234501942219,84.66147178137415,27.183898884890397],[84.34947966017964,27.465452750358615,84.32665096838491,27.947391799358257,84.60820483385312,28.25938392055276],[85.02926737140018,28.72356732037873,85.44779338763672,29.197896805446803,85.85617331863115,29.669689769204346],[86.0058280759521,29.844709739630535,86.21889586603615,29.93348798549889,86.4319636561202,29.93348798549889],[86.60698362654638,29.93348798549889,86.78454011828309,29.872611474046305,86.92912183298299,29.748321929830603],[87.24618699679854,29.47437762829396,87.28169829514589,28.99243857929432,87.00775399360924,28.675373415478767],[86.59176449868325,28.195970887789645,86.16562891851514,27.711495317479482,85.73695681703651,27.23716583241141],[85.73695681703651,27.23716583241141]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[94.71624225629303,39.222229024639375],[94.4955649022774,38.86457951985543,94.0288449811409,38.75043606088183,93.66865895504644,38.97111341489746],[93.31100945026247,39.19179076891309,93.19686599128889,39.65851069004958,93.41754334530451,40.01869671614405],[94.02377193851984,41.010476548559105,94.61731792518258,42.027621594079406,95.17788913480847,43.042230118289176],[95.31739780688731,43.29334572803109,95.57612298056081,43.43539092142046,95.84499423947639,43.43539092142046],[95.96928378369209,43.43539092142046,96.09610984921832,43.404952665694175,96.21278982950244,43.339003111620535],[96.58058541952848,43.13608140677858,96.71502104898629,42.67189800695261,96.5095628228338,42.30410241692657],[95.93630900665528,41.269201722232594,95.33261693475046,40.2317645062281,94.7137057349825,39.222229024639375],[94.71624225629303,39.222229024639375]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[99.51534057580524,48.32580400811158],[99.24900583820019,47.727184978827815,98.9699884940425,47.123492906923,98.68589810726377,46.532483441570804],[98.50580509421651,46.15200524499214,98.05176777963267,45.992204402429095,97.671289583054,46.17229741547633],[97.29081138647533,46.35239042852356,97.13101054391228,46.80642774310744,97.31110355695951,47.186905939686106],[97.58758437980669,47.7677693197962,97.86152868134333,48.358778785148395,98.12532689763785,48.94725172919006],[98.33839468772189,49.42665425687919,98.54638943518492,49.90352026325778,98.74677461871633,50.37784974832585],[98.86852764162153,50.667013177725636,99.15261802840027,50.84203314815182,99.4468545004211,50.84203314815182],[99.54577883153154,50.84203314815182,99.64723968395252,50.82174097766762,99.74362749375244,50.78115663669924],[100.13171525426267,50.61628275151515,100.31180826730991,50.16985500086285,100.1469343821258,49.78430376166313],[99.94147615597333,49.29982819135296,99.73094488719983,48.81281609973227,99.51280405449471,48.325804008111575],[99.51534057580524,48.32580400811158]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[90.00845870395966,32.3634754009813],[89.7522700515967,32.02865458799207,89.27540404521811,31.965241555228967,88.94058323222887,32.22143020759193],[88.60576241923964,32.4776188599549,88.54234938647653,32.954484866333495,88.7985380388395,33.289305679322716],[89.50369096316528,34.21259943635362,90.19869780224899,35.16125840648975,90.86326638560638,36.11499041924694],[91.0103846216168,36.328058209331,91.2488176248061,36.43966514699407,91.4872506279954,36.43966514699407],[91.63690538531633,36.43966514699407,91.7890966639478,36.39400776340463,91.92099577209507,36.30269299622575],[92.2659626703264,36.06172347172593,92.3496678735737,35.58739398665786,92.10869834907388,35.24242708842654],[91.43144715916385,34.27093942649568,90.72375771352753,33.30452480718587,90.0033856613386,32.3634754009813],[90.00845870395966,32.3634754009813]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[104.99676312784858,65.67560977209874],[104.77101273121188,64.51134649056802,104.51482407884893,63.33947364510573,104.23834325600177,62.19042949143815],[104.13941892489132,61.78204956044372,103.72850247258634,61.5309339507018,103.32012254159189,61.629858281812254],[102.91174261059749,61.7287826129227,102.66062700085553,62.13969906522767,102.75955133196602,62.548078996222095],[103.03095911219211,63.67429445809495,103.28207472193405,64.82587513307304,103.50275207594966,65.96730972280903],[103.57377467264436,66.33003227021403,103.89083983645989,66.58368440126648,104.24848934124385,66.58368440126648],[104.29668324614381,66.58368440126648,104.34487715104378,66.57861135864543,104.39560757725427,66.56846527340333],[104.80906055086976,66.48729659146656,105.07793180978533,66.08906274571422,104.99676312784858,65.67560977209872],[104.99676312784858,65.67560977209874]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[102.98783824991318,57.601862440699456],[102.64287135168188,56.470573936205554,102.26746619772425,55.32913934646956,101.87176887328245,54.21560649114933],[101.7322602012036,53.81990916670752,101.29597853579341,53.61191441924452,100.90028121135161,53.75142309132335],[100.50458388690977,53.8909317634022,100.29658913944678,54.32721342881241,100.43609781152563,54.72291075325422],[100.82418557203586,55.81615143809025,101.19198116206192,56.934757336031524,101.53187501767219,58.04575367004123],[101.63079934878263,58.372964919098884,101.93264538473503,58.58603270918294,102.2598566337927,58.58603270918294],[102.33341575179792,58.58603270918294,102.4069748698031,58.57588662394084,102.48307050911885,58.55305793214612],[102.8838408761817,58.43130490924094,103.1121277941289,58.00516932907284,102.99037477122376,57.604398962009974],[102.98783824991318,57.601862440699456]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[105.47616565553768,74.73606389329201],[105.89469167177418,74.69801607363415,106.20414727165819,74.32768396229758,106.16609945200031,73.90915794606106],[106.0595655569583,72.72967553666719,105.92512992750049,71.53751052072072,105.767865606248,70.36563767525841],[105.71206213741647,69.94964818033242,105.32904741952727,69.65794822962211,104.91305792460126,69.71375169845365],[104.49706842967524,69.76955516728518,104.20536847896493,70.15256988517436,104.26117194779647,70.56855938010038],[104.4158997477385,71.71760353376794,104.54779885588573,72.88947637923025,104.65179622961726,74.04613009682939],[104.68730752796458,74.44182742127119,105.01959181964327,74.73860041460254,105.40767958015356,74.73860041460254],[105.43050827194824,74.73860041460254,105.45333696374298,74.73860041460254,105.47616565553768,74.73606389329203],[105.47616565553768,74.73606389329201]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[106.45272636008957,78.55606498694182],[106.44004375353697,78.13500244939476,106.09000381268461,77.80525467902659,105.66894127513754,77.82047380688974],[105.24787873759048,77.83315641344235,104.9181309672223,78.18573287560525,104.93081357377491,78.6042588918418],[104.95110574425914,79.2282431342308,104.96125182950122,79.8623734618619,104.96632487212227,80.48889422556144],[104.96886139343279,80.90742024179798,105.30875524904306,81.24477757609773,105.7272812652796,81.24477757609773],[105.7272812652796,81.24477757609773,105.73235430790064,81.24477757609773,105.73235430790064,81.24477757609773],[106.15341684544771,81.2422410547872,106.49077417974745,80.89727415655587,106.48823765843693,80.47874814031934],[106.48316461581588,79.83954477006718,106.47048200926328,79.19526835719398,106.45018983877905,78.55860150825235],[106.45272636008957,78.55606498694182]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[76.90732613510094,31.262625152213694],[76.85405918757992,31.204285162071635,76.76528094171157,31.196675598140057,76.7069409515695,31.24994254566107],[75.70247851260183,32.155480653518296],[74.63460304087104,30.96838868019286],[74.55597088024479,30.879610434324505,74.42153525078699,30.872000870392935,74.33529352622915,30.948096509708662],[73.59970234617707,31.610128571755542],[74.81215953260775,32.95702138764402],[73.80769709364007,33.86255949550124],[73.74935710349801,33.91328992171173,73.74682058218748,34.00460468889061,73.80008752970849,34.06294467903267],[74.12222573614511,34.42059418381662],[77.23200086284807,31.620274656997637],[76.90986265641145,31.262625152213694],[76.90732613510094,31.262625152213694]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[73.5972564235685,31.60862858709419],[74.34914439441964,32.443684777271],[67.96087028943269,38.19571261748441],[67.87227516316112,38.27548402748442,67.73614902745217,38.26834995900953,67.65637761745216,38.17975483273795],[67.19472179787765,37.667034101974764],[67.11495038787764,37.578438975703186,67.12208445635252,37.44231283999424,67.21067958262411,37.36254142999423],[73.59895368761106,31.610513589780822],[73.59895368761106,31.610513589780822],[73.5972564235685,31.60862858709419]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{}}},{"translatedPath":[[80.41279858624571,35.1561853638687],[80.46606553376674,35.21452535401077,80.46352901245619,35.305840121189654,80.40518902231415,35.35657054740014],[79.40072658334647,36.26210865525736],[80.46860205507726,37.449200628582794],[80.54723421570351,37.537978874451156,80.54216117308246,37.67241450390895,80.45591944852463,37.7510466645352],[79.72032826847254,38.413078726582086],[78.50787108204186,37.066185910693605],[77.50340864307418,37.97172401855083],[77.44506865293212,38.022454444761316,77.35629040706375,38.017381402140266,77.30302345954274,37.95904141199821],[76.98088525310615,37.601391907214264],[80.0906603798091,34.80107238039528],[80.41279858624571,35.158721885179226],[80.41279858624571,35.1561853638687]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[73.02768972810674,44.14810011166053],[72.5660339085322,43.63537938089735],[72.4862624985322,43.54678425462577,72.4933965670071,43.41065811891683,72.58199169327868,43.33088670891682],[78.97026579826563,37.57885886870341],[79.72215376911677,38.41391505888022],[73.33387966412982,44.16594289909363],[73.24528453785824,44.245714309093636,73.10915840214929,44.238580240618745,73.02938699214928,44.149985114347174],[73.02768972810674,44.14810011166053]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{}}},{"translatedPath":[[84.54304472133265,25.808905885455246],[86.63237675771586,28.12934419269601],[28.66928253344983,81.09435097575827],[25.766775949542126,78.73129599631227],[83.72987017380817,25.766289213249994]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{},"8":{},"9":{},"10":{},"11":{}}}]`);
            const imageData = JSON.parse(`[{"doorType": "typeNew"},{"translatedPath":[[0,16.357162978224444],[160.70912626105513,16.357162978224444],[160.70912626105513,20.446453722780554],[0,20.446453722780554],[0,16.357162978224444]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{}}},{"translatedPath":[[78.30991775824953,0],[82.39920850280564,0],[82.39920850280564,36.803616701005],[78.30991775824953,36.803616701005],[78.30991775824953,0]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{}}}]`);
            // const imageData = JSON.parse(`[{"doorType": "typeNewWithPath"},{"translatedPath":[[411.8542882133645,79.99269639839625],[2574.9000381213496,446.44572449375204,4172.592001321751,2192.232274269562,4172.592001321751,4248.260768185099],[4249.34175056886,4248.260768185099],[4248.260768185098,2150.07396130284,2618.139333471834,367.5340104791179,411.8542882133645,0],[411.8542882133645,79.99269639839625]],"pathAttributes":{"0":{},"1":{},"2":{}}},{"translatedPath":[[410.77330582960246,0],[410.77330582960246,4248.260768185098],[-1.0809823837618964,4248.260768185098],[-1.0809823837618964,0],[410.77330582960246,0]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{}}},{"translatedPath":[[378.343834316739,27.02455959405279],[378.343834316739,4221.236208591045],[31.34848912910114,4221.236208591045],[31.34848912910114,27.02455959405279],[378.343834316739,27.02455959405279]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{}}},{"translatedPath":[[378.343834316739,448.6076892612765],[378.343834316739,3799.653078923822],[31.34848912910114,3799.653078923822],[31.34848912910114,448.6076892612765],[378.343834316739,448.6076892612765]],"pathAttributes":{"0":{},"1":{},"2":{},"3":{},"4":{},"5":{},"6":{},"7":{}}}]`);
            const koef = door.length / 80;
            const path = [...imageData.slice(1)];
            let centreX;
            let centreY;

            if (door.type === door.TYPE_SLIDING) {
                if (imageData[0].doorType === "slider") {
                    // Если в JSON пришло изображение двери с типом slider, то:
                    // Создаем геттеры для определения переменных, которыми будем пользоваться в вычислениях:
                    function getSliderDoorPointMinCoordX() { // Координата Х точки наиболее удаленной от центра дверного проема влево
                        return path[0].translatedPath[1][0]
                    }

                    function getSliderDoorPointMaxCoordX() { // Координата Х точки наиболее удаленной от центра дверного проема вправо
                        return path[3].translatedPath[0][0]
                    }

                    function getSliderDoorPointMinCoordY() { // Координата Y точки наиболее близкой к внешней стороне стены ()
                        return path[0].translatedPath[3][1]
                    }

                    //Определяем коэффициент масштабирования, так как SVG может быть нарисован не в масштабе
                    const scaleKoef = 80 / (getSliderDoorPointMaxCoordX() - getSliderDoorPointMinCoordX());
                    // Настраиваем начальные координаты элементов двери
                    path.forEach(el => {
                        el.translatedPath = el.translatedPath.map(path => {
                            return path.map(coord => coord * scaleKoef)
                        });
                    });

                    // Меняем координаты при изменении ширины дверного проема
                    if (door.length !== 80) {
                        path.forEach(el => {
                            el.translatedPath.forEach(coordList => {
                                for (let i = 0; i < coordList.length; i++) {
                                    if (i % 2 === 0) {
                                        coordList[i] *= koef;
                                    } else {
                                        coordList[i] = coordList[i];
                                    }
                                }
                            });
                        });
                    }
                    // для совмещения точек svg иконки и точек на канвасе (начало и конец дверного проема)
                    centreX = getSliderDoorPointMinCoordX() + (getSliderDoorPointMaxCoordX() - getSliderDoorPointMinCoordX()) / 2;
                    centreY = getSliderDoorPointMinCoordY() + this.wallWidth / 2;
                } else {
                    // Если выбрали дверь типа slider, но в JSON изображение почему-то не пришло, то вставляем старый вариант как заглушку
                    this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                    this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);
                    var center = door.getCenter(), gap = (this.doorWidth + 2) / 2;
                    var a = new THREE.Vector2(door.x1, door.y1);
                    var b = new THREE.Vector2(door.x2, door.y2);
                    var c = new THREE.Vector2(center.x, center.y);

                    var empty = new THREE.Vector2();
                    var empty2 = new THREE.Vector2();
                    var d = empty.subVectors(c, a).multiplyScalar(1 - (gap / empty.length())).add(a);
                    var e = empty2.clone().subVectors(d, c).rotateAround({x: 0, y: 0}, -Math.PI / 2).add(c);
                    var f = empty2.subVectors(c, a).multiplyScalar(gap / empty2.length()).rotateAround({
                        x: 0,
                        y: 0
                    }, Math.PI / 2).add(a);

                    var xArr = [this.convertX(a.x), this.convertX(d.x), this.convertX(e.x), this.convertX(f.x)];
                    var yArr = [this.convertY(a.y), this.convertY(d.y), this.convertY(e.y), this.convertY(f.y)];
                    this.drawPolygon(
                        xArr,
                        yArr,
                        true,
                        this.roomColor,
                        true,
                        this.edgeColor,
                        1
                    );

                    var empty3 = new THREE.Vector2();
                    var empty4 = new THREE.Vector2();
                    var g = empty3.subVectors(c, b).multiplyScalar(1 - (gap / empty3.length())).add(b);
                    var h = empty4.clone().subVectors(g, c).rotateAround({x: 0, y: 0}, -Math.PI / 2).add(c);
                    var i = empty4.subVectors(c, b).multiplyScalar(gap / empty4.length()).rotateAround({
                        x: 0,
                        y: 0
                    }, Math.PI / 2).add(b);

                    xArr = [this.convertX(b.x), this.convertX(g.x), this.convertX(h.x), this.convertX(i.x)];
                    yArr = [this.convertY(b.y), this.convertY(g.y), this.convertY(h.y), this.convertY(i.y)];
                    this.drawPolygon(
                        xArr,
                        yArr,
                        true,
                        this.roomColor,
                        true,
                        this.edgeColor,
                        1
                    );
                }
            } else if (door.type === door.TYPE_WITH_PATH) {
                if (imageData[0].doorType === "typeWithPath") {
                    // Если в JSON пришло изображение двери с типом typeWithPath, то:
                    // Устраняем погрешности SVG изображения
                    path[12].translatedPath[2][0] = 28.75; // здесь исправляем погрешность именно этой SVG, поэтому хардкодим
                    path[12].translatedPath[2][1] = path[7].translatedPath[5][1]; // здесь тоже исправляем погрешность именно этой SVG

                    // Создаем геттеры для определения переменных, которыми будем пользоваться в вычислениях:
                    //Для точек траектории открывания двери
                    function getPathTrajectoryPointMaxCoordX() { // Координата Х самой удаленной от оси вращения двери точки самого нижнего штриха траектории
                        return path[7].translatedPath[5][0];
                    }

                    function getPathTrajectoryPointMaxCoordY() { // Координата Y самой удаленной от оси вращения двери точки самого нижнего штриха траектории
                        return path[7].translatedPath[5][1];
                    }

                    // Для точек двери
                    function getPathDoorRotationPointCoordX() { // Координата Х точки вращения двери
                        return path[12].translatedPath[2][0];
                    }

                    function getPathDoorRotationPointCoordY() { // Координата Y точки вращения двери
                        return path[12].translatedPath[2][1];
                    }

                    function getPathDoorSecondPointRotationCoordX() { // Координата Х второй точки вращения двери (радиуса)
                        return path[12].translatedPath[1][0];
                    }

                    function getPathDoorSecondPointRotationCoordY() { // Координата Y второй точки вращения двери (радиуса)
                        return path[12].translatedPath[1][1];
                    }

                    function getPathDoorPointMinCoordX() { // Координата Х самой крайней точки двери по оси Х. Отрезок от точки вращения до этой точки и есть ширина двери
                        return path[12].translatedPath[3][0];
                    }

                    function getPathDoorPointMinCoordY() { // Координата Y самой крайней точки двери по оси Х. Отрезок от точки вращения до этой точки и есть ширина двери
                        return path[12].translatedPath[3][1];
                    }

                    //Начальные координаты этой же точки
                    let initialPathDoorPointMinCoordX = path[12].translatedPath[3][0];
                    let initialPathDoorPointMinCoordY = path[12].translatedPath[3][1];

                    function getPathDoorOuterPointMaxCoordX() { // Координата Х точки внешней стороны двери наиболее удаленной от оси вращения.
                        return path[12].translatedPath[4][0];
                    }

                    function getPathDoorOuterPointMaxCoordY() { // Координата Y точки внешней стороны двери наиболее удаленной от оси вращения.
                        return path[12].translatedPath[4][1];
                    }

                    function getPathDoorFlangePointCoordX() { // Координата Х точки в дальнем от оси вращения торце двери.
                        return path[12].translatedPath[0][0];
                    }

                    function getPathDoorFlangePointCoordY() { // Координата Y точки в дальнем от оси вращения торце двери.
                        return path[12].translatedPath[0][1];
                    }

                    // Создаем сеттер для переопределения координат точек самой двери
                    function setDoorPath(newPath) {
                        path[12].translatedPath = newPath; // Указываем блок с координатами самой двери
                    }

                    // Определяем ширину, при которой толщина перестает меняться
                    const stopScaleWidth = 150;

                    //Определяем коэффициент масштабирования, так как SVG может быть нарисован не в масштабе
                    const scaleKoef = 80 / (getPathTrajectoryPointMaxCoordX() - getPathDoorPointMinCoordX());
                    //Меняем координаты в соответствии с масштабом
                    path.forEach(el => {
                        el.translatedPath = el.translatedPath.map(path => {
                            return path.map(coord => coord * scaleKoef)
                        });
                    });
                    // Переопределяем начальные координаты
                    initialPathDoorPointMinCoordX = initialPathDoorPointMinCoordX * scaleKoef;
                    initialPathDoorPointMinCoordY = initialPathDoorPointMinCoordY * scaleKoef;

                    // Угол открытой двери (угол смещения координат точек двери)
                    const doorScaleAngle = 90 - Math.atan((getPathDoorSecondPointRotationCoordX() - getPathDoorRotationPointCoordX()) / (getPathDoorSecondPointRotationCoordY() - getPathDoorRotationPointCoordY())) * 180 / Math.PI;
                    // Углы смещения штрихов (так как смещаются по кругу, а не вдоль открывающейся двери - угол разный для каждой точки)
                    const dashAngles = [];
                    for (let i = 0; i <= 7 && i < path.length; i++) {
                        const el = path[i].translatedPath;
                        const elAngles = [];

                        for (let a = 0; a < el.length; a++) {
                            const point = el[a];
                            const pointAngles = [];

                            for (let b = 0; b < point.length / 2; b++) {
                                const x = point[b * 2];
                                const y = point[b * 2 + 1];
                                let angle = Math.atan((y - getPathDoorRotationPointCoordY()) / (x - getPathDoorRotationPointCoordX())) * 180 / Math.PI;
                                pointAngles.push(angle);
                            }
                            elAngles.push(pointAngles);
                        }
                        dashAngles.push(elAngles);
                    }
                    //Определяем коэффициенты изменения ширины двери
                    const koefProportion = door.length / 80;
                    const koefDelta = door.length - 80;

                    // Определяем толщину двери
                    let doorThickness;
                    // До тех пор, пока ширина двери не превысила ширину при которой толщина перестает меняться, толщина двери увеличивается пропорционально увеличению ширины.
                    // Лишние скобки для наглядности.
                    if (door.length <= stopScaleWidth) {
                        doorThickness = ((getPathDoorPointMinCoordX() - getPathDoorRotationPointCoordX()) / Math.sin(doorScaleAngle)) * koefProportion;
                    } else if (door.length > stopScaleWidth) { // В противном случае
                        doorThickness = ((getPathDoorPointMinCoordX() - getPathDoorRotationPointCoordX()) / Math.sin(doorScaleAngle)) * (stopScaleWidth / 80);
                    }

                    // Настраиваем начальные координаты элементов двери в зависимости от ее ширины.
                    // Расчитываем координаты точек двери.
                    // При любой толщине двери точка вращения не меняется, поэтому точки [1] и [2] остаются на месте.

                    const coordX1 = getPathDoorSecondPointRotationCoordX();
                    const coordY1 = getPathDoorSecondPointRotationCoordY();
                    const coordX2 = getPathDoorRotationPointCoordX();
                    const coordY2 = getPathDoorRotationPointCoordY();
                    // Точка [3] является проекцией точки [2].
                    const coordX3 = coordX2 + doorThickness * Math.sin(doorScaleAngle);
                    const coordY3 = coordY2 - doorThickness * Math.cos(doorScaleAngle);
                    // Находим координаты точек [0] и [4].
                    // Так как расстояние между этими точками не меняются при увеличении ширины, то найдем разницу координат, чтобы выдерживать это расстояние.
                    const deltaX = Math.abs(getPathDoorFlangePointCoordX() - getPathDoorOuterPointMaxCoordX());
                    const deltaY = Math.abs(getPathDoorFlangePointCoordY() - getPathDoorOuterPointMaxCoordY());
                    const coordX0 = coordX1 - doorThickness * Math.cos(doorScaleAngle) + deltaX;
                    const coordY0 = coordY1 + doorThickness * Math.sin(doorScaleAngle) - deltaY;
                    const coordX4 = coordX0 - deltaX * Math.cos(doorScaleAngle);
                    const coordY4 = coordY0 - deltaY * Math.sin(doorScaleAngle);

                    // Присваиваем найденные координаты
                    const doorPath = [
                        [coordX0, coordY0],
                        [coordX1, coordY1],
                        [coordX2, coordY2],
                        [coordX3, coordY3],
                        [coordX4, coordY4],
                    ];
                    setDoorPath(doorPath);
                    // Вычисляем коэффициенты изменения координат при изменении толщины двери, чтобы применить для изменения координат ручек
                    const thicknessDeltaX = coordX3 - initialPathDoorPointMinCoordX;
                    const thicknessDeltaY = coordY3 - initialPathDoorPointMinCoordY;

                    // Теперь устанавливаем положение ручек двери при изменении толщины двери
                    // Так как толщина двери увеличивается в сторону открывания, значит меняться будут координаты ручки на стороне открывания.
                    for (let i = 8; i <= 9 && i < path.length; i++) {
                        const el = path[i];
                        el.translatedPath = el.translatedPath.map((point) => {
                            if (point.length === 2) {
                                return [point[0] + thicknessDeltaX, point[1] + thicknessDeltaY];
                            } else if (point.length === 6) {
                                return [
                                    point[0] + thicknessDeltaX, point[1] + thicknessDeltaY,
                                    point[2] + thicknessDeltaX, point[3] + thicknessDeltaY,
                                    point[4] + thicknessDeltaX, point[5] + thicknessDeltaY,
                                ];
                            }
                        });
                    }

                    //Рисуем дверь
                    if (door.length !== 80) {
                        //Смещение пунктирной линии (траектории открывания двери)
                        for (let i = 0; i <= 7 && i < path.length; i++) {
                            const el = path[i].translatedPath;

                            for (let a = 0; a < el.length; a++) {
                                const point = el[a];

                                for (let b = 0; b < point.length; b++) {
                                    const angle = dashAngles [i][a][Math.floor(b / 2)];

                                    if (b % 2 === 0) { // Если координата четная (X)
                                        point[b] = point[b] + koefDelta * Math.cos(angle * Math.PI / 180);
                                    } else { // Если координата нечетная (Y)
                                        point[b] = point[b] + koefDelta * Math.sin(angle * Math.PI / 180);
                                    }
                                }
                            }
                        }

                        // Смещение ручек двери при изменении ширины двери
                        // Ручки смещаются вдоль оси открытой двери, точки смещаются на такую же величину, как и точки торца двери.
                        // (так, что расстояние от ручек до дальнего от стены края двери не меняется).
                        for (let i = 8; i <= 11 && i < path.length; i++) {
                            const el = path[i];
                            el.translatedPath = el.translatedPath.map((point) => {
                                if (point.length === 2) {
                                    return [point[0] + koefDelta * Math.cos(doorScaleAngle), point[1] + koefDelta * Math.sin(doorScaleAngle)];
                                } else if (point.length === 6) {
                                    return [
                                        point[0] + koefDelta * Math.cos(doorScaleAngle), point[1] + koefDelta * Math.sin(doorScaleAngle),
                                        point[2] + koefDelta * Math.cos(doorScaleAngle), point[3] + koefDelta * Math.sin(doorScaleAngle),
                                        point[4] + koefDelta * Math.cos(doorScaleAngle), point[5] + koefDelta * Math.sin(doorScaleAngle),
                                    ];
                                }
                            });
                        }

                        // Увеличение ширины двери
                        const newDoorPath = [
                            // Основание двери остается на месте при любой ширине двери, поэтому меняются координаты трех точек
                            [getPathDoorFlangePointCoordX() + koefDelta * Math.cos(doorScaleAngle), getPathDoorFlangePointCoordY() + koefDelta * Math.sin(doorScaleAngle)],
                            [getPathDoorSecondPointRotationCoordX() + koefDelta * Math.cos(doorScaleAngle), getPathDoorSecondPointRotationCoordY() + koefDelta * Math.sin(doorScaleAngle)],
                            [getPathDoorRotationPointCoordX(), getPathDoorRotationPointCoordY()],
                            [getPathDoorPointMinCoordX(), getPathDoorPointMinCoordY()],
                            [getPathDoorOuterPointMaxCoordX() + koefDelta * Math.cos(doorScaleAngle), getPathDoorOuterPointMaxCoordY() + koefDelta * Math.sin(doorScaleAngle)],
                        ];
                        setDoorPath(newDoorPath);
                    }

                    // для совмещения точек svg иконки и точек на канвасе (начало и конец дверного проема)
                    centreX = (getPathDoorPointMinCoordX() + getPathTrajectoryPointMaxCoordX()) / 2;
                    centreY = (getPathDoorPointMinCoordY() + getPathTrajectoryPointMaxCoordY()) / 2;
                } else { // Если выбрали дверь типа typeWithPath, но в JSON изображение почему-то не пришло, то вставляем старый вариант как заглушку
                    var pathPoint = door.getPath();
                    var width = pathPoint.radius * this.pixelsPerCm;
                    this.drawLine(this.convertX(pathPoint.bottomX), this.convertY(pathPoint.bottomY), this.convertX(pathPoint.topX), this.convertY(pathPoint.topY), this.edgeWidth, this.wallColor);
                    this.context.beginPath();
                    this.context.arc(
                        this.convertX(pathPoint.bottomX),
                        this.convertY(pathPoint.bottomY),
                        width,
                        pathPoint.angle * THREE.Math.DEG2RAD,
                        (pathPoint.angle - 90 * pathPoint.rotateCoefficient) * THREE.Math.DEG2RAD,
                        (pathPoint.rotateCoefficient === 1) //false
                    );
                    this.context.strokeStyle = this.wallColor;
                    this.context.stroke();

                    //show door itself when opened.
                    this.drawDoorPosition(door, pathPoint);

                    this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                    this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);
                }
            } else if (door.type === door.TYPE_NEW_WITH_PATH) {
                if (imageData[0].doorType === "typeNewWithPath") {
                    // Если в JSON пришло изображение двери с типом slider, то:
                    // Создаем геттеры для определения переменных, которыми будем пользоваться в вычислениях:
                    //Для точек траектории открывания двери

                    function getNewPathTrajectoryPointMaxCoordX() { // Координата Х самой удаленной от оси вращения двери точки самого нижнего штриха траектории
                        return path[0].translatedPath[2][0];
                    }
                    function getNewPathTrajectoryPointMaxCoordY() { // Координата Y самой удаленной от оси вращения двери точки самого нижнего штриха траектории
                        return path[0].translatedPath[2][1];
                    }

                    // Для точек двери
                    function getNewPathDoorRotationPointCoordX() { // Координата Х точки вращения двери
                        return path[1].translatedPath[1][0];
                    }
                    function getNewPathDoorRotationPointCoordY() { // Координата Y точки вращения двери
                        return path[1].translatedPath[1][1];
                    }
                    function getNewPathDoorPointMinCoordX() { // Координата Х самой крайней точки двери по оси Х. Отрезок от точки вращения до этой точки и есть ширина двери
                        return path[1].translatedPath[2][0];
                    }

                    // Определяем ширину, при которой толщина перестает меняться
                    const stopScaleWidth = 150;

                    //Определяем коэффициент масштабирования, так как SVG может быть нарисован не в масштабе
                    const scaleKoef = 80 / (getNewPathTrajectoryPointMaxCoordX() - getNewPathDoorPointMinCoordX());
                    //Меняем координаты в соответствии с масштабом
                    path.forEach(el => {
                        el.translatedPath = el.translatedPath.map(path => {
                            return path.map(coord => coord * scaleKoef)
                        });
                    });

                    // Углы смещения штриха (так как смещаются по кругу, а не вдоль открывающейся двери - угол разный для каждой точки)
                    const dashAngles = [];
                    const el = path[0].translatedPath;
                    const elAngles = [];
                    for (let a = 0; a < el.length; a++) {
                        const point = el[a];
                        const pointAngles = [];
                        for (let b = 0; b < point.length / 2; b++) {
                            const x = point[b * 2];
                            const y = point[b * 2 + 1];
                            let angle = Math.atan((y - getNewPathDoorRotationPointCoordY()) / (x - getNewPathDoorRotationPointCoordX())) * 180 / Math.PI;
                            pointAngles.push(angle);
                        }
                        elAngles.push(pointAngles);
                    }
                    dashAngles.push(elAngles);
                    //Определяем коэффициенты изменения ширины двери
                    const koefProportion = door.length / 80;
                    const koefDelta = door.length - 80;

                    // Определяем толщину двери
                    let doorThickness;
                    // До тех пор, пока ширина двери не превысила ширину при которой толщина перестает меняться, толщина двери увеличивается пропорционально увеличению ширины.
                    // Лишние скобки для наглядности.
                    if (door.length <= stopScaleWidth) {
                        doorThickness = (getNewPathDoorRotationPointCoordX() - getNewPathDoorPointMinCoordX()) * koefProportion;
                    } else if (door.length > stopScaleWidth) { // В противном случае
                        doorThickness = (getNewPathDoorRotationPointCoordX() - getNewPathDoorPointMinCoordX()) * (stopScaleWidth / 80);
                    }
                    // При любой толщине двери точка вращения не меняется, поэтому точки [0] и [1] остаются на месте.
                    for (let i = 1; i < path.length; i++) {
                        const el = path[i].translatedPath;
                        if (el[2].length > 1) {
                            el[2][0] = el[2][0] - doorThickness;
                        }
                        if (el[3].length > 1) {
                            el[3][0] = el[3][0] - doorThickness;
                        }
                    }

                    //Рисуем дверь
                    if (door.length !== 80) {
                        //Смещение пунктирной линии (траектории открывания двери)
                        const el = path[0].translatedPath;
                        for (let a = 0; a < el.length; a++) {
                            const point = el[a];
                            for (let b = 0; b < point.length; b++) {
                                const angle = dashAngles [0][a][Math.floor(b / 2)];
                                if (b % 2 === 0) { // Если координата четная (X)
                                    point[b] = point[b] + koefDelta * Math.cos(angle * Math.PI / 180);
                                } else { // Если координата нечетная (Y)
                                    point[b] = point[b] + koefDelta * Math.sin(angle * Math.PI / 180);
                                }
                            }
                        }
                        // Увеличение ширины двери
                        for (let i = 1; i < path.length; i++) {
                            const el = path[i].translatedPath;
                            // Основание двери остается на месте при любой ширине двери, поэтому меняются координаты трех точек
                            if (el[0].length > 1) {
                                el[0][1] = el[0][1] - koefDelta;
                            }
                            if (el[3].length > 1) {
                                el[3][1] = el[3][1] - koefDelta;
                            }
                            if (el[4].length > 1) {
                                el[4][1] = el[4][1] - koefDelta;
                            }
                        }

                    }
                    // для совмещения точек svg иконки и точек на канвасе (начало и конец дверного проема)
                    centreX = (getNewPathDoorRotationPointCoordX() + getNewPathTrajectoryPointMaxCoordX()) / 2;
                    centreY = (getNewPathDoorRotationPointCoordY() + getNewPathTrajectoryPointMaxCoordY()) / 2;

                } else {
                    const pathPoint = door.getPath();
                    width = pathPoint.radius * this.pixelsPerCm;

                    this.drawLine(this.convertX(pathPoint.bottomX), this.convertY(pathPoint.bottomY), this.convertX(pathPoint.topX), this.convertY(pathPoint.topY), this.edgeWidth, this.wallColor); // "тень" двери, когда дверь закрыта
                    this.context.beginPath();
                    this.context.arc(
                        this.convertX(pathPoint.bottomX),
                        this.convertY(pathPoint.bottomY),
                        width, //радиус открывания двери
                        pathPoint.angle * THREE.Math.DEG2RAD,
                        (pathPoint.angle - 90 * pathPoint.rotateCoefficient) * THREE.Math.DEG2RAD,
                        (pathPoint.rotateCoefficient === 1) //false
                    );
                    this.context.strokeStyle = this.wallColor; // траектория
                    this.context.stroke();

                    //show door itself when opened.
                    this.drawNewDoorPosition(door, pathPoint);

                    this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor); // рамка дверного проема
                    this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor); // дверной проём
                }
            } else if (door.type === door.TYPE_NEW) {
                if (imageData[0].doorType === "typeNew") {
                    // Если в JSON пришло изображение двери с типом slider, то:
                    // Создаем геттеры для определения переменных, которыми будем пользоваться в вычислениях:
                    function getNewDoorPointMinCoordX() { // Координата Х точки наиболее удаленной от центра дверного проема влево
                        return path[0].translatedPath[0][0]
                    }

                    function getNewDoorPointMaxCoordX() { // Координата Х точки наиболее удаленной от центра дверного проема вправо
                        return path[0].translatedPath[1][0]
                    }

                    function getNewDoorPointMinCoordY() { // Координата Y точки наиболее близкой к внешней стороне стены
                        return path[1].translatedPath[0][1]
                    }

                    function getNewDoorPointMaxCoordY() { // Координата Y точки наиболее близкой к внешней стороне стены
                        return path[1].translatedPath[2][1]
                    }

                    //Определяем коэффициент масштабирования, так как SVG может быть нарисован не в масштабе
                    const scaleKoef = 80 / (getNewDoorPointMaxCoordX() - getNewDoorPointMinCoordX());
                    // Настраиваем начальные координаты элементов двери
                    path.forEach(el => {
                        el.translatedPath = el.translatedPath.map(path => {
                            return path.map(coord => coord * scaleKoef)
                        });
                    });

                    // Меняем координаты при изменении ширины дверного проема
                    if (door.length !== 80) {
                        path.forEach(el => {
                            el.translatedPath.forEach(coordList => {
                                for (let i = 0; i < coordList.length; i++) {
                                    if (i % 2 === 0) {
                                        coordList[i] *= koef;
                                    } else {
                                        coordList[i] = coordList[i];
                                    }
                                }
                            });
                        });
                    }
                    // для совмещения точек svg иконки и точек на канвасе (начало и конец дверного проема)
                    centreX = (getNewDoorPointMinCoordX() + getNewDoorPointMaxCoordX()) / 2;
                    centreY = (getNewDoorPointMinCoordY() + getNewDoorPointMaxCoordY()) / 2;
                }
            } else if (door.type === door.TYPE_DOUBLE) {
                var arPathPoint = door.getPath();
                var width;
                for (i = 0; i < arPathPoint.length; i++) {
                    const pathPoint = arPathPoint[i];
                    width = pathPoint.radius * this.pixelsPerCm;
                    this.drawLine(this.convertX(pathPoint.bottomX), this.convertY(pathPoint.bottomY), this.convertX(pathPoint.topX), this.convertY(pathPoint.topY), this.edgeWidth, this.wallColor);
                    this.context.beginPath();
                    this.context.arc(
                        this.convertX(pathPoint.bottomX),
                        this.convertY(pathPoint.bottomY),
                        width,
                        pathPoint.angle * THREE.Math.DEG2RAD,
                        (pathPoint.angle - 90 * pathPoint.rotateCoefficient) * THREE.Math.DEG2RAD,
                        (pathPoint.rotateCoefficient === 1) //false
                    );
                    this.context.strokeStyle = this.wallColor;
                    this.context.stroke();
                }

                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);
            } else if (door.type === door.TYPE_EMPTY) { //TYPE_EMPTY
                this.context.setLineDash([8, 8]);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                this.context.setLineDash([]);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);
            } else if (door.type === door.TYPE_BIFOLD) {
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);
                var pointA = new THREE.Vector2(door.x1, door.y1);
                var pointB = new THREE.Vector2(door.x2, door.y2);
                if (door.pathFrom === -1) { //change places
                    var temp = pointA;
                    pointA = pointB;
                    pointB = temp;
                }
                var rotated1 = pointB
                    .clone()
                    .sub(pointA)
                    .rotateAround(new THREE.Vector2(0, 0), door.direction === -1 ? Math.PI / 16 : -Math.PI / 16)
                    .multiplyScalar(0.5);

                var k = pointB
                    .clone()
                    .sub(pointA)
                    .rotateAround(new THREE.Vector2(0, 0), door.direction === -1 ? -Math.PI / 2 : Math.PI / 2)
                    .multiplyScalar(this.doorWidth / 2 / door.getWidth())
                    .add(pointA);
                var l = k.clone().add(rotated1);
                var m = pointA.clone().add(rotated1);

                var n = pointA
                    .clone()
                    .sub(pointB)
                    .rotateAround(new THREE.Vector2(0, 0), door.direction === -1 ? Math.PI / 2 : -Math.PI / 2)
                    .multiplyScalar(this.doorWidth / 2 / door.getWidth())
                    .add(pointB);

                xArr = [this.convertX(pointA.x), this.convertX(k.x), this.convertX(l.x), this.convertX(m.x)];
                yArr = [this.convertY(pointA.y), this.convertY(k.y), this.convertY(l.y), this.convertY(m.y)];
                this.drawPolygon(
                    xArr,
                    yArr,
                    true,
                    this.roomColor,
                    true,
                    this.edgeColor,
                    1
                );

                xArr = [this.convertX(pointB.x), this.convertX(n.x), this.convertX(l.x), this.convertX(m.x)];
                yArr = [this.convertY(pointB.y), this.convertY(n.y), this.convertY(l.y), this.convertY(m.y)];
                this.drawPolygon(
                    xArr,
                    yArr,
                    true,
                    this.roomColor,
                    true,
                    this.edgeColor,
                    1
                );
            } else if (door.type === door.TYPE_DUTCH) {
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);

                var pointA = new THREE.Vector2(door.x1, door.y1);
                var pointB = new THREE.Vector2(door.x2, door.y2);
                if (door.pathFrom === -1) { //change places
                    var temp = pointA;
                    pointA = pointB;
                    pointB = temp;
                }
                var rotated = pointB
                    .sub(pointA)
                    .rotateAround(new THREE.Vector2(0, 0), door.direction === -1 ? -Math.PI / 32 : Math.PI / 32)
                    .add(pointA);

                this.drawLine(this.convertX(pointA.x), this.convertY(pointA.y), this.convertX(rotated.x), this.convertY(rotated.y), this.convertMeasure(this.doorWidth), this.edgeColor);
                this.drawLine(this.convertX(pointA.x), this.convertY(pointA.y), this.convertX(rotated.x), this.convertY(rotated.y), this.convertMeasure(this.doorWidth) - 2, this.doorColor);
            } else if (door.type === door.TYPE_OVERHEAD) {
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                this.drawDoorOverhead(door);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);
            } else if (door.type === door.TYPE_POCKET) {
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
                this.drawLine(this.convertX(door.x1), this.convertY(door.y1), this.convertX(door.x2), this.convertY(door.y2), this.convertMeasure(this.doorWidth), this.doorColor);

                var pointA = new THREE.Vector2(door.x1, door.y1);
                var pointB = new THREE.Vector2(door.x2, door.y2);
                if (door.pathFrom === -1) { //change places
                    var temp = pointA;
                    pointA = pointB;
                    pointB = temp;
                }
                const openedCoef = 0.1;
                const closedCoef = 0.9;
                var openRate = door.openRate >= 0 && door.openRate <= 1 ? (1 - door.openRate) * (closedCoef - openedCoef) + openedCoef : closedCoef;
                var line = new THREE.Line3(pointA, pointB);
                var pointBShifted = line.at(openRate, new THREE.Vector3);
                this.drawLine(
                    this.convertX(pointA.x),
                    this.convertY(pointA.y),
                    this.convertX(pointBShifted.x),
                    this.convertY(pointBShifted.y),
                    this.convertMeasure(this.doorWidth * 2 / 5) + 2,
                    this.edgeColor
                );
                this.drawLine(
                    this.convertX(pointA.x),
                    this.convertY(pointA.y),
                    this.convertX(pointBShifted.x),
                    this.convertY(pointBShifted.y),
                    this.convertMeasure(this.doorWidth * 2 / 5),
                    this.roomColor
                );
            }

            function drawPath(path, attributes, iconsStartX, iconsStartY, angle) {

                const stroke = attributes.stroke && attributes.stroke.value ? attributes.stroke.value : 'black';
                const fill = attributes.fill && attributes.fill.value ? attributes.fill.value : 'transparent';

                _this.context.strokeStyle = stroke;
                _this.context.fillStyle = fill;
                _this.context.fillStyle = color;

                _this.context.beginPath();

                if (!iconStartX) {
                    iconStartX = iconsStartX
                    iconStartY = iconsStartY
                }

                //для смещения координат
                let newKoordX = (door.x1 + door.x2) / 2
                let newKoordY = (door.y1 + door.y2) / 2

                let allDiffX = newKoordX - iconStartX
                let allDiffY = newKoordY - iconStartY

                function rotateElement(x, y, cx, cy, theta) {
                    // Вычисляем разницу между координатами элемента и точки (cx, cy)
                    const dx = x - cx;
                    const dy = y - cy;

                    // Вычисляем новые координаты элемента, повернутого на угол theta
                    const cosTheta = Math.cos(theta);
                    const sinTheta = Math.sin(theta);
                    const xPrime = dx * cosTheta - dy * sinTheta;
                    const yPrime = dx * sinTheta + dy * cosTheta;

                    // Добавляем обратно координаты точки (cx, cy)
                    const xRotated = xPrime + cx;
                    const yRotated = yPrime + cy;

                    // Возвращаем новые координаты элемента
                    return {x: xRotated, y: yRotated};
                }

                const theta = angle * (Math.PI / 180)
                for (let i = 0; i < path.length; i++) {
                    for (let j = 0; j < path[i].length; j += 2) {
                        const coord = rotateElement(path[i][j], path[i][j + 1], iconStartX, iconStartY, theta)
                        path[i][j] = coord.x
                        path[i][j + 1] = coord.y
                    }
                }

                path = path.map(el => {
                    return el.map((coord, index) => {
                        if (index % 2 === 0) {
                            return coord + allDiffX
                        } else {
                            return coord + allDiffY
                        }
                    })
                })

                for (const segment of path) {
                    if (segment.length === 2) {
                        const [x, y] = segment;
                        _this.context.lineTo(_this.convertX(x), _this.convertY(y));
                    } else if (segment.length === 1) {
                        const [x] = segment;
                        _this.context.moveTo(_this.convertX(x), startY);
                    } else if (segment.length === 3) {
                        const [x1, y1, x2] = segment;
                        _this.context.lineTo(_this.convertX(x1), _this.convertY(y1));
                        _this.context.moveTo(_this.convertX(x2), startY);
                    } else if (segment.length === 4) {
                        const [x1, y1, x2, y2] = segment;
                        _this.context.quadraticCurveTo(x1, y1, x2, y2);
                    } else if (segment.length > 4 && segment.length % 2 === 0) {
                        const numCoordinates = segment.length;
                        const numCurves = (numCoordinates - 2) / 4;

                        for (let i = 0; i < numCurves; i++) {
                            const startIndex = i * 4;
                            const [x1, y1, x2, y2, x3, y3] = segment.slice(startIndex, startIndex + 6);
                            _this.context.bezierCurveTo(_this.convertX(x1), _this.convertY(y1), _this.convertX(x2), _this.convertY(y2), _this.convertX(x3), _this.convertY(y3));
                        }
                    }
                }

                _this.context.closePath();
                _this.context.fill();
                _this.context.stroke();
            }

            let correctAngle = door.direction === -1
                ? door.wall.wallAngle
                : door.wall.wallAngle + 180
            path.forEach((el, index) => {
                drawPath(el.translatedPath, el.pathAttributes, centreX, centreY, correctAngle)
            });

            if (door.hovered) {
                if (door.startHovered) this.drawCircle(this.convertX(door.x1), this.convertY(door.y1), (this.convertMeasure(this.doorWidth) / 2) + 2, this.wallColorHover);
                if (door.endHovered) this.drawCircle(this.convertX(door.x2), this.convertY(door.y2), (this.convertMeasure(this.doorWidth) / 2) + 2, this.wallColorHover);

                this.drawDoorMeasures(door);
            }
        };

        /* helper function to draw real door position on image
         */

        this.drawDoorPosition = function (door, pathPoint) {
            if (door.openRate !== undefined && door.openRate > 0 && door.openRate <= 1) { //don't show in 0
                if (door.openRate) door.openRate = parseFloat(door.openRate);
                var rotated = new THREE.Vector2(pathPoint.topX, pathPoint.topY).rotateAround(
                    new THREE.Vector2(pathPoint.bottomX, pathPoint.bottomY),
                    (pathPoint.rotateCoefficient === 1 ? -1 : 1) * Math.PI / 2 * (1 - door.openRate)
                );
                this.drawLine(this.convertX(pathPoint.bottomX), this.convertY(pathPoint.bottomY),
                    this.convertX(rotated.x), this.convertY(rotated.y), 1, this.edgeColor);
            }
        };

        this.drawNewDoorPosition = function (door, pathPoint) {
            if (door.openRate !== undefined && door.openRate > 0 && door.openRate <= 1) {
                if (door.openRate) door.openRate = parseFloat(door.openRate);

                var rotated = new THREE.Vector2(pathPoint.topX, pathPoint.topY).rotateAround(
                    new THREE.Vector2(pathPoint.bottomX, pathPoint.bottomY),
                    (pathPoint.rotateCoefficient === 1 ? -1 : 1) * Math.PI / 2 * (1 - door.openRate)
                );

                // Толщина двери
                var doorThickness = this.wallWidth * 0.6;
                // Размер белых квадратов
                var squareSize = this.wallWidth * 0.6;
                // Ширина обводки
                var borderLineWidth = this.wallWidth * 0.6 + 2;

                // Координаты концов линии двери
                var startX = this.convertX(pathPoint.bottomX);
                var startY = this.convertY(pathPoint.bottomY);
                var endX = this.convertX(rotated.x);
                var endY = this.convertY(rotated.y);

                // Направление вектора
                var directionX = endX - startX;
                var directionY = endY - startY;

                // Нормализуем вектор направления
                var length = Math.sqrt(directionX * directionX + directionY * directionY);
                directionX /= length;
                directionY /= length;

                // Корректируем координаты концов линии двери
                var normStartX = startX + directionX * doorThickness;
                var normStartY = startY + directionY * doorThickness;
                var normEndX = endX;
                var normEndY = endY;

                // Делаем длину обводки больше, чем ширина двери на 1рх
                var extendedStartX = normStartX - directionX;
                var extendedStartY = normStartY - directionY;
                var extendedEndX = normEndX + directionX;
                var extendedEndY = normEndY + directionY;

                // Рисуем обводку для двери
                this.drawDoorBorder(extendedStartX, extendedStartY, extendedEndX, extendedEndY, borderLineWidth, '#666');

                // Рисуем дверь
                this.drawLine(normStartX, normStartY, normEndX, normEndY, doorThickness, '#ff0000');

                // Рисуем белые квадраты
                this.drawSquare(normStartX + directionX * squareSize / 2, normStartY + directionY * squareSize / 2, squareSize, '#ffffff');
                this.drawSquare(normEndX - directionX * squareSize / 2, normEndY - directionY * squareSize / 2, squareSize, '#ffffff');
            }
        };

        /* Only for overhead doors.
         */
        this.drawDoorOverhead = function (door) {
            function vect(x, y) {
                return new THREE.Vector2(x, y);
            }

            var shifted = vect(door.x2, door.y2)
                .sub(vect(door.x1, door.y1))
                .rotateAround(vect(0, 0), door.direction === 1 ? -Math.PI / 2 : Math.PI / 2)
                .multiplyScalar(6 / door.getWidth());
            var p1 = shifted.add(vect(door.x1, door.y1));
            var p2 = shifted.clone().add(vect(door.x2, door.y2).sub(vect(door.x1, door.y1)));
            this.drawLine(this.convertX(p1.x), this.convertY(p1.y), this.convertX(p2.x), this.convertY(p2.y),
                this.convertMeasure(this.doorWidth), this.edgeColor);
        };

        this.drawWindow = function (oWindow) {
            this.drawLine(this.convertX(oWindow.x1), this.convertY(oWindow.y1), this.convertX(oWindow.x2), this.convertY(oWindow.y2), this.convertMeasure(this.doorWidth) + 2, this.edgeColor);
            this.drawLine(this.convertX(oWindow.x1), this.convertY(oWindow.y1), this.convertX(oWindow.x2), this.convertY(oWindow.y2), this.convertMeasure(this.doorWidth), this.windowColor);

            var bridge = oWindow.getBridge();
            this.drawLine(this.convertX(bridge[0]), this.convertY(bridge[1]), this.convertX(bridge[2]), this.convertY(bridge[3]), 1, this.edgeColor);

            if (oWindow.hovered) {
                if (oWindow.startHovered) this.drawCircle(this.convertX(oWindow.x1), this.convertY(oWindow.y1), (this.convertMeasure(this.doorWidth) / 2) + 2, this.wallColorHover);
                if (oWindow.endHovered) this.drawCircle(this.convertX(oWindow.x2), this.convertY(oWindow.y2), (this.convertMeasure(this.doorWidth) / 2) + 2, this.wallColorHover);

                this.drawDoorMeasures(oWindow);
            }
        };

        /**
         * Draw distances from door to next walls
         * @param door
         */
        this.drawDoorMeasures = function (door) {
            var edge;
            if (door.wall instanceof Wall && (door.wall.frontEdge || door.wall.backEdge)) {
                var oEdges = {"FrontEdge": door.wall.frontEdge, "BackEdge": door.wall.backEdge};
                for (var key in oEdges) {
                    edge = oEdges[key];
                    if (edge) {
                        var start = edge.getInteriorStart();
                        var end = edge.getInteriorEnd();
                        var startPointOnEdgeV, endPointOnEdgeV, startEdgeDistance, endEdgeDistance,
                            centerP = new THREE.Vector2();

                        if (door["startPointOn" + key]) { //startPointOnFrontEdge //startPointOnBackEdge
                            startPointOnEdgeV = new THREE.Vector2(door["startPointOn" + key].x, door["startPointOn" + key].y);
                            centerP = new THREE.Line3(new THREE.Vector3(door["startPointOn" + key].x, door["startPointOn" + key].y, 0),
                                new THREE.Vector3(start.x, start.y, 0)).getCenter(centerP);
                            startEdgeDistance = startPointOnEdgeV.distanceTo(new THREE.Vector2(start.x, start.y));

                            this.drawLabel(centerP, this.prepareDimension(startEdgeDistance), null, this.measureColor);
                        }
                        if (door["endPointOn" + key]) { //endPointOnFrontEdge //endPointOnBackEdge
                            endPointOnEdgeV = new THREE.Vector2(door["endPointOn" + key].x, door["endPointOn" + key].y);
                            centerP = new THREE.Line3(new THREE.Vector3(door["endPointOn" + key].x, door["endPointOn" + key].y, 0),
                                new THREE.Vector3(end.x, end.y, 0)).getCenter(centerP);
                            endEdgeDistance = endPointOnEdgeV.distanceTo(new THREE.Vector2(end.x, end.y));

                            this.drawLabel(centerP, this.prepareDimension(endEdgeDistance), null, this.measureColor);
                        }
                    }
                }
            }

            //calc distances from door to interior edges
            this.drawLabel(door.getCenter(), this.prepareDimension(door.getWidth()), null, this.measureColor);
        };

        /** Draw a line in DRAW_WALLS mode
         *
         */
        this.drawCursor = function (options) {
            function getDistance(x1, y1, x2, y2) {
                var a = x1 - x2;
                var b = y1 - y2;
                return Math.sqrt(a * a + b * b);
            }

            if (options !== undefined && ("drawnWall" in options)) {
                if (this.floormodel.mode === this.floormodel.modes.DRAW) {
                    options.drawnWall.arWalls.forEach(function (wall) {
                        this.drawLine(
                            this.convertX(wall.start.x),
                            this.convertY(wall.start.y),
                            this.convertX(wall.end.x),
                            this.convertY(wall.end.y),
                            this.convertMeasure(this.wallWidthHover),
                            this.wallColorHover
                        );
                        this.drawLabel(
                            {x: options.targetX, y: options.targetY - 30},
                            this.prepareDimension(getDistance(options.lastNode.x, options.lastNode.y, options.targetX, options.targetY)),
                            12
                        );
                    }.bind(this));
                    if (options.drawnWall.start !== null) {
                        this.drawLine(
                            this.convertX(options.drawnWall.start.x),
                            this.convertY(options.drawnWall.start.y),
                            this.convertX(options.drawnWall.end.x),
                            this.convertY(options.drawnWall.end.y),
                            this.convertMeasure(this.wallWidthHover),
                            this.wallColorHover
                        );
                        this.drawLabel(
                            {x: options.targetX, y: options.targetY - 30},
                            this.prepareDimension(getDistance(options.lastNode.x, options.lastNode.y, options.targetX, options.targetY)),
                            12
                        );
                    }
                    this.drawCircle(this.convertX(options.targetX), this.convertY(options.targetY), this.cornerRadiusHover, this.cornerColorHover);
                } else if (this.floormodel.mode === this.floormodel.modes.DRAWLINE && options.lastNode) {
                    this.drawLine(
                        this.convertX(options.drawnWall.start.x),
                        this.convertY(options.drawnWall.start.y),
                        this.convertX(options.drawnWall.end.x),
                        this.convertY(options.drawnWall.end.y),
                        this.convertMeasure(this.wallWidthHover),
                        this.wallColorHover
                    );
                    this.drawLabel({
                        x: options.targetX,
                        y: options.targetY - 30
                    }, this.prepareDimension(getDistance(options.lastNode.x, options.lastNode.y, options.targetX, options.targetY)), 12);
                    this.drawCircle(this.convertX(options.targetX), this.convertY(options.targetY), this.cornerRadiusHover, this.cornerColorHover);
                }
            }
        };

        /** */
        this.drawLine = function (startX, startY, endX, endY, width, color) {
            // width is an integer
            // color is a hex string, i.e. #ff0000
            this.context.beginPath();
            this.context.moveTo(startX, startY);
            this.context.lineTo(endX, endY);
            this.context.lineWidth = width;
            this.context.strokeStyle = color;
            this.context.stroke();
        };

        this.drawSquare = function (x, y, size, color) {
            // Рисуем квадрат
            this.context.fillStyle = color;
            this.context.fillRect(x - size / 2, y - size / 2, size, size);
        };

        this.drawDoorBorder = function (startX, startY, endX, endY, lineWidth, color) {
            // Устанавливаем свойства для черной обводки
            this.context.lineWidth = lineWidth;
            this.context.strokeStyle = color;

            // Рисуем черную обводку вокруг двери
            this.context.beginPath();
            this.context.moveTo(startX, startY);
            this.context.lineTo(endX, endY);
            this.context.stroke();
        };

        /** returns n where -gridSize/2 < n <= gridSize/2  */
        this.calculateGridOffset = function (n) {
            if (n >= 0) {
                return (n + this.gridSpacing / 2.0) % this.gridSpacing - this.gridSpacing / 2.0;
            } else {
                return (n - this.gridSpacing / 2.0) % this.gridSpacing + this.gridSpacing / 2.0;
            }
        };

        /** */
        this.drawGrid = function () {
            var offsetX = this.calculateGridOffset(-this.originX);
            var offsetY = this.calculateGridOffset(-this.originY);
            var width = this.canvasElement.width;
            var height = this.canvasElement.height;
            for (var x = 0; x <= (width / this.gridSpacing); x++) {
                this.drawLine(this.gridSpacing * x + offsetX, 0, this.gridSpacing * x + offsetX, height, this.gridWidth, this.gridColor);
            }
            for (var y = 0; y <= (height / this.gridSpacing); y++) {
                this.drawLine(0, this.gridSpacing * y + offsetY, width, this.gridSpacing * y + offsetY, this.gridWidth, this.gridColor);
            }
        };

        this.drawOrigin = function () {
            this.drawLine(-this.originX, -this.originBoundary, -this.originX, this.originBoundary, this.originLineWidth, this.originColor);
            this.drawLine(-this.originBoundary, -this.originY, this.originBoundary, -this.originY, this.originLineWidth, this.originColor);
        };

        this.drawPolygon = function (xArr, yArr, fill, fillColor, stroke, strokeColor, strokeWidth) {
            // fillColor is a hex string, i.e. #ff0000
            fill = fill || false;
            stroke = stroke || false;
            this.context.beginPath();
            this.context.moveTo(xArr[0], yArr[0]);
            for (var i = 1; i < xArr.length; i++) {
                this.context.lineTo(xArr[i], yArr[i]);
            }
            this.context.closePath();
            if (fill) {
                this.context.fillStyle = fillColor;
                this.context.fill();
            }
            if (stroke) {
                this.context.lineWidth = strokeWidth;
                this.context.strokeStyle = strokeColor;
                this.context.stroke();
            }
        };

        this.drawCorner = function (corner) {
            var hover = /*(corner === this.viewmodel.activeCorner)*/ false;
            var color = this.cornerColor;
            if (hover && this.floormodel.mode == this.floormodel.modes.DELETE) {
                color = this.deleteColor;
            } else if (hover) {
                color = this.cornerColorHover;
            }
            this.drawCircle(this.convertX(corner.x), this.convertY(corner.y), this.convertMeasure(this.cornerRadius), color);
        };

        this.drawCircle = function (centerX, centerY, radius, fillColor) {
            this.context.beginPath();
            this.context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            this.context.fillStyle = fillColor;
            this.context.fill();
        };

        this.drawLabel = function (position, text, fontSize, color) {
            fontSize = fontSize || 12;
            color = color || "#000000";
            this.context.font = fontSize + "px Arial";
            this.context.fillStyle = color;
            this.context.textBaseline = "middle";
            this.context.textAlign = "center";
            this.context.strokeStyle = "#ffffff";
            this.context.lineWidth = 4;

            this.context.strokeText(
                text,
                this.convertX(position.x),
                this.convertY(position.y)
            );
            this.context.fillText(
                text,
                this.convertX(position.x),
                this.convertY(position.y)
            );
        };

        this.drawObject = function (embed) {
            var scope = this;
            var obj, src;
            if ("getSvgAsBase64" in embed && (src = embed.getSvgAsBase64())) {
                if (this.cachedImages[src]) { //take from cache instead of one more http request
                    obj = this.cachedImages[src];
                } else {
                    obj = new Image();
                    obj.src = src;
                    this.cachedImages[src] = obj;//cache
                }
            } else {
                obj = new Image();
                obj.src = "images/svg/" + embed.type + ".svg";
            }

            function drawObjectWithRotate() {
                var c = embed.getCenter();

                scope.context.save();
                scope.context.translate(scope.convertX(c.x), scope.convertY(c.y));
                scope.context.rotate(embed.angle);
                scope.context.drawImage(obj,
                    Math.floor(-embed.getWidth() * scope.pixelsPerCm / 2),
                    Math.floor(-embed.getHeight() * scope.pixelsPerCm / 2),
                    Math.floor(embed.getWidth() * scope.pixelsPerCm),
                    Math.floor(embed.getHeight() * scope.pixelsPerCm)
                );
                scope.drawControls(embed);
                scope.context.restore();
                if (embed.hovered) {
                    scope.context.strokeStyle = "#e3e3df";
                    scope.context.lineWidth = scope.embedBoxWidth;
                    var rect = embed.getRectangle();
                    scope.context.strokeRect(
                        scope.convertX(rect[0].x),
                        scope.convertY(rect[0].y),
                        (rect[1].x - rect[0].x) * scope.pixelsPerCm,
                        (rect[3].y - rect[0].y) * scope.pixelsPerCm
                    );
                    scope.drawHelpers(rect[3].x, rect[3].y, rect[2].x, rect[2].y, rect[2].x, rect[1].y);
                    if (scope.scalePercentage >= 175) { //object dimensions
                        var rectCenter = {x: (rect[2].x + rect[3].x) / 2, y: rect[3].y - 10};
                        scope.drawLabel(
                            rectCenter,
                            scope.prepareDimension(embed.getWidth()) + " x " + scope.prepareDimension(embed.getHeight()),
                            11
                        );
                    }
                }
            }

            if (obj.complete && !scope.isIE) {
                drawObjectWithRotate();
            } else {
                obj.onload = drawObjectWithRotate;
            }
        };

        /*
         * draw scale and rotate icons under 2 bottom points of any rectangular
         */
        this.drawHelpers = function (bottomLeftX, bottomLeftY, bottomRightX, bottomRightY, topRightX, topRightY) {
            var scope = this;
            var helperIconWidth = 24;
            var scale = new Image(), rotate = new Image();
            scale.src = "images/scale2.png";
            scale.position = [bottomRightX - helperIconWidth, bottomRightY - helperIconWidth];
            rotate.src = "images/rotate2.png";
            rotate.position = [bottomLeftX, bottomLeftY - helperIconWidth];

            [scale, rotate].forEach(function (icon) {
                function drawIcon() {
                    scope.context.drawImage(icon, scope.convertX(icon.position[0]), scope.convertY(icon.position[1]), scope.convertMeasure(helperIconWidth), scope.convertMeasure(helperIconWidth));
                }

                if (icon.complete) {
                    drawIcon();
                } else {
                    icon.onload = drawIcon;
                }
            });
        };

        /* Draw object's resize controls
         */
        this.drawControls = function (embed) {
            if (embed.hovered) {
                var width = this.convertMeasure(embed.getWidth()),
                    height = this.convertMeasure(embed.getHeight()),
                    left = -(width) / 2,
                    top = -(height) / 2;

                this.context.strokeStyle = this.context.fillStyle = "#e3e3df";
                this.context.lineWidth = this.embedBoxWidth;

                // middle-bottom
                this.drawControl(left + width / 2, top + height);

                // middle-right
                this.drawControl(left + width, top + height / 2);
            }
        };

        this.drawControl = function (left, top) {
            var size = 12;
            this.context.fillRect(left - size / 2, top - size / 2, size, size);
        };

        /*
         * draw wall length on wall hover
         * @param {bool} forceHovered flag shows if system must always show wall dimensions or not
         */
        this.drawWallLabels = function (forceHovered) {
            if (this.floormodel.activeDoor !== null) return false;

            var _this = this, dim, tempStart, tempEnd;
            var isCornerOverlapped = false;
            var overlappedCorner = this.floormodel.activeCorner;

            this.floormodel.getCorners().forEach(function (corner) {
                if (corner === overlappedCorner) isCornerOverlapped = true;
            });

            this.floormodel.getWalls().forEach(function (wall) {
                if (isCornerOverlapped) { //if corner overlapped show measurements of two walls
                    if (overlappedCorner === wall.getStart() || overlappedCorner === wall.getEnd()) {
                        if (wall.frontEdge) {
                            tempStart = wall.frontEdge.getInteriorStart();
                            tempEnd = wall.frontEdge.getInteriorEnd();
                            //if (wall.frontEdge.room) {
                            dim = new Measure(
                                {x: tempStart.x, y: tempStart.y},
                                {x: tempEnd.x, y: tempEnd.y},
                                wall.frontEdge.room
                            );
                            _this.drawMeasure(dim);
                            /*} else {
                                _this.drawLabel(wall.getCenter(), "•-"+_this.prepareDimension(wall.getLength())+"-•", "11", _this.measureColorAlt);
                            }*/
                        }
                        if (wall.backEdge) {
                            tempStart = wall.backEdge.getInteriorStart();
                            tempEnd = wall.backEdge.getInteriorEnd();
                            //if (wall.backEdge.room) {
                            dim = new Measure(
                                {x: tempStart.x, y: tempStart.y},
                                {x: tempEnd.x, y: tempEnd.y},
                                wall.backEdge.room
                            );
                            _this.drawMeasure(dim);
                            /*} else {
                                _this.drawLabel(wall.getCenter(), "•-"+_this.prepareDimension(wall.getLength())+"-•", "11", _this.measureColorAlt);
                            }*/
                        }
                    }
                } else if (wall.hovered || forceHovered) { //if wall overlapped also show measurements of sticked walls
                    var corner1 = wall.getStart();
                    var corner2 = wall.getEnd();
                    var neighbourWalls = [].concat(corner1.wallStarts, corner1.wallEnds, corner2.wallStarts, corner2.wallEnds);
                    neighbourWalls.forEach(function (wallNeighbour) {
                        if (wallNeighbour !== wall) {
                            if (wallNeighbour.frontEdge) {
                                tempStart = wallNeighbour.frontEdge.getInteriorStart();
                                tempEnd = wallNeighbour.frontEdge.getInteriorEnd();
                                if (wallNeighbour.frontEdge.room) {
                                    dim = new Measure(
                                        {x: tempStart.x, y: tempStart.y},
                                        {x: tempEnd.x, y: tempEnd.y},
                                        wallNeighbour.frontEdge.room
                                    );
                                    _this.drawMeasure(dim);
                                }
                            }
                            if (wallNeighbour.backEdge) {
                                tempStart = wallNeighbour.backEdge.getInteriorStart();
                                tempEnd = wallNeighbour.backEdge.getInteriorEnd();
                                if (wallNeighbour.backEdge.room) {
                                    dim = new Measure(
                                        {x: tempStart.x, y: tempStart.y},
                                        {x: tempEnd.x, y: tempEnd.y},
                                        wallNeighbour.backEdge.room
                                    );
                                    _this.drawMeasure(dim);
                                }
                            }
                        }
                    });
                }
            });
        };

        /* Draw a measurement line
         */
        this.drawMeasure = function (dim) {
            //draw measurement itself
            this.drawLine(
                this.convertX(dim.start.x),
                this.convertY(dim.start.y),
                this.convertX(dim.end.x),
                this.convertY(dim.end.y),
                1,
                this.measureColor
            );

            //draw measurement width
            this.drawLabel(dim.getCenter(), this.prepareDimension(dim.getLength()), null, this.measureColor);
        };

        /* Draw room's square
         */
        this.drawRoomSquare = function () {
            var _this = this;
            this.floormodel.getRooms().forEach(function (room) {
                if (room.getVisibleName()) {
                    var position = room.getRoomNamePosition();
                    var positionUpdated = {x: position.x, y: position.y + 32};
                    _this.drawLabel(positionUpdated, "~" + _this.prepareSquare(room.getSquareReal().toFixed(1)), 14);
                }
            });
        };

        /* Draw picture overlay under canvas field
         */
        this.drawBottomOverlay = function () {
            var scope = this;
            if (scope.floormodel.overlay.opacity === 0) return false;

            if (this.floormodel.overlay.updated) {
                this.overlayImg.src = this.floormodel.overlay.source;
                this.floormodel.overlay.updated = false;
            }

            if (!this.overlayImg.onload) {
                this.overlayImg.onload = function () {
                    var coef = scope.floormodel.overlay.scale;
                    var fixedWidth = this.width * coef;
                    var fixedHeight = this.height * coef;
                    var x = scope.convertX(-fixedWidth * 0.5),   // this = image loaded
                        y = scope.convertY(-fixedHeight * 0.5),
                        w = scope.convertMeasure(fixedWidth),
                        h = scope.convertMeasure(fixedHeight);

                    scope.context.globalAlpha = scope.floormodel.overlay.opacity;
                    scope.context.drawImage(this, x, y, w, h);
                    scope.context.globalAlpha = 1;
                };
            }

            if (this.overlayImg.complete) this.overlayImg.onload();
        };

        this.drawUnderlyingLevel = function () {
            var _this = this, tempWallColor = this.wallColor, tempEdgeColor = this.edgeColor;
            this.wallColor = "#fbfbfb";
            this.edgeColor = "#dbdbdb";
            this.floormodel.underlyingOverlay.getWalls().forEach(function (wall) {
                _this.drawWall(wall);
            });
            this.wallColor = tempWallColor;
            this.edgeColor = tempEdgeColor;
        };

        /** Convert from model coords to canvas coords. */
        this.convertX = function (x) {
            return (x - this.originX * this.cmPerPixel) * this.pixelsPerCm;
        };
        /** Convert from THREEjs coords to canvas coords. */
        this.convertY = function (y) {
            return (y - this.originY * this.cmPerPixel) * this.pixelsPerCm;
        };
        this.convertMeasure = function (measure) {
            return measure * this.pixelsPerCm;
        };
        this.convertBack = function (measure) {
            return measure * this.cmPerPixel;
        };

        /* Get a displayed value according to unit system
         * @return {string} value formatted to meters or feets
         */
        this.prepareDimension = function (value) {
            if (this.unitSystem === this.units.METRIC) {
                return Utils.cmToMeters(value, 2);
            } else if (this.unitSystem === this.units.IMPERIAL) {
                return Utils.cmToFeet(value);
            } else if (this.unitSystem === this.units.IMPERIAL2) {
                return Utils.cmToFeet(value, true);
            } else { //BOTH
                return Utils.cmToFeet(value) + " (" + Utils.cmToMeters(value) + ")";
            }
        };

        /* Get a displayed square value according to unit system
         * @return {string} value formatted to sq ms or sq fts
         */
        this.prepareSquare = function (value) {
            if (this.unitSystem === this.units.METRIC) {
                return value + "m²";
            } else if (this.unitSystem === this.units.IMPERIAL) {
                return Utils.sqMetersToSqFeet(value) + "ft²";
            } else { //BOTH
                return Utils.sqMetersToSqFeet(value) + "ft² (" + value + "m²)";
            }
        };

        this.changeCursor = function (cursorName) {
            var $pCanvas = $("#" + this.canvas);
            $pCanvas.removeClass("canvas_sresize canvas_seresize canvas_eresize");
            if (["canvas_sresize", "canvas_seresize", "canvas_eresize"].indexOf(cursorName) === -1) return false;
            $pCanvas.addClass(cursorName);
        };

        /** */
        this.reset = function () {
            this.resizeViewport();
            this.resetOrigin();
        };
        /** */
        this.resizeViewport = function () {
            var $canvasSel = $("#" + this.canvas);
            var $parent = $(window);
            $canvasSel.height($parent.height());
            $canvasSel.width($parent.width());
            this.canvasElement.height = $parent.height();
            this.canvasElement.width = $parent.width();
        };
        /** Sets the origin so that floormodel is centered */
        this.resetOrigin = function () {
            this.originX = -$(this.canvasElement).width() / 2.0;
            this.originY = -$(this.canvasElement).height() / 2.0;
        };
        this.panOrigin = function (dx, dy) {
            this.originX += dx;
            this.originY += dy;
        };
        this.setOriginTo = function (x, y) {
            this.originX = -x;
            this.originY = -y;
        };
    }
;
