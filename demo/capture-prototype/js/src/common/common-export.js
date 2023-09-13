
'use strict';
/* Export both model and floorplan stuff
 * @param {object} FloorModel object
 * @param {object} SceneModel object
 * @param {boolean} sendToBrowser flag indicates whether to allow to download file or not
 */
var CommonExport = function(floormodel, scenemodel, sendToBrowser) {
    var scope = this;
    this.floormodel = floormodel;
    this.scenemodel = scenemodel;
    this.sendToBrowser = sendToBrowser;
};

CommonExport.prototype.toXML = function() {
    var floorplanExport = new Export(this.floormodel);
    var xml = floorplanExport.toXML();
    var modelXml = "";

    modelXml += "<model>";
    modelXml += "<wallsHeight>" + this.scenemodel.wallsHeight + "</wallsHeight>";
    modelXml += "</model>";

    xml = xml.replace("></floorplan>", ">" + modelXml + "</floorplan>");

    if (this.sendToBrowser) {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(xml);
        Utils.sendFileToBrowser(dataStr, "modeldata.xml");
    }

    return xml;
};