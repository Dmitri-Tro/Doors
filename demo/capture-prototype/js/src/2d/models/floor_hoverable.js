
'use strict';
var FloorHoverable = function() {
    this.activeWall = null;
    this.activeCorner = null;
    this.activeDoor = null;
    this.activeRoom = null;
    this.activeRoomName = null;
    this.activeObject = null;
    this.activeCamera = null;
    this.activeDimension = null;
    this.activeCameraIndicator = null;

    this.getObjectFromTopLayer = function() {
        [this.activeObject, this.activeDoor, this.activeCorner, this.activeWall, this.activeRoom].forEach(function(activeItem) {
            if (activeItem !== null) return activeItem;
        });
        return null;
    };

    this.overlappedCorner = function (x, y, tolerance) {
        tolerance = tolerance || this.defaultFloorPlanTolerance;
        for (var i = 0; i < this.corners.length; i++) {
            if (this.corners[i].distanceFrom(x, y) < tolerance) {
                return this.corners[i];
            }
        }
        return null;
    };
    this.overlappedLine = function (x, y, tolerance) {
        tolerance = tolerance || this.defaultFloorPlanTolerance;
        for (var i = 0; i < this.lines.length; i++) {
            if (this.lines[i].distanceFrom(x, y) < tolerance) {
                this.lines[i].hovered = true;
                return this.lines[i];
            } else {
                this.lines[i].hovered = false;
            }
        }
        return null;
    };
    this.overlappedWall = function (x, y, tolerance) {
        tolerance = tolerance || this.defaultFloorPlanTolerance;
        for (var i = 0; i < this.walls.length; i++) {
            if (this.walls[i].distanceFrom(x, y) < tolerance) {
                this.walls[i].hovered = true;
                return this.walls[i];
            } else {
                this.walls[i].hovered = false;
            }
        }
        return null;
    };
    this.overlappedDoor = function (x, y, tolerance) {
        tolerance = tolerance || this.defaultFloorPlanTolerance;
        var holes = this.doors.concat(this.windows);
        for (var i = 0; i < holes.length; i++) {
            if (holes[i].distanceFrom(x, y) < tolerance) {
                holes[i].hovered = true;
                holes[i].checkBordersOverlapped(x, y);
                return holes[i];
            } else {
                holes[i].hovered = false;
            }
        }
        return null;
    };
    this.overlappedObject = function (x, y, tolerance) {
        tolerance = tolerance || this.defaultFloorPlanTolerance;
        var overlapped = null;
        for (var i = 0; i < this.embeds.length; i++) {
            if (Utils.isPointInsidePolygon(x, y, this.embeds[i].getRectangle())) {
                this.embeds[i].hovered = true;
                overlapped = this.embeds[i];
                this.embeds[i].checkButtonsOverlapped(x, y);
            } else {
                this.embeds[i].hovered = false;
            }
        }
        return overlapped;
    };
    this.overlappedRoom = function (x, y) {
        for (var i = 0; i < this.rooms.length; i++) {
            if (Utils.isPointInsidePolygon(x, y, this.rooms[i].corners)) {
                return this.rooms[i];
            }
        }
        return null;
    };
    this.overlappedRoomName = function (x, y) {
        for (var i = 0; i < this.rooms.length; i++) {
            var center = this.rooms[i].getRoomNamePosition();
            var amountOfLetters = this.rooms[i].getVisibleName().length;
            var averageLetterWidth = 8;
            var poly = [
                {x: center.x - amountOfLetters / 2 * 8, y: center.y + 10},
                {x: center.x + amountOfLetters / 2 * 8, y: center.y + 10},
                {x: center.x + amountOfLetters / 2 * 8, y: center.y - 10},
                {x: center.x - amountOfLetters / 2 * 8, y: center.y - 10}
            ];
            if (Utils.isPointInsidePolygon(x, y, poly)) {
                return this.rooms[i];
            }
        }
        return null;
    };
    this.overlappedCamera = function (x, y, tolerance) {
        tolerance = tolerance || this.defaultFloorPlanTolerance;
        for (var i = 0; i < this.cameras.length; i++) {
            if (this.cameras[i].distanceFrom(x, y) < tolerance) {
                return this.cameras[i];
            }
        }
        return null;
    };
    this.overlappedCameraIndicator = function (x, y) {
        var cam = this.getActiveCamera();
        if (cam) {
            cam.indicatorHighlighted = false;
            var point = cam.getIndicatorPoint();
            if (point.distanceTo(new THREE.Vector2(x, y)) < this.defaultFloorPlanTolerance / 2) {
                cam.indicatorHighlighted = true;
                return cam;
            }
        }
        return null;
    };

    /* Check if point overlapps width/height line (dimension).
     * Dimension is not a separate object, but a property of placement/room object
     * @return {Room}
     */
    this.overlappedDimension = function (x, y) {
        var dim1, dim2;
        for (var i = 0; i < this.rooms.length; i++) {
            if (dim1 = this.rooms[i].getPlacement().dimensionsCache[0]) {
                if (Utils.isPointInsidePolygon(x, y, dim1.getBoundingBox())) return dim1;
            }
            if (dim2 = this.rooms[i].getPlacement().dimensionsCache[1]) {
                if (Utils.isPointInsidePolygon(x, y, dim2.getBoundingBox())) return dim2;
            }
        }
        return null;
    };
};

if ( typeof exports !== 'undefined' ) module.exports = FloorHoverable;
