
'use strict';
var Placement = function(roomName) { //abstract room definition, created to manage rooms properties

    var scope = this;
    var USUAL_ROOM = 0;
    var BALCONY = 1;

    this.id = Utils.guid();
    this.roomName = roomName || "";
    this.type = USUAL_ROOM;
    this.visibleName = this.roomName;
    this.visibleNamePosition = null; /* position of rooms name label */
    this.isRoomNameShown = false; /* boolean. Do show roomName or not */
    this.areDimensionsShown = false; /* boolean. Do show central dimensions in this rooms or not */
    this.dimensionIndex = 0; /* used in room.getDimensions() */
    this.dimensionsCache = [];

    this.ceilingTypes = {
        "BOX": 1,
        "SLOPED": 2,
        "PEAKED": 3,
        "ATTIC": 4,
        "TRAY": 5
    };
    this.ceiling = this.ceilingTypes.BOX;

    this.editable = {
        "visibleName": {
            type: "string",
            label: "Room name",
            value: this.visibleName
        },
        "type": {
            type: "switch",
            label: "Type",
            variants: [
                {label: "Usual Room", value: USUAL_ROOM, checked: 1},
                {label: "Balcony", value: BALCONY}
            ],
            value: this.type,
            casttype: "number"
        },
        "ceiling": {
            type: "switch",
            label: "Ceiling Type",
            variants: [
                {label: "Box", value: this.ceilingTypes.BOX, checked: 1},
                {label: "Sloped", value: this.ceilingTypes.SLOPED},
                {label: "Peaked", value: this.ceilingTypes.PEAKED},
                {label: "Attic", value: this.ceilingTypes.ATTIC},
                {label: "Tray", value: this.ceilingTypes.TRAY}
            ],
            value: this.ceiling,
            casttype: "number"
        },
        "isRoomNameShown": {
            type: "switch",
            label: "Name visibility",
            variants: [
                {label: "Visible", value: true, checked: 1},
                {label: "Not visible", value: false}
            ],
            value: this.isRoomNameShown,
            casttype: "number"
        },
        "areDimensionsShown": {
            type: "switch",
            label: "Measurements",
            variants: [
                {label: "Visible", value: true, checked: 1},
                {label: "Not visible", value: false}
            ],
            width: "70%",
            value: this.areDimensionsShown,
            casttype: "boolean"
        },
        "dimensionIndex": {
            type: "button",
            callback: function() {
                scope.dimensionIndex++;
                scope.dimensionsCache = [];
            },
            label: "",
            width: "30%",
            value: this.dimensionIndex
        }
    };

    this.getName = function() {
        return this.roomName;
    };

    this.isUsualRoom = function() {
        return this.type === USUAL_ROOM;
    };

    this.isBalcony = function() {
        return this.type === BALCONY;
    };

    this.toggleType = function() {
        if (this.type === USUAL_ROOM) this.type = BALCONY;
        else this.type = USUAL_ROOM;
    };

    this.setName = function(name){
        this.visibleName = name;
    };
    this.setVisibleName = this.setName;
};

Placement.prototype.toJSON = function() {
    return {
        "id": this.id,
        "roomName": this.roomName,
        "type": this.type,
        "visibleName": this.visibleName,
        "visibleNamePosition": this.visibleNamePosition,
        "isRoomNameShown": this.isRoomNameShown,
        "areDimensionsShown": this.areDimensionsShown,
        "dimensionIndex": this.dimensionIndex
    }
};

if ( typeof exports !== 'undefined' ) module.exports = Placement;