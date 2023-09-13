'use strict';

/**
 * Main 3D view tab class
 * @class
 */
const Scene3D = function (selector) {
    this.selector = selector || '#scene3d';
    this.container = null;

    this.events = new EventsSystem('Scene3D');

    // THREE
    this.scene = new THREE.Scene;
    this.camera = new THREE.PerspectiveCamera(45, 1, 1, 100000);
    this.renderer = new THREE.WebGLRenderer({alpha: true, preserveDrawingBuffer: true});
    this.raycaster = new THREE.Raycaster;
    this.lights = {
        ambient: new THREE.AmbientLight(0xffffff, 0.6),
        point: new THREE.PointLight(0xffffff, 0.6)
    };

    this.zeroAxes = null;

    this.animated = false;
    this.animationRequestId = null;

    this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.addEventListener('change', function (e) {
        this.render();
    }.bind(this));
    this.orbitControls.keyPanSpeed = 0;

    this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
    this.transformControl.addEventListener('change', function(event) {
        this.render();
    }.bind(this));
    this.transformControl.addEventListener('dragging-changed', function (event) {
        this.orbitControls.enabled = !event.value;
        this.events.fire('transformDragging', event);
    }.bind(this));
    this.transformControl.addEventListener('objectChange', function (event) {
        this.events.fire('transformObject', event.target);
    }.bind(this));

    this.mouse = {
        coordinates: {
            x: 0,
            y: 0
        },
        down: false,
        hovered: null,
        clicked: null
    };

    this.raycastClasses = [];

    this.clear = function () {
        var removeFromScene = [];
        this.scene.children.forEach(function (item) {
            if (item.isClearable && item.isClearable()) {
                removeFromScene.push(item);
            }
        });

        removeFromScene.forEach(function (item) {
            this.scene.remove(item);
        }.bind(this));

        return this;
    }

    this.mount = function () {
        if (!this.container) { // Already not mounted
            // Create container
            this.container = document.querySelector(this.selector);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.container.append(this.renderer.domElement);
            this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.container.addEventListener("mousedown", this.onMouseDown.bind(this));
            this.container.addEventListener("mouseup", this.onMouseUp.bind(this));
            this.container.addEventListener('resize', this.onResize.bind(this));

            // Add camera
            this.camera.fov = 45;
            // this.camera.zoom = 1;
            this.camera.position.x = 0;
            this.camera.position.y = 1000;
            this.camera.position.z = 0;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.lookAt(new THREE.Vector3);
            this.camera.updateProjectionMatrix();
            this.scene.add(this.camera);
            
            // Add lights
            this.scene.add(this.lights.ambient);
            this.camera.add(this.lights.point);

            // Add controls
            this.scene.add(this.transformControl);

            //Add zero coordinates
            this.zeroAxes = new THREE.AxesHelper(3000);
            this.scene.add(this.zeroAxes);

            this.transformControl.addEventListener('objectChange', function () {
                var mode = this.transformControl.getMode();

                if (typeof(this.transformControl.object.onTransform) === 'function') {
                    this.transformControl.object.onTransform(mode);
                }

                this.events.fire('transformUpdate', {
                    object: this.transformControl.object, 
                    mode: mode
                });
            }.bind(this));

            this.startAnimate();
        }

        return this;
    }

    this.unmount = function () {
        this.transformControl.detach();
        this.clear()//.stopAnimate();

        return this;
    }

    this.addTestMesh = function () {
        var geometry = new THREE.BoxGeometry(10, 10, 10);
        var material = new THREE.MeshLambertMaterial({color: 0x00FF00});
        var mesh = new THREE.Mesh(geometry, material);

        this.add(mesh);

        return mesh;
    }

    this.onMouseMove = function (event) {
        this.mouse.coordinates.x = (event.clientX / this.renderer.domElement.width) * 2 - 1;
        this.mouse.coordinates.y = -(event.clientY / this.renderer.domElement.height) * 2 + 1;

        this.raycast();

        this.events.fire('objectHovered', {hovered: this.mouse.hovered});
    }

    this.onMouseDown = function () {
        this.mouse.down = true;
        this.mouse.clicked = this.mouse.hovered;
        this.events.fire('objectClicked', {clicked: this.mouse.clicked});
    }

    this.onMouseUp = function () {
        this.mouse.down = false;
        this.mouse.clicked = null;
    }

    this.onResize = function () {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    this.raycast = function () {
        const canRaycastClass = function (raycasted) {
            var can = false;

            this.raycastClasses.forEach(function (raycastClass) {
                if (raycasted instanceof raycastClass) can = true;
            }.bind(this));

            return can;
        }.bind(this);

        this.raycaster.setFromCamera(this.mouse.coordinates, this.camera);

        var intersects = this.raycaster.intersectObjects(this.scene.children, true);
        var intersected = null;

        for (var i = 0; i < intersects.length; i++) {
            if (
                intersected === null && 
                intersects[i] && 
                intersects[i].object.canRaycasted !== false && // can raycast by default
                canRaycastClass(intersects[i].object)
            ) {
                intersected = intersects[i];
            }
        }

        this.mouse.hovered = intersected;
    }

    this.setRaycastClasses = function (classes) {
        this.raycastClasses = classes || [];
    }

    this.animate = function () {
        if (this.animated) {
            this.animationRequestId = requestAnimationFrame(this.animate.bind(this));
            this.render();
        }
    }

    this.startAnimate = function () {
        this.animated = true;
        this.animate();
        return this;
    }

    this.stopAnimate = function () {
        this.animated = false;
        //cancelAnimationFrame(this.animationRequestId);
        return this;
    }

    this.render = function () {
        this.renderer.render(this.scene, this.camera);
    }

    this.add = function (item) {
        this.scene.add(item);
        return this;
    }

    this.remove = function (item) {
        this.scene.remove(item);
        return this;
    }

    this.attachTransform = function (object) {
        this.transformControl.attach(object);
        return this;
    }

    this.detachTransform = function () {
        this.transformControl.detach();
        return this;
    }

    this.setTransformMode = function (mode) {
        const validModes = ['translate', 'rotate', 'scale'];
        if (~validModes.indexOf(mode)) {
            this.transformControl.setMode(mode);
        } else {
            console.warn('TransformControl Mode «' + mode + '» not valid!');
        }
        return this;
    }
}