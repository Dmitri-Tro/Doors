//==========================
// make available in nodejs
//==========================
if ( typeof exports !== 'undefined' ) {
    var THREE = require( 'three' );
}

( function() {

    var model3d = {
        sceneWidth: 0,
        sceneHeight: 0,
        scene: null,
        renderer: null,
        controls: null,
        roomGroup: [],
        krpano: {},
        threeMergingScene: {},
        lens: 150, // height of camera tripod
        camera: {},
        axis: {},
        door: {},
        points: [],
        mesh: {},
        new2DPoints: [], // important for 2d plugin compatible
        heightOfWall: 150,
        widthOfWall: 10,
        intersectionPoints: [],
        shape: {},
        windowShape: {},
        doorCutingShape: {},
        doorShape: {},
        doorMaterial: {},
        floorMaterial: {},
        floorMesh: {},
        exportFloor: {},
        exportWalls: {},
        geometry: {},
        material: {},
        plane: {},

        walls: {},
        wallsCache: {},
        meshArray: {},
        export: null,

        sceneName: '',
        cell: [],
        existedRoom: [],
        doors: [],

        init: function() {

            this.krpano = document.getElementById( "krpanoSWFObject2" );

            // add viewport for three js scene
            if ( $( '#three-scene' ).length !== 0 ) {
                $( '#three-scene' ).remove();
            }
            $( '#krpanoSWFObject2' ).append( '<div id="three-scene"></div>' );
            this.threeMergingScene = $( '#three-scene' );
            this.threeMergingScene.css( {
                width: '320px',
                height: '240px',
                position: 'absolute',
                bottom: '0',
                right: '0',
                border: '1px solid rgba(255,0,0,0.2)'
            } );
            this.sceneWidth = this.threeMergingScene.width();
            this.sceneHeight = this.threeMergingScene.height();
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera( 45, this.sceneWidth / this.sceneHeight, 0.1, 10000 );
            this.addCamera();
            this.addspotlight();
            this.renderer = new THREE.WebGLRenderer( { alpha: true } );
            this.renderer.setSize( this.sceneWidth, this.sceneHeight );
            this.renderer.setClearColor( 0xffffff, 0 );
            this.threeMergingScene.append( this.renderer.domElement );
            this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
            this.controls.maxPolarAngle = Math.PI / 2.1;
            var those = this;
            this.activateEvents();
            this.groundMaterials.push( new THREE.MeshLambertMaterial( { color: 0x477841 } ) );
            this.groundMaterials.push( new THREE.MeshLambertMaterial( { color: 0x686c5e } ) );
            // this.addGround();
            this.shape = this.addShape( 5, this.heightOfWall );
            this.windowShape = this.addShape( 80, 0.5 * this.heightOfWall );
            this.doorCutingShape = this.addShape( 80, 0.8 * this.heightOfWall );
            this.doorShape = this.addShape( 5, 0.8 * this.heightOfWall );
            this.material = new THREE.MeshPhongMaterial( { color: 0xcccccc, wireframe: false, side: THREE.DoubleSide } );
            this.doorMaterial = new THREE.MeshLambertMaterial( { color: 0x614126, wireframe: false } );
            this.floorMaterial = new THREE.MeshBasicMaterial( { color: 0xa8775a, wireframe: false } );
            this.stoveMaterial = new THREE.MeshBasicMaterial( { color: 0xa33444, wireframe: false } );
            // this.interfaceElements = $('.interface-elements');
            this.export = new THREE.Object3D();

            // export button handlers
            $( '.export3dContainer' ).find( '.alone-room' ).click( function() {
                those.export3dObj();
            } );

            //get tripod height from parameter
            var url = new URL(document.location.href);
            var height = url.searchParams.get("height");
            if (height !== null && height.length > 0) {
                those.lens = parseFloat(height) * 30.48;
            }

            this.render();
        },
        activateEvents: function() {
            var those = this;
            this.controls.addEventListener( 'change', function() { those.render(); } );
        },
        deactivateEvents: function() {
            if (this.controls) {
                this.controls.removeEventListener('change');
            }
        },
        changeOfRoom: function( krpanoPointsArray ) {
            this.cell = krpanoPointsArray;
            this.meshArray[ this.sceneName ].cell = krpanoPointsArray;
            this.existedRoom = [];
            var that = this;
            krpanoPointsArray.forEach( function( el, index, arr ) {
                that.existedRoom.push( that.getXgetYgetZ( el.ath, el.bottomAtv, el.topAtv ) );
            } );
            this.createRoom();

            // autotesting
            if ( typeof( mocha ) === 'object' ) {
                return this.existedRoom;
            }
        },
        createRoom: function(coordinates) {
            if (coordinates === undefined) coordinates = this.existedRoom;
            this.createFloor( coordinates );
            this.meshArray[ this.sceneName ].existedRoom = coordinates;
            coordinates.push( coordinates[ 0 ] );
            this.makeBoxOfWalls( coordinates );
        },
        radians: function( degrees ) {
            return degrees * Math.PI / 180;
        },
        degrees: function( radians ) {
            return radians * ( 180 / Math.PI );
        },
        // There are distance on the floor - from camera base point to wall by the
        // normal. Based on the line equation.
        calculateDistanceToWall: function( plinthPoint1, plinthPoint2 ) {
            var top = Math.abs( plinthPoint2.x * plinthPoint1.z - plinthPoint1.x * plinthPoint2.z );
            var bottom = Math.sqrt( Math.pow( ( plinthPoint1.z - plinthPoint2.z ), 2 ) + Math.pow( ( plinthPoint1.x - plinthPoint2.x ), 2 ) );
            return top / bottom;
        },
        // It's line similar like calculateDistanceToWall, but not perpendicular.
        // It's line on the floor from camera base point to projection on the floor
        // of walls located point.
        calculateDistanceToFloorProjectionOfWallPoint: function( plinthPoint1, plinthPoint2, wallPointAth ) {
            var h = this.calculateDistanceToWall( plinthPoint1, plinthPoint2 );
            // arc is angle between axis and existing wall
            var arc = Math.atan( ( plinthPoint2.z - plinthPoint1.z ) / ( plinthPoint2.x - plinthPoint1.x ) );
            // angle is nearest angle between wall and rj - distance
            // betwee camera base and our projection of walls point
            var delta = this.degrees( arc );
            var angle = parseFloat( wallPointAth ) + 90 - delta;
            var rj = Math.abs( h / Math.cos( this.radians( angle ) ) );

            return { 'rj': rj, 'h': h, 'delta': delta };
        },
        // see repo/methodics/walls measurement
        calculateCoordinatesOnTheWall: function( point1, plinthPoint1, plinthPoint2, lens ) {

            var lens = parseFloat( lens );
            var r1 = this.calculateDistanceToFloorProjectionOfWallPoint( plinthPoint1, plinthPoint2, point1.ath ).rj;

            var x = r1 * Math.cos( this.radians( point1.ath ) );
            var y = lens - r1 * Math.tan( this.radians( point1.atv ) ); // y is height
            var z = r1 * Math.sin( this.radians( point1.ath ) );

            return {
                x: x,
                y: y,
                z: z
            };
        },
        updateHolesFromKrpanoHotspots: function( data ) {
            this.meshArray[ this.sceneName ].holes = data;
            this.restoreWallsFromCache();
            this.doors = [];

            var states = [];

            var that = this;
            data.forEach( function( hole ) {
                states.push( {
                    name: hole.name,
                    type: that.winDoorFromSphereTo3d( hole.wallIndexes, hole.holeContour, hole.target )
                } );
            } );
            this.meshArray[ this.sceneName ].doors = this.doors;
            this.meshArray[ this.sceneName ].archiveDoors = this.doors;
            this.render();

            return states;
        },
        winDoorFromSphereTo3d: function( wallIndexes, holeContour, target ) {
            var contour3dCoords = [];

            if ( !!wallIndexes ) {
                var those = this;
                holeContour.forEach( function( point, index, arr ) {
                    contour3dCoords.push( those.calculateCoordinatesOnTheWall( point, those.existedRoom[ wallIndexes[ 0 ] ], those.existedRoom[ wallIndexes[ 1 ] ], those.lens ) );
                } );

                // midle arithmetic of sides of hole
                var heightOfHole = ( contour3dCoords[ 0 ].y + contour3dCoords[ 1 ].y - contour3dCoords[ 2 ].y - contour3dCoords[ 3 ].y ) / 2;
                var widthOfHole = ( Math.sqrt( Math.pow( contour3dCoords[ 3 ].x - contour3dCoords[ 2 ].x, 2 ) + Math.pow( contour3dCoords[ 3 ].z - contour3dCoords[ 2 ].z, 2 ) ) + Math.sqrt( Math.pow( contour3dCoords[ 0 ].x - contour3dCoords[ 1 ].x, 2 ) + Math.pow( contour3dCoords[ 0 ].z - contour3dCoords[ 1 ].z, 2 ) ) ) / 2;

                // center of cutting hole
                var xCoord = ( contour3dCoords[ 0 ].x + contour3dCoords[ 1 ].x + contour3dCoords[ 2 ].x + contour3dCoords[ 3 ].x ) / 4;
                var yCoord = ( contour3dCoords[ 0 ].y + contour3dCoords[ 1 ].y + contour3dCoords[ 2 ].y + contour3dCoords[ 3 ].y ) / 4;
                var zCoord = ( contour3dCoords[ 0 ].z + contour3dCoords[ 1 ].z + contour3dCoords[ 2 ].z + contour3dCoords[ 3 ].z ) / 4;

                // this.axis.position.set( doorFrameCoordinates[1].x, yCoord, doorFrameCoordinates[1].z );

                var doorFrameCoordinates = [ {
                    x: ( contour3dCoords[ 0 ].x + contour3dCoords[ 3 ].x ) / 2,
                    z: ( contour3dCoords[ 0 ].z + contour3dCoords[ 3 ].z ) / 2
                }, {
                    x: ( contour3dCoords[ 1 ].x + contour3dCoords[ 2 ].x ) / 2,
                    z: ( contour3dCoords[ 1 ].z + contour3dCoords[ 2 ].z ) / 2
                } ];

                var type = ( ( yCoord - heightOfHole / 2 ) < 0 ) ? 'door' : 'window';

                this.makeWinDoor3d( {
                    cuttedWallIndex: wallIndexes[ 0 ],
                    x: xCoord,
                    y: yCoord,
                    z: zCoord,
                    height: heightOfHole,
                    width: widthOfHole,
                    type: type,
                    doorFrameCoordinates: doorFrameCoordinates
                } );

                if ( type === 'door' ) {

                    // floor points of walls corner
                    var firstPoint = this.existedRoom[ wallIndexes[ 0 ] ];
                    var nextPoint = this.existedRoom[ wallIndexes[ 1 ] ];

                    // points based vectors for 3d manipulations
                    var firstVector = new THREE.Vector3( firstPoint.x, 0, firstPoint.z );
                    var nextVector = new THREE.Vector3( nextPoint.x, 0, nextPoint.z );

                    // direction is vector between 2 points of wall
                    var direction = nextVector.clone().sub( firstVector );

                    this.doors.push( {
                        x: xCoord,
                        y: yCoord,
                        z: zCoord,
                        height: heightOfHole,
                        width: widthOfHole,
                        doorFrameCoordinates: doorFrameCoordinates,
                        uuid: this.makeId( 'x' + xCoord + 'y' + yCoord + 'z' + zCoord ),
                        direction: direction,
                        firstVector: firstVector,
                        nextVector: nextVector,
                        target: target,
                        source: this.sceneName
                    } );

                    return 'door';
                } else {
                    return 'window';
                }

            }

        },
        getXgetYgetZ: function( ath, bottomAtv, topAtv ) {

            // function to get 2d coordinates
            var alpha = 180 - 90 - bottomAtv;

            // radius is line on the floor between camera base and point
            var radius = this.lens / Math.sin( this.radians( bottomAtv ) ) * Math.sin( this.radians( alpha ) );
            var newx = Math.cos( this.radians( ath ) ) * radius;
            var newy = this.lens - radius * Math.tan( this.radians( topAtv ) );
            var newz = Math.sin( this.radians( ath ) ) * radius;

            return {
                x: newx,
                y: newy,
                z: newz,
                r: radius
            }
        },
        get2dCoordinates: function( x, y, z, r ) { //back equ
            var ath = ( (x / r) > 0 ? this.degrees( Math.atan( z / x ) ) : this.degrees( Math.atan( z / x ) ) + 180 );
            var ath2 = this.degrees( Math.asin( z / r ) );
            var bottomAtv = this.degrees( Math.atan( this.lens / r ) );
            var topAtv = -this.degrees( Math.atan( (y - this.lens) / r ) );

            return {
                ath: ath,
                bottomAtv: bottomAtv,
                topAtv: topAtv
            }
        },
        addAxis: function() {
            // axis helper for scene
            this.axis = new THREE.AxisHelper( 140 );
            this.scene.add( this.axis );
        },
        addCamera: function() {
            // camera position
            this.camera.position.x = -500;
            this.camera.position.y = 1500;
            this.camera.position.z = 0;
            this.camera.lookAt( new THREE.Vector3() );
            this.scene.add( this.camera );
        },
        changeCameraPosition: function( x, y, z ) {
            var x = ( x !== undefined ) ? x : -500;
            var y = ( y !== undefined ) ? y : 500;
            var z = ( z !== undefined ) ? z : 0;
            this.camera.position.x = x;
            this.camera.position.y = y;
            this.camera.position.z = z;
            this.camera.lookAt( new THREE.Vector3() );
            this.render();
        },
        addspotlight: function() {
            var ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
            this.scene.add( ambient );

            var pointLight = new THREE.PointLight( 0xffffff, 0.8 );
            this.camera.add( pointLight );
        },
        addShape: function( x, z ) {
            var pts = [];
            pts.push( new THREE.Vector2( 0, -0.5 * x ) );
            pts.push( new THREE.Vector2( 0, 0.5 * x ) );
            pts.push( new THREE.Vector2( z, 0.5 * x ) );
            pts.push( new THREE.Vector2( z, -0.5 * x ) );
            return new THREE.Shape( pts );
        },
        // export: function( item ) {
        //     if ( !item ) {
        //         item = 0;
        //     }
        //     var result = this.meshArray[ item ].geometry.toJSON();
        //     console.log( 'JSON export:' );
        //     console.log( JSON.stringify( result ) );
        //     var exporter = new THREE.OBJExporter();
        //     console.log( '.obj export:' );
        //     console.log( exporter.parse( this.meshArray[ item ] ) );
        // },
        removeCurrentMesh: function() {
            this.mesh.name = 'old_mesh_sector';
            var old_mesh_sector = this.scene.getObjectByName( 'old_mesh_sector' );
            this.scene.remove( old_mesh_sector );
        },
        removeMeshFromStore: function() {
            this.meshArray[ 0 ].name = 'old_mesh';
            var old_mesh = this.scene.getObjectByName( 'old_mesh' );
            this.scene.remove( old_mesh );
        },
        restoreWallsFromCache: function() {
            this.scene.remove( this.walls );
            this.export.remove( this.exportWalls );
            this.walls = this.wallsCache.clone();
            this.exportWalls = this.wallsCache.clone();
            this.export.add( this.exportWalls );
            this.meshArray[ this.sceneName ].export = this.export.clone();
            this.scene.add( this.walls );
        },
        makeWinDoor3d: function( params ) {

            if (!this.walls.children[ params.cuttedWallIndex ]) return false;
            var old_mesh_bsp = new ThreeBSP( this.walls.children[ params.cuttedWallIndex ] ); // take base wall

            // cutting box
            var cuting_mesh = this.createMeshOfWall( {
                firstPoint: params.doorFrameCoordinates[ 0 ],
                nextPoint: params.doorFrameCoordinates[ 1 ],
                cubeX: params.x,
                cubeY: params.y,
                cubeZ: params.z,
                lengthOfWall: params.width,
                heightOfWall: params.height,
                widthOfWall: 2 * this.widthOfWall
            } );

            var cuting_bsp = new ThreeBSP( cuting_mesh );
            var newMesh = old_mesh_bsp.subtract( cuting_bsp );
            var result = newMesh.toMesh( this.material );
            result.geometry.computeVertexNormals();

            // remove old walls from export group
            this.export.remove( this.exportWalls );

            this.walls.children[ params.cuttedWallIndex ] = result; // change base wall with new hole
            this.exportWalls.children[ params.cuttedWallIndex ] = result; // change same one for export

            // update export group and mesh array export property
            this.export.add( this.exportWalls );
            this.meshArray[ this.sceneName ].export = this.export.clone();

            // build new oak doors
            // if ( params.type === 'door' ) {
            //  var oakDoor_bsp = old_mesh_bsp.intersect( cuting_bsp );
            //  var oakDoor = oakDoor_bsp.toMesh( this.doorMaterial );
            //  oakDoor.geometry.computeVertexNormals();
            //  var door_hinges = new THREE.Mesh(      // door_hinges will be the parent - base point for rotation the door
            //      new THREE.SphereGeometry(2,3,2),
            //      new THREE.MeshBasicMaterial( { transparent: true, opacity: 0 }  ));
            //  door_hinges.position.set( params.x, 0, params.z );
            //  door_hinges.rotateY( params.bias );
            //  oakDoor.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( -params.x, 0, -params.z ) ); // move center of door
            //  oakDoor.geometry.verticesNeedUpdate = true;
            //  door_hinges.add(oakDoor); // add child to parent
            //  var rotationAngle = (params.type == 'DoorOut') ? Math.PI/6 : -Math.PI/6; // in-out direction of opening the door
            //  oakDoor.rotation.y = rotationAngle;
            //  this.scene.remove( this.door );
            //  this.door = door_hinges;
            //  this.scene.add( this.door );
            // }

            this.render();

            return result;
        },
        createVerticesOfFloor: function( points ) {
            var pts = [];
            points.forEach( function( value, key ) {
                pts.push( new THREE.Vector2( value.z, value.x ) );
            } );
            return new THREE.Shape( pts );
        },
        // creating carpet of room
        createFloor: function( points ) {

            if ( ( this.floorMesh instanceof THREE.Object3D ) && ( this.exportFloor instanceof THREE.Object3D ) ) {
                this.export.remove( this.exportFloor );
                this.scene.remove( this.floorMesh );
            }

            var pointsOfFloor = [];

            // y position of floor is negative
            // for 2d export purposes
            pointsOfFloor.push( new THREE.Vector3( 0, -1, 0 ) );
            pointsOfFloor.push( new THREE.Vector3( 0, -0.5, 0 ) );
            var vertices = this.createVerticesOfFloor( points );
            var floorGeometry = this.makeExtrudeGeometry( pointsOfFloor, vertices );
            this.floorMesh = new THREE.Mesh( floorGeometry, this.floorMaterial );
            this.floorMesh.rotateY( Math.PI );

            this.exportFloor = this.floorMesh.clone();

            if (this.export) {
              this.export.add( this.exportFloor );
            }
            if (this.scene) {
              this.scene.add( this.floorMesh );
            }

            this.render();
        },
        createMeshOfWall: function( params ) {

            // wall parameters
            var xCoord = ( params.nextPoint.x - params.firstPoint.x );
            var zCoord = ( params.nextPoint.z - params.firstPoint.z );

            var lengthOfWall = ( !params.lengthOfWall ) ? Math.sqrt( Math.pow( xCoord, 2 ) + Math.pow( zCoord, 2 ) ) + this.widthOfWall : params.lengthOfWall;
            var heightOfWall = ( !params.heightOfWall ) ? this.heightOfWall : params.heightOfWall;
            var widthOfWall = ( !params.widthOfWall ) ? this.widthOfWall : params.widthOfWall;

            // axis start at left or right hand of wall
            var vectorPosition = Math.sign( params.firstPoint.x * zCoord - params.firstPoint.z * xCoord );
            var cubeX = ( !params.cubeX ) ? ( params.firstPoint.x + params.nextPoint.x ) / 2 : params.cubeX;
            var cubeY = ( !("cubeY" in params) ) ? heightOfWall / 2 : params.cubeY;
            var cubeZ = ( !params.cubeZ ) ? ( params.firstPoint.z + params.nextPoint.z ) / 2 : params.cubeZ;

            // rotation angle of wall
            var f = -Math.atan2( zCoord, xCoord );

            // wall mesh
            var geometry = new THREE.BoxGeometry( lengthOfWall, heightOfWall, widthOfWall );
            var wall = new THREE.Mesh( geometry, params.material );
            wall.rotateY( f );
            wall.position.set( cubeX, cubeY, cubeZ );
            wall.castShadow = true;

            return wall;

        },

        loadObj: function( url, coord ) {
            var that = this;
            var objLoader = new THREE.OBJLoader();
            var material = new THREE.MeshBasicMaterial( { color: 'white', side: THREE.DoubleSide } );
            objLoader.load( url, function( object ) {
                object.traverse( function( child ) {
                    if ( child instanceof THREE.Mesh ) {
                        child.material = material;
                    }
                } );
                object.position.y = 50;
                object.position.x = coord.x;
                object.position.z = coord.z;
                that.scene.add( object );
            } );
        },

        makeBoxOfWalls: function( points ) {

            // remove old boxes of walls
            if ( ( this.walls instanceof THREE.Object3D ) && ( this.exportWalls instanceof THREE.Object3D ) ) {
                this.export.remove( this.exportWalls );
                this.scene.remove( this.walls );
            }

            // clearing objects
            this.walls = new THREE.Object3D();
            this.wallsCache = new THREE.Object3D();
            this.exportWalls = new THREE.Object3D();

            // middle arithmetic height of wall
            var summOfHeight = 0;
            points.forEach( function( point, key ) {
                summOfHeight += point.y;
            } );
            this.heightOfWall = summOfHeight / points.length;

            // walls projections solution
            var that = this;
            $.each( points, function( key, value ) {
                if ( points.length > key + 1 ) {
                    var wallMaterial = that.material;

                    // cubeArrayMaterials[picturedSide] = new THREE.MeshLambertMaterial();
                    // var picturedSide = 6;
                    // // what side of wall is inner - 4 or 5 side of 6 sides wall
                    // if (vectorPosition === 1) {
                    //  picturedSide = ((f < -3 * Math.PI / 4) && (f > Math.PI / 4) ) ? 5 : 4;
                    // }
                    // if (vectorPosition === -1) {
                    //  picturedSide = ((f > Math.PI / 4) && (f < -3 * Math.PI / 4) ) ? 4 : 5;
                    // }

                    var wall = that.createMeshOfWall( {
                        firstPoint: points[ key ],
                        nextPoint: points[ key + 1 ],
                        material: wallMaterial
                    } );
                    that.walls.add( wall );
                }
            } );

            // cache for cuting holes
            this.wallsCache = this.walls.clone();

            // cache added to export object for merging purposes
            this.exportWalls = this.walls.clone();
            this.export.add( this.exportWalls );

            // move export scene to mesh array
            this.meshArray[ this.sceneName ].export = this.export.clone();

            // add to 3d scene
            this.scene.add( this.walls );

            this.render();
        },
        makeExtrudeGeometry: function( points, shape, closed ) {
            // shape is flat perimeter
            // points is 1cm of carpet width
            var closedSpline = new THREE.CatmullRomCurve3( points );
            closedSpline.type = 'catmullrom';
            closedSpline.tension = 0.0001; // means strong angles of curve
            closedSpline.closed = !!closed; // close conture when all points will draw closed flat
            var extrudeSettings = {
                steps: 300,
                bevelEnabled: false,
                extrudePath: closedSpline,
                material: 0,
                extrudeMaterial: 1
            };
            return new THREE.ExtrudeGeometry( shape, extrudeSettings );
        },
        changeGrownGeometry: function( x, z ) {
            // check maximum size of point and existing of main floor mesh
            if ( ( x > 600 || z > 600 ) && !this.meshArray.length ) {
                var maxCoor = Math.max( x, z )
                this.plane.geometry = new THREE.PlaneGeometry( maxCoor, maxCoor, 1, 1 )
                this.render();
            }
        },
        groundMaterials: [],
        addGround: function() {
            this.plane = new THREE.Mesh( new THREE.PlaneGeometry( 1600, 1600, 1, 1 ), this.groundMaterials[ 0 ] );
            this.plane.rotation.x = -0.5 * Math.PI;
            this.plane.position.x = 15;
            this.plane.position.y = 0;
            this.plane.position.z = 0;
            this.scene.add( this.plane );
        },
        changeGroundMaterial: function( index ) {
            this.plane.material = this.groundMaterials[ index ];
            this.render();
        },
        render: function() {
            if (this.renderer) {
                this.renderer.render( this.scene, this.camera );
            }
        },
        export3dObj: function() {

            // convert scene 3d model to .obj format
            var exporter = new THREE.OBJExporter();
            var exportScene = exporter.parse( this.scene );

            // creating of text content
            var blobObj = new Blob( [ exportScene ], { type: "text/plain;charset=utf-8" } );

            // saving to file
            saveAs( blobObj, "alone-room-3d.obj" );
        },
        export2dPlan: function() {

            // create link of download image
            var download = document.createElement( 'a' );

            // add the fake element to page (FireFox needs)
            $( 'body' ).append( download );

            this.setSceneSize( 800, 600, true );
            // save decoded string to href
            download.href = this.renderer.domElement.toDataURL();

            // specify of file name
            download.download = 'floor-plan.png';

            // emulating of click to linf with picture
            download.click();

            this.setSceneSize( 480, 320, false );
            this.render();

            // rmeove the fake element from page (FireFox needs)
            $( download ).remove();

        },
        setSceneSize: function( width, height, exportCase ) {

            // change size of wrapper dom element
            this.threeMergingScene.css( {
                width: width,
                height: height
            } );

            // change size of viewport
            this.renderer.setSize( width, height );

            if ( exportCase ) {

                this.controls.reset();

                this.camera.left = -this.cameraSettings.width / 2;
                this.camera.right = this.cameraSettings.width / 2;
                this.camera.bottom = -this.cameraSettings.height / 2;
                this.camera.top = this.cameraSettings.height / 2;

                this.camera.position.set( this.cameraSettings.centerX, 120, this.cameraSettings.centerZ );
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
            this.render();
        },
        changeScene: function( currentScene, newScene ) {

            // creating id of current scene
            this.sceneName = newScene;
            if ( !this.meshArray[ newScene ] ) { // scene does not exist

                // creating item in meshArray for saving data
                this.meshArray[ newScene ] = {};

                // putting krpano cell in room itemss
                this.cell = [];
                this.meshArray[ newScene ].cell = [];

                // create array of doors
                this.meshArray[ newScene ].doors = [];
                this.meshArray[ newScene ].archiveDoors = [];

                // create empty object for export 3d model
                this.meshArray[ newScene ].export = {};

                // create empty array for 2d points
                this.meshArray[ newScene ].existedRoom = [];

                this.meshArray[ newScene ].basepointPosition = [];
            } else {
                this.cell = this.meshArray[ newScene ]; //load saved points
            }
        },
        makeId: function( hexDigits ) {
            var s = [];
            for ( var i = 0; i < 36; i++ ) {
                s[ i ] = hexDigits.substr( Math.floor( Math.random() * 0x10 ), 1 );
            }
            s[ 14 ] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
            s[ 19 ] = hexDigits.substr( ( s[ 19 ] & 0x3 ) | 0x8, 1 ); // bits 6-7 of the clock_seq_hi_and_reserved to 01
            s[ 8 ] = s[ 13 ] = s[ 18 ] = s[ 23 ] = "-";

            var uuid = s.join( "" );
            return uuid;
        },
        //calculate camera position
        getBasepointCoordinates: function() {
            var roomId = this.sceneName;
            var coords = this.getRoomContour(roomId);
            var basePointVariants = [];

            function renameZYCoords(coords) {
                var newCoords = [];
                for (var i=0; i<coords.length; i++) {
                    newCoords[i] = {
                        x:  coords[i].x,
                        y:  coords[i].z
                    };
                }
                return newCoords;
            }

            function choosePoint(basePointVariants) {
                for (var i=0; i<basePointVariants.length; i++) {
                    for (var j=0; j<basePointVariants[i].length; j++) {
                        if (Utils.isPointInsidePolygon(basePointVariants[i][j].x, basePointVariants[i][j].y, renameZYCoords(coords))) {
                            return basePointVariants[i][j];
                        }
                    }
                }
            }

            if (coords[0] && coords[1] && coords[2]) {
                basePointVariants.push(this.resolveTrianglePoint(
                    new THREE.Vector2(coords[0].x, coords[0].z),
                    new THREE.Vector2(coords[1].x, coords[1].z),
                    new THREE.Vector2(coords[2].x, coords[2].z),
                    coords[0].r,
                    coords[1].r
                ));
                basePointVariants.push(this.resolveTrianglePoint(
                    new THREE.Vector2(coords[1].x, coords[1].z),
                    new THREE.Vector2(coords[2].x, coords[2].z),
                    new THREE.Vector2(coords[3].x, coords[3].z),
                    coords[1].r,
                    coords[2].r
                ));

                this.meshArray[roomId].basepointPosition = choosePoint(basePointVariants);
            }
            return this.meshArray[roomId].basepointPosition;
        },
        //get camera position helper
        resolveTrianglePoint: function(firstPoint, secondPoint, thirdPoint, inner1, inner2) {
            var possible = [];

            var side1Length = firstPoint.distanceTo(secondPoint);
            var side2Length = secondPoint.distanceTo(thirdPoint);
            var innerTriangleSide1 = inner1;
            var innerTriangleSide2 = inner2;
            var firstCorner = Math.acos(
                    (side1Length * side1Length + innerTriangleSide1 * innerTriangleSide1 - innerTriangleSide2 * innerTriangleSide2) / (2 * side1Length * innerTriangleSide1)
                ) * THREE.Math.RAD2DEG;

            var theta1 = 0; var theta2 = 0; var beta = 0;
            beta = secondPoint.clone().sub(firstPoint).angle() * THREE.Math.RAD2DEG;

            theta1 = Math.abs(firstCorner - beta);
            theta2 = Math.abs(firstCorner + beta);

            possible.push({
                x: firstPoint.x + innerTriangleSide1 * Math.cos(theta1 * THREE.Math.DEG2RAD),
                y: firstPoint.y + innerTriangleSide1 * Math.sin(theta1 * THREE.Math.DEG2RAD)
            });
            possible.push({
                x: firstPoint.x + innerTriangleSide1 * Math.cos(theta2 * THREE.Math.DEG2RAD),
                y: firstPoint.y + innerTriangleSide1 * Math.sin(theta2 * THREE.Math.DEG2RAD)
            });

            return possible;
        },
        getRoomContour: function(roomId) {
            return this.meshArray[roomId].coords2d ? this.meshArray[roomId].coords2d : this.meshArray[roomId].existedRoom;
        },
        // add/move vertices of 3d model
        changePoints: function(changes, availableRooms) {
            var pointTolerance = 0.5;

            if (!("oldX" in changes)) { //add new points to room
                this.meshArray[ Object.keys(this.meshArray)[0] ].existedRoom.push({
                    x: changes.newX,
                    y: this.heightOfWall,
                    z: changes.newY,
                    r: Math.sqrt( Math.abs(changes.newX * changes.newX + changes.newY * changes.newY) )
                });
                /*var existed = this.meshArray[ Object.keys(this.meshArray)[0] ].existedRoom.slice(0);
                for (var coord in existed) { //[{x:1,y:2,z:3,r:4}, {x:1,y:2,z:3,r:4}]
                    if (existed.hasOwnProperty(coord)) {
                        if ((Math.abs(changes.oldX - existed[coord].x) < pointTolerance) && (Math.abs(changes.oldY - existed[coord].z) < pointTolerance)) {
                            existed[coord].x = changes.newX;
                            existed[coord].z = changes.newY;
                            existed[coord].r = Math.sqrt( Math.abs( existed[coord].x * existed[coord].x + existed[coord].z * existed[coord].z ) );
                            console.log("changed");
                        }
                        if (counter != existed.length-1) newCell.push(model3d.get2dCoordinates(existed[coord].x, existed[coord].y, existed[coord].z, existed[coord].r));
                    }
                    counter++;
                }*/
                /*var newCell = [];
                window.pluginCell.cell = newCell;
                window.pluginCell.buildContour( newCell );
                window.pluginCell.krpano.call( "updatescreen();" );
                this.changeOfRoom( newCell );*/
                console.log("changed");
            } else { //update existing
                /*for (var arMesh in this.meshArray) {
                    if ("existedRoom" in model3d.meshArray[arMesh]) {
                        var newCell = [];
                        var existed = model3d.meshArray[arMesh].existedRoom; //[[160,-165], [170,180]]
                        var counter = 0;
                        for (var coord in existed) { //[{x:1,y:2,z:3,r:4}, {x:1,y:2,z:3,r:4}]
                            if (existed.hasOwnProperty(coord)) {
                                //console.log("move");
                                if ((Math.abs(changes.oldX - existed[coord].x) < pointTolerance) && (Math.abs(changes.oldY - existed[coord].z) < pointTolerance)) {
                                    existed[coord].x = changes.newX;
                                    existed[coord].z = changes.newY;
                                    existed[coord].r = Math.sqrt( Math.abs( existed[coord].x * existed[coord].x + existed[coord].z * existed[coord].z ) );
                                    //console.log("changed");
                                }

                                if (counter != existed.length-1) newCell.push(model3d.get2dCoordinates(existed[coord].x, existed[coord].y, existed[coord].z, existed[coord].r));
                            }
                            counter++;
                        }
                        if (this.sceneName == arMesh) {
                            window.pluginCell.cell = newCell;
                            window.pluginCell.buildContour( newCell );
                            window.pluginCell.krpano.call( "updatescreen();" );
                            this.changeOfRoom( newCell );
                        }
                    }
                }*/
            }
        }
    };

    //==========================
    // make available in nodejs
    //==========================
    if ( typeof exports !== 'undefined' ) {
        module.exports = model3d;
    } else {
        window.model3d = model3d;
    }

} )();
