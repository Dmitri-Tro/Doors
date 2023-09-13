
'use strict';

/** Window object constructor
 * @param {number} x1 door's start corner coord
 * @param {number} y1 door's start corner coord
 * @param {number} x2 door's end corner coord
 * @param {number} y2 door's end corner coord
 * @param {FloorModel} floormodel system object to take array of walls to attach door to and other stuff
 * @param {number=} direction direction of door with path, exactly 1 or -1
 */
function Window(x1, y1, x2, y2, floormodel, direction) {
    Door.apply(this, arguments);

    this.bridgeWidth = 10; //bridge is a small dash on center of window
    this.editable = {
        "height": {
            type: "number",
            label: "Height",
            value: this.height,
            width: "49%"
        },
        "heightFromFloor": {
            type: "number",
            label: "Height from floor",
            value: this.heightFromFloor,
            width: "49%"
        },
        "length": {
            type: "number",
            label: "Length",
            value: this.length
        }
    };

    this.height = Window.staticHeight;
    this.heightFromFloor = Window.staticHeightFromFloor;

    /**
     * get a small dash coordinates on a window.
     * todo now its used every render frame, try to cache it
     * @return {[number, number, number, number]}
     */
    this.getBridge = function() {
        var sub = new THREE.Vector2();
        var angle = sub.subVectors(new THREE.Vector2(this.x1, this.y1), new THREE.Vector2(this.x2, this.y2)).angle();
        var dx = this.bridgeWidth * Math.cos(angle);
        var dy = this.bridgeWidth * Math.sin(angle);
        var x4 = (this.x1 + this.x2) / 2;
        var y4 = (this.y1 + this.y2) / 2;
        return [x4 - dx, y4 - dy, x4 + dx, y4 + dy];
    };

    /* After first window's height change, default height also changes
     */
    this.setHeight = function(value) {
        this.height = value;
        Window.staticHeight = value;
    };

    this.setHeightFromFloor = function(value) {
        this.heightFromFloor = value;
        Window.staticHeightFromFloor = value;
    };
};

/* default value of height and height from floor */
Window.staticHeight = 140;
Window.staticHeightFromFloor = 80;

Window.prototype.toJSON = function() {
    return {
        "x1": this.x1,
        "y1": this.y1,
        "x2": this.x2,
        "y2": this.y2,
        "id": this.id,
        "wall": this.wall,
        "wallWidth": this.wallWidth,
        "startDistance": this.startDistance,
        "height": this.height,
        "heightFromFloor": this.heightFromFloor,
        "length": this.length
    };
};

Window.prototype.removeOverlapDoors = Door.prototype.removeOverlapDoors;

if ( typeof exports !== 'undefined' ) module.exports = Window;