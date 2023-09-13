
'use strict';
var EmbedStairsCaracole = function(x, y, angle, id) {
    EmbedObject.apply(this, [x, y, angle, "stairs_caracole", id]);

    /* constants */
    this.RADIUS = 117;
    this.DIRECTION_UP = 1;
    this.DIRECTION_DOWN = 2;
    this.DIRECTION_CW = 1;
    this.DIRECTION_CCW = 2;

    /* room's id which a stair leads to */
    this.leadsToRoom = null;

    /* stairs angle */
    this.degree = 90;

    /* rotate object to start not from top */
    this.shiftAngle = 0;

    /* total steps */
    this.steps = 5;

    /* stair direction */
    this.doShowDirection = false;
    this.vDirection = this.DIRECTION_UP;
    this.hDirection = this.DIRECTION_CW;

    this.editable = {
        "leadsToRoom": {
            type: "switch",
            label: "Lead to hotspot",
            variants: [],
            value: this.leadsToRoom,
            casttype: "string"
        },
        "degree": {
            type: "number",
            label: "Angle",
            value: this.degree,
            width: "50%"
        },
        "steps": {
            type: "number",
            label: "Steps",
            value: this.steps,
            width: "50%"
        },
        "doShowDirection": {
            type: "switch",
            label: "Direction visibility",
            variants: [
                {label: "No", value: false, checked: 1, hideProps: ["vDirection", "hDirection"]},
                {label: "Yes", value: true, showProps: ["vDirection", "hDirection"]}
            ],
            value: this.doShowDirection,
            casttype: "boolean"
        },
        "hDirection": {
            type: "switch",
            label: "Horizontal direction",
            variants: [
                {label: "CW", value: this.DIRECTION_CW, checked: 1},
                {label: "CCW", value: this.DIRECTION_CCW}
            ],
            width: "50%",
            value: this.hDirection,
            casttype: "number"
        },
        "vDirection": {
            type: "switch",
            label: "Vertical direction",
            variants: [
                {label: "Up", value: this.DIRECTION_UP, checked: 1},
                {label: "Down", value: this.DIRECTION_DOWN}
            ],
            width: "50%",
            value: this.vDirection,
            casttype: "number"
        }
    };
    this.getEditable = function() {
        this.editable["leadsToRoom"].variants = this.getRooms();
        return this.editable;
    };

    /**
     * used in properties controller
     * @param value
     */
    this.setDegree = function(value) {
        const degreeStepRatio = 16;
        this.degree = value > 360 ? 360 : value;
        this.steps = Math.floor(this.degree / degreeStepRatio);
    };

    this.loadSvg();
};

EmbedStairsCaracole.prototype = Object.create(EmbedObject.prototype); //just a hack to make instanceof working

EmbedStairsCaracole.prototype.loadSvg = function() {
    this.svgData = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" preserveAspectRatio="none"></svg>';
    this.saveAsBase64();
};

EmbedStairsCaracole.prototype.getSvgAsBase64 = function() {
    var svg = "";
    if (this.svgData.length > 0) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(this.svgData, "image/svg+xml");

        doc.documentElement.appendChild(
            this.createPath(doc, this.describeArcPath(120, 120, this.RADIUS, this.shiftAngle, this.degree+this.shiftAngle, true), "#000000", "1")
        );
        doc.documentElement.appendChild(
            this.createPath(doc, this.drawStepsPath(120, 120, this.shiftAngle, this.degree+this.shiftAngle), "#000000", "1")
        );
        if (this.doShowDirection) {
            doc.documentElement.appendChild(
                this.createPath(doc, this.drawDirectionPath(120, 120, this.shiftAngle, this.degree+this.shiftAngle), "#000000", "1")
            );

            var text = (this.vDirection === this.DIRECTION_UP ? "UP" : "DOWN");
            var pos = (this.polarToCartesian(120, 120, this.RADIUS / 1.3, this.shiftAngle));
            doc.documentElement.appendChild(
                this.createText(doc, text, pos.x, pos.y, "sans-serif", 24, "#000000")
            );
        }

        svg = this.srcData = "data:image/svg+xml;base64," + window.btoa(doc.documentElement.outerHTML);
    }
    return svg;
};

