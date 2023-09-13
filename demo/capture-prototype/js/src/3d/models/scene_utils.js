
"use strict";
/* Model utility and helper functions
 */
var SceneUtils = {
    //triangulate and add a face to given geometry
     addFace: function(geometry, vertices, shift) {
        shift = shift || 0;
        var triangles = THREE.ShapeUtils.triangulateShape(vertices, []);
        for (var i = 0; i < triangles.length; i++) {
            geometry.faces.push(new THREE.Face3(triangles[i][0]+shift, triangles[i][1]+shift, triangles[i][2]+shift));
        }
    }
};