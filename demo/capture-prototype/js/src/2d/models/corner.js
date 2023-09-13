// x and y are floats
function Corner(floorplan, x, y, id) {

    this.id = id || Utils.guid();
    this.x = x;
    this.y = y;
    this.floorplan = floorplan; // also known as floormodel
    this.wallStarts = [];
    this.wallEnds = [];

    this.moved_callbacks = $.Callbacks();
    this.deleted_callbacks = $.Callbacks();
    this.action_callbacks = $.Callbacks();

    //corner state. =true when whole wall is merged and both corners are merged.
    this.merged = false;
}

Corner.prototype = Object.create(Dot.prototype);
Corner.prototype.constructor = Corner;

Corner.prototype.tolerance = 20;

Corner.prototype.fireOnMove = function(func) {
    this.moved_callbacks.add(func);
};

Corner.prototype.fireOnDelete = function(func) {
    this.deleted_callbacks.add(func);
};

Corner.prototype.fireOnAction = function(func) {
    this.action_callbacks.add(func);
};

Corner.prototype.snapToAxis = function(tolerance) {
    var scope = this;

    // try to snap this corner to an axis
    var snapped = {
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
    this.moved_callbacks.fire(this.x, this.y);
    this.wallStarts.forEach(function(wall) {
        wall.fireMoved();
    });
    this.wallEnds.forEach(function(wall) {
        wall.fireMoved();
    });
    return snapped;
};

Corner.prototype.fireAction = function(action) {
    this.action_callbacks.fire(action)
};

Corner.prototype.remove = function() {
    this.deleted_callbacks.fire(this);
};

Corner.prototype.removeAll = function() {
    for( var i = 0; i < this.wallStarts.length; i++ ) {
        this.wallStarts[i].remove();
    }
    for( var i = 0; i < this.wallEnds.length; i++ ) {
        this.wallEnds[i].remove();
    }
    this.remove()
};

Corner.prototype.move = function(newX, newY, merge) {
    if (merge === undefined) merge = true;

    this.x = newX;
    this.y = newY;
    if (merge) this.mergeWithIntersected();
    this.moved_callbacks.fire(this.x, this.y);
    this.wallStarts.forEach(function(wall) {
        wall.fireMoved();
    });
    this.wallEnds.forEach(function(wall) {
        wall.fireMoved();
    });
};

/**
 * Get corners which have a mutual wall with this corner
 * @return {Array}
 */
Corner.prototype.adjacentCorners = function() {
    var retArray = [];
    for( var i = 0; i < this.wallStarts.length; i++ ) {
        retArray.push(this.wallStarts[i].getEnd());
    }
    for( var i = 0; i < this.wallEnds.length; i++ ) {
        retArray.push(this.wallEnds[i].getStart());
    }
    return retArray;
};
Corner.prototype.adjacentCornersWithoutOrphan = function() {
    return this.adjacentCorners().filter(function (corner) {
        return !this.wallToOrFrom(corner).orphan;
    }.bind(this));
};

Corner.prototype.isWallConnected = function(wall) {
    for( var i = 0; i < this.wallStarts.length; i++ ) {
        if (this.wallStarts[i] == wall) {
            return true;
        }
    }
    for( var i = 0; i < this.wallEnds.length; i++ ) {
        if (this.wallEnds[i] == wall) {
            return true;
        }
    }
    return false;
};

Corner.prototype.distanceFrom = function(x, y) {
    var a = new THREE.Vector2( x, y );
    var b = new THREE.Vector2( this.x, this.y );
    return a.distanceTo( b );
};

Corner.prototype.distanceFromWall = function(wall) {
    return wall.distanceFrom(this.x, this.y);
};

Corner.prototype.distanceFromCorner = function(corner) {
    return this.distanceFrom(corner.x, corner.y);
};

Corner.prototype.detachWall = function(wall) {
    Utils.removeValueById(this.wallStarts, wall.id);
    Utils.removeValueById(this.wallEnds, wall.id);
    if (this.wallStarts.length == 0 && this.wallEnds.length == 0) {
        this.remove();
    }
};

Corner.prototype.attachStart = function(wall) {
    this.wallStarts.push(wall)
};

Corner.prototype.attachEnd = function(wall) {
    this.wallEnds.push(wall)
};

// get wall to corner
Corner.prototype.wallTo = function(corner) {
    for( var i = 0; i < this.wallStarts.length; i++ ) {
        if (this.wallStarts[i].getEnd() === corner) {
            return this.wallStarts[i];
        }
    }
    return null;
};

Corner.prototype.wallFrom = function(corner) {
    for( var i = 0; i < this.wallEnds.length; i++ ) {
        if (this.wallEnds[i].getStart() === corner) {
            return this.wallEnds[i];
        }
    }
    return null;
};

Corner.prototype.wallToOrFrom = function(corner) {
    return this.wallTo(corner) || this.wallFrom(corner);
};

Corner.prototype.combineWithCorner = function(corner) {
    // update position to other corner's
    this.x = corner.x;
    this.y = corner.y;
    // absorb the other corner's wallStarts and wallEnds
    for( var i = corner.wallStarts.length - 1; i >= 0; i-- ) {
        corner.wallStarts[i].setStart( this );
    }
    for( var i = corner.wallEnds.length - 1; i >= 0; i-- ) {
        corner.wallEnds[i].setEnd( this );
    }
    // delete the other corner
    corner.removeAll();
    this.removeDuplicateWalls();
    this.floorplan.update();
};

/** fires in drawing mode when the wall intersects another wall. Makes a merging or wall division by default.
 * @param {boolean} onlySearch if true, merging will not happen
 * @return {boolean}
 */
Corner.prototype.mergeWithIntersected = function(onlySearch) {
    if (this.mergeWithCorner(onlySearch)) return true;
    if (this.mergeWithWall(onlySearch)) return true;

    return false;
};

/**
* Try to search another corner in the same place where current corner is situated. Merge them by default
* @param {boolean} onlySearch flag indicates whether to only search corner without merging or merge it immediately.
*/
Corner.prototype.mergeWithCorner = function(onlySearch) {
    //console.log('mergeWithIntersected for object: ' + this.type);
    // check corners
    for (var i = 0; i < this.floorplan.getCorners().length; i++) {
        var obj = this.floorplan.getCorners()[i];
        if (this.distanceFromCorner(obj) < this.tolerance && obj !== this) {
            if (onlySearch !== true) this.combineWithCorner(obj);
            return obj;
        }
    }
    return false;
};

/**
 * Try to search wall under the current corner. Merge it by default
 * @param {boolean} onlySearch flag indicates whether to only search a wall without merging or merge them immediately.
 */
Corner.prototype.mergeWithWall = function(onlySearch) {
    // check walls
    for( var i = 0; i < this.floorplan.getWalls().length; i++ ) {
        var obj = this.floorplan.getWalls()[i];
        if (this.distanceFromWall(obj) < this.tolerance && !this.isWallConnected( obj )) {
            if (onlySearch !== true) {
                // update position to be on wall
                var intersection = Utils.closestPointOnLine(this.x, this.y,
                    obj.getStart().x, obj.getStart().y,
                    obj.getEnd().x, obj.getEnd().y);
                this.x = intersection.x;
                this.y = intersection.y;
                // merge this corner into wall by breaking wall into two parts
                var corner = obj.divide(this.x, this.y, this.floorplan);
                this.mergeWithCorner();
                this.floorplan.update();
                this.merged = true;
                return corner; //return corner appeared after splitting
            }
            return obj; //return intersected wall
        }
    }
    return false;
};

// ensure we do not have duplicate walls (i.e. same start and end points)
Corner.prototype.removeDuplicateWalls = function() {
    // delete the wall between these corners, if it exists
    var wallEndpoints = {};
    var wallStartpoints = {};
    var doorsWindowsCache = [];
    var floormodel = this.floorplan;
    for( var i = this.wallStarts.length - 1; i >= 0; i-- ) {
        if (this.wallStarts[i].getEnd() === this) {
            // remove zero length wall
            this.wallStarts[i].remove();
        } else if (this.wallStarts[i].getEnd().id in wallEndpoints) {
            // remove duplicated wall
            doorsWindowsCache = doorsWindowsCache.concat(this.wallStarts[i].detachDoors(floormodel));
            this.wallStarts[i].remove();
        } else {
            wallEndpoints[this.wallStarts[i].getEnd().id] = true;
        }
    }
    for( var i = this.wallEnds.length - 1; i >= 0; i-- ) {
        if (this.wallEnds[i].getStart() === this) {
            // removed zero length wall
            this.wallEnds[i].remove();
        } else if (this.wallEnds[i].getStart().id in wallStartpoints) {
            // removed duplicated wall
            doorsWindowsCache = doorsWindowsCache.concat(this.wallEnds[i].detachDoors(floormodel));
            this.wallEnds[i].remove();
        } else {
            wallStartpoints[this.wallEnds[i].getStart().id] = true;
        }
    }

    //also search for walls with same corners but looking in different directions
    for( var k = this.wallStarts.length - 1; k >= 0; k-- ) {
        for( var m = this.wallEnds.length - 1; m >= 0; m-- ) {
            if (this.wallStarts[k].getEnd() === this.wallEnds[m].getStart()) {
                if (this.wallStarts[k].id !== this.wallEnds[m].id) {
                    doorsWindowsCache = doorsWindowsCache.concat(this.wallEnds[m].detachDoors(floormodel));
                    this.wallEnds[m].remove();
                }
            }
        }
    }

    //attach doors back to walls
    doorsWindowsCache.forEach(function(door){
        door.assignWall();
        if (!door.wall) {
            console.warn('Some ' + (door instanceof Door ? 'door' : 'window') + ' lost when merged.');
            floormodel.removeObject(door);
        } else {
            door.wall.fireOnMove($.proxy(door.recalcCoordinates, door));
        }
    }.bind(this));

    //remove duplicate doors
    doorsWindowsCache.forEach(function(door){
        door.removeOverlapDoors(floormodel);
    }.bind(this));
};

// position order is important in 3d to build walls correctly
Corner.prototype.getOrderPosition = function() {
    for (var i=0; i<this.floorplan.corners.length; i++) {
        if (this.id === this.floorplan.corners[i].id) return i;
    }
    return -1;
};

Corner.prototype.toJSON = function() {
    var propNames = [
        "id",
        "x",
        "y",
        "wallStarts",
        "wallEnds"
    ];
    var props = {};
    propNames.forEach(function(val, key, arProps) {
        if (this.hasOwnProperty(val)) props[val] = this[val];
    }.bind(this));
    return props;
};

if ( typeof exports !== 'undefined' ) module.exports = Corner;