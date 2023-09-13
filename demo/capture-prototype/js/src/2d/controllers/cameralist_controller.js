'use strict';
var CameraListClass = function(controller, currentRoomId, htmlWrapper) {
    this.controller = controller;
    this.currentRoomId = currentRoomId;
    this.roomObj = null;

    this.htmlWrapper = htmlWrapper;
    this.htmlContainer = ".camerapanel";
    this.propsCameraSelector = ".propspanel__addcamera";

    this.dropDownItemClass = "js-camerapanel-dropdown-item";
    this.cameraListItemClass = "camerapanel__list-item";
    this.cameraRoomName = "camerapanel__roomname";
    this.cameraAssignClass = "js-assign-roomname";
    this.cameraRemoveClass = "js-remove-cam";

    this.handleListItemHover();
    this.handleListItemClick();
    this.handleCameraActions();
    this.init = function() { //is fired every room selection
        this.getRoom();
        this.bindCameraAdding();
        this.handleDropdown();
        this.render();
    };
    return this;
};

CameraListClass.prototype.bindCameraAdding = function() {
    var scope = this;
    $(document).off("click", this.propsCameraSelector);
    $(document).on("click", this.propsCameraSelector, function(e) { //add camera handler
        e.preventDefault();
        if (scope.roomObj) {
            var camX = scope.roomObj.getCenter().x, camY = scope.roomObj.getCenter().y, cam;
            if (scope.roomObj.getPlacement().visibleNamePosition === null) { //center of room
                camY += 40; //shift a little to not overlap room name
            }

            if (!Utils.isPointInsidePolygon(camX, camY, scope.roomObj.corners)) {//may be its a complex U-shape or L-shape room
                var p = scope.roomObj.getVisualCenter();
                camX = p.x;
                camY = p.y;
            }
            cam = new Camera(camX, camY, 0, 0, null, scope.roomObj.roomName, false, true);

            scope.controller.floormodel.cameras.push(cam);
        }
        scope.render();
    });
};

CameraListClass.prototype.getRoom = function() {
    var scope = this;
    var object_id = this.currentRoomId;
    var object = scope.controller.floormodel.getObjectById(object_id);
    scope.controller.floormodel.rooms.forEach(function(room) {
        if (room.roomName === object.roomName) scope.roomObj = room;
    });
};

CameraListClass.prototype.renderContainer = function() {
    $(this.htmlWrapper).append("<div class='camerapanel'></div>");
};

CameraListClass.prototype.render = function() {
    $(this.htmlContainer).remove();
    this.renderContainer();
    this.renderList();
    this.renderButton();
};

CameraListClass.prototype.renderButton = function() {
    $(this.htmlContainer)
        .append("<a href='javascipt:void(0)' class='propspanel__addcamera' data-object_id='"+this.currentRoomId+"'><span class='glyphicon glyphicon-facetime-video'></span> Add camera</a>");
};

CameraListClass.prototype.renderList = function() {
    var cameras = [], scope = this;
    scope.controller.floormodel.cameras.forEach(function(camera) {
        if (camera.roomName === scope.roomObj.roomName) cameras.push(camera);
    });
    if (cameras.length) {
        var items = [];
        cameras.forEach(function(camera) {
            if (camera.isAddedManually) items.push("<li class='list-group-item camerapanel__list-item'>"+scope.getSelect(camera.id)+"</li>");
            else items.push(
                "<li class='list-group-item camerapanel__list-item' data-id='"+camera.id+"'>" +
                "<div class='row'>" +
                "<div class='col-xs-9 camerapanel__roomname'><span class='glyphicon glyphicon-facetime-video'></span> " + (camera.visibleName || camera.roomName) + "</div>" +
                "<div class='col-xs-3'>" +
                "<a href='#' class='camerapanel__rotate js-assign-roomname' title='Assign camera name to room'><i class='fas fa-check'></i></a>" +
                "<a href='#' class='camerapanel__rotate camerapanel__rotate_last js-remove-cam' title='Remove camera'><i class='fas fa-times'></i></a>" +
                "</div>" +
                "</li>");
        });
        $(this.htmlContainer).append("<ul class='list-group camerapanel__list'>"+items.join("")+"</ul>");
    }
};

CameraListClass.prototype.getSelect = function(cameraId) {
    var positionsFrom3d = [], arScenes = this.getAvailableCameras();
    for (var i=0; i<arScenes.length; i++) {
        positionsFrom3d.push("<li><a class='"+this.dropDownItemClass+"' href='#' data-id='"+arScenes[i].filename+"' data-camera='"+arScenes[i].name+"'>" +
            arScenes[i].name+" <span class='camerapanel__helper'>"+arScenes[i].filename+"</span>" +
            "</a></li>");
    }
    return "<div class='dropdown camerapanel__dropdown'>" +
        "<button id='dLabel' type='button' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>Choose a camera position<span class='caret'></span></button>" +
        "<ul class='dropdown-menu' aria-labelledby='dLabel' data-camera='"+cameraId+"'>"+positionsFrom3d.join("")+"</ul>" +
        "</div>";
};

CameraListClass.prototype.getAvailableCameras = function() {
    var scope = this, scenes = [], newScenes;
    for (var scene in window.apartmentData) {
        if (window.apartmentData.hasOwnProperty(scene)) scenes.push(window.apartmentData[scene]);
    }
    newScenes = scenes.filter(function (item) {
        var bSave = true;
        for (var i=0; i<scope.controller.floormodel.cameras.length; i++) {
            if (scope.controller.floormodel.cameras[i].id === item.filename) bSave = false;
        }

        if ("plan" in item && item.plan.toString() !== window.dataHandling.params.floor) bSave = false;

        return bSave;
    });
    return newScenes;
};

CameraListClass.prototype.handleDropdown = function() {
    var scope = this;
    $(document).off("click", "."+this.dropDownItemClass);
    $(document).on("click", "."+this.dropDownItemClass, function(e) { //change camera id
        e.preventDefault();
        var sceneId = $(this).data("id");
        var newCameraName = $(this).data("camera");
        var cameraId = $(this).parent().parent("ul").data("camera");
        var camera = scope.controller.floormodel.getCameraById(cameraId);
        var placement = scope.roomObj.getPlacement();

        var camerasInRoom = [];
        scope.controller.floormodel.cameras.forEach(function(camera) {
            if (camera.roomName === scope.roomObj.roomName && !camera.isAddedManually) camerasInRoom.push(camera);
        });

        if (sceneId && camera && placement) {
            camera.id = sceneId;
            camera.isAddedManually = false;
            camera.visibleName = newCameraName;

            //set room's name from panorama
            if (camerasInRoom.length === 0) {
                scope.setRoomsNameBackFromCamera(camera);
            }

            scope.render();
            scope.controller.fireRedraw();
            scope.controller.propsNav.update();
        }
    });
};

/* Set name for the room where current camera is situated.
 * Thats the case when panorama is attached to camera (the first attachment)
 * https://app.asana.com/0/325793706170889/426041205958666
 */
CameraListClass.prototype.setRoomsNameBackFromCamera = function (camera) {
    var room = null;
    for (var i=0; i<this.controller.floormodel.rooms.length; i++) {
        if (this.controller.floormodel.rooms[i].roomName === camera.roomName) room = this.controller.floormodel.rooms[i];
    }
    room.setVisibleName(camera.visibleName);
};

CameraListClass.prototype.handleListItemHover = function() {
    var scope = this;
    $(document).off("mouseover mouseout", "."+this.cameraListItemClass);
    $(document).on("mouseover", "."+this.cameraListItemClass, function(e) { //change camera id
        var cameraId = $(this).data("id");
        var camera = scope.controller.floormodel.getCameraById(cameraId);
        if (camera) {
            camera.highlighted = true;
            scope.controller.fireRedraw();
        }
    }).on("mouseout", "."+this.cameraListItemClass, function(e) { //change camera id
        var cameraId = $(this).data("id");
        var camera = scope.controller.floormodel.getCameraById(cameraId);
        if (camera) {
            camera.highlighted = false;
            scope.controller.fireRedraw();
        }
    });
};

CameraListClass.prototype.handleListItemClick = function() {
    var scope = this;
    $(document).off("click", "."+this.cameraRoomName);
    $(document).on("click", "."+this.cameraRoomName, function(e) {
        e.preventDefault();
        var cameraId = $(this).closest("."+this.cameraListItemClass).data("id");
        window.messenger.send({action: "camerachange", hotspot: cameraId});
    });
};

CameraListClass.prototype.handleCameraActions = function() {
    var scope = this;
    $(document)
        .off("click", "."+this.cameraAssignClass)
        .on("click", "."+this.cameraAssignClass, function(e) {
            e.preventDefault();
            var cameraId = $(this).closest("."+scope.cameraListItemClass).data("id");
            var camera = scope.controller.floormodel.getCameraById(cameraId);
            scope.setRoomsNameBackFromCamera(camera);
            scope.controller.fireRedraw();
            scope.controller.propsNav.update();
        });
    $(document)
        .off("click", "."+this.cameraRemoveClass)
        .on("click", "."+this.cameraRemoveClass, function(e) {
            e.preventDefault();
            var cameraId = $(this).closest("."+scope.cameraListItemClass).data("id");
            var camera = scope.controller.floormodel.getCameraById(cameraId);
            Utils.removeValue(scope.controller.floormodel.cameras, camera);
            scope.controller.fireRedraw();
            scope.controller.propsNav.update();
        });
};

var CameraListController = (function() {
    var instances = [];
    return {
        getInstance: function (controller, currentRoomId, htmlContainer) {
            if (!instances[currentRoomId]) {
                instances[currentRoomId] = new CameraListClass(controller, currentRoomId, htmlContainer);
            }
            return instances[currentRoomId];
        }
    };
})();