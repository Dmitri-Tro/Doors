// util function for checking room
function checkRoom( sceneName, defaultContour, data, oldScene ) {

    it( '.changeScene() method must create empty properties.', function() {
        model3d.changeScene( oldScene, sceneName );
        assert( model3d.sceneName === sceneName );
        assert.isObject( model3d.meshArray[ model3d.sceneName ] );
        assert.isArray( model3d.meshArray[ model3d.sceneName ].doors );
    } );

    it( '.changeOfRoom() must create array with x, y, z, r numbered coordinates.', function( done ) {
        var arr = model3d.changeOfRoom( defaultContour );
        arr.forEach( function( el, key ) {
            for ( var coord in el ) {
                if ( typeof( el[ coord ] ) !== 'number' ) {
                    allNumbers = false;
                    done( new Error( '#' + key + ' element consist not number coordinate:' + coord + ' with value ' + el[ coord ] ) );
                }
            }
        } );
        done();
        assert.isArray( arr );
    } );

    it( '.cell is array equal to input data.', function() {
        assert( model3d.cell === defaultContour );
        assert.isArray( model3d.cell );
    } );

    it( '.cell is cached to meshArray object', function() {
        assert.equal( defaultContour, model3d.meshArray[ sceneName ].cell );
    } );

    it( '.existedRoom is array with +1 length compare to krpano contour.', function() {
        assert( ( model3d.existedRoom.length - defaultContour.length ) === 1 );
        assert.isArray( model3d.existedRoom );
    } );

    it( '.walls property is Object3D.', function() {
        assert.instanceOf( model3d.walls, THREE.Object3D );
    } );

    it( '.walls.children consist of more then 4 walls.', function() {
        assert.isAtLeast( model3d.walls.children.length, 4 );
    } );

    it( '.wallsCache property is Object3D.', function() {
        assert.instanceOf( model3d.wallsCache, THREE.Object3D );
    } );

    it( '.exportWalls property is Object3D.', function() {
        assert.instanceOf( model3d.exportWalls, THREE.Object3D );
    } );

    it( '.export include .exportWalls.', function() {
        var exist = false;
        model3d.export.children.forEach( function( el ) {
            if ( el === model3d.exportWalls ) {
                exist = true;
            }
        }.bind( this ) );
        assert( exist );
    } );

    it( 'Scene include .walls object.', function() {
        var exist = false;
        model3d.scene.children.forEach( function( el ) {
            if ( el === model3d.walls ) {
                exist = true;
            }
        }.bind( this ) );
        assert( exist );
    } );

    it( '.updateHolesFromKrpanoHotspots() must create the door.', function() {

        var holes = model3d.updateHolesFromKrpanoHotspots( data );

        assert.lengthOf( holes, 1 );
        assert.equal( data[ 0 ].name, holes[ 0 ].name );
        assert.equal( 'door', holes[ 0 ].type );
    } );

    it( 'Holes input data cached to meshArray.', function() {
        assert.equal( data, model3d.meshArray[ sceneName ].holes );
    } );

    it( '.doors is array and cached to meshArray.', function() {
        assert.isArray( model3d.doors );
        assert.equal( model3d.doors, model3d.meshArray[ sceneName ].doors );
    } );

    it( '.source property of door is current scene.', function() {
        assert( model3d.doors[ 0 ].source === sceneName );
    } );

    it( 'Door have numeric main properties: x, y, z, width, height.', function() {
        assert.isNumber( model3d.doors[ 0 ].x );
        assert.isNumber( model3d.doors[ 0 ].y );
        assert.isNumber( model3d.doors[ 0 ].z );
        assert.isNumber( model3d.doors[ 0 ].width );
        assert.isNumber( model3d.doors[ 0 ].height );
    } );

    it( '.firstVector .nextVector .direction of door is instances of THREE.Vector3', function() {
        assert.instanceOf( model3d.doors[ 0 ].firstVector, THREE.Vector3 );
        assert.instanceOf( model3d.doors[ 0 ].nextVector, THREE.Vector3 );
        assert.instanceOf( model3d.doors[ 0 ].direction, THREE.Vector3 );
    } );

    it( '.doorFrameCoordinates is array with 2 points, that have numeric coordinates', function() {
        assert.isArray( model3d.doors[ 0 ].doorFrameCoordinates );
        model3d.doors[ 0 ].doorFrameCoordinates.forEach( function( el ) {
            assert.isNumber( el.x );
            assert.isNumber( el.z );
        } )
    } );

}

