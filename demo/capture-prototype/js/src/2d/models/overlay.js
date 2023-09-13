/* Overlay. Its a semi-transparent picture under floorplan field. Can be used to draw plans correctly
 * @param {string} image source, usually base64 image data
 */
var Overlay = function(source, type) {
    this.source = source;
    this.type = type;
    this.updated = false;
    this.scale = 2.6;
    this.scaleMin = 0.5;
    this.scaleMax = 6;

    this.opacity = 0.3;
    this.opacityMin = 0;
    this.opacityMax = 1;

    this.messAlert = new Alert("", "", 2000);

    this.processPDF();
    this.initSliders();
};

Overlay.prototype.setScale = function(scale) {
    if (scale >= this.scaleMin && scale <= this.scaleMax) this.scale = scale;
    this.messAlert = new Alert("Scale changed: "+this.scale, "", 2000);
    this.messAlert.render();
};

Overlay.prototype.setOpacity = function(opacity) {
    if (opacity >= this.opacityMin && opacity <= this.opacityMax) this.opacity = opacity;
    this.messAlert = new Alert("Opacity changed: "+this.opacity, "", 2000);
    this.messAlert.render();
};

/* Convert pdf to image
 */
Overlay.prototype.processPDF = function() {
    if (this.type === "pdf") {}
};

Overlay.prototype.initSliders = function() {

};

if ( typeof exports !== 'undefined' ) module.exports = Overlay;