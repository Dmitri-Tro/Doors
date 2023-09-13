var Utils = {
    /** Returns in the unique elemnts in arr */
    unique: function (arr, hashFunc) {
        var tResults = [];
        var tMap = {};
        for (var tI = 0; tI < arr.length; tI++) {
            if (!tMap.hasOwnProperty(arr[tI])) {
                tResults.push(arr[tI]);
                tMap[hashFunc(arr[tI])] = true;
            }
        }
        return tResults;
    },
    /** Remove value from array, if it is present */
    removeValue: function (array, value) {
        for (var tI = array.length - 1; tI >= 0; tI--) {
            if (array[tI] === value) {
                array.splice(tI, 1);
            }
        }
    },
    /** Remove value from array by it's id, if it is present */
    removeValueById: function (array, valueId) {
        for (var tI = array.length - 1; tI >= 0; tI--) {
            if ("id" in array[tI] && array[tI].id === valueId) {
                array.splice(tI, 1);
            }
        }
    },
    /** Subtracts the elements in subArray from array */
    subtract: function (array, subArray) {
        return Utils.removeIf(array, function (el) {
            return Utils.hasValue(subArray, el);
        });
    },
    /** Checks if value is in array */
    hasValue: function (array, value) {
        for (var tI = 0; tI < array.length; tI++) {
            if (array[tI] === value) {
                return true;
            }
        }
        return false;
    },
    guid: function() {
        function gen(count) {
            var out = "";
            for (var i=0; i<count; i++) {
                out += (((1+Math.random())*0x10000)|0).toString(16).substring(1);
            }
            return out;
        }
        return [gen(2), gen(1), gen(1), gen(1), gen(3)].join("-");
    },
    pointDistanceFromLine: function( x, y, x1, y1, x2, y2 ) {
        var point = this.closestPointOnLine(x, y, x1, y1, x2, y2);
        var dx = x - point.x;
        var dy = y - point.y;
        return Math.sqrt(dx * dx + dy * dy);
    },
    closestPointOnLine: function(x, y, x1, y1, x2, y2) { //on line's segment.
        // thanks, http://stackoverflow.com/a/6853926
        var A = x - x1;
        var B = y - y1;
        var C = x2 - x1;
        var D = y2 - y1;

        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = dot / len_sq;

        var xx, yy;

        if (param < 0 || (x1 == x2 && y1 == y2)) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        return {
            x: xx,
            y: yy
        }
    },
    pointPerpendicularToLine: function(x, y, x1, y1, x2, y2) {
        var k = ((y2-y1) * (x-x1) - (x2-x1) * (y-y1)) / ((y2-y1) * (y2-y1) + (x2-x1) * (x2-x1));
        var x4 = x - k * (y2-y1);
        var y4 = y + k * (x2-x1);

        return {
            x: x4,
            y: y4
        }
    },
    // points is array of points with x,y attributes
    isClockwise: function( points ) {
        // make positive
        var subX = Math.min(0, Math.min.apply(null, $.map(points, function(p) {
            return p.x;
        })));
        var subY = Math.min(0, Math.min.apply(null, $.map(points, function(p) {
            return p.x;
        })));
        var newPoints = $.map(points, function(p) {
            return {
                x: p.x - subX,
                y: p.y - subY
            }
        });

        // determine CW/CCW, based on:
        // http://stackoverflow.com/questions/1165647
        var sum = 0;
        for ( var i = 0; i < newPoints.length; i++ ) {
            var c1 = newPoints[i];
            if (i == newPoints.length-1) {
                var c2 = newPoints[0]
            } else {
                var c2 = newPoints[i+1];
            }
            sum += (c2.x - c1.x) * (c2.y + c1.y);
        }
        return (sum >= 0);
    },

    // angle between 0,0->x1,y1 and 0,0->x2,y2 (-pi to pi)
    angle: function( x1, y1, x2, y2 ) {
        var dot = x1 * x2 + y1 * y2;
        var det = x1 * y2 - y1 * x2;
        var angle = -Math.atan2( det, dot );
        return angle;
    },

    // shifts angle to be 0 to 2pi
    angle2pi: function( x1, y1, x2, y2 ) {
        var theta = this.angle(x1, y1, x2, y2);
        if (theta < 0) {
            theta += 2*Math.PI;
        }
        return theta;
    },

    // shift the items in an array by shift (positive integer)
    cycle: function(arr, shift) {
        var ret = arr.slice(0);
        for (var i = 0; i < shift; i++) {
            var tmp = ret.shift();
            ret.push(tmp);
        }
        return ret;
    },

    isPointInsidePolygon: function(x, y, pointsList) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

        var inside = false;
        for (var i = 0, j = pointsList.length - 1; i < pointsList.length; j = i++) {
            var xi = pointsList[i].x, yi = pointsList[i].y;
            var xj = pointsList[j].x, yj = pointsList[j].y;

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    },

    capitalizeFirstLetter: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    /* Remove underscores. Capitalize first letters in words.
     */
    humanize: function(str) {
        var frags = str.split('_');
        for (var i=0; i<frags.length; i++) {
            frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
        }
        return frags.join('');
    },

    /* Convert centimeters to meters
     * @param {number} cm
     * @param {number} tolerance amount of digits after .
     * @return {string} converted value with units
     */
    cmToMeters: function(cm, tolerance) {
        tolerance = tolerance || 1;
        return (cm / 100).toFixed(tolerance) + "m";
    },

    /* Convert centimeters to feet/inches
     * @param {boolean} onlyFeets flag indicating whether to return a feet value with decimals(12.58) or feet with inches value (12"7)
     * @return {string} converted value with units
     */
    cmToFeet: function(cm, onlyFeets) {
        var realFeet = ((cm*0.393700) / 12);
        if (onlyFeets) return realFeet.toFixed(2) + "ft";

        var feet = Math.floor(realFeet);
        var inches = Math.round((realFeet - feet) * 12);
        if (inches === 12) {
            feet++; inches = 0;
        }
        return feet + "'" + inches + '"';
    },

    //TODO remove one of metersToFeet and cmToFeet
    metersToFeet: function(meters) {
        var inches = (meters * 0.393700787).toFixed(0);
        var feet = Math.floor(inches / 12);
        inches %= 12;
        return feet+"'"+inches;
    },

    /* Convert square meters to square feets
     * @return {string} converted value with units
     */
    sqMetersToSqFeet: function(sqm) {
        return (sqm / 0.09290304).toFixed(2);
    },

    getKeyByValue: function (object, value) {
        for (var key in object){
            if (object.hasOwnProperty(key) && object[key] === value){
                return key;
            }
        }
        return null;
    },

    debounce: function (func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    },

    /**
     * Determines if 2 segments intersect. {p0, p1} - first segment, {p1, p2}-second.
     * @param p0_x
     * @param p0_y
     * @param p1_x
     * @param p1_y
     * @param p2_x
     * @param p2_y
     * @param p3_x
     * @param p3_y
     * @return {boolean}
     */
    doSegmentsIntersect: function(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
        var s1_x, s1_y, s2_x, s2_y;
        s1_x = p1_x - p0_x;
        s1_y = p1_y - p0_y;
        s2_x = p3_x - p2_x;
        s2_y = p3_y - p2_y;

        var s, t;
        s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
        t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
        {
            // Collision detected
            return true;
        }

        return false; // No collision
    },
    /**
     * Find a point-intersection of 2 lines.
     * @param x1 first line
     * @param y1 first line
     * @param x2 first line
     * @param y2 first line
     * @param x3 second line
     * @param y3 second line
     * @param x4 second line
     * @param y4 second line
     * @return {{x,y}|null}
     */
    linesIntersect: function(x1, y1, x2, y2, x3, y3, x4, y4)
    {
        var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
        if (denom == 0) {
            return null;
        }
        ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
        ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
        return {
            x: x1 + ua*(x2 - x1),
            y: y1 + ua*(y2 - y1),
            seg1: ua >= 0 && ua <= 1,
            seg2: ub >= 0 && ub <= 1
        };
    },

    sendFileToBrowser: function(sData, sFileName) {
        var download = document.createElement('a');
        download.setAttribute("href", sData);
        download.setAttribute("download", sFileName);
        document.body.appendChild(download);
        download.click();
        download.remove();
    },

    /* Normalize angle to 0 - 359 */
    normalizeAngle: function (angle) {
        var angle = angle > 0 ? angle % 360 : 360 - -(angle % 360);
        return angle === 360 ? 0 : angle; 
    },

    degToRad: function (degrees) {
        return degrees * Math.PI / 180;
    },

    radToDeg: function (radians) {
        return radians * (180 / Math.PI);
    },

    coordinatesPanoTo3d: function (ath, bottomAtv, topAtv, cameraHeight) {
        // function to get 2d coordinates
        var alpha = 180 - 90 - bottomAtv;

        // radius is line on the floor between camera base and point
        var radius = cameraHeight / Math.sin(this.degToRad(bottomAtv)) * Math.sin(this.degToRad(alpha));
        var newX = Math.cos(this.degToRad(ath)) * radius;
        var newY = cameraHeight - radius * Math.tan(this.degToRad(topAtv));
        var newZ = Math.sin(this.degToRad(ath)) * radius;

        return {
            x: newX,
            y: newY,
            z: newZ,
            r: radius
        }
    },
    coordinates3dToPano: function (x, y, z, r, cameraHeight) {
        var ath = ((x / r) > 0 ? this.radToDeg(Math.atan(z / x)) : this.radToDeg(Math.atan(z / x)) + 180);
        var bottomAtv = this.radToDeg(Math.atan(cameraHeight / r));
        var topAtv = -this.radToDeg(Math.atan((y - cameraHeight) / r));

        return {
            ath: ath,
            bottomAtv: bottomAtv,
            topAtv: topAtv
        }
    },
    
    /**
     * @param  {number} angleH angle in radians horisontal 
     * @param  {number} angleV angle in radians vertical
     * @param  {number} height 
     */
    coordsPanoTo3d: function (angleH, angleV, height) {
        /**
         *       B
         *      /| 
         *   c / | a
         *    /  |
         * A /___| C
         *     b
         */

        // Normalize pano angle
        angleV = -Math.abs(angleV) + Math.PI / 2;

        var B = angleV;
        var C = Math.PI / 2;
        var A = Math.PI - C - B;

        var radius = height / Math.cos(B) * Math.cos(A);

        var X = Math.cos(angleH) * radius;
        var Z = Math.sin(angleH) * radius;

        return {
            x: X,
            y: 0,
            z: Z,
            r: radius
        };
    },

    coords3dToPano: function (x, y, z) {
        // Hint: Y === Height of camera
        if (typeof(x) === 'object') {
            y = x.y;
            z = x.z;
            x = x.x;
        };

        var xzRadius = Math.hypot(x, z);
        var radius = Math.hypot(x, y, z);

        var angleV = (Math.PI / 2) - Math.asin(xzRadius / radius);
        var angleH = Math.acos(x / xzRadius);

        return {
            ath: Utils.radToDeg(angleH),
            atv: Utils.radToDeg(angleV)
        }
    },

    getBoundingBoxOfPolygon: function (polygon) {
        var boundingBox = {
            lowestX: Infinity,
            lowestY: Infinity,
            highestX: -Infinity,
            highestY: -Infinity
        };

        polygon.forEach(function (point) {
            boundingBox.lowestX = point.x < boundingBox.lowestX ? point.x : boundingBox.lowestX;
            boundingBox.highestX = point.x > boundingBox.highestX ? point.x : boundingBox.highestX;
            boundingBox.lowestY = point.y < boundingBox.lowestY ? point.y : boundingBox.lowestY;
            boundingBox.highestY = point.y > boundingBox.highestY ? point.y : boundingBox.highestY;
        });

        return boundingBox;
    },

    getCenterOfPolygon: function (polygon) {
        var boundingBox = this.getBoundingBoxOfPolygon(polygon);

        return {
            x: boundingBox.lowestX + ((boundingBox.highestX - boundingBox.lowestX) / 2),
            y: boundingBox.lowestY + ((boundingBox.highestY - boundingBox.lowestY) / 2)
        };
    },
    
    getRotationOfLine: function (x1, x2 ,y1, y2) {
        var theta = Math.atan2(x2 - x1, y1 - y2);

        if (theta < 0) {
            theta += Math.PI * 2;
        }

        return theta;
    },
    
    isInsidePanoPolygon: function (x, y, pointsList) {
        // http://cs.haifa.ac.il/~gordon/plane.pdf

        /**       Fix when :
         *          ▄██████▄  
         *         ███pano███ 
         *         ███rama███ 
         * start -> ▀██████▀ <- end 
         * here   -180 || 180   here
         */

        var boundingBox = this.getBoundingBoxOfPolygon(pointsList);
        pointsListClone = JSON.parse(JSON.stringify(pointsList)); 

        if (Math.abs(boundingBox.highestX - boundingBox.lowestX) > 180) {
            pointsListClone.forEach(function (p) {
                p.x = this.reflectAngle(p.x, true);
            }.bind(this));
    
            x = this.reflectAngle(x, true);
        }

        return this.isPointInsidePolygon(x, y, pointsListClone); //Todo: get projection on sphere 
    },

    reflectAngle: function (x, panoCoordinates) {
        if (panoCoordinates) {
            return x > 0 ? x - 180 : x + 180; 
        } else {
            return x > 180 ? x - 180 : x + 180;
        }
    },

    getPolarPointOnVector: function (x1, x2, r1, r2, t) {
        var aX = 0;
        var aR = 0;

        var a = r1 * Math.sin(x1) + (r2 * Math.sin(x2) - r1 * Math.sin(x1)) * t;
        var b = r1 * Math.cos(x1) + (r2 * Math.cos(x2) - r1 * Math.cos(x1)) * t;

        if (b > 0) {
            aX = Math.atan(a / b);
        } else {
            aX = Math.PI + Math.atan(a / b);
        }

        aR = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));

        return {
            x: aX,
            r: aR
        }
    },

    // http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
    getIntersectionBetweenTwoLines: function (line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
        var denominator, a, b, numerator1, numerator2, result = {
            x: null,
            y: null,
            onLine1: false,
            onLine2: false
        };

        denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));

        if (denominator == 0) {
            return result;
        }

        a = line1StartY - line2StartY;
        b = line1StartX - line2StartX;

        numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
        numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);

        a = numerator1 / denominator;
        b = numerator2 / denominator;

        // if we cast these lines infinitely in both directions, they intersect here:
        result.x = line1StartX + (a * (line1EndX - line1StartX));
        result.y = line1StartY + (a * (line1EndY - line1StartY));

        /*
        * it is worth noting that this should be the same as:
        * x = line2StartX + (b * (line2EndX - line2StartX));
        * y = line2StartX + (b * (line2EndY - line2StartY));
        */

        // if line1 is a segment and line2 is infinite, they intersect if:
        if (a > 0 && a < 1) {
            result.onLine1 = true;
        }

        // if line2 is a segment and line1 is infinite, they intersect if:
        if (b > 0 && b < 1) {
            result.onLine2 = true;
        }

        // if line1 and line2 are segments, they intersect if both of the above are true
        return result;
    },

    // https://stackoverflow.com/questions/27426053/find-specific-point-between-2-points-three-js
    getPointBetweenVectorsByLength: function (pointA, pointB, length) {
        var dir = pointB.clone().sub(pointA).normalize().multiplyScalar(length);
        return pointA.clone().add(dir);
    },

    getPointBetweenVectorsByPercentage: function (pointA, pointB, percentage) {
        if (percentage === undefined) percentage = 0.5;

        var dir = pointB.clone().sub(pointA);
        var len = dir.length();
        dir = dir.normalize().multiplyScalar(len * percentage);
        return pointA.clone().add(dir);
    },

    rotateAroundPivot: function (px, py, angle, cx, cy) {
        var sin = Math.sin(Utils.degToRad(angle));
        var cos = Math.cos(Utils.degToRad(angle));
        
        // translate point back to origin:
        var opx = px - cx;
        var opy = py - cy;

        // rotate point
        var x = opx * cos - opy * sin;
        var y = opx * sin + opy * cos;

        // translate point back:
        opx = x + cx;
        opy = y + cy;

        return {
            x: opx,
            y: opy
        }
    },

    getSortIndices: function (toSort) {
        for (var i = 0; i < toSort.length; i++) {
            toSort[i] = [toSort[i], i];
        }
        toSort.sort(function (left, right) {
            return left[0] < right[0] ? -1 : 1;
        });
        var sortIndices = [];
        for (var j = 0; j < toSort.length; j++) {
            sortIndices.push(toSort[j][1]);
            toSort[j] = toSort[j][0];
        }
        return sortIndices;
    },

    cartesianToPolar: function (x, y, inDegrees) {
        var radius = Math.hypot(x, y);
        var angle = Math.atan2(y, x);

        return {
            radius: radius,
            angle: inDegrees ? this.radToDeg(angle) : angle
        }
    },

    polarToCartesian: function (radius, angle, inDegrees) {
        var x = radius * Math.cos(inDegrees ? this.degToRad(angle) : angle);
        var y = radius * Math.sin(inDegrees ? this.degToRad(angle) : angle);

        return {
            x: x,
            y: y
        }
    },

    getClosestAngle: function (angle, angles) {
        var minDiff = Infinity;
        var closestAngle = angle;

        angles.forEach(function (a) {
            var diff = Math.abs(angle - a);
            if (diff > 180) {
                diff = Math.abs(this.reflectAngle(angle) - this.reflectAngle(a));
            }

            if (diff < minDiff) {
                minDiff = diff;
                closestAngle = a;
            }
        }.bind(this));

        return closestAngle;
    },

    // http://www.euclideanspace.com/maths/geometry/rotations/euler/index.htm
    getPanoCoordinateWithPitchAndRoll: function (coordinate, pitch, roll) {
        var radAth = Utils.degToRad(coordinate.ath);
        var radAtv = Utils.degToRad(coordinate.atv);

        coordinate.atv += (pitch * Math.cos(radAth)) + (roll * Math.cos(radAth + Math.PI / 2));
        coordinate.ath += (roll * Math.sin(radAtv));

        return coordinate;
    }
};

if ( typeof exports !== 'undefined' ) module.exports = Utils;