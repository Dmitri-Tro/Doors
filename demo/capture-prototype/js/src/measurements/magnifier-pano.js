'use strict';

/** 
 * Class responsible to magnifier pano
 * @class
 * @param  {string} selector
 */
const MagnifierPano = function (selector) {
    this.initialized = false;
    this.active = false;

    this.pano = null;
    this.panoSelector = selector ? selector : 'magnifier-pano'; // default selector

    this.images = {
        test: 'images/pano/marker.png',
        cross: 'images/pano/marker-magnifier.png',
        contrastedCross: 'images/pano/marker-magnifier-contrast.png'
    };

    this.events = new EventsSystem('MagnifierPano');
    
    /** 
     * initialize pano
     * @returns {this}
     */
    this.init = function () {
        if (this.initialized !== false) return this;
        
        this.initialized = 'in proccess';

        function ready () {
            this.pano = document.getElementById(this.panoSelector + '-pano');
            this.initialized = true;
        }

        function error () {
            this.initialized = false;
        }

        embedpano({
            id: this.panoSelector + '-pano',
            xml: "templates/sphere-magnifier.xml",
            target: this.panoSelector,
            html5: "webgl+only",
            webglsettings:{
                depth: true
            },
            onready: ready.bind(this),
            onerror: error.bind(this),
            passQueryParameters: true,
            wmode: "opaque"
        });

        return this;
    }

     /**
     * @param  {number} pitch
     * @param  {number} roll
     * @returns {this}
     */
    this.updatePitchRoll = function (pitch, roll) {
        this.pano.set("image.prealign", (-pitch)+"|0|"+(-roll));
        this.pano.call("updatescreen();");

        return this;
    }
    
    /**
     * @param  {string} url
     * @returns {this}
     */
    this.setImage = function (url, pitch, roll) {
        this.pano.call("setimage(" + url + ", " + -pitch + ", " + -roll + ");");
        this.pano.call("updateobject(true,true);");
        this.addCrossLayer();

        return this;
    }
    
    /**
     * @param  {number} ath
     * @param  {number} atv
     * @returns {this}
     */
    this.setPosition = function (ath, atv) {
        this.pano.set("view.hlookat", ath);
        this.pano.set("view.vlookat", atv);
        this.pano.set("view.fov", 8);

        return this;
    }

    /**
     * @returns {this}
     */
    this.addCrossLayer = function () { 
        var cross = this.images.contrastedCross;

        this.pano.call('addlayer("cross")');
        this.pano.set('layer["cross"].name', 'cross');
        this.pano.set('layer["cross"].type', 'image');
        this.pano.set('layer["cross"].url', cross);
        this.pano.set('layer["cross"].align', 'center');
        this.pano.set('layer["cross"].edge', 'center');
        this.pano.set('layer["cross"].zorder', '1000');
        this.pano.set('layer["cross"].x', 0);
        this.pano.set('layer["cross"].y', 0);
        this.pano.set('layer["cross"].keep', true);
        this.pano.set('layer["cross"].visible', true);
        this.pano.set('layer["cross"].enabled', true);

        return this;
    }
}