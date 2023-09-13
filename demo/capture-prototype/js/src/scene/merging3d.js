//==========================
// make available in nodejs
//==========================
if ( typeof exports !== 'undefined' ) {
    var THREE = require( 'three' );
}

( function() {
    var merging3d = {

        // empty essences for fill it in future
        scene: {},
        rooms: {}, //threejs Object3d
        camera: {},
        groundMaterials: [],
        renderer: {},
        controls: {},
        plane: {},
        doors: [],
        mergedRoomsId: [],
        existedRooms: {},
        threeMergingScene: {},
        cameraSettings: {},
        axis: {},
        compass: {},
        compassAngle: 0,

        init: function() {

            // add viewport for three js scene
            if ( $( '#three-merging' ).length !== 0 ) {
                $( '#three-merging' ).remove();
            }
            $( '#view3d' ).append( '<div id="three-merging"></div>' );
            this.threeMergingScene = $( '#three-merging' );

            this.threeMergingScene.css( {
                width: $(window).width()+'px',
                height: $(window).height()+'px'
            } );

            var those = this;

            this.scene = new THREE.Scene();

            this.camera = new THREE.OrthographicCamera( -480, 480, 320, -320, 0.1, 10000 );
            this.addCamera();
            this.addSpotLight();
            this.renderer = new THREE.WebGLRenderer( {
                alpha: true,
                preserveDrawingBuffer: true
            } );
            this.renderer.setClearColor( 0xffffff, 0 );
            this.threeMergingScene.append( this.renderer.domElement );

            this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

            this.setSceneSize( $(window).width(), $(window).height(), false, this.renderer );
            // this.controls.maxPolarAngle = Math.PI / 2.1;
            this.controls.addEventListener( 'change', function() { those.render(); } );

            this.groundMaterials.push( new THREE.MeshLambertMaterial( { color: 0x477841 } ) );
            this.groundMaterials.push( new THREE.MeshLambertMaterial( { color: 0x686c5e } ) );

            this.camera.zoom = 0.25;
            this.camera.updateProjectionMatrix();
            this.controls.update();

            //this.render();

            // init svg
            $( '.svg' ).svg();
        },
        addAxis: function() {
            // axis helper for scene
            this.axis = new THREE.AxisHelper( 140 );
            this.scene.add( this.axis );
        },
        changeMaterials: function( forExport ) {

            // black and white colors for export
            var exportWallMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: false, side: THREE.DoubleSide } );
            var exportFloorMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: false } );

            // defoult colors
            var modelWallMaterial = new THREE.MeshBasicMaterial( { color: 0xcccccc, wireframe: false, side: THREE.DoubleSide } );
            var modelFloorMaterial = new THREE.MeshBasicMaterial( { color: 0xa8775a, wireframe: false } );

            this.scene.children.forEach( function( obj ) {
                if ( obj.type === 'Object3D' ) {
                    chooseColor( obj );
                }
            } );

            // recursive function to gone inside nested groups
            function chooseColor( parent ) {
                parent.children.forEach( function( mesh ) {
                    if ( mesh.type === 'Object3D' ) {
                        chooseColor( mesh );
                    } else {
                        switch ( mesh.geometry.type ) {

                            // it's a wall
                            case 'BoxGeometry':
                                mesh.material = forExport ? exportWallMaterial : modelWallMaterial;
                                break;

                                // it's a wall with window / door
                            case 'Geometry':
                                mesh.material = forExport ? exportWallMaterial : modelWallMaterial;
                                break;

                                // it's a floor
                            case 'ExtrudeGeometry':
                                mesh.material = forExport ? exportFloorMaterial : modelFloorMaterial;
                                break;
                        }
                    }
                } );
            }

            this.render();
        },
        setSceneSize: function( width, height, exportCase, renderer ) {

            // change size of wrapper dom element
            this.threeMergingScene.css( {
                width: width,
                height: height
            } );

            // change size of viewport
            renderer.setSize( width, height );

            if ( exportCase ) {

                this.controls.reset();

                this.camera.left = -this.cameraSettings.width / 2;
                this.camera.right = this.cameraSettings.width / 2;
                this.camera.bottom = -this.cameraSettings.height / 2;
                this.camera.top = this.cameraSettings.height / 2;

                this.camera.position.set( this.cameraSettings.centerX, 10, this.cameraSettings.centerZ );
                this.camera.lookAt( new THREE.Vector3( this.cameraSettings.centerX, 0, this.cameraSettings.centerZ ) );
                this.controls.target.set( this.cameraSettings.centerX, 0, this.cameraSettings.centerZ );

            } else {

                this.camera.left = -width / 2;
                this.camera.right = width / 2;
                this.camera.bottom = -height / 2;
                this.camera.top = height / 2;

                this.camera.zoom = 1;
                this.camera.position.y = 2000;

            }

            this.camera.updateProjectionMatrix();
            this.controls.update();
            renderer.render( this.scene, this.camera );
        },
        addCamera: function() {
            // camera position
            this.camera.position.x = 0;
            this.camera.position.y = 1000;
            this.camera.position.z = 0;
            this.camera.lookAt( new THREE.Vector3() );
            this.scene.add( this.camera );
        },
        addSpotLight: function() {
            // add spot lights
            /*var spotLight1 = new THREE.SpotLight( 0xffffff );
            spotLight1.position.set( 20, 800, 100 );
            this.scene.add( spotLight1 );

            var spotLight2 = new THREE.SpotLight( 0xffffff );
            spotLight2.position.set( 50, 100, 800 );
            this.scene.add( spotLight2 );

            var spotLight3 = new THREE.SpotLight( 0xffffff );
            spotLight3.position.set( -800, 100, -40 );
            this.scene.add( spotLight3 );

            var spotLight4 = new THREE.SpotLight( 0xffffff );
            spotLight4.position.set( 50, 100, -800 );
            this.scene.add( spotLight4 );

            var spotLight5 = new THREE.SpotLight( 0xffffff );
            spotLight5.position.set( 800, 100, -40 );
            this.scene.add( spotLight5 );*/

            var ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
            this.scene.add( ambient );

            var pointLight = new THREE.PointLight( 0xffffff, 0.8 );
            this.camera.add( pointLight );
        },
        addGround: function( coords ) {
            if ( !!coords ) {

                // remove old ground
                this.scene.remove( this.plane );

                // helper array for shape creating
                var pts = [];

                // without loop because contour points order is not properly
                pts.push( new THREE.Vector2( coords[ 0 ].z, coords[ 0 ].x ) );
                pts.push( new THREE.Vector2( coords[ 2 ].z, coords[ 2 ].x ) );
                pts.push( new THREE.Vector2( coords[ 3 ].z, coords[ 3 ].x ) );
                pts.push( new THREE.Vector2( coords[ 1 ].z, coords[ 1 ].x ) );
                var verticesOfGround = new THREE.Shape( pts );

                // it's nearest of 0 of height surface
                var pointsOfGround = [];
                pointsOfGround.push( new THREE.Vector3( 0, 0, 0 ) );
                pointsOfGround.push( new THREE.Vector3( 0, 0.05, 0 ) );
                var closedSpline = new THREE.CatmullRomCurve3( pointsOfGround );
                closedSpline.type = 'catmullrom';
                var extrudeSettings = {
                    steps: 1,
                    extrudePath: closedSpline
                };
                var groundGeometry = new THREE.ExtrudeGeometry( verticesOfGround, extrudeSettings );

                // create the mesh and add that to scene
                var groundMesh = new THREE.Mesh( groundGeometry, this.groundMaterials[ 0 ] );

                groundMesh.rotateY( Math.PI );
                this.plane = groundMesh;
                this.scene.add( this.plane );
            }
        },
        updateGround: function() {

            // common group for all object helpers
            var allTheHelpers = new THREE.Object3D();

            // wrap all the meshes to helpers
            this.scene.children.forEach( function( value, key ) {

                if ( ( value.type === 'Object3D' ) ) {
                    var helper = new THREE.BoxHelper( value );
                    // add helper to group
                    allTheHelpers.add( helper );
                }

            } );

            // creating common helper (all the objects wrapped)
            var maxHelper = new THREE.BoxHelper( allTheHelpers );

            // there are 2 points upper and bottom - choose one of them - second number in array
            var y = maxHelper.geometry.attributes.position.array[ 1 ];

            // choose 4 points of max helper for geometry of common ground
            var coords = [];

            for (var key in maxHelper.geometry.attributes.position.array) {
                if ( maxHelper.geometry.attributes.position.array[key] === y ) {
                    coords.push( {
                        x: maxHelper.geometry.attributes.position.array[ key - 1 ],
                        z: maxHelper.geometry.attributes.position.array[ key + 1 ]
                    } )
                }
            }

            // parameters of camera to do screenshot for 2d export
            this.cameraSettings = {
                width: Math.abs( coords[ 2 ].x - coords[ 1 ].x ),
                height: Math.abs( coords[ 0 ].z - coords[ 3 ].z ),
                centerX: ( coords[ 1 ].x + coords[ 2 ].x ) / 2,
                centerZ: ( coords[ 0 ].z + coords[ 3 ].z ) / 2,
                left: coords[ 1 ].x,
                right: coords[ 2 ].x,
                top: coords[ 0 ].z,
                bottom: coords[ 3 ].z
            };

            // creating 3d model of ground
            // this.addGround( coords );

            this.render();
        },
        render: function() {
            this.renderer.render( this.scene, this.camera );
        },
        degrees: function( radians ) {
            return radians * ( 180 / Math.PI );
        },
        radians: function( degrees ) {
            return degrees * Math.PI / 180;
        },
        scaleDoor: function( door, coefficient ) {
            door.x *= coefficient;
            door.z *= coefficient;
            door.width *= coefficient;

            door.doorFrameCoordinates[ 0 ].x *= coefficient;
            door.doorFrameCoordinates[ 0 ].z *= coefficient;
            door.doorFrameCoordinates[ 1 ].x *= coefficient;
            door.doorFrameCoordinates[ 1 ].z *= coefficient;
        },
        remerge: function() {

            // clearing scene for new merging
            this.scene.children.forEach( function( el ) {
                if ( el instanceof THREE.Object3D ) {
                    this.scene.remove( el );
                }
            }.bind( this ) );

            // twice... because after first clearing it not clear
            this.scene.children.forEach( function( el ) {
                if ( el instanceof THREE.Object3D ) {
                    this.scene.remove( el );
                }
            }.bind( this ) );

            // clearing local props
            this.doors = [];
            var mergedRoomsIdCash = this.mergedRoomsId;
            this.mergedRoomsId = [];

            // restore all doors from archive
            for ( room in window.model3d.meshArray ) {
                if ( !!window.model3d.meshArray[room].archiveDoors.length ) {
                    window.model3d.meshArray[room].doors = window.model3d.meshArray[room].archiveDoors.slice();
                }
            }

            // re-merge all rooms;
            mergedRoomsIdCash.forEach( function( roomId, index ) {
                var answer = window.mergeConditions( undefined, undefined, roomId );
            } );

            this.render();
        },
        merge: function( mergeRoomId, mergingToDoorUuid, mergeDoorUuid ) {

            var firstDoor = {};
            var secondDoor = {};

            // take necessary coordinates of first door
            var keyOf1Door = 0;
            this.doors.forEach( function( value, key ) {
                if ( value.uuid === mergingToDoorUuid ) {
                    firstDoor = value;
                    keyOf1Door = key;
                }
            } );

            // and same manipulations with second door
            var keyOf2Door = 0;
            window.model3d.meshArray[ mergeRoomId ].doors.forEach( function( value, key ) {
                if ( value.uuid === mergeDoorUuid ) {
                    secondDoor = value;
                    keyOf2Door = key;
                }
            } );

            var roomsAngle = firstDoor.direction.angleTo( secondDoor.direction ) - Math.PI;

            // and remove usable door from stack
            this.doors.splice( keyOf1Door, 1 );

            // and remove usable door from stack
            // window.model3d.meshArray[ mergeRoomId ].doors.splice( keyOf2Door, 1 );
            // commented for re-merging purposes

            // what different first and second doors - it must be same
            var scaleCoefficient = firstDoor.width / secondDoor.width;

            var group = this.addMeshesOfRoomToScene( mergeRoomId, scaleCoefficient, roomsAngle, firstDoor, secondDoor );

            return {
                group: group,
                roomsAngle: roomsAngle,
                firstDoor: firstDoor,
                secondDoor: secondDoor
            }
        },
        addMeshesOfRoomToScene: function( mergeRoomId, scaleCoefficient, roomsAngle, firstDoor, secondDoor ) {

            // set default value of scale
            if ( !scaleCoefficient ) {
                var scaleCoefficient = 1;
            }

            // for checking of already existed room in the plan
            this.mergedRoomsId.push( mergeRoomId );

            // import group from existed contour of three-application
            var source3d = window.model3d.meshArray[ mergeRoomId ].export.clone();

            // cache all free doors of current room scene
            var doors = window.model3d.meshArray[ mergeRoomId ].doors;

            // cache all 2d points of contour
            var existedRoom = window.model3d.meshArray[ mergeRoomId ].existedRoom.slice( 0 );
            var changedRoom = [];
            var resultAngle = 0;

            if ( roomsAngle !== undefined ) {

                // build helper lines of walls with doors
                var firstDoorHelper = this.buildHelperLine( firstDoor.firstVector, firstDoor.nextVector );
                var secondDoorHelper = this.buildHelperLine( secondDoor.firstVector, secondDoor.nextVector );

                // new group for transformation purposes
                var transformGroup = new THREE.Object3D();
                this.scene.add( transformGroup );
                // merging is with first door
                transformGroup.position.set( firstDoor.x, 0, firstDoor.z );

                // charging to new group all what we need for transformation
                transformGroup.add( source3d );
                transformGroup.add( secondDoorHelper );

                // we translating base group inside the new group
                // center points of doors is sticking together now
                source3d.translateX( -secondDoor.x );
                source3d.translateZ( -secondDoor.z );

                // all what we need - rotate the room around doors center point
                transformGroup.rotateY( -roomsAngle );

                // we don't know properly position of
                // second room - it can be mirrored or on the
                // one side from door, but we have helpers
                var firstDoorDirection = this.buildDirectionVector( firstDoorHelper, this.scene );
                var secondDoorDirection = this.buildDirectionVector( secondDoorHelper, transformGroup );

                var difference = this.degrees( firstDoorDirection.angleTo( secondDoorDirection ) );

                resultAngle = roomsAngle;

                if ( Math.abs( difference - 180 ) > 1 ) {

                    // accurately is 1 degrees, and
                    // if it's not good - rotation to
                    // another way (rooms is one sided from door)
                    transformGroup.rotateY( roomsAngle * 2 );
                    resultAngle = -roomsAngle;

                }
                this.renderer.render( this.scene, this.camera ); //???

                // translating room points coordinates according to movement of room
                changedRoom = this.transformRoomPoints( existedRoom, source3d.clone(), -resultAngle );

                // all doors params of transformed
                // room must be changed also
                this.transformDoorsParams( doors, source3d );

                // helper had complied his mission
                transformGroup.remove( secondDoorHelper );
                

                // change variable for testing purposes
                source3d = transformGroup;

            } else {

                // translating room points coordinates according to movement of room
                changedRoom = this.transformRoomPoints( existedRoom, source3d.clone(), 0 );

                // it first room for merging and
                // not need to do any manipulations
                this.scene.add( source3d );

            }

            // we had changed merged 3d model
            // and let's update ground and export
            // parameters
            this.updateGround();

            // accumulate all free doors available for merging
            doors.forEach( function( door ) {
                this.doors.push( door );
            }.bind( this ) );


            // draw 2d plan by SVG paths
            window.model3d.meshArray[ mergeRoomId ].coords2d = changedRoom;
            window.model3d.meshArray[ mergeRoomId ].angle = resultAngle;
            window.model3d.getBasepointCoordinates();
            //this.draw2dPlan( this.preparePointsForPlan(changedRoom), doors );

            this.render();

            return source3d;
        },
        transformRoomPoints: function( existedRoom, parent, bias ) {

            var changedRoom = [];
            existedRoom.forEach( function( point ) {
                // coordinates writing to vector
                var pointV = new THREE.Vector3( point.x, point.y, point.z );

                // get changed coordinates
                parent.rotateY( bias );
                pointV.applyMatrix4(parent.matrixWorld);

                // push to returnable array
                changedRoom.push( {x: pointV.x, z: pointV.z, r: point.r} );

            } );

            return changedRoom;

        },
        preparePointsForPlan: function(changedRoom) {
            var plain = [];
            changedRoom.forEach(function(point) {
                plain.push([ point.x, point.z ]);
            });
            return plain;
        },
        transformDoorsParams: function( doors, parent ) {

            doors.forEach( function( door ) {

                // center of room
                var center = new THREE.Vector3( door.x, door.y, door.z );
                parent.localToWorld( center );
                door.x = center.x;
                door.y = center.y;
                door.z = center.z;

                // door frame coordinates
                var frameC = door.doorFrameCoordinates;
                var frame1 = new THREE.Vector3( frameC[ 0 ].x, 0, frameC[ 0 ].z );
                var frame2 = new THREE.Vector3( frameC[ 1 ].x, 0, frameC[ 1 ].z );

                parent.localToWorld( frame1 );
                parent.localToWorld( frame2 );

                door.doorFrameCoordinates = [ {
                    x: frame1.x,
                    z: frame1.z
                }, {
                    x: frame2.x,
                    z: frame2.z
                } ];

                // firstVector
                door.firstVector = parent.localToWorld( door.firstVector );

                // nextVector
                door.nextVector = parent.localToWorld( door.nextVector );

                // direction
                door.direction = door.nextVector.clone().sub( door.firstVector );

            }.bind( this ) );

        },
        draw2dPlan: function( room, doors ) {

            var svg = $( '.svg' ).svg( 'get' );
            var svgWalls = svg.group( { stroke: 'black', fill: 'transparent', strokeWidth: 3 } );
            svg.polyline( svgWalls, room );

            var svgDoors = svg.group( { stroke: 'white', strokeWidth: 4 } );
            doors.forEach( function( door ) {
                var frame = door.doorFrameCoordinates;
                svg.line( svgDoors, frame[0].x, frame[0].z, frame[1].x, frame[1].z );
            });

            return true;

        },
        buildHelperLine: function( point1, point2 ) {

            var geometry = new THREE.Geometry();
            geometry.verticesNeedUpdate = true;

            // line between 2 points based on 2 vertices
            geometry.vertices.push( point1, point2 );
            return new THREE.Line( geometry, new THREE.LineBasicMaterial() );

        },
        buildDirectionVector: function( helperLine, parent ) {

            // we want to know absolute position
            parent.updateMatrixWorld();

            var vector1 = helperLine.geometry.vertices[ 0 ].clone();
            vector1.applyMatrix4( helperLine.matrixWorld );

            var vector2 = helperLine.geometry.vertices[ 1 ].clone();
            vector2.applyMatrix4( helperLine.matrixWorld );

            // it's simple vector between 2 points of helper line
            return vector2.clone().sub( vector1 );

        },
        export3dObj: function() {

            // convert scene 3d model to .obj format
            var exporter = new THREE.OBJExporter();
            var exportScene = exporter.parse( this.scene );

            // creating of text content
            var blobObj = new Blob( [ exportScene ], { type: "text/plain;charset=utf-8" } );

            // saving to file
            saveAs( blobObj, "merged-rooms-3d.obj" );
        },
        pngExport2dPlan: function() {

            // create link of download image
            var download = document.createElement( 'a' );

            // add the fake element to page (FireFox needs)
            $( 'body' ).append( download );

            // paint walls to black and floor
            // to white like design on paper
            this.changeMaterials( true );

            this.setSceneSize( this.cameraSettings.width, this.cameraSettings.height, true, this.renderer );

            // add compass icon in bottom right corner
            // this.addCompass();

            // save decoded string to href
            download.href = this.renderer.domElement.toDataURL();

            // specify of file name
            download.download = 'floor-plan.png';

            // emulating of click to linf with picture
            download.click();

            this.setSceneSize( 480, 320, false, this.renderer );

            // remove compass icon
            // this.removeCompass();

            // set previous colors
            this.changeMaterials( false );

            this.render();

            // remove the fake element from page (FireFox needs)
            $( download ).remove();

        },
        svgExport2dPlan: function() {

            // var renderer = new THREE.SVGRenderer();
            // renderer.setClearColor( 0xffffff, 0 );
            // renderer.render( this.scene, this.camera );

            // create link of download image
            var download = document.createElement( 'a' );

            // add the fake element to page (FireFox needs)
            $( 'body' ).append( download );

            // paint walls to black and floor
            // to white like design on paper
            // this.changeMaterials( true );

            // this.setSceneSize( this.cameraSettings.width, this.cameraSettings.height, true, this.renderer );

            var XMLS = new XMLSerializer();
            // var svgstring = XMLS.serializeToString( renderer.domElement );
            var svg = document.getElementsByTagName('svg')[0];

            svg.setAttribute( 'width', this.cameraSettings.width );
            svg.setAttribute( 'height', this.cameraSettings.height );
            svg.setAttribute( 'viewBox', this.cameraSettings.left+' '+this.cameraSettings.bottom+' '+this.cameraSettings.width+' '+this.cameraSettings.height );

            var svgstring = XMLS.serializeToString( svg );
            var b64 = btoa( svgstring );

            // save decoded string to href
            download.href = "data:image/svg+xml;base64,\n" + b64;

            // specify of file name
            download.download = 'floor-plan.svg';

            // emulating of click to linf with picture
            download.click();

            // this.setSceneSize( 480, 320, false, this.renderer );

            // set previous colors
            // this.changeMaterials( false );

            // remove the fake element from page (FireFox needs)
            $( download ).remove();

        },
        addCompass: function() {
            var loader = new THREE.TextureLoader();
            var compassPic = new THREE.MeshBasicMaterial();

            loader.load(
                'compass.png',
                function( texture ) {
                    compassPic = new THREE.MeshBasicMaterial( {
                        map: texture
                    } );
                }
            );

            this.compass = new THREE.Mesh( new THREE.PlaneGeometry( 250, 250, 1, 1 ), compassPic );

            this.compass.rotation.z = this.radians( this.compassAngle );
            this.compass.rotation.x = -0.5 * Math.PI;

            this.compass.position.x = this.cameraSettings.width + 175;
            this.compass.position.y = -1;
            this.compass.position.z = this.cameraSettings.height + 175;
            this.scene.add( this.compass );
        },
        removeCompass: function() {
            this.scene.remove( this.compass );
        }
    };

    //==========================
    // make available in nodejs
    //==========================
    if ( typeof exports !== 'undefined' ) {
        module.exports = merging3d;
    } else {
        window.merging3d = merging3d;
    }

} )();
