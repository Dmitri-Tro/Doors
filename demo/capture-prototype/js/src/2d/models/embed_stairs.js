
'use strict';
var EmbedStairs = function(x, y, angle, id) {
    EmbedObject.apply(this, [x, y, angle, "stairs", id]);

    /* room's id which a stair leads to */
    this.leadsToRoom = null;

    this.editable = {
        "leadsToRoom": {
            type: "select",
            label: "Lead to hotspot",
            variants: [],
            value: this.leadsToRoom,
            casttype: "string"
        }
    };
    this.getEditable = function() {
        this.editable["leadsToRoom"].variants = this.getRooms();
        return this.editable;
    };

    this.loadSvg();
};

EmbedStairs.prototype = Object.create(EmbedObject.prototype);

EmbedStairs.prototype.loadSvg = function() {
    var defered = $.Deferred(), scope = this;
    $.get("images/svg/" + scope.type + ".svg", function(data) {
        scope.svgData = data.documentElement.outerHTML;
        scope.saveAsBase64();
        defered.resolve();
    });
    return defered.promise();
};

EmbedStairs.prototype.getSvgAsBase64 = function() {
    var svg = "";
    if (this.svgData.length > 0) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(this.svgData, "image/svg+xml");

        var w = this.getWidth(), stepMin = 16, stepMax = 33, step, lineWidth = 1 / this.scaleX;
        for (var i = 2, doContinue = true; i < Math.floor(w / 2), doContinue === true; i++) {
            if (w / i > stepMin && w / i < stepMax) {
                step = w / i;
                for (var k = 1; k < i; k++) {
                    var adaptedWidth = this.optionsMap[this.type].width * (k * step) / w;
                    var newElement = this.createLine(doc, adaptedWidth, 0, adaptedWidth, this.optionsMap[this.type].height, "#000", lineWidth);
                    doc.documentElement.appendChild(newElement);
                }
                doContinue = false;
            }
        }

        //direction
        var arrowParts = [], fh = this.optionsMap[this.type].height, fw = this.optionsMap[this.type].width;
        arrowParts.push(this.createLine(doc, 1, fh/2, fw, fh/2, "#000", "1.5"));
        arrowParts.push(this.createLine(doc, 11, fh/2+10, 1, fh/2, "#000", "1.5"));
        arrowParts.push(this.createLine(doc, 11, fh/2-10, 1, fh/2, "#000", "1.5"));

        arrowParts.forEach(function(item) {
            doc.documentElement.appendChild(item);
        });


        svg = this.srcData = "data:image/svg+xml;base64," + window.btoa(doc.documentElement.outerHTML);
    }
    return svg;
};

/* Get a vector-based direction where a person move when going upstairs or downstairs.
 * @return {THREE.Vector3}
 */
EmbedStairs.prototype.getDirection = function() {
    var vect = new THREE.Vector3(-1, 0, 0), center = this.getCenter();

    //apply rotation and scale, without positioning
    var quat = (new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.angle);
    var scale = new THREE.Vector3(this.scaleX, this.scaleY, 1);
    var temp_matrix = (new THREE.Matrix4()).compose(new THREE.Vector3(), quat, scale);

    vect.applyMatrix4(temp_matrix);

    //revert vector when staircase from bottom level to current
    if (this.leadsToRoom !== null && window.apartmentData[this.leadsToRoom].plan < +window.dataHandling.params.floor)
        vect.multiplyScalar(-1);

    //convert to 2d vector
    return new THREE.Vector2(vect.x, vect.y).normalize().add(new THREE.Vector3(center.x, center.y));
};

EmbedStairs.prototype.getDirection3D = function() {
    var vect = this.getDirection(), lens = Number(Camera.lens), vectAdapted;

    lens += 1;
    if (this.leadsToRoom !== null && window.apartmentData[this.leadsToRoom].plan < +window.dataHandling.params.floor) {
        vectAdapted = new THREE.Vector3(vect.x, lens, vect.y).multiplyScalar(-1);
    } else {
        vectAdapted = new THREE.Vector3(vect.x, lens, vect.y);
    }

    return vectAdapted;
}

/* Build an array for editable object.
 * @return {Array} array of objects. room variants
 */
EmbedStairs.prototype.getRooms = function() {
    var arRooms = [];
    for (var roomKey in window.apartmentData) {
        var item = window.apartmentData[roomKey];
        if (window.apartmentData.hasOwnProperty(roomKey) && ("plan" in item) && item.plan.toString() !== window.dataHandling.params.floor) {
            arRooms.push({
                label: item.name+" ["+item.plan+"]", value: item.filename, plan: item.plan
            });
        }
    }
    arRooms.sort(function(a, b) { //sort rooms by floor
        return a.plan - b.plan;
    });
    return arRooms;
};

EmbedStairs.prototype.toJSON = function() {
    return {
        "id": this.id,
        "x": this.x,
        "y": this.y,
        "version": this.version,
        "type": this.type,
        "angle": this.angle,
        "scaleX": this.scaleX,
        "scaleY": this.scaleY,
        "matrix": this.matrix,
        "rect": this.rect,
        "svgData": this.svgData,
        "srcData": this.srcData,
        "leadsToRoom": this.leadsToRoom
    };
};

if ( typeof exports !== 'undefined' ) module.exports = EmbedStairs;