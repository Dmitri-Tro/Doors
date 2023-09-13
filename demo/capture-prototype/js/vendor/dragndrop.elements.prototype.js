'use strict';

(function () {
    var interiorElement = {
        hotspotActiveName : null,
        elementType: null,

        init: function () {
            this.krpano = document.getElementById( "krpanoSWFObject2" );
        },
        initElement: function (name, url, width, height) {
            var that = this;
            this.krpano.call("addhotspot(" + name + ")");
            this.krpano.set("hotspot[" + name + "].url", url);
            this.krpano.set("hotspot[" + name + "].alpha", 0.4);
            this.krpano.set("hotspot[" + name + "].scale", 2.0);
            this.krpano.set("hotspot[" + name + "].width", width);
            this.krpano.set("hotspot[" + name + "].height", height);
            this.krpano.set("hotspot[" + name + "].ath", 5);
            this.krpano.set("hotspot[" + name + "].atv", -38);

            this.krpano.set("hotspot[" + name + "].ondown", function() {
                that.hotspotActiveName = name;
            });

            this.krpano.set("hotspot[" + name + "].onup", function() {
                that.hotspotActiveName = false;
                that.convertCoordsAndBuild3dModel();
            });
            console.log('element-created');
        },
        moveElement: function () {
            if (this.hotspotActiveName){
                this.krpano.call( "screentosphere(mouse.x, mouse.y, toh, tov);" );
                var hCoord = this.krpano.get('toh');
                var vCoord = this.krpano.get('tov');
                this.krpano.set("hotspot["+ this.hotspotActiveName +"].ath", hCoord);
                this.krpano.set("hotspot["+ this.hotspotActiveName +"].atv", vCoord);
            }
        },
        convertCoordsAndBuild3dModel: function () {
            var hCoord = this.krpano.get('toh');
            var vCoord = this.krpano.get('tov');
            if(window.model3d.getXgetYgetZ(hCoord, vCoord, 0).r > 0){
                window.model3d.loadObj('./obj/Toilet.obj', window.model3d.getXgetYgetZ(hCoord, vCoord, 0));
                window.model3d.render();
            }
        }
    };

    function addInteriorElementToKrpnao() {
        $('#add-stove-btn').on('click', function () {
            var date = new Date();
            interiorElement.initElement('test-stove' + date.getTime(), './stove-icon.jpg', 40, 60);

            $('body').on('mousemove', function () {
                interiorElement.moveElement()
            })
        });
    }
    addInteriorElementToKrpnao();

    interiorElement.init();

})();
