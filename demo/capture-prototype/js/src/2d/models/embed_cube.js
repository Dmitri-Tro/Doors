/* Cube object
 */

'use strict';
var EmbedCube = function(x, y, angle, id) {
    EmbedObject.apply(this, [x, y, angle, "box", id]);
    this.type = "cube";

    this.editable = {
        "height": {
            type: "number",
            label: "Height",
            value: this.height
        }
    };
};

EmbedCube.prototype = Object.create(EmbedObject.prototype);

EmbedCube.prototype.height = 90;

EmbedCube.prototype.getSvgAsBase64 = function() {
    const defaultDim = 90;
    const thicknessHoriz = 2 / defaultDim * 100 / this.scaleY;
    const thicknessVert = 2 / defaultDim * 100 / this.scaleX;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"\n' +
        '     preserveAspectRatio="none">\n' +
        '    <rect x="0" y="0" width="90" height="90" fill="#fff" stroke="none" />\n' +
        '\n' +
        '    <line x1="1" y1="1" x2="89" y2="1" stroke="black" stroke-width="' + thicknessHoriz + '%"></line>\n' +
        '    <line x1="89" y1="1" x2="89" y2="89" stroke="black" stroke-width="' + thicknessVert + '%"></line>\n' +
        '    <line x1="89" y1="89" x2="1" y2="89" stroke="black" stroke-width="' + thicknessHoriz + '%"></line>\n' +
        '    <line x1="1" y1="89" x2="1" y2="1" stroke="black" stroke-width="' + thicknessVert + '%"></line>\n' +
        '</svg>';
    return "data:image/svg+xml;base64," + window.btoa(svg);
};

EmbedCube.prototype.toJSON = function() {
    return {
        "id": this.id,
        "x": this.x,
        "y": this.y,
        "version": this.version,
        "type": this.type,
        "angle": this.angle,
        "scaleX": this.scaleX,
        "scaleY": this.scaleY,
        "height": this.height
    };
};

if ( typeof exports !== 'undefined' ) module.exports = EmbedCube;