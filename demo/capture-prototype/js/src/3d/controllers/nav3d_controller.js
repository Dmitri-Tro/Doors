
'use strict';
/* Controller for navigation on the "3D View"
 */
var Nav3dController = function(sceneModel, floorController) {
    var scope = this;

    /* selectors */
    var sUploadModel = '.js-upload-model';
    var sDownloadCameras = '.js-cameras-list';
    var sDownloadObj = '.merged-rooms';
    var sSaveXml = '.js-save-xml';
    var sWallsHeightInput = '.js-walls-height';
    this.sWallHeightBox = '.js-selected-height';
    
    this.doorParameterCenterSelector = '.js-door-parameter-center';
    this.doorParameterWidthSelector = '.js-door-parameter-width';
    this.doorParameterHeightSelector = '.js-door-parameter-height';

    this.sceneModel = sceneModel;
    this.floorController = floorController;
    this.selectedWall = null;
    this.selectedMesh = null;

    function init() {
        $(sUploadModel).click( function() {
            scope.uploadModel();
        } );
        $(sDownloadCameras).click(function(){
            var cExport = new Export(scope.floorController.floormodel, true);
            cExport.saveCamerasList();
        });
        // export button handlers
        $(sDownloadObj).click( function() {
            scope.sceneModel.export3dObj(scope.floorController.floormodel);
        } );
        $(sSaveXml).click(function() { //save xml
            var exportInstance = new CommonExport(scope.floorController.floormodel, scope.sceneModel, true);
            exportInstance.toXML();
        });

        $(sWallsHeightInput).on("change", Utils.debounce(function(e) {
            var height = parseInt($(sWallsHeightInput).val(), 10);
            if (height > 0) scope.sceneModel.wallsHeight = height;
            new SceneLoader(scope.sceneModel, scope.floorController.floormodel);
            return true;
        }, 500));

        $(scope.sWallHeightBox).on("change", "input", Utils.debounce(function(e) {
            if (scope.selectedWall) {
                scope.selectedWall.height = parseInt($(this).val(), 10);
                scope.sceneModel.rebuildWall(scope.selectedWall, scope.selectedMesh);
            }
            scope.sceneModel.render();
            return true;
        }, 500));

        // doors
        $(scope.doorParameterHeightSelector).on("change", "input", Utils.debounce(function(e) {
            if (scope.selectedWall && scope.selectedMesh) {
                scope.selectedMesh.doorParams.height = parseInt($(this).val(), 10);

                var door = floorController.floormodel.getDoorById(scope.selectedMesh.doorParams.doorId);
                door.setHeight(scope.selectedMesh.doorParams.height);
                
                scope.sceneModel.rebuildWall(scope.selectedWall, scope.selectedMesh);
            }
            scope.sceneModel.render();
            return true;
        }, 500));

        $(scope.doorParameterCenterSelector).on("change", "input", Utils.debounce(function(e) {
            if (scope.selectedWall && scope.selectedMesh) {
                var center = parseInt($(this).val(), 10);

                var door = floorController.floormodel.getDoorById(scope.selectedMesh.doorParams.doorId);

                var newCoordinates = door.moveCenter(center);

                scope.selectedMesh.doorParams.doorFrameCoordinates = [
                  {x: newCoordinates.x1, z: newCoordinates.y1},
                  {x: newCoordinates.x2, z: newCoordinates.y2}
                ]
                
                scope.sceneModel.rebuildWall(scope.selectedWall, scope.selectedMesh);
            }
            scope.sceneModel.render();
            return true;
        }, 500));

        $(scope.doorParameterWidthSelector).on("change", "input", Utils.debounce(function(e) {
            if (scope.selectedWall && scope.selectedMesh) {
                scope.selectedMesh.doorParams.width = parseInt($(this).val(), 10);

                var door = floorController.floormodel.getDoorById(scope.selectedMesh.doorParams.doorId);
                door.setWidth(scope.selectedMesh.doorParams.width, 'center');

                scope.sceneModel.rebuildWall(scope.selectedWall, scope.selectedMesh);
            }
            scope.sceneModel.render();
            return true;
        }, 500));
      }
    init();

    /* Inputs are not blurred by default when clicked on canvas, because canvas clicks are redefined by three.js . That's why we'll do that implicitly
     */
    this.handleInputBlurs = function() {
        scope.sceneModel.threeMergingScene.on("click.blurInputs", function() {
            $(sWallsHeightInput).blur();
        });
    };

    /* show input for separate walls
     */
    this.showInputWallHeight = function(wall, mesh) {
        var height = wall.height || this.sceneModel.wallsHeight;
        this.selectedWall = wall;
        this.selectedMesh = mesh;
        $(this.sWallHeightBox).find("input").val(height)
            .end().removeClass("hide");
    };

    this.showInputDoorParameters = function (wall, mesh) {
        this.selectedWall = wall;
        this.selectedMesh = mesh;

        var door = floorController.floormodel.getDoorById(scope.selectedMesh.doorParams.doorId);
        var distance = door.getDistanceBetweenWallCorners();

        $(this.doorParameterCenterSelector).removeClass("hide");
        $(this.doorParameterWidthSelector).removeClass("hide");
        $(this.doorParameterHeightSelector).removeClass("hide");

        $(this.doorParameterCenterSelector).find("input").val(distance.center);
        $(this.doorParameterWidthSelector).find("input").val(this.selectedMesh.doorParams.width);
        $(this.doorParameterHeightSelector).find("input").val(this.selectedMesh.doorParams.height);
    }

    this.hideInputDoorParameters = function () {
        $(this.doorParameterCenterSelector).addClass("hide");
        $(this.doorParameterWidthSelector).addClass("hide");
        $(this.doorParameterHeightSelector).addClass("hide");
    }

    this.reset = function () {
      this.hideInputDoorParameters();
      this.hideInputWallHeight();
      this.resetVariables();
    }

    this.resetVariables = function () {
        this.selectedWall = null;
        this.selectedMesh = null;
    }

    /* hide input for separate walls
     */
    this.hideInputWallHeight = function() {
        $(this.sWallHeightBox).addClass("hide");
    };

    this.uploadModel = function() {
        function showError(jqXHR, textStatus, error) { //show window with error
            var text = "Got an error from server: " + error;
            var popover = new PopoverDialog("center", 100, text, "Error");
            popover.addButton("OK", function() {
                popover.close();
            });
            popover.render();
        }
        function showSuccess() {
            var popover = new PopoverDialog("center", 100, "Uploaded succesfully!", "Success");
            popover.addButton("OK", function() {
                popover.close();
            });
            popover.render();
        }

        var domain = window.dataHandling.getDomain();
        var floorId = window.dataHandling.params.floor || null;
        var tourId = window.dataHandling.params.orderId || null;

        var exportInstance = new Export(scope.floorController.floormodel, false);
        var camerasData = exportInstance.saveCamerasList();
        $.when(
            scope.floorController.nav.sendData(domain, floorId, tourId, null, false), //send floorplan data parallely
            scope.sceneModel.export3dObj(scope.floorController.floormodel, true)
        )
            .done(function() {
                var fileModel = scope.sceneModel.savedModel;

                var request1 = new RequestBackend(domain, window.dataHandling.params.authToken);
                var request2 = new RequestBackend(domain, window.dataHandling.params.authToken);
                $.when(request1.send3DModel(tourId, floorId, fileModel))
                    .done(function(response1) {
                        if (response1.type === "ATTACHMENT_UPLOADED") {
                            $.when(request2.send3DCameras(tourId, floorId, camerasData))
                                .done(function() {
                                    showSuccess();
                                })
                                .fail(showError);
                        } else {
                            showError(null, null, "Model hasn't been uploaded!");
                        }
                    })
                    .fail(showError);
            });
    };
};