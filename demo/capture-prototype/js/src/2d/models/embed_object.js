
'use strict';
function EmbedObject(x, y, angle, type, id) {
    var scope = this;

    this.isEmbedObject = true; //for checking in child subclasses

    /*  ver 1.0 = objects position is based on left top corner
        ver 2.0 = objects position is based on center
     */
    this.version = 2.0;

    this.id = id || Utils.guid();
    this.x = x; //position
    this.y = y; //position
    this.type = type || "chair";
    this.angle = angle || 0; //rotation angle
    this.scaleX = 1; //scaling coeeficient
    this.scaleY = 1; //scaling coeeficient

    this.matrix = new THREE.Matrix4();
    this.optionsMap = {
        "bedroom": {width: 160, height: 178.133},
        "bedroom_single": {width: 107, height: 180},
        "bath": {width: 93, height: 176},
        "bath_corner": {width: 140, height: 129},
        "toilet": {width: 64, height: 44.19},
        "urinal": {width: 48, height: 45.6},
        "nightstand": {width: 80, height: 60},
        "chair": {width: 54, height: 54},
        "stove": {width: 60, height: 60},
        "sink": {width: 60, height: 38},
        "sink2": {width: 60, height: 47}, //not used, left for old plans support
        "sink_kitchen": {width: 76.59, height: 60},
        "stairs": {width: 120, height: 89},
        "stairs_scissor": {width: 263, height: 200}, //not used, supported for old plans
        "stairs_switch": {width: 263, height: 200}, //not used, supported for old plans
        "stairs_spiral": {width: 200, height: 200},
        "stairs_spiral_quarter": {width: 120, height: 120}, //not used, supported for old plans
        "stairs_rect_quarter": {width: 120, height: 120}, //not used, supported for old plans
        "stairs_caracole": {width: 240, height: 240},
        "stairs_square": {width: 240, height: 240},
        "stairs_rect_caracole": {width: 240, height: 240},
        "shower": {width: 90, height: 126},
        "box": {width: 80, height: 80},
        "wardrobe": {width: 96, height: 80},
        "table": {width: 90, height: 90},
        "plant": {width: 80, height: 80},
        "fridge": {width: 60, height: 60},
        "handrail": {width: 260, height: 20},
        "cube": {width: 90, height: 90}
    };
    this.rect = {};
    this.svgData = "";
    this.srcData = "";

    /* state */
    this.helperIconWidth = this.helperIconHeight = 24;
    this.helperIconHalfWidth = this.helperIconWidth;
    this.hovered = false; //when mouse pointer is over icon
    this.scaleHovered = false; //when mouse pointer is over scale function
    this.scaleXHovered = false;
    this.scaleYHovered = false;
    this.rotateHovered = false; //and over rotate function

    this.editable = {};

    this.init();
};

EmbedObject.prototype.__proto__ = Object.create(SvgInterface.prototype); //no supported by ie10

EmbedObject.prototype.init = function(){
    this.rect = this.getGeometry();
};

/* Origin of object can be in center (in new versions >=2.0) and in left top corner(old 1.0 version)
 * @return {boolean}
 */
EmbedObject.prototype.isOriginInCenter = function() {
    return this.version > 1.0;
};

//default threejs geometry of a rectangle
EmbedObject.prototype.getGeometry = function() {
    var geometry = new THREE.Geometry();
    var w = this.optionsMap[this.type].width, h = this.optionsMap[this.type].height;
    if (this.isOriginInCenter()) {
        geometry.vertices.push( new THREE.Vector3( -w/2, -h/2, 0 ) );
        geometry.vertices.push( new THREE.Vector3( w/2, -h/2, 0 ) );
        geometry.vertices.push( new THREE.Vector3( w/2, h/2, 0 ) );
        geometry.vertices.push( new THREE.Vector3( -w/2, h/2, 0 ) );
    } else {
        geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
        geometry.vertices.push( new THREE.Vector3( w, 0, 0 ) );
        geometry.vertices.push( new THREE.Vector3( w, h, 0 ) );
        geometry.vertices.push( new THREE.Vector3( 0, h, 0 ) );
    }
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.faces.push(new THREE.Face3(0, 2, 3));
    geometry.computeBoundingBox();

    return geometry;
};

EmbedObject.prototype.getWidth = function() {
    return this.optionsMap[ this.type ].width * this.scaleX;
};

EmbedObject.prototype.getHeight = function() {
    return this.optionsMap[ this.type ].height * this.scaleY;
};

