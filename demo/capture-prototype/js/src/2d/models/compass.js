
'use strict';
var Compass = function() {
    this.angle = 0; //east position
    this.leftPadding = 70;
    this.bottomPadding = 20;
    this.compassWidth = 62;
    this.compassHeight = 62;
    this.src = "images/compass_.png";

    this.tempAngle = 0;
    this.tempX = 0;
    this.tempY = 0;

    this.overlapped = function(x, y, height) { //compass image rectangular coordinates
        var leftTopCornerX = this.leftPadding;
        var leftTopCornerY = height - this.bottomPadding - this.compassHeight;
        var rightBottomCornerX = this.leftPadding + this.compassWidth;
        var rightBottomCornerY = height/* - this.bottomPadding*/;
        return (leftTopCornerX <= x) && (leftTopCornerY <= y) && (rightBottomCornerX >= x) && (rightBottomCornerY >= y);
    };

    /* change east coordinate */
    this.setAngle = function(deg) {
        if (deg < 0) deg += 360;
        if (deg >= 360) deg -= 360;
        this.angle = deg;
    };

    this.calcAngle = function(oldX, oldY, newX, newY) {
        if (oldX !== this.tempX && oldY !== this.tempY) {
            this.tempAngle = this.angle;
            this.tempX = oldX;
            this.tempY = oldY;
        } else {
            var d = (Math.atan2(newY, newX) - Math.atan2(oldY, oldX)) * THREE.Math.RAD2DEG % 360;
            this.setAngle(this.tempAngle + d);
        }
    };

    this.toJSON = function() {
        return {angle: this.angle};
    };
};

if ( typeof exports !== 'undefined' ) module.exports = Compass;