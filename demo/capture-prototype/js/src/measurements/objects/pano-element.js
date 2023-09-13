const PanoElement = function (pano, options) {
    this.id = Utils.guid();  
    this.x = 0;
    this.y = 0;
    this.room = null;
    this.type = undefined;
    this.visible = true,
    this.deletable = true;
    this.zOrder = 0;

    this._pano = pano;
    this._needUpdate = true;

    Object.assign(this, options || {});

    this.setOptions = function (newOptions) {
        this.needUpdate = true;
        Object.assign(this, newOptions);
        
        return this;
    }

    this.getOptions = function () {
        return this.options;
    }

    this.update = function (force) {
        if (this.needUpdate || force) {
            this.needUpdate = false;
            this.draw();
        }

        return this;
    }

    this.draw = function () {
        if (this.pano) {
            var methodName = this.type + 'Draw';

            if (this[methodName]) {
                this.pano.call('addhotspot(' + this.id + ')');

                this[methodName]();


            } else {
                console.warn('Type «' + this.type + '» of hotspot not supported');
            }
        }

        return this;
    }

    this.clear = function () {

    }

    // METHODS FOR CUSTOM TYPES (TODO: Move to another classes)
    this.cornerDraw = function () {
        this.pano.call('addhotspot("' + hotspotId + '")');
        this.pano.set(
            'hotspot["' + hotspotId + '"].url', 
            this.images[
                'point' + 
                (options.location === 'FLOOR' ? 'Floor' : 'Ceiling') + 
                (options.angle90 === true ? '90' : '')
            ]
        );
        this.pano.set('hotspot["' + hotspotId + '"].alpha', options.visible ? 1.0 : 0.25);
        this.pano.set('hotspot["' + hotspotId + '"].ath', options.x);
        this.pano.set('hotspot["' + hotspotId + '"].atv', options.y);
        this.pano.set('hotspot["' + hotspotId + '"].zorder', options.zOrder ? options.zOrder : this.types.corner.order);
        this.pano.set('hotspot["' + hotspotId + '"].renderer', 'css3d');
        this.pano.set('hotspot["' + hotspotId + '"].onhover', function () {
            if (this.config.showHoweredHotspot) { // show hovered hotspot
                if (this.temp.hoveredHotspot.last !== hotspotId) {
                    console.log('Hovered:', this.hotspots[hotspotId]);
                    this.temp.hoveredHotspot.last = hotspotId;
                }
            }
            this.temp.hoveredHotspot.id = hotspotId;
        }.bind(this));
        this.pano.set('hotspot["' + hotspotId + '"].onout', function () {
            this.temp.hoveredHotspot.id = null;
        }.bind(this));
        this.pano.set('hotspot["' + hotspotId + '"].ondown', function () {
            event.preventDefault();
            this.handleMouseDown();
            this.temp.clickedHotspot.id = hotspotId;
        }.bind(this));
    }
}