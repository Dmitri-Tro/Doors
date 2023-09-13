"use strict";

/* Represents a perspective camera
 */
var Device = function(sceneModel, fov, aspect, near, far) {
    THREE.PerspectiveCamera.call(this, fov, aspect, near, far);

    this.sceneModel = sceneModel;

    this.modes = {
        SPACE: 1,
        INDOOR: 2
    };
    this.mode = this.modes.SPACE;
};

Device.prototype = Object.create(THREE.PerspectiveCamera.prototype);

/* make default view look from one of the cameras.
 */
Device.prototype.turnInto = function(cameraId) {
    var isCamera = false, mesh;
    if (cameraId) {
        mesh = this.sceneModel.camerasLayer.getObjectByName(SceneModel.CAMERA_BOX_PREFIX + cameraId);
        if (mesh) isCamera = true;
    }

    if (isCamera) {
        this.mode = this.modes.INDOOR;

        var pos = mesh.getWorldPosition();
        this.position.set(pos.x, pos.y, pos.z);

        //this.sceneModel.controls = new THREE.FirstPersonControls(this.camera, this.renderer.domElement);
        this.sceneModel.camera.fov = 90;
        this.sceneModel.camera.zoom = 0.1;
        this.sceneModel.controls.target = new THREE.Vector3(pos.x, pos.y, pos.z + 1);
        this.sceneModel.controls.enableZoom = false;
        this.sceneModel.controls.enablePan = false;
        this.sceneModel.controls.enableDamping = true;
        this.sceneModel.controls.rotateSpeed = -0.1;
        this.sceneModel.controls.zoom = 0.1;
    } else { //space flying
        this.mode = this.modes.SPACE;

        this.position.set(0, 2000, 0);
        this.lookAt( new THREE.Vector3() );
        this.sceneModel.controls.enableZoom = true;
        this.sceneModel.controls.enablePan = true;
        this.sceneModel.controls.enableDamping = false;
        this.sceneModel.controls.rotateSpeed = 1.0;
        this.sceneModel.controls.reset();
    }

    this.sceneModel.render();

    return true;
};

/* Reset to default space camera.
 */
Device.prototype.isInSpaceMode = function() {
    return this.mode === this.modes.SPACE;
};

/* Reset to default space camera.
 */
Device.prototype.resetMode = function() {
    return this.turnInto(false);
};