EmbedStairsCaracole.prototype.drawStepsPath = function(x, y, startAngle, endAngle) {
    var d = [], linePoint, range = endAngle-startAngle, stepAngle = range/(this.steps),
        stepsAmount = range >= 360 ? this.steps : this.steps - 1;
    for (var i=0; i<stepsAmount; i++) {
        linePoint = this.polarToCartesian(x, y, this.RADIUS, startAngle + stepAngle * (i+1));
        d.push("M", x, y);
        d.push("L", linePoint.x, ",", linePoint.y);
    }
    return d.join(" ");
};

EmbedStairsCaracole.prototype.drawDirectionPath = function(x, y, startAngle, endAngle) {
    var path = this.describeArcPath(x, y, this.RADIUS / 1.5 , startAngle, endAngle, false);
    var end = this.polarToCartesian(x, y, this.RADIUS / 1.5, endAngle);
    var vectorAngle = endAngle + 90;

    if (this.hDirection === this.DIRECTION_CCW) {
        end = this.polarToCartesian(x, y, this.RADIUS / 1.5, startAngle);
        vectorAngle = startAngle - 90;
    }

    var arrowLeftPart = (vectorAngle - 135) * THREE.Math.DEG2RAD;
    var vectorLeftPart = new THREE.Vector2(Math.sin(arrowLeftPart), -Math.cos(arrowLeftPart)).multiplyScalar(10).add(new THREE.Vector2(end.x, end.y));

    var arrowRightPart = (vectorAngle + 135) * THREE.Math.DEG2RAD;
    var vectorRightPart = new THREE.Vector2(Math.sin(arrowRightPart), -Math.cos(arrowRightPart)).multiplyScalar(10).add(new THREE.Vector2(end.x, end.y));

    new THREE.Vector2(end.x, end.y)
    var arrowPath = [
        "M", end.x, end.y,
        "L", vectorLeftPart.x, vectorLeftPart.y,
        "M", end.x, end.y,
        "L", vectorRightPart.x, vectorRightPart.y
    ].join(" ");
    path += arrowPath;

    return path;
};

/* Build an array for editable object.
 * @return {Array} array of objects. room variants
 */
EmbedStairsCaracole.prototype.getRooms = function() {
    var arRooms = [];
    for (var roomKey in window.apartmentData) {
        var item = window.apartmentData[roomKey];
        if (window.apartmentData.hasOwnProperty(roomKey) && ("plan" in item) && item.plan.toString() !== window.dataHandling.params.floor) {
            arRooms.push({
                label: item.name, value: item.filename
            });
        }
    }
    return arRooms;
};

/**
 * Returns a direction vector for current ladder (up or down). Used in 3d player
 * @return {THREE.Vector3}
 */
EmbedStairsCaracole.prototype.getDirection3D = function () {
    var lens = Number(Camera.lens+1), vectAdapted;

    if (this.leadsToRoom !== null && window.apartmentData[this.leadsToRoom].plan < +window.dataHandling.params.floor) {
        vectAdapted = new THREE.Vector3(0, lens, 0).multiplyScalar(-1);
    } else {
        vectAdapted = new THREE.Vector3(0, lens, 0);
    }

    return vectAdapted;
};

EmbedStairsCaracole.prototype.toJSON = function() {
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
        "leadsToRoom": this.leadsToRoom,
        "degree": this.degree,
        "shiftAngle": this.shiftAngle,
        "steps": this.steps,
        "doShowDirection": this.doShowDirection,
        "vDirection": this.vDirection,
        "hDirection": this.hDirection
    };
};

if ( typeof exports !== 'undefined' ) module.exports = EmbedStairsCaracole;