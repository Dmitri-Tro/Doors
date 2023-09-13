'use strict';
/**
 * Class for storing and mapping setting variables
 * @param floormodel {FloorModel}
 * @param settings {[]}
 * @constructor
 */
var SettingsMapper = function(floormodel, settings) {
    this.floorModel = floormodel;

    this.predefined = {
        wallsHeight: {reference: this.floorModel.sceneModel, key: "wallsHeight"}
    };

    //expand and store here any plan and 3d related properties separated from objects (walls, doors, etc)
    /*settings = settings || [];
    settings.forEach(function(val, key, arItems) {
        this[key] = val;
    });*/
};

SettingsMapper.prototype.toJSON = function() {
    var json = {};
    for (var key in this.predefined) {
        json[key] = this.predefined[key].reference[this.predefined[key].key];
    }
    return json;
};

/**
 * In our system we don't use SettingsMapper fields, we use real variables from other places, so we need to update them
 */
SettingsMapper.prototype.updateReferences = function() {
    for (var key in this.predefined) {
        if (key in this && this.predefined[key].reference) this.predefined[key].reference[this.predefined[key].key] = this[key];
    }
};

if ( typeof exports !== 'undefined' ) module.exports = SettingsMapper;