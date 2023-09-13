var THREE = require( 'three' );
var chai = require( 'chai' );
var assert = chai.assert;
var merging3d = require( '../../capture-prototype/js/src/scene/merging3d.js' );

describe( 'three-merging.js methods: ', function() {

    it( 'merging3d is defined and is object.', function() {
        assert.isDefined( merging3d );
        assert.isObject( merging3d );
    } )

    it( '.buildHelperLine build the helper line instance of THREE.Line.', function() {
        var line = merging3d.buildHelperLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 1, 2, 3 ) );
        assert.instanceOf( line, THREE.Line );
    } )

    it( '.buildDirectionVector return instance of THREE.Vector3.', function() {
    	var parent = new THREE.Object3D();
    	var helperLine = merging3d.buildHelperLine( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 1, 2, 3 ) );
    	var direction = merging3d.buildDirectionVector( helperLine, parent );
        assert.instanceOf( direction, THREE.Vector3 );
    } )

} )
