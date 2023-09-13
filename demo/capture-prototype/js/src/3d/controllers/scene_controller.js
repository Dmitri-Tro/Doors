
"use strict";
/* 3d model controller
 */
var SceneController = function(sceneModel, floorController) {
    this.sceneModel = sceneModel;
    this.floorController = floorController;
    this.nav3dController = new Nav3dController(sceneModel, floorController);
};

SceneController.prototype.init = function() {
    this.sceneModel.init();
    this.nav3dController.handleInputBlurs();
    this.handleClick();
    this.handleCamerasSelect();
    this.setSpaceMode();
};

SceneController.RAYCAST_ALL = 0;
SceneController.RAYCAST_ONLY_WALLS = 1;
SceneController.RAYCAST_ONLY_CAMERAS = 2;

SceneController.prototype.handleClick = function(objectsToRaycast) {
    var scope = this;
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var mouseState = 'up';
    var activeTrigger = null;
    var offset = new THREE.Vector3();
    var ah = null;

    var objects;

    this.sceneModel.threeMergingScene.on('mousemove', function(event) { 
        if (scope.sceneModel && scope.sceneModel.plane) {       
            mouse.x = (event.clientX / scope.sceneModel.renderer.domElement.width) * 2 - 1;
            mouse.y = -(event.clientY / scope.sceneModel.renderer.domElement.height) * 2 + 1;

            if (!objectsToRaycast) {
                objects = scope.sceneModel.walls.children
                    .concat(scope.sceneModel.camerasLayer.children)
                    .concat(scope.sceneModel.controllers.doors.children);
            } else if (objectsToRaycast === SceneController.RAYCAST_ONLY_WALLS) {
                objects = scope.sceneModel.walls.children;
            } else if (objectsToRaycast === SceneController.RAYCAST_ONLY_CAMERAS) {
                objects = scope.sceneModel.camerasLayer.children;
            }

            var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
            vector.unproject(scope.sceneModel.camera);

            raycaster.set(
                scope.sceneModel.camera.position, 
                vector.sub(scope.sceneModel.camera.position).normalize()
            );

            if (activeTrigger) {
                var intersects = raycaster.intersectObject(scope.sceneModel.plane);

                if (intersects[0]) {
                    var worldPos = intersects[0].point.sub(offset);
                    var localPos = activeTrigger.getParent().worldToLocal(worldPos);

                    activeTrigger.material = new THREE.MeshBasicMaterial({color: 0x00ff00});

                    activeTrigger.move(localPos);
                    activeTrigger.parent.updateMatrixWorld();

                    scope.sceneModel.render();
                }
            } else if (scope.sceneModel && scope.sceneModel.plane) {
                var intersects = raycaster.intersectObjects(objects, true);
                
                if (intersects.length > 0) {
                    scope.sceneModel.plane.position.copy(intersects[0].object.getWorldPosition());
                    scope.sceneModel.plane.rotation.copy(intersects[0].object.getWorldRotation());
                    // scope.sceneModel.plane.lookAt(scope.sceneModel.camera.position);

                    scope.sceneModel.render();
                }
            }
        }
    });

    this.sceneModel.threeMergingScene.on('mouseup', function(event) {
        if (activeTrigger) {
            var door = scope.floorController.floormodel.getDoorById(activeTrigger.parent.userData.doorId);
            var needRebuild = false;
            // Height
            if (activeTrigger.parent._transform.height) {
                var height = activeTrigger.parent._transform.height.y;
    
                scope.nav3dController.selectedMesh.doorParams.height = height;
                door.setHeight(height);
                needRebuild = true;
            }

            if (activeTrigger.parent._transform.start) {
                door.setNewCoordinate({
                    x: activeTrigger.parent._transform.start.x,
                    y: activeTrigger.parent._transform.start.z,
                }, 'start');

                scope.nav3dController.selectedMesh.doorParams.doorFrameCoordinates[1] = {
                    x: activeTrigger.parent._transform.start.x,
                    z: activeTrigger.parent._transform.start.z,
                };

                needRebuild = true;
            }

            if (activeTrigger.parent._transform.end) {
                door.setNewCoordinate({
                    x: activeTrigger.parent._transform.end.x,
                    y: activeTrigger.parent._transform.end.z,
                }, 'end');

                scope.nav3dController.selectedMesh.doorParams.doorFrameCoordinates[0] = {
                    x: activeTrigger.parent._transform.end.x,
                    z: activeTrigger.parent._transform.end.z,
                };

                needRebuild = true;
            }

            if (needRebuild) {
                scope.nav3dController.selectedMesh.doorParams.width = door.getWidth();
                scope.sceneModel.rebuildWall(scope.nav3dController.selectedWall, scope.nav3dController.selectedMesh);
            }
        }
        
        activeTrigger = null;
        // scope.resetClicked();
        scope.sceneModel.enableControl();
        // scope.nav3dController.resetVariables();
        mouseState = 'up';
    });

    this.sceneModel.threeMergingScene.on('mousedown', function(event) {
        if (scope.sceneModel && !scope.sceneModel.plane) {
            scope.sceneModel.createPlane();
        }

        mouseState = 'down';

        event.preventDefault();

        mouse.x = (event.clientX / scope.sceneModel.renderer.domElement.width) * 2 - 1;
        mouse.y = -(event.clientY / scope.sceneModel.renderer.domElement.height) * 2 + 1;

        raycaster.setFromCamera(mouse, scope.sceneModel.camera);

        if (!objectsToRaycast) {
            objects = scope.sceneModel.walls.children
                .concat(scope.sceneModel.camerasLayer.children)
                .concat(scope.sceneModel.controllers.doors.children);
        } else if (objectsToRaycast === SceneController.RAYCAST_ONLY_WALLS) {
            objects = scope.sceneModel.walls.children;
        } else if (objectsToRaycast === SceneController.RAYCAST_ONLY_CAMERAS) {
            objects = scope.sceneModel.camerasLayer.children;
        }

        var intersects = raycaster.intersectObjects(objects, true);

        // activeTrigger = null;
        scope.resetClicked();
 
        if (intersects.length > 0) {
            if (intersects[0].object instanceof Panel) {
                // wallChosen = true;
                scope.sceneModel.walls.children.forEach(function(wall) {
                    //wall.material = wall.shader;
                    wall.material = scope.sceneModel.wallsMaterial;
                });
                intersects[0].object.material = new THREE.MeshPhongMaterial(
                    { color: new THREE.Color(255, 0, 0), wireframe: false, side: THREE.DoubleSide }
                );
                scope.sceneModel.render();

                //get instances to use them in input block
                var wallMesh = intersects[0].object;
                var wall = scope.sceneModel.getWallByMesh(wallMesh);
                if (!wall) {
                    wallMesh = scope.sceneModel.searchWallByGeometry(wallMesh.geometry.vertices);
                    wall = scope.sceneModel.getWallByMesh(wallMesh);
                }

                //show input
                scope.nav3dController.showInputWallHeight(wall, wallMesh);
                scope.nav3dController.hideInputDoorParameters();
            } else if (intersects[0].object instanceof TransformController) {
                intersects[0].object.showControls();
                // intersects[0].object.setActive();

                var wallMesh = scope.sceneModel.getMeshById(intersects[0].object.userData.wallId);
                var wall = scope.sceneModel.getWallById(wallMesh.id);

                scope.nav3dController.showInputDoorParameters(wall, wallMesh);
                scope.nav3dController.hideInputWallHeight();
            } else if (intersects[0].object instanceof Trigger) {
                intersects[0].object.getParent().showControls();
                scope.sceneModel.disableControl();
                activeTrigger = intersects[0].object;
                
                var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
                vector.unproject(scope.sceneModel.camera);

                raycaster.set(
                    scope.sceneModel.camera.position, 
                    vector.sub(scope.sceneModel.camera.position).normalize()
                );

                var planeIntersects = raycaster.intersectObject(scope.sceneModel.plane);

                if (planeIntersects[0]) {
                    offset.copy(planeIntersects[0].point).sub(scope.sceneModel.plane.position);
                }
            } else { //usual mesh = camera
                var camId = intersects[0].object.name.substr(10);
                scope.setIndoorMode(camId);
            }
        } else {
            scope.nav3dController.resetVariables();
            scope.nav3dController.hideInputWallHeight();
            scope.nav3dController.hideInputDoorParameters();
        }
    });
};

SceneController.prototype.resetClicked = function () {
    var scope = this;

    scope.sceneModel.controllers.doors.children.forEach(function (controller) {
        controller.hideControls();
    });

    scope.sceneModel.walls.children.forEach(function(wall) {
        wall.material = scope.sceneModel.wallsMaterial;
        //wall.material = wall.shader;
    });
    scope.sceneModel.render();
}

SceneController.prototype.doNotHandleClick = function() {
    this.sceneModel.threeMergingScene.off('mousedown');
};

SceneController.prototype.handleRotating = function(cameraObj) {
    var scope = this, LEFT_ARROW_KEY = 37, RIGHT_ARROW_KEY = 39, SPACE_KEY = 32;
    $(document).on("keyup.add_angle", function(e) {
        if (e.which === LEFT_ARROW_KEY) {
            cameraObj.mergeAngle = window.Utils.normalizeAngle(cameraObj.mergeAngle - 1);
        } else if (e.which === RIGHT_ARROW_KEY) {
            cameraObj.mergeAngle = window.Utils.normalizeAngle(cameraObj.mergeAngle + 1);
        } else if (e.which === SPACE_KEY) {
            cameraObj.mergeAngle = window.Utils.normalizeAngle(cameraObj.mergeAngle - 180);
        }
        var mesh = scope.sceneModel.panorama.children[0];
        mesh.setRotationFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            (window.Utils.normalizeAngle(360 - cameraObj.mergeAngle) - 180) * THREE.Math.DEG2RAD
        );

        console.log('Camera angle SC:', cameraObj.id, cameraObj.mergeAngle);
        
        scope.sceneModel.render();
    });
};

SceneController.prototype.doNotHandleRotating = function() {
    $(document).off("keyup.add_angle");
};

SceneController.prototype.handleMoving = function(cameraObj) {
    var scope = this, STRAFE_LEFT = 65, STRAFE_RIGHT = 68, GO_STRAIGHT = 87, GO_BACK = 83, STEP = 1;
    $(document).on("keyup.set_position", function(e) {
        var mesh = scope.sceneModel.panorama.children[0];
        if (e.which === STRAFE_LEFT) {
            cameraObj.x -= STEP;
            mesh.translateX(-STEP);
            scope.sceneModel.camera.translateX(-STEP);
        } else if (e.which === STRAFE_RIGHT) {
            cameraObj.x += STEP;
            mesh.translateX(STEP);
            scope.sceneModel.camera.translateX(STEP);
        } else if (e.which === GO_STRAIGHT) {
            cameraObj.y += STEP;
            mesh.translateZ(STEP);
            scope.sceneModel.camera.translateZ(STEP);
        } else if (e.which === GO_BACK) {
            cameraObj.y -= STEP;
            mesh.translateZ(-STEP);
            scope.sceneModel.camera.translateZ(-STEP);
        }
        scope.sceneModel.render();
    });
};

SceneController.prototype.doNotHandleMoving = function() {
    $(document).off("keyup.set_position");
};

/* Add a select with cameras in 3d view
 */
SceneController.prototype.handleCamerasSelect = function() {
    var options = "<li class='view-select__option' data-value='space'><a href='javascript:void(0)'>In space</a></li>", scope = this;
    this.floorController.floormodel.cameras.forEach(function(cam) {
        options +=
            "<li class='view-select__option' data-value='" + cam.id + "'>" +
                "<a href='javascript:void(0)' title='" + cam.id + "'>" + cam.visibleName + "</a>" +
            "</li>";
    });
    $(".view-select__select").html(options);

    $(".view-select__option").on("click", function(e) {
        var cam = $(this).data("value");
        if (cam === "space") {
            scope.setSpaceMode();
        } else { //indoor
            scope.setIndoorMode(cam);
        }
        scope.sceneModel.render();
    });
};

/* Space flight mode.
 */
SceneController.prototype.setSpaceMode = function () {
    this.sceneModel.camera.turnInto(); //go to space
    this.handleClick();
    this.doNotHandleRotating();
    this.doNotHandleMoving();

    this.sceneModel.removeCeiling();
    this.sceneModel.removePanorama();
};

/* Sets and indoor mode. This mode means we are situated inside a room. Ceiling is added, view is held from camera
 */
SceneController.prototype.setIndoorMode = function (cameraId) {
    var roomsInfo = window.jsonData.tour.rooms,
        cameraObj = this.floorController.floormodel.getCameraById(cameraId);

    this.sceneModel.camera.turnInto(cameraId);
    this.doNotHandleClick();
    this.handleClick(SceneController.RAYCAST_ONLY_CAMERAS);
    this.handleRotating(cameraObj);
    this.handleMoving(cameraObj);

    this.sceneModel.createCeiling(this.floorController.floormodel.rooms);
    this.sceneModel.createPanorama(roomsInfo[cameraId].url, cameraObj);
};