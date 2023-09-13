/* Different functions used to maintain svg images
 */
var SvgInterface = function() {};

SvgInterface.prototype.createLine = function (document, x1, y1, x2, y2, color, w) {
    var aLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    aLine.setAttribute('x1', x1);
    aLine.setAttribute('y1', y1);
    aLine.setAttribute('x2', x2);
    aLine.setAttribute('y2', y2);
    aLine.setAttribute('stroke', color);
    aLine.setAttribute('stroke-width', w);
    return aLine;
};

SvgInterface.prototype.createPath = function(document, data, color, w) {
    var aPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    aPath.setAttribute('d', data);
    aPath.setAttribute('fill', "none");
    aPath.setAttribute('stroke', color);
    aPath.setAttribute('stroke-width', w);
    return aPath;
};

SvgInterface.prototype.createText = function(document, text, x, y, fontFamily, fontSize, color) {
    var aPath = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    aPath.setAttribute('x', x);
    aPath.setAttribute('y', y);
    aPath.setAttribute('font-family', fontFamily);
    aPath.setAttribute('font-size', fontSize);
    aPath.setAttribute('font-weight', "bold");
    aPath.setAttribute('text-shadow', "1px 1px 0px rgba(255, 255, 255, 1);");
    aPath.setAttribute('fill', color);
    aPath.setAttribute('color', color);
    aPath.setAttribute('text-anchor', "middle");
    var textNode = document.createTextNode(text);
    aPath.appendChild(textNode);
    return aPath;
};

SvgInterface.prototype.polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

SvgInterface.prototype.describeArcPath = function(x, y, radius, startAngle, endAngle, doCloseToCenter) {
    var bFullRound = false;
    if (endAngle - startAngle >= 360) {
        endAngle = startAngle + 359;
        bFullRound = true;
    }
    var start = this.polarToCartesian(x, y, radius, endAngle);
    var end = this.polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        (bFullRound ? "Z" : "")
    ];
    if (bFullRound) {
        d.push("Z");
    } else if (doCloseToCenter) {
        d.push("L " + x + "," + y + " Z");
    }

    return d.join(" ");
};

if ( typeof exports !== 'undefined' ) module.exports = SvgInterface;