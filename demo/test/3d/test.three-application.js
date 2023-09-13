var THREE = require( 'three' );
var chai = require( 'chai' );
var assert = chai.assert;
var model3d = require('../../capture-prototype/js/src/scene/model3d.js');
global.Utils = require("../../capture-prototype/js/src/2d/models/utils.js");
var Camera = require('../../capture-prototype/js/src/2d/models/camera.js' );

describe( 'three-application.js methods: ', function() {

    it( 'model 3d is defined and is object.', function() {
        assert.isDefined( model3d );
        assert.isObject( model3d );
    } )

    it( '.addShape method return THREE Shape.', function() {
        var shape = model3d.addShape( 2, 3 );
        assert.instanceOf( shape, THREE.Shape );
    } )

    it( '.makeExtrudeGeometry return THREE Extrude geometry.', function() {
        var shape = model3d.addShape( 2, 3 );
        var points = [];
        points.push( new THREE.Vector3( 0, 0, 0 ) );
        points.push( new THREE.Vector3( 1, 1, 1 ) );
        var geometry = model3d.makeExtrudeGeometry( points, shape );
        assert.instanceOf( geometry, THREE.ExtrudeGeometry );
    } )

    it( '.createMeshOfWall return THREE.Mesh with THREE.BoxGeometry.', function() {
    	var material = new THREE.MeshBasicMaterial();
        var params = {
            firstPoint: { x: 30, y: 10, z: 30 },
            nextPoint: { x: 10, y: 10, z: 10 },
            material: material
        };

		var wall = model3d.createMeshOfWall( params );
        assert.instanceOf( wall, THREE.Mesh );
        assert.instanceOf( wall.geometry, THREE.BoxGeometry );
    } )

} )

describe("model3d.getBasepointCoordinates", function() {
    model3d.sceneName = 0;
    model3d.meshArray[0] = {
        coords2d: [
            // x: x-cordinate, z: y-coordinate, r: radius-width between center and this point
            { r: 243.41689260587904, x: 157.67992999622646, z: -185.44223705048202 },
            { r: 663.5399728952721, x: 469.19361442258486, z: 469.1936144225848 },
            { r: 663.5399728952721, x: -469.1936144225848, z: 469.19361442258486 },
            { r: 663.5399728952721, x: -469.1936144225848, z: -469.19361442258486}
        ]
    };
    it ("should be inside room", function() {
        var point = model3d.getBasepointCoordinates();
        var camera = new Camera(point.x, point.y);
        var coordsList = [];
        model3d.meshArray[0].coords2d.forEach(function(coord) {
            coordsList.push({x: coord.x, y: coord.z});
        });
        assert.isTrue(camera.isInsideRoom(coordsList));
    });
});