// check existing of merged scene
function checkMergedScene( name ) {

    it( 'Camera settings (for 2d export purposes) have numeric properties: bottom, centerX, centerZ, height, left, right, top, width.', function() {

        assert.property( merging3d.cameraSettings, 'bottom' );
        assert.property( merging3d.cameraSettings, 'centerX' );
        assert.property( merging3d.cameraSettings, 'centerZ' );
        assert.property( merging3d.cameraSettings, 'height' );
        assert.property( merging3d.cameraSettings, 'left' );
        assert.property( merging3d.cameraSettings, 'right' );
        assert.property( merging3d.cameraSettings, 'top' );
        assert.property( merging3d.cameraSettings, 'width' );

        for ( var i in merging3d.cameraSettings ) {
            assert.isNumber( merging3d.cameraSettings[ i ] );
        }
    } );

    it( 'Room scene id is in list of merged id\'s.', function() {
        assert.includeMembers( merging3d.mergedRoomsId, [ name ] );
    } );
}

// util function for creating random contour
function createContour( sceneName, ath1, ath2, ath3, ath4, doorName, target, wallIndexes, oldScene ) {

    // random input data for walls
    var defaultContour = [ {
        ath: ath1 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 20,
        bottomAtv: 10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2,
        topAtv: -10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2
    }, {
        ath: ath2 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 20,
        bottomAtv: 10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2,
        topAtv: -10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2
    }, {
        ath: ath3 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 20,
        bottomAtv: 10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2,
        topAtv: -10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2
    }, {
        ath: ath4 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 20,
        bottomAtv: 10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2,
        topAtv: -10 + Math.sign( ( ( Math.random() > 0.5 ) + '' ).search( true ) + 0.5 ) * Math.random() * 2
    } ];

    // input data for door
    var middleAth = ( defaultContour[ wallIndexes[ 0 ] ].ath + defaultContour[ wallIndexes[ 1 ] ].ath ) / 2;
    var bottomAtv = Math.max.apply( null, [ defaultContour[ wallIndexes[ 0 ] ].bottomAtv, defaultContour[ wallIndexes[ 1 ] ].bottomAtv ] );
    var topAtv = Math.min.apply( null, [ defaultContour[ wallIndexes[ 0 ] ].topAtv, defaultContour[ wallIndexes[ 1 ] ].topAtv ] );
    var data = [ {
        name: doorName,
        target: target,
        wallIndexes: wallIndexes,
        holeContour: [ {
            ath: middleAth - 7,
            atv: topAtv + 3
        }, {
            ath: middleAth + 7,
            atv: topAtv + 3
        }, {
            ath: middleAth + 7,
            atv: bottomAtv + 15
        }, {
            ath: middleAth - 7,
            atv: bottomAtv + 15
        } ]
    } ];

    checkRoom( sceneName, defaultContour, data, oldScene );
}

// three-application scene init
describe( 'Check three-application.js init:', function() {

    it( 'Must have global "model3d" variable.', function() {
        assert.isObject( model3d );
    } );

    it( '.init() method must create the three.js scene.', function() {
        model3d.init();
        assert.instanceOf( model3d.scene, THREE.Object3D );
    } );

} );

// build first contour
describe( 'Building first random contour with door:', function() {
    createContour( 'test-room-1', -45, 45, 135, 225, 'door_0', 'test-room-2', [ 0, 1 ] );
} );

// merge scene init
describe( 'Check three-merging.js init:', function() {

    it( 'Must have global merging3d variable', function() {
        assert.isObject( merging3d );
    } );

    it( '.init() method must create the three.js scene.', function() {
        merging3d.init();
        assert.instanceOf( merging3d.scene, THREE.Object3D );
    } );

} );


// merge first contour
describe( 'Drop first contour to merging scene:', function() {

    var firstRoom = 'test-room-1';

    it( 'Merged object is instance of "Object3D" and room exist in merging scene.', function() {

        var room = merging3d.addMeshesOfRoomToScene( firstRoom );

        var exist = false;

        merging3d.scene.children.forEach( function( el ) {
            if ( el === room ) {
                exist = true;
            }
        } );

        assert( exist );

        assert.instanceOf( room, THREE.Object3D );

    } );

    checkMergedScene( firstRoom );

    // for first merging only
    it( 'The door of source scene copied also.', function() {
        assert( model3d.doors[ 0 ] === merging3d.doors[ 0 ] );
    } );

} );

// second room
describe( 'Building second random contour with door:', function() {
    createContour( 'test-room-2', 0, 90, 180, 270, 'door_1', 'test-room-1', [ 1, 2 ], 'test-room-1' );
} );

// merge second scene
describe( 'Drop second contour to merging scene:', function() {

    var room = {};
    var secondRoom = 'test-room-2';

    it( 'Second room is in merged scene and instance of Object3D.', function() {
        room = merging3d.merge( 'test-room-2', merging3d.doors[ 0 ].uuid, model3d.doors[ 0 ].uuid );

        var exist = false;

        merging3d.scene.children.forEach( function( el ) {
            if ( el === room.group ) {
                exist = true;
            }
        } );

        assert( exist );

        assert.instanceOf( room.group, THREE.Object3D );
    } );

    checkMergedScene( secondRoom );

    it( 'Second room change initial position.', function() {
        assert( ( room.group.position.x !== 0 ) && ( room.group.position.z !== 0 ) );
    } );

    it( 'Angle between rooms is defined.', function() {
        assert.isDefined( room.roomsAngle );
    } );

    it( 'Second room rotation is equal angle between rooms.', function() {
        assert.equal( room.roomsAngle.toFixed( 4 ), room.group.rotation.y.toFixed( 4 ) );
    } );


    it( 'First door have numeric main properties: x, y, z, width, height.', function() {
        assert.isNumber( room.firstDoor.x );
        assert.isNumber( room.firstDoor.y );
        assert.isNumber( room.firstDoor.z );
        assert.isNumber( room.firstDoor.width );
        assert.isNumber( room.firstDoor.height );
    } );

    it( '.firstVector .nextVector .direction of first door is instances of THREE.Vector3', function() {
        assert.instanceOf( room.firstDoor.firstVector, THREE.Vector3 );
        assert.instanceOf( room.firstDoor.nextVector, THREE.Vector3 );
        assert.instanceOf( room.firstDoor.direction, THREE.Vector3 );
    } );

    it( '.doorFrameCoordinates of first door is array with 2 points, that have numeric coordinates', function() {
        assert.isArray( room.firstDoor.doorFrameCoordinates );
        room.firstDoor.doorFrameCoordinates.forEach( function( el ) {
            assert.isNumber( el.x );
            assert.isNumber( el.z );
        } )
    } );


    it( 'Second door have numeric main properties: x, y, z, width, height.', function() {
        assert.isNumber( room.secondDoor.x );
        assert.isNumber( room.secondDoor.y );
        assert.isNumber( room.secondDoor.z );
        assert.isNumber( room.secondDoor.width );
        assert.isNumber( room.secondDoor.height );
    } );

    it( '.firstVector .nextVector .direction of second door is instances of THREE.Vector3', function() {
        assert.instanceOf( room.secondDoor.firstVector, THREE.Vector3 );
        assert.instanceOf( room.secondDoor.nextVector, THREE.Vector3 );
        assert.instanceOf( room.secondDoor.direction, THREE.Vector3 );
    } );

    it( '.doorFrameCoordinates of second door is array with 2 points, that have numeric coordinates', function() {
        assert.isArray( room.secondDoor.doorFrameCoordinates );
        room.secondDoor.doorFrameCoordinates.forEach( function( el ) {
            assert.isNumber( el.x );
            assert.isNumber( el.z );
        } )
    } );

    // after(function() {
        setTimeout(function() {
            merging3d.svgExport2dPlan();
            describe( 'Testing of exports of merged scene.', function () {

                it( 'test', function () {
                });

            });
        }, 1500);
    // });

} );



// remerge case
// describe( 'Remerging case testing.', function() {
//     it( 'test of merging 3d', function() {
//         merging3d.remerge();
//     } )
// } )
