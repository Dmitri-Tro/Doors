/* iFrame parent/child communication
 */
var Messenger = function(floormodel) {
    this.floormodel = floormodel;

    this.init = function() {
        var scope = this;

        // Listen to message from child window
        var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
        var eventListener = window[eventMethod];
        var messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
        eventListener(messageEvent, function(e) {
            scope.receiveMessage(e);
        }, false);
    };
    this.init();

    /* Send a message to iframe with iframeId
     * @param {string} iframeId iframe HtmlElement id
     */
    this.send = function(message, domain) {
        if (!domain) domain = "*";
        try {
            if (window.frames.length) {
                for (var i=0; i<window.frames.length; i++)
                    window.frames[i].postMessage(message, domain);
            }
        } catch(e) {}
    };

    /* Wrapper function to control messages when received from outside iframe
     * @param {Event} event
     */
    this.receiveMessage = function(event) {
        //if (event.origin.indexOf("https://") === 0 && event.origin.indexOf("immoviewer.com") > 0) return; //additional check
        try {
            switch (event.data.action) {
                case "cameralookat": //value = ath horizontal coordinate
                    this.floormodel.rotateActiveCamera(event.data.ath);
                    break;
                case "camerachange": //value = hotspot_name
                    this.floormodel.setActiveCameraByRoomName(event.data.hotspot);
                    break;
            }
        } catch (e) {}
    };
};

if ( typeof exports !== 'undefined' ) module.exports = Messenger;