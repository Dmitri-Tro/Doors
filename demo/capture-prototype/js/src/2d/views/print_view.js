
'use strict';
var PrintView = function(floormodel) {
    FloorView.apply(this, arguments);
    this.floormodel = floormodel;

    // wall config
    this.wallColor = "#000";

    /* door */
    this.doorColor = "#ffffff";
    this.windowColor = "#ffffff";

    this.draw = function (options) {
        var _this = this;
        this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.context.fillStyle = "rgba(255, 255, 255, 1)";
        this.context.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        //this.drawGrid();
        //this.drawOrigin();
        this.floormodel.getRooms().forEach(function (room) {
            _this.drawRoom(room);
        });
        this.floormodel.getWalls().forEach(function (wall) {
            _this.drawWall(wall);
        });
        this.floormodel.getCorners().forEach(function (corner) {
            _this.drawCorner(corner);
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
        //this.drawCamera(this.floormodel.getActiveCamera());

        //this.drawCursor(options);
        this.drawRuler();
        this.drawCompass();
    };
};