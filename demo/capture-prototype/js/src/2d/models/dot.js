const Dot = function(x, y, id) {
    this.id = id || Utils.guid();
    this.x = x;
    this.y = y;
};

// TODO: deprecate
Dot.prototype.getX = function() {
    return this.x;
};

// TODO: deprecate
Dot.prototype.getY = function() {
    return this.y;
};

Dot.prototype.snapToAxis = function(tolerance) {
    // try to snap this corner to an axis
    /*var snapped = {
        x: false,
        y: false
    };
    var adj_corners = this.adjacentCorners();
    adj_corners.forEach(function(corner) {
        if (Math.abs(corner.x - scope.x) < tolerance) {
            scope.x = corner.x;
            snapped.x = true;
        }
        if (Math.abs(corner.y - scope.y) < tolerance) {
            scope.y = corner.y;
            snapped.y = true;
        }
    });
    return snapped;*/
    return {x: this.x, y: this.y}
};

Dot.prototype.relativeMove = function(dx, dy) {
    this.move(this.x + dx, this.y + dy);
};

Dot.prototype.move = function(newX, newY) {
    this.x = newX;
    this.y = newY;
};

Dot.prototype.distanceFrom = function(x, y) {
    var a = new THREE.Vector2( x, y );
    var b = new THREE.Vector2( this.x, this.y );
    return a.distanceTo( b );
};

Dot.prototype.distanceFromWall = function(wall) {
    return wall.distanceFrom(this.x, this.y);
};

Dot.prototype.distanceFromCorner = function(corner) {
    return this.distanceFrom(corner.x, corner.y);
};

if ( typeof exports !== 'undefined' ) module.exports = Dot;