EmbedObject.prototype.getCenter = function() {
    var rect = this.getGeometry(), c = new THREE.Vector3();
    rect.applyMatrix(this.getTransformMatrix());
    rect.computeBoundingBox();
    rect.boundingBox.getCenter(c);
    return {x: c.x, y: c.y};
};

EmbedObject.prototype.getPosition = function() {
    return [this.x, this.y];
};

/* get selection bounding box coordinates
 * @param {boolean} remove additional padding
 * @return {array}
 */
EmbedObject.prototype.getRectangle = function(doNotAddPadding) {
    var rect = this.getGeometry();
    rect.applyMatrix(this.getTransformMatrix());

    function getBoundings(rect) {
        var bxmin = Math.min(rect[0].x, rect[1].x, rect[2].x, rect[3].x);
        var bymin = Math.min(rect[0].y, rect[1].y, rect[2].y, rect[3].y);
        var bxmax = Math.max(rect[0].x, rect[1].x, rect[2].x, rect[3].x);
        var bymax = Math.max(rect[0].y, rect[1].y, rect[2].y, rect[3].y);
        var box = [];
        box[0] = {x: bxmin, y: bymin};
        box[1] = {x: bxmax, y: bymin};
        box[2] = {x: bxmax, y: bymax};
        box[3] = {x: bxmin, y: bymax};
        return box;
    }

    function expand(vertices, tolerance) {
        vertices[0].x -= tolerance; vertices[0].y -= tolerance;
        vertices[1].x += tolerance; vertices[1].y -= tolerance;
        vertices[2].x += tolerance; vertices[2].y += tolerance;
        vertices[3].x -= tolerance; vertices[3].y += tolerance;
        return vertices;
    }

    var boundings = getBoundings(rect.vertices);
    if (!doNotAddPadding) expand(boundings, this.helperIconHalfWidth);
    return boundings;
};

/* get object vertices with transformations
 * @return {array}
 */
EmbedObject.prototype.getVertices = function() {
    var rect = this.getGeometry();
    rect.applyMatrix(this.getTransformMatrix());
    return rect.vertices;
};

/* Get current transformation matrix of the object, including rotation, scale, position
 */
EmbedObject.prototype.getTransformMatrix = function() { //todo just use compose
    var temp_matrix = new THREE.Matrix4();
    var pos = new THREE.Vector3(this.x, this.y, 0);
    var quat = (new THREE.Quaternion).setFromAxisAngle(new THREE.Vector3( 0, 0, 1 ), this.angle);
    var scale = new THREE.Vector3(this.scaleX, this.scaleY, 1);

    temp_matrix.compose(pos, quat, scale);

    return temp_matrix;
};

/* Check flags if mouse pointer overlaps rotate or scale buttons.
 */
EmbedObject.prototype.checkButtonsOverlapped = function(x, y) {
    var rect = this.getRectangle();
    var matrix = this.getTransformMatrix();
    var geometry = this.getGeometry();
    var leftBottom = new THREE.Vector3(rect[3].x, rect[3].y , 0);
    var rightBottom = new THREE.Vector3(rect[2].x, rect[2].y, 0);
    var rightTop = new THREE.Vector3(rect[1].x, rect[1].y, 0);
    var rightMiddle = new THREE.Vector3(geometry.vertices[1].x, (geometry.vertices[1].y + geometry.vertices[2].y) / 2, 0).applyMatrix4(matrix);
    var middleBottom = new THREE.Vector3((geometry.vertices[0].x + geometry.vertices[1].x) / 2, geometry.vertices[2].y, 0).applyMatrix4(matrix);
    var point = new THREE.Vector3(x, y, 0);

    this.rotateHovered = leftBottom.distanceTo(point) <= this.helperIconHalfWidth;
    this.scaleHovered = rightBottom.distanceTo(point) <= this.helperIconHalfWidth;
    this.scaleXHovered = rightMiddle.distanceTo(point) <= this.helperIconHalfWidth / 2;
    this.scaleYHovered = middleBottom.distanceTo(point) <= this.helperIconHalfWidth / 2;
};

EmbedObject.prototype.rotateFromPoint = function(x, y) {
    if (this.rotateStartPoint && "rotateInitialAngle" in this) {
        var c = this.getCenter();
        var point = new THREE.Vector2(x, y);
        var buttonPoint = new THREE.Vector2(this.rotateStartPoint.x, this.rotateStartPoint.y);
        var center = new THREE.Vector2(c.x, c.y);
        var buttonAngle = new THREE.Vector2().subVectors(buttonPoint, center).angle();
        var pointAngle = new THREE.Vector2().subVectors(point, center).angle();
        var angle = (pointAngle - buttonAngle + this.rotateInitialAngle) % (Math.PI * 2);
    }
    this.rotate(angle);
};
EmbedObject.prototype.rotate = function(angle) {
    function toFixedNumber(num, x){ //.toFixed() replacement, which doesn't use strings
        if (typeof num === 'string') num = parseFloat(num, 10);
        var pow = Math.pow(10, x);
        return +( Math.round(num*pow) / pow );
    }
    this.angle = toFixedNumber(angle, 2);
    //this.matrix.multiply(new THREE.Matrix4().makeRotationZ(angle));
    //do not rotate selection rectangle, but rotate only the image
};
EmbedObject.prototype.snapAngle = function() {
    var scope = this;
    var ranges = [-360, -270, -180, -90, 0, 90, 180, 270, 360];
    var tolerance = 7.5;
    ranges.forEach(function(rangeAngle) {
        if (scope.angle * THREE.Math.RAD2DEG > rangeAngle - tolerance && scope.angle * THREE.Math.RAD2DEG < rangeAngle + tolerance) {
            scope.angle = rangeAngle * THREE.Math.DEG2RAD;
        }
    });
};

EmbedObject.prototype.scaleFromPoint = function(x, y) {
    var rect = this.getRectangle(true);
    var leftTop = new THREE.Vector2(rect[0].x, rect[0].y);
    var leftBottom = new THREE.Vector2(rect[3].x, rect[3].y);
    var rightBottom = new THREE.Vector2(rect[2].x, rect[2].y);
    var rightTop = new THREE.Vector2(rect[1].x, rect[1].y);
    var diagonal = leftTop.distanceTo(rightBottom);
    var newPoint = new THREE.Vector2(x, y);
    var newDiagonal = leftTop.distanceTo(newPoint);
    var coefficient = newDiagonal / diagonal;
    if (coefficient < 1 &&
        (leftBottom.distanceTo(newPoint) / this.optionsMap[ this.type ].width <= 0.5 || rightTop.distanceTo(newPoint) / this.optionsMap[ this.type ].height <= 0.5)
    ) coefficient = 1; //do not scale less than 50% of object's width

    this.scaleX *= coefficient;
    this.scaleY *= coefficient;
    if (this.isOriginInCenter()) {
        var newX = leftTop.x + leftTop.distanceTo(rightTop) / 2 * coefficient;
        var newY = leftTop.y + leftTop.distanceTo(leftBottom) / 2 * coefficient;
        this.moveTo(newX, newY);
    }
};
EmbedObject.prototype.scaleXFromPoint = function(x, y) {
    var curMatrix = this.getTransformMatrix();
    var geometry = this.getGeometry();
    var middleLeft = new THREE.Vector3(geometry.vertices[0].x, (geometry.vertices[1].y + geometry.vertices[2].y) / 2, 0).applyMatrix4(curMatrix);
    var middleRight = new THREE.Vector3(geometry.vertices[1].x, (geometry.vertices[1].y + geometry.vertices[2].y) / 2, 0).applyMatrix4(curMatrix);
    var len = middleLeft.distanceTo(middleRight);
    var newPoint = new THREE.Vector3(x, y, 0);
    var newLen = middleLeft.distanceTo(newPoint);
    var coefficient = newLen / len;
    if (coefficient < 1 && newLen / this.optionsMap[ this.type ].width <= 0.5) coefficient = 1; //do not scale less than 50% of object's width

    this.scaleX *= coefficient;

    if (this.isOriginInCenter()) { //move origin to left top corner
        var v = new THREE.Vector2().subVectors(middleRight, middleLeft);
        v.multiplyScalar( (coefficient - 1) / 2 );
        this.moveBy(v.x, v.y);
    }
};
EmbedObject.prototype.scaleYFromPoint = function(x, y) {
    var curMatrix = this.getTransformMatrix();
    var geometry = this.getGeometry();
    var middleTop = new THREE.Vector3((geometry.vertices[0].x + geometry.vertices[1].x) / 2, geometry.vertices[0].y, 0).applyMatrix4(curMatrix);
    var middleBottom = new THREE.Vector3((geometry.vertices[0].x + geometry.vertices[1].x) / 2, geometry.vertices[2].y, 0).applyMatrix4(curMatrix);
    var len = middleTop.distanceTo(middleBottom);
    var newPoint = new THREE.Vector3(x, y, 0);
    var newLen = middleTop.distanceTo(newPoint);
    var coefficient = newLen / len;
    if (coefficient < 1 && newLen / this.optionsMap[ this.type ].height <= 0.5) coefficient = 1; //do not scale less than 50% of object's width

    this.scaleY *= coefficient;

    if (this.isOriginInCenter()) { //move origin to left top corner
        var v = new THREE.Vector2().subVectors(middleBottom, middleTop);
        v.multiplyScalar( (coefficient - 1) / 2 );
        this.moveBy(v.x, v.y);
    }
};
EmbedObject.prototype.scale = function(scale) {
    this.scaleX = scale;
    this.scaleY = scale;
};

EmbedObject.prototype.moveTo = function(x, y) {
    this.x = x; this.y = y;
};
EmbedObject.prototype.moveBy = function(dx, dy) {
    this.x += dx; this.y += dy;
};

EmbedObject.prototype.saveAsBase64 = function() {
    this.srcData = "data:image/svg+xml;base64," + window.btoa(this.svgData);
};

EmbedObject.prototype.getSvgAsBase64 = function() {
    return this.srcData;
};

/* try to snap this object to wall
 * @param {array} walls - a list of floorplan walls
 * @param {number} tolerance - distance to wall to make object stick to wall
 */
EmbedObject.prototype.snapToWall = function(rooms, tolerance) {
    var scope = this;
    var rect = this.getVertices();
    var center = this.getCenter();
    if (rooms.length) {
        //check here if object is inside wall
        for (var k = 0; k < rooms.length; k++) {
            var room = rooms[k];
            if ( //are all points inside room?
            Utils.isPointInsidePolygon(rect[0].x, rect[0].y, room.corners) &&
            Utils.isPointInsidePolygon(rect[1].x, rect[1].y, room.corners) &&
            Utils.isPointInsidePolygon(rect[2].x, rect[2].y, room.corners) &&
            Utils.isPointInsidePolygon(rect[3].x, rect[3].y, room.corners)
            ) {
                var edge = room.edgePointer;
                while (true) {
                    var start = edge.getInteriorStart();
                    var end = edge.getInteriorEnd();
                    var iMin = -1, distMin = Infinity, arNearestPoints = [];
                    for (var i = 0; i < rect.length; i++) {
                        var dist = Utils.pointDistanceFromLine(rect[i].x, rect[i].y, start.x, start.y, end.x, end.y);
                        arNearestPoints.push(Utils.closestPointOnLine(rect[i].x, rect[i].y, start.x, start.y, end.x, end.y));
                        if (dist < tolerance) {
                            if (dist < distMin) {
                                distMin = dist;
                                iMin = i;
                            }
                        }
                    }

                    if (iMin > -1) {
                        var point = arNearestPoints[iMin];
                        var offsetX = scope.isOriginInCenter() ? rect[iMin].x - center.x : rect[iMin].x - rect[0].x;
                        var offsetY = scope.isOriginInCenter() ? rect[iMin].y - center.y : rect[iMin].y - rect[0].y;

                        scope.x = point.x - offsetX;
                        scope.y = point.y - offsetY;
                    }

                    if (edge.next === room.edgePointer) {
                        break;
                    } else {
                        edge = edge.next;
                    }
                }
            }
        }
    }
};

/* Rotate object to some angle, when it becomes paralel to some wall
 */
EmbedObject.prototype.tempAngle = 0;
EmbedObject.prototype.rotateToRandomRoomAngle = function(rooms) {
    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    var rect = this.getVertices(), arAngles = [], v = new THREE.Vector2();
    if (rooms.length) {
        //check here if object is inside wall
        for (var k = 0; k < rooms.length; k++) {
            var room = rooms[k];
            if ( //are all points inside room?
            Utils.isPointInsidePolygon(rect[0].x, rect[0].y, room.corners) &&
            Utils.isPointInsidePolygon(rect[1].x, rect[1].y, room.corners) &&
            Utils.isPointInsidePolygon(rect[2].x, rect[2].y, room.corners) &&
            Utils.isPointInsidePolygon(rect[3].x, rect[3].y, room.corners)
            ) {
                var edge = room.edgePointer;
                while (true) {
                    var st = edge.wall.getStart();
                    var end = edge.wall.getEnd();
                    arAngles.push(v.clone().subVectors(new THREE.Vector2(end.x, end.y), new THREE.Vector2(st.x, st.y)).angle());

                    if (edge.next === room.edgePointer) {
                        break;
                    } else {
                        edge = edge.next;
                    }
                }
                this.tempAngle = getRandomInt(arAngles.length);
                this.rotate(arAngles[this.tempAngle]);
            }
        }
    }
};

EmbedObject.prototype.toJSON = function() {
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
        "srcData": this.srcData
    };
};

if ( typeof exports !== 'undefined' ) module.exports = EmbedObject;