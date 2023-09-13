
"use strict";
/* Scene Class, represents a 3d model of whole floor.
 */
var SceneModel = function() {
    this.initialized = false; //flag shows if sceneModel init() method already triggered
    this.viewTabSelector = "#view3d";
    this.sceneSelector = '#three-merging';

    var sWallsHeightInput = '.js-walls-height'; //todo move to controller
    var wallsHeight = 250;
    Object.defineProperty(this, 'wallsHeight', { //default height for each wall
        get: function() {
            return wallsHeight;
        },
        set: function(h) {
            h = (h === undefined ? 250 : h);
            wallsHeight = h;
            $(sWallsHeightInput).val(h);
        }
    });

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.plane = null;
    this.walls = new THREE.Group(); //group layer of model walls
    this.wallsMap = {}; //3d wall meshes are mapped to 2d walls
    this.controllers = {
        doors: new THREE.Group()
    };
    this.meshesMap = {}; //2d walls are mapped to 3d meshes
    this.camerasLayer = new THREE.Object3D(); //group layer of cameras. a camera is a simple box (its a helper for panorama, we need to know camera's coordinates)
    this.floors = new THREE.Group();
    this.ceilings = new THREE.Group();
    this.panorama = new THREE.Group();

    //materials
    this.wallsMaterial = new THREE.MeshPhongMaterial({color: 0xcccccc, wireframe: false, side: THREE.DoubleSide});
    this.floorMaterial = new THREE.MeshLambertMaterial({color: new THREE.Color(193, 115, 73), wireframe: false, side: THREE.DoubleSide});
    this.cameraBoxMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color('green'), wireframe: true, side: THREE.DoubleSide});
    this.arrowBoxMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color('yellow'), wireframe: true/*, side: THREE.DoubleSide*/});
    this.cameraBoxMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color('green'), wireframe: false/*, side: THREE.DoubleSide*/});

    this.shaderMaterial = THREE.ShaderLib["equirect"];
    //this.shaderMaterial.uniforms["tEquirect"].value = "";

    this.savedModel = null;
};

SceneModel.CAMERA_BOX_PREFIX = "camera_pos";
SceneModel.ARROW_BOX_PREFIX = "arrow_pos";

SceneModel.prototype.init = function() {
    if (this.initialized) return false;
    this.initialized = true;

    // add viewport for three js scene
    if ( $(this.sceneSelector).length !== 0 ) $(this.sceneSelector).remove();
    $( this.viewTabSelector ).append( '<div id="' + this.sceneSelector.substring(1, this.sceneSelector.length) + '"></div>' );
    this.threeMergingScene = $(this.sceneSelector);

    this.threeMergingScene.css({
        width: $(window).width()+'px',
        height: $(window).height()+'px'
    });

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer( {
        alpha: true,
        preserveDrawingBuffer: true
    } );
    this.threeMergingScene.append( this.renderer.domElement );
    this.addCamera();
    this.addLight();
    this.setSceneSize( $(window).width(), $(window).height(), this.renderer );
};

SceneModel.prototype.createPlane = function () {
    var geo = new THREE.PlaneBufferGeometry(2000, 2000, 8, 8);
    var mat = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      side: THREE.DoubleSide, 
      opacity: 0,
      transparent: true,
    });

    var plane = new THREE.Mesh(geo, mat);
    plane.name = '_plane';

    this.plane = plane

    this.scene.add(plane);
}

/* creating carpet for a whole flat
 * @param {Array} points array of all room's corners
 */
SceneModel.prototype.createFloor = function(rooms) {
    if (this.floors instanceof THREE.Group) {
        this.scene.remove( this.floors );
    }

    var scope = this;
    this.floors = new THREE.Group();
    this.name = "floor";

    rooms.forEach(function(r) {
        var points = r.corners;

        var shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }
        shape.lineTo(points[0].x, points[0].y);

        var extrudeSettings = {
            steps: 1,
            amount: 3,
            bevelEnabled: false
        };

        var floorGeometry = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings );
        var floorMesh = new THREE.Mesh(floorGeometry, scope.floorMaterial);
        floorMesh.name = "floor";
        scope.floors.add(floorMesh);
    });
    scope.floors.rotateX(Math.PI/2);

    this.scene.add( this.floors );
};

SceneModel.prototype.createCeiling = function(rooms) {
    var scope = this;
    this.removeCeiling();
    this.ceilings = new THREE.Group();

    rooms.forEach(function(r) {
        var points = r.corners;

        var shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }
        shape.lineTo(points[0].x, points[0].y);

        var extrudeSettings = {
            steps: 1,
            amount: 3,
            bevelEnabled: false
        };

        var floorGeometry = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings );
        var floorMesh = new THREE.Mesh(floorGeometry, scope.floorMaterial);
        floorMesh.name = "ceiling";
        scope.ceilings.add(floorMesh);
    });
    this.scene.add( this.ceilings );

    scope.ceilings.rotateX(90 * THREE.Math.DEG2RAD);
    scope.ceilings.translateZ(-scope.wallsHeight);
};

SceneModel.prototype.removeCeiling = function() {
    if (this.ceilings instanceof THREE.Group) {
        this.scene.remove( this.ceilings );
    }
};

/*
 * @param {Wall} wall
 */
SceneModel.prototype.addWall = function(wall) {
    var height = wall.height || this.wallsHeight;

    //second material
    var edge = wall.frontEdge || wall.backEdge;
    if (edge) {
        var mesh = this.createMesh({
            firstPoint: {x: wall.getStartX(), z: wall.getStartY(), y: height},
            nextPoint: {x: wall.getEndX(), z: wall.getEndY(), y: height},
            corners: edge.corners(),
            heightOfWall: height,
            material: this.wallsMaterial,
            wallId: wall.id
        });

        this.wallsMap[mesh.id] = wall;
        this.meshesMap[wall.id] = mesh;
        this.walls.add(mesh);
    } else {
        console.log("no edge"+wall);
    }
};

/* to create a wall use .addWall() instead.
 * @param {Object} params plain object with params, see .addWall()
 */
SceneModel.prototype.createMesh = function(params) { // Todo: choose parameters keys to make function more universal 
    var heightOfWall = (!params.heightOfWall) ? Panel.height : params.heightOfWall;
    var isDoor, mesh;

    if (params.corners) {
        isDoor = false;
        // we use multiple y coordinate by -1
        var shape = new THREE.Shape();
        shape.moveTo(params.corners[0].x, -params.corners[0].y);
        for (var i = 1; i < params.corners.length; i++) {
            shape.lineTo(params.corners[i].x, -params.corners[i].y);
        }
        shape.lineTo(params.corners[0].x, -params.corners[0].y);

        var extrudeSettings = {
            steps: 1,
            amount: heightOfWall,
            bevelEnabled: false
        };

        var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI/2);

    } else { //old variant todo also use corners
        isDoor = true;
        var xCoord = ( params.nextPoint.x - params.firstPoint.x );
        var zCoord = ( params.nextPoint.z - params.firstPoint.z );

        var lengthOfWall = ( !params.lengthOfWall ) ? Math.sqrt(Math.pow(xCoord, 2) + Math.pow(zCoord, 2)) + Panel.thickness : params.lengthOfWall;
        var widthOfWall = ( !params.widthOfWall ) ? Panel.thickness : params.widthOfWall;

        // axis start at left or right hand of wall
        var vectorPosition = Math.sign(params.firstPoint.x * zCoord - params.firstPoint.z * xCoord);
        var cubeX = ( !params.cubeX ) ? ( params.firstPoint.x + params.nextPoint.x ) / 2 : params.cubeX;
        var cubeY = ( !("cubeY" in params) ) ? heightOfWall / 2 : params.cubeY;
        var cubeZ = ( !params.cubeZ ) ? ( params.firstPoint.z + params.nextPoint.z ) / 2 : params.cubeZ;

        // rotation angle of wall
        var f = -Math.atan2(zCoord, xCoord);

        // wall mesh
        var geometry = new THREE.BoxGeometry(lengthOfWall, heightOfWall, widthOfWall);
    }

    if (params.type === 'controller') {
        mesh = new TransformController(geometry, params.material);
    } else if (isDoor) { //door
        mesh = new Panel(geometry, params.material);
        mesh.rotateY(f);
        mesh.position.set(cubeX, cubeY, cubeZ);
        mesh.castShadow = true;
    } else { //return wall by default
        mesh = new Panel(geometry, params.material);
        mesh.castShadow = true;
    }

    mesh.userData = params;

    if (Array.isArray(params.material)) {
        mesh.geometry.faces.forEach(function (f) {
            f.materialIndex = 0;
        });
    }

    return mesh;
};

/* add camera in terms of three js
 * @param {string} key in this.arCameras object
 * @param {object} position Vector3
 * @param {object} direction where it looks at Vector3
 */
SceneModel.prototype.addCamera = function() {
    var scope = this;
    this.camera = new Device(this, 70, $(window).width()/$(window).height(), 0.1, 10000);
    this.camera.position.x = 0;
    this.camera.position.y = 2000;
    this.camera.position.z = 0;
    this.camera.lookAt( new THREE.Vector3() );
    this.camera.minPolarAngle = Math.PI / 2;
    this.scene.add( this.camera );

    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
    this.controls.addEventListener('change', function() {
        scope.render();
    });

    this.camera.zoom = 0.25;
    this.camera.updateProjectionMatrix();
    this.controls.update();
};

SceneModel.prototype.enableControl = function() {
    if (this.controls) {
        this.controls.enableRotate = true;
    }
}

SceneModel.prototype.disableControl = function() {
    if (this.controls) {
        this.controls.enableRotate = false;
    }
}

SceneModel.prototype.addLight = function() {
    var ambient = new THREE.AmbientLight( 0xffffff, 0.6 );
    this.scene.add( ambient );

    var pointLight = new THREE.PointLight( 0xffffff, 0.6 );
    this.camera.add( pointLight );
};

/*
 * @param {Object} params plain object with params, see SceneLoader constructor
 */
SceneModel.prototype.addDoor = function( params ) {
    var wallMesh = this.walls.children[ params.cuttedWallIndex ];
    if (!wallMesh) return false;

    // cutting box (door)
    var cuting_mesh = this.createMesh( {
        firstPoint: params.doorFrameCoordinates[ 0 ],
        nextPoint: params.doorFrameCoordinates[ 1 ],
        lengthOfWall: params.width,
        heightOfWall: params.height,
        widthOfWall: 2 * Panel.thickness,
        wallId: params.wallId,
        doorId: params.doorId
    } );
    
    this.addDoorController({
        firstPoint: params.doorFrameCoordinates[0],
        nextPoint: params.doorFrameCoordinates[1],
        lengthOfWall: params.width,
        heightOfWall: params.height,
        widthOfWall: Panel.thickness,
        type: 'controller',
        wallId: params.wallId,
        doorId: params.doorId
    });

    // take base wall
    var old_mesh_bsp = new ThreeBSP(wallMesh);

    var cuting_bsp = new ThreeBSP(cuting_mesh);
    var newMesh = old_mesh_bsp.subtract(cuting_bsp);
    var result = newMesh.toMesh(this.wallsMaterial);
    result.geometry.computeVertexNormals();

    //convert to panel
    var resultPanel = new Panel(result.geometry, result.material);
    resultPanel.position.copy(result.position);
    resultPanel.quaternion.copy(result.quaternion);
    resultPanel.scale.copy(result.scale);
    resultPanel.type = resultPanel.types.WITH_DOOR;
    resultPanel.doorParams = params;

    //also update maps
    var wall = this.getWallByMesh(wallMesh);
    delete this.wallsMap[wallMesh.id];
    this.wallsMap[resultPanel.id] = wall;
    this.meshesMap[wall.id] = resultPanel;

    // change base wall with new hole
    this.walls.remove(wallMesh);
    wallMesh.geometry.dispose();
    wallMesh.material.dispose();
    wallMesh = undefined;

    this.walls.add(resultPanel);

    return result;
};

SceneModel.prototype.addDoorController = function (doorParams) {
    this.removeDoorController(doorParams.wallId);
    this.controllers.doors.add(this.createMesh(doorParams));
}

SceneModel.prototype.removeDoorController = function (wallId) {
    var _this = this;
    var success = false;

    this.controllers.doors.children.forEach(function (controller) {
        if (controller.userData.wallId === wallId) {
            _this.controllers.doors.remove(controller);

            success = true;
        }
    });

    return success;
}

SceneModel.prototype.setSceneSize = function(width, height, renderer) {
    // change size of wrapper dom element
    this.threeMergingScene.css( {
        width: width,
        height: height
    } );

    // change size of viewport
    renderer.setSize( width, height );

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.bottom = -height / 2;
    this.camera.top = height / 2;

    this.camera.zoom = 1;
    this.camera.position.y = 2000;

    this.camera.updateProjectionMatrix();
    //this.controls.update();
    renderer.render( this.scene, this.camera );
};

SceneModel.prototype.render = function() {
    this.renderer.render( this.scene, this.camera );
};

SceneModel.prototype.removeObjects = function() {
    var scope = this;
    var arDelete = [];
    this.scene.traverse( function( node ) {
        if ( node instanceof THREE.Mesh ) {
            if (Array.isArray(node.material)) {
                for (var i=0; i<node.material.length; i++) node.material[i].dispose();
            } else
                node.material.dispose();
            node.geometry.dispose();
            if (node.parent !== null) arDelete.push({parent: node.parent, item: node});
        }
    });
    arDelete.forEach(function(obj) {
        obj.parent.remove(obj.item);
    });
    this.wallsMap = {};
};

SceneModel.prototype.removeWall = function(search) {
    //do not delete materials and geometry bj.material.dispose();
    //obj.geometry.dispose();
    if (typeof(search) === 'object') {
      for (var i = 0; i < this.walls.children.length; i++) {
          if (this.equals(this.walls.children[i].geometry.vertices, search.geometry.vertices)) {
              this.walls.remove(this.walls.children[i]);
          }
      }
    } else if (typeof(search) === 'string') {
        var wall = this.getMeshById(search);
        this.walls.remove(wall);
    }
};

SceneModel.prototype.rebuildWall = function (wall, mesh) {
  if (mesh.isSimple()) {
      this.removeWall(mesh);
      this.addWall(wall);
  } else /*if (mesh.isWithDoor())*/ {
      var doorParams = mesh.doorParams;
      this.removeWall(doorParams.wallId);
      //add simple wall and cut a door in it
      this.addWall(wall);
      var lastkey = this.walls.children.length;
      this.addDoor({
          cuttedWallIndex: lastkey - 1,
          x: doorParams.x,
          y: doorParams.y,
          z: doorParams.z,
          height: doorParams.height,
          width: doorParams.width,
          type: "door",
          doorFrameCoordinates: doorParams.doorFrameCoordinates,
          wallId: wall.id,
          doorId: doorParams.doorId
      });
  }
}

/* Using SimplifyModifier try to decrease amount of polygons
 */
SceneModel.prototype.optimizeMeshes = function(tolerance) {
    var sceneCopy = this.scene.clone();
    sceneCopy.traverse( function( node ) {
        if ( node instanceof THREE.Mesh ) {
            var geometry = node.geometry;
            if (geometry.vertices.length > 1000) {
                if (!tolerance) tolerance = /*geometry.vertices.length * 0.25 | 0*/ 2;
                var modifer = new THREE.SimplifyModifier();
                var simplified = modifer.modify( geometry, tolerance );
                if (simplified.vertices.length > 0) {
                    node.geometry.dispose();
                    node.geometry = simplified;
                }
            }
        }
    });
    return sceneCopy;
};

/* Handling exporting scene as .obj file
 * @param {Floormodel} 2d floormodel instance
 * @param {boolean} save internally to .savedModel (true) or output to browser (any other value)
 * @return {Deferred}
 * TODO move somewhere out.
 */
SceneModel.prototype.export3dObj = function(floormodel, internally) {
    var scope = this, dfd = $.Deferred();

    //leave just empty doors, in export we dont' need doors
    var model = Object.assign({}, floormodel);
    model.windows = [];
    var loader = new SceneLoader(scope, model);
    loader.addDoorArrows(floormodel.doors, floormodel.rooms); //add arrows for completely all doors

    //temporarily add ceiling
    setTimeout(function() {
        scope.createCeiling(floormodel.rooms);
        scope.render();

        setTimeout(function() { //evil, but scene's any adding operations don't have any callbacks
            scope.render();

            // convert scene 3d model to .obj format
            var exporter = new THREE.OBJExporter();
            //var optimizedScene = this.optimizeMeshes();
            var cloneScene = scope.scene.clone();

            var remove = [];

            scope.scene.children.forEach(function (sceneChild, sceneIndex) {
                if (sceneChild instanceof THREE.Group) {
                    sceneChild.children.forEach(function (groupChild, groupIndex) {
                        if (groupChild instanceof Trigger || groupChild instanceof TransformController) {
                            remove.push({
                                sceneIndex: sceneIndex, 
                                value: cloneScene.children[sceneIndex].children[groupIndex]
                            });
                        }
                    });
                }
            });

            remove.forEach(function (r) {
                cloneScene.children[r.sceneIndex].remove(r.value);
            });

            var exportScene = exporter.parse(cloneScene);

            // creating of text content
            var blobObj = new Blob( [ exportScene ], { type: "text/plain;charset=utf-8" } );

            // saving to file
            if (internally === true) {
                scope.savedModel = blobObj;
                new SceneLoader(scope, floormodel);
                dfd.resolve();
            } else {
                var filesaver = saveAs( blobObj, "merged.obj" );
                filesaver.onwriteend = function() {
                    new SceneLoader(scope, floormodel);
                    dfd.resolve();
                }
            }
        }, 2000);
    }, 2000);

    return dfd.promise();
};

SceneModel.prototype.getWallByMesh = function(mesh) {
    return this.wallsMap[mesh.id];
};

SceneModel.prototype.getMeshByWall = function(wall) {
    return this.meshesMap[wall.id];
};

SceneModel.prototype.getWallById = function (id) {
    return this.wallsMap[id];
}

SceneModel.prototype.getMeshById = function (id) {
    return this.meshesMap[id];
}

/* Search by geometry, sometimes search by ids doesn't work as expected because threejs changes meshes some way.
 * @param {Array} vertices array of points from geometry.vertices
 */
SceneModel.prototype.searchWallByGeometry = function(vertices) {
    var ret = null;
    for (var i=0; i<this.walls.children.length; i++) {
        if (this.equals(this.walls.children[i].geometry.vertices, vertices)) {
            ret = this.walls.children[i];
        }
    }
    return ret;
};

/* helper method to compare arrays as string
 * @param {array} a1
 * @param {array} a2
 * @todo replace to utils
 */
SceneModel.prototype.equals = function(a1, a2) {
    return JSON.stringify(a1) === JSON.stringify(a2);
};

/* todo move panorama to separate class */
SceneModel.prototype.createPanorama = function(textureUrl, cameraObj) {
    var scope = this, mesh;
    this.removePanorama();
    this.panorama = new THREE.Group();

    var texture = new THREE.TextureLoader().load(textureUrl, function() {
        var geometry = new THREE.SphereBufferGeometry(20, 60, 60);
        // invert the geometry on the x-axis so that all of the faces point inward
        geometry.scale( -1, 1, 1 );

        var material = new THREE.MeshBasicMaterial( {
            map: texture,
            transparent: true,
            opacity: 0.5,
        } );

        mesh = new THREE.Mesh(geometry, material);
        mesh.name = "panorama";
        mesh.camera_id = cameraObj.id;
        scope.panorama.add(mesh);
        scope.scene.add(scope.panorama);
        mesh.position.copy(scope.camera.position); //todo add pitch/roll rotation to sphere to adjust accuracy

        //Normalize before use
        cameraObj.mergeAngle = Utils.normalizeAngle(cameraObj.mergeAngle);

        mesh.setRotationFromAxisAngle(
          new THREE.Vector3(0, 1, 0), 
          (Utils.normalizeAngle(360 - cameraObj.mergeAngle) - 180) * THREE.Math.DEG2RAD
        );

        console.log('Camera angle SM:', cameraObj.id, cameraObj.mergeAngle);

        scope.render();
    });
};

SceneModel.prototype.removePanorama = function() {
    if (this.panorama instanceof THREE.Group) {
        this.scene.remove(this.panorama);
    }
};