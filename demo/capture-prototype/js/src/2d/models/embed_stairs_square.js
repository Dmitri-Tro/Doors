/* Spiral square stairs
 */

'use strict';
var EmbedStairsSquare = function(x, y, angle, id) {
    EmbedStairsCaracole.apply(this, [x, y, angle, id]);
    this.type = "stairs_square";

    this.IMAGE_SIZE = 240;
    this.IMAGE_HALFSIZE = this.IMAGE_SIZE / 2;

    this.getSvgAsBase64 = function() {
        var svg = "";
        if (this.svgData.length > 0) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(this.svgData, "image/svg+xml");

            var points = [
                {x: 0, y: -1},
                {x: 1, y: -1},
                {x: 1, y: 0},
                {x: 1, y: 1},
                {x: 0, y: 1},
                {x: -1, y: 1},
                {x: -1, y: 0},
                {x: -1, y: -1}
            ];
            var endAngle = this.degree+this.shiftAngle > 360 ? 360 : this.degree+this.shiftAngle;
            var end = this.getSupremePointByAngle(endAngle);
            var ex, ey;
            for (var i=0, cutAngle=0; cutAngle<endAngle; i++, cutAngle += 45) {
                var sx = points[i].x*this.RADIUS+this.IMAGE_HALFSIZE;
                var sy = points[i].y*this.RADIUS+this.IMAGE_HALFSIZE;

                if (endAngle < cutAngle+45) { //not a full 45 angle
                    cutAngle = endAngle;
                    var point = this.getSupremePointByAngle(cutAngle);
                    ex = point.x;
                    ey = point.y;
                } else { //full 45 angle
                    ex = points[i+1] ? points[i+1].x*this.RADIUS+this.IMAGE_HALFSIZE : points[0].x*this.RADIUS+this.IMAGE_HALFSIZE;
                    ey = points[i+1] ? points[i+1].y*this.RADIUS+this.IMAGE_HALFSIZE : points[0].y*this.RADIUS+this.IMAGE_HALFSIZE;
                }
                doc.documentElement.appendChild(this.createLine(doc, sx, sy, ex, ey, "#000000", "1"));
            }
            doc.documentElement.appendChild(this.createLine(doc, this.IMAGE_HALFSIZE, this.IMAGE_HALFSIZE-this.RADIUS, this.IMAGE_HALFSIZE, this.IMAGE_HALFSIZE, "#000000", "1"));
            doc.documentElement.appendChild(this.createLine(doc, end.x, end.y, this.IMAGE_HALFSIZE, this.IMAGE_HALFSIZE, "#000000", "1"));

            doc.documentElement.appendChild(
                this.createPath(doc, this.drawStepsPath(this.IMAGE_HALFSIZE, this.IMAGE_HALFSIZE, this.shiftAngle, this.degree+this.shiftAngle), "#000000", "1")
            );
            if (this.doShowDirection) {
                doc.documentElement.appendChild(
                    this.createPath(doc, this.drawDirectionPath(this.IMAGE_HALFSIZE, this.IMAGE_HALFSIZE, this.shiftAngle, this.degree+this.shiftAngle), "#000000", "1")
                );

                var text = (this.vDirection === this.DIRECTION_UP ? "UP" : "DOWN");
                var pos = (this.polarToCartesian(this.IMAGE_HALFSIZE, this.IMAGE_HALFSIZE, this.RADIUS / 1.3, this.shiftAngle));
                doc.documentElement.appendChild(
                    this.createText(doc, text, pos.x, pos.y, "sans-serif", 24, "#000000")
                );
            }

            svg = this.srcData = "data:image/svg+xml;base64," + window.btoa(doc.documentElement.outerHTML);
        }
        return svg;
    };

    this.getSupremePointByAngle = function(angle) {
        var ex, ey;
        var k = Math.tan( (angle-90)*THREE.Math.DEG2RAD );
        if ( angle > -45 && angle <= 45 || angle > 315 && angle <= 405 ) {
            ex = -this.RADIUS/k;
            ey = k*ex;
        }
        else if ( (angle > 45 && angle <= 135) ) {
            ey = this.RADIUS*k;
            ex = k === 0 ? this.RADIUS : ey/k;
        }
        else if ( (angle > 135 && angle <= 225) ) {
            ex = this.RADIUS/k;
            ey = k*ex;
        }
        else {
            ey = -this.RADIUS*k;
            ex = k === 0 ? 0 : ey/k;
        }
        return {x: ex+this.IMAGE_HALFSIZE, y: ey+this.IMAGE_HALFSIZE};
    };

    this.drawStepsPath = function(x, y, startAngle, endAngle) {
        var d = [], range = endAngle-startAngle, stepAngle = range/(this.steps),
            stepsAmount = range >= 360 ? this.steps : this.steps - 1;
        for (var i=0; i<stepsAmount; i++) {
            //console.log(startAngle + stepAngle * (i+1))

            var a = startAngle + stepAngle * (i+1);
            var point = this.getSupremePointByAngle(a);

            d.push("M", x, y);
            d.push("L", point.x, ",", point.y);
        }
        return d.join(" ");
    };
};

EmbedStairsSquare.prototype = Object.create(EmbedStairsCaracole.prototype); //just a hack to make instanceof working

if ( typeof exports !== 'undefined' ) module.exports = EmbedStairsSquare;