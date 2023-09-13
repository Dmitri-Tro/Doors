
'use strict';
var SceneLoader = function(sceneModel, floorModel) {
    this.sceneModel = sceneModel;
    this.floorModel = floorModel.purify();

    var scope = this;

    if (this.floorModel.walls.length > 0) {
        this.sceneModel.scene.add(this.sceneModel.walls);
        Object.keys(this.sceneModel.controllers).map(function (k) { // add all controllers to scene
            scope.sceneModel.scene.add(scope.sceneModel.controllers[k]);
        });
        this.sceneModel.removeObjects();
        this.floorModel.walls.forEach(function(wall) {
            if (wall.bearing === wall.modes.INVISIBLE) return false;
            scope.sceneModel.addWall(wall);
        });
        this.sceneModel.createFloor(this.floorModel.rooms);
        //this.sceneModel.createCeiling(this.floorModel.rooms);
    }

    this.floorModel.doors.forEach(function(door) {
        if (door.wall) {
            var mesh = scope.sceneModel.getMeshByWall(door.wall);
            scope.sceneModel.walls.children.forEach(function (meshWall, key) {
                if (scope.sceneModel.equals(mesh.geometry.vertices, meshWall.geometry.vertices)) {
                    if (door.openRate > 0) {
                        scope.sceneModel.addDoor({
                            wallId: door.wall.id,
                            doorId: door.id,
                            cuttedWallIndex: key,
                            x: door.x1,
                            y: door.height / 2,
                            z: door.y1,
                            height: door.height,
                            width: door.getWidth(),
                            type: "door",
                            doorFrameCoordinates: [
                                {x: door.x1, z: door.y1},
                                {x: door.x2, z: door.y2}
                            ]
                        });
                    }
                }
            });
        }
    });

    //this.updateGround();
    this.addCameras(this.floorModel.cameras);
    if ("textures" in window.dataHandling.params) this.projectTextures(this.floorModel.cameras, this.floorModel.rooms);
    this.sceneModel.render();
};

/* Add cameras as boxes to scene.
 */
SceneLoader.prototype.addCameras = function(cameras) {
    var model = this.sceneModel, defaultSize = 20;
    this.sceneModel.scene.remove(this.sceneModel.camerasLayer);
    if (cameras.length > 0) {
        model.camerasLayer = new THREE.Object3D();
        cameras.forEach(function(cam, key, arCameras) {
            var geometry = new THREE.BoxGeometry(defaultSize, defaultSize, defaultSize);
            var mesh = new THREE.Mesh(geometry, model.cameraBoxMaterial);
            mesh.name = SceneModel.CAMERA_BOX_PREFIX + cam.id;
            model.camerasLayer.add(mesh);
            mesh.position.set(cam.x, Camera.lens, cam.y);
        });
        model.scene.add(model.camerasLayer);
    }
};

/* Add plane arrows on the floor near the doors.
 */
SceneLoader.prototype.addDoorArrows = function(doors, rooms) {
    var model = this.sceneModel, defaultSize = 20, wallsRoomsMap = getWallsRoomsMap();

    function getWallsRoomsMap() { //todo reaplce to floor_tools.js
        var map = {};
        rooms.forEach(function(room) {
            room.getWalls().forEach(function(wall) {
                if (!map[wall.id]) map[wall.id] = [];
                map[wall.id].push(room);
            });
        });
        return map;
    }

    this.sceneModel.scene.remove(this.sceneModel.arrows);
    if (doors.length > 0) {
        model.arrows = new THREE.Object3D();
        doors.forEach(function(door, key, arDoors) {
            for (var roomKey in wallsRoomsMap[door.wall.id]) {
                var room = wallsRoomsMap[door.wall.id][roomKey];
                var point = door.getArrowPosition(room.roomName, room.getCenter());

                var geometry = new THREE.BoxGeometry(defaultSize, defaultSize, defaultSize);
                var mesh = new THREE.Mesh(geometry, model.arrowBoxMaterial);
                mesh.name = SceneModel.ARROW_BOX_PREFIX + door.id + "|" + wallsRoomsMap[door.wall.id][roomKey].roomName;
                model.arrows.add(mesh);
                mesh.position.set(point.x, Camera.lens, point.y);
            }
        });
        model.scene.add(model.arrows);
    }
};

/* project pano images to room walls.
 * actually works only with ?textures=1 parameter in url
 * @param {array} cameras array of Camera objects
 * @param {array} rooms array of Room objects
 */
SceneLoader.prototype.projectTextures = function(cameras, rooms) {
    var scope = this, roomsTextured = {};
    if (!window.jsonData) return false;
    if (cameras.length > 0) {
        cameras.forEach(function(cam) {
            var url = window.jsonData.tour.rooms[cam.id].url;
            var room = scope.floorModel.getRoomByName(cam.roomName);
            var walls = [];

            //collect meshes to project
            var edge = room.edgePointer;
            while (true) {
                var mesh = scope.sceneModel.getMeshByWall(edge.wall);
                if (mesh) walls.push(mesh);
                if (edge.next === room.edgePointer) {
                    break;
                } else {
                    edge = edge.next;
                }
            }

            //we have to mark already textured rooms, because sometimes there're >=2 cameras in a room
            if (!roomsTextured[room.roomName]) {
                roomsTextured[room.roomName] = true;

                var arItems = scope.getFacesForProjection(cam);
                arItems.forEach(function(item, key, arItems){
                    arItems[key].face.materialIndex = 1;
                    if (Array.isArray(item.mesh.material)) {
                        /*arItems[key].mesh.material[1].uniforms.map.value = (new THREE.TextureLoader).load(url, function() {
                            scope.sceneModel.render();
                        });*/
                        arItems[key].mesh.material[1] = new THREE.MeshPhongMaterial(
                            {color: 0x336699, wireframe: false, side: THREE.DoubleSide}
                        );
                        arItems[key].mesh.material[1].needsUpdate = true;
                    }
                });
            }
        });
    }
};

/* Get Raycasted Elements of room (faces and meshes).
 */
SceneLoader.prototype.getFacesForProjection = function(camera) {
    this.sceneModel.render(); //force a render before, to make raycasting work

    var found = [];
    var raycaster = new THREE.Raycaster();
    var cameraObj = this.sceneModel.camerasLayer.getObjectByName(SceneModel.CAMERA_BOX_PREFIX + camera.id);
    for (var k=0; k<360; k=k+10) {
        var vec2d = new THREE.Vector2(1, 0);
        var vecRotated = vec2d.rotateAround(new THREE.Vector2(0, 0), k*THREE.Math.DEG2RAD);
        raycaster.set(cameraObj.position.clone(), (new THREE.Vector3(vecRotated.x, 0, vecRotated.y)).normalize());

        var intersects = raycaster.intersectObjects(this.sceneModel.walls.children);
        if (intersects.length > 0 && found.indexOf(intersects[0].face) === -1) {
            found.push({face: intersects[0].face, mesh: intersects[0].object});
        }
    }

    return found;
};