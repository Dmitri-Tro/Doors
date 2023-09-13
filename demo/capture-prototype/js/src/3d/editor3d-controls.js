'use strict';

/**
 * Editor 3D controls
 * @class
 */
const Editor3DControls = function () {
    Controls.call(this, 'editor3d');
    
    // Static controls
    this.controls = {
        editor3dTransform: {
            id: 'editor3d-transform',
            type: 'button-group'
        },
        editor3dTransformMode: {
            id: 'editor3d-transform-mode',
            type: 'button-group'
        },
        uploadToServer: {
            id: 'editor3d-upload-to-server',
            type: 'button'
        },
        getGif: {
            id: 'editor3d-get-gif',
            type: 'button'
        },
        downloadModelObj: {
            id: 'editor3d-download-obj',
            type: 'button'
        },
        downloadModelStl: {
            id: 'editor3d-download-stl',
            type: 'button'
        },
        downloadXml: {
            id: 'editor3d-download-xml',
            type: 'button'
        },
        downloadPositions: {
            id: 'editor3d-camera-positions',
            type: 'button'
        },
        addRoom: {
            id: 'editor3d-add-room',
            type: 'button'
        },
        removeRoom: {
            id: 'editor3d-remove-room',
            type: 'button'
        },
        mergeRooms: {
            id: 'editor3d-merge-rooms',
            type: 'button'
        },
        assembleRooms: {
            id: 'editor3d-assemble-puzzle',
            type: 'button'
        },
        mergeCorners: { // Todo: make selector by class too
            id: 'editor3d-merge-corners',
            type: 'button'
        },
        resetFloor: {
            id: 'editor3d-reset-floor',
            type: 'button'
        },
        cutFloorByLine: {
            id: 'editor3d-cut-floor',
            type: 'button'
        }
    }
};
