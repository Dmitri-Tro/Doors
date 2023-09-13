
'use strict';
var ImageView = function(floormodel) {
    FloorView.apply(this, arguments);
    this.floormodel = floormodel;

    this.wallColor = "#000";
    this.edgeColor = "#000";
    this.doorColor = "#ffffff";
    this.windowColor = "#ffffff";
    this.roomColor = "#ffffff";
    this.lineColor = "#000";

    this.draw = function (options) {
        var _this = this;

        this.setCenter();

        this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        if (options !== undefined && "background" in options) { //color background
            this.context.fillStyle = options.background;
            this.context.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }

        this.floormodel.getRooms().forEach(function (room) {
            _this.drawRoom(room);
        });
        this.floormodel.getWalls().forEach(function (wall) {
            _this.drawWall(wall);
        });
        this.floormodel.getLines().forEach(function (line) {
            _this.drawLineObject(line);
        });
        this.floormodel.getCorners().forEach(function (corner) {
            //_this.drawCorner(corner);
            //_this.drawLabel(corner, "("+parseInt(corner.x, 10)+";"+parseInt(corner.y, 10)+")");
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

        if (options !== undefined && "wall_measurements" in options) this.drawWallLabels(true);
        if (options !== undefined && "square" in options) this.drawRoomSquare(true);
        if (options !== undefined && "central" in options) this.drawRoomDimensions();
        this.drawRoomNames();
    };

    this.drawDoorPosition = function() {};

    this.drawWall = function (wall) {
        var hover = /*(wall === this.viewmodel.activeWall)*/false;
        if (!hover && wall.bearing !== wall.modes.INVISIBLE && wall.frontEdge) {
            this.drawEdge(wall.frontEdge, hover);
        }
        if (!hover && wall.bearing !== wall.modes.INVISIBLE && wall.backEdge) {
            this.drawEdge(wall.backEdge, hover);
        }
    };

    this.drawEdge = function(edge, hover) {
        var _this = this;
        var color = this.edgeColor;
        if (hover && this.floormodel.mode == this.floormodel.modes.DELETE) {
            color = this.deleteColor;
        } else if (hover) {
            color = this.edgeColorHover;
        }
        var corners = edge.corners();
        this.drawPolygon(
            $.map(corners, function(corner) {
                return _this.convertX(corner.x);
            }),
            $.map(corners, function(corner) {
                return _this.convertY(corner.y);
            }),
            true,
            color,
            true,
            color,
            this.edgeWidth
        );
    };

    this.drawRoom = function(room) {
        var _this = this;
        var placement = room.getPlacement();
        this.drawPolygon(
            $.map(room.corners, function(corner) {
                return _this.convertX(corner.x);
            }),
            $.map(room.corners, function(corner) {
                return _this.convertY(corner.y);
            }),
            true,
            (!placement || placement.isUsualRoom() ? this.roomColor : this.roomColorBalcony)
        );
    };

    /* Set the center of flat to center of screen
     */
    this.setCenter = function () {
        var box = this.floormodel.getBoundingBox();

        this.originX = (Math.abs(box.maxX - box.minX) / 2.0 + box.minX) * this.pixelsPerCm - $(this.canvasElement).width() / 2.0;
        this.originY = (Math.abs(box.maxY - box.minY) / 2.0 + box.minY) * this.pixelsPerCm - $(this.canvasElement).height() / 2.0;
    };

    /* Draw central dimensions inside room
     */
    this.drawRoomDimensions = function () {
        var _this = this;
        var defaultCanvasScale = 15, fontSize = 14;

        this.floormodel.getRooms().forEach(function (room) {
            if (room.getPlacement().areDimensionsShown === true && _this.pixelsPerFoot >= defaultCanvasScale) {
                var position = room.getRoomNamePosition();
                var unitsPosition = {x: position.x, y: position.y+32};
                var metersPosition = {x: position.x, y: position.y+64};
                var dimensions = room.getDimensions();
                var unitsFormatted = dimensions[0] + " x " + dimensions[1]; //TODO use prepareDimension();
                var metersFormatted = "(" + dimensions[2] + " x " + dimensions[3] + ")";
                if (_this.unitSystem === _this.units.METRIC) {
                    _this.drawLabel(metersPosition, metersFormatted, fontSize);
                } else if (_this.unitSystem === _this.units.IMPERIAL) {
                    _this.drawLabel(unitsPosition, unitsFormatted, fontSize);
                } else { //BOTH
                    _this.drawLabel(unitsPosition, unitsFormatted, fontSize);
                    _this.drawLabel(metersPosition, metersFormatted, fontSize);
                }

                _this.drawArrow(dimensions[4].x, dimensions[4].z, dimensions[5].x, dimensions[5].z, 30);
                _this.drawArrow(dimensions[5].x, dimensions[5].z, dimensions[4].x, dimensions[4].z, 30);
                _this.drawArrow(dimensions[6].x, dimensions[6].z, dimensions[7].x, dimensions[7].z, 30);
                _this.drawArrow(dimensions[7].x, dimensions[7].z, dimensions[6].x, dimensions[6].z, 30);
            }
        });
    };
};