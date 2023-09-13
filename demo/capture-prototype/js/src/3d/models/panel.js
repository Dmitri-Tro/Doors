"use strict";

/* Represents a 3d wall mesh
 */
var Panel = function(geometry, material) {
    THREE.Mesh.call(this, geometry, material);

    this.types = {
        "SIMPLE": 1,
        "WITH_DOOR": 2 //meshes with door have to be extruded with a hole
    };
    this.type = this.types.SIMPLE;
};

Panel.height = 150;
Panel.thickness = 10;

Panel.prototype = Object.create(THREE.Mesh.prototype);

Panel.prototype.isSimple = function() {
    return this.type === this.types.SIMPLE;
};

Panel.prototype.isWithDoor = function() {
    return this.type === this.types.WITH_DOOR;
};