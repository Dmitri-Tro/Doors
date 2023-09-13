function addAndPositionWindow() { // dbl click event called from sphere.xml
    var name = "window_" + ( windows.windowCount++ );
    windows.addWindow( name, windows.defaultWindowColor );
    windows.moveWindowToMousePosition( name, windows.defaultWindowWidth, windows.defaultWindowHeight );
}

var windows = {

    windowCount: 0,
    currentWindow: undefined, // name of the window currently being moved or undefined
    windowResizeCorner: undefined, // 1 = top left, 2 = top right, 3 = bottom right, 4 = bottom left
    resizeThreshold: 2,
    defaultWindowWidth: 10,
    defaultWindowHeight: 10,
    defaultWindowColor: "0x0000FF",
    defaultDoorColor: "0x614126",
    krpano: {},
    resizeUrl: 'images/pano/expand.png',
    closeUrl: 'images/pano/cancel.png',
    selectUrl: 'images/pano/selectbox.png',
    elements: [],
    fakeTargetMap: [],

    init: function() {

        this.krpano = document.getElementById( "krpanoSWFObject2" );

        // add demo door (we know from the meta information where the doors are):
        // this.addWindow("door_1", windows.defaultWindowColor);  // TODO: use different color (+ make sure it doesn't get lost on move)
        // this.moveWindowTo("door_1", -63, -8.5, -53, 13, 13);

        $( "body" ).mousemove( function( event ) {
            if ( windows.windowResizeCorner ) {
                if ( windows.windowResizeCorner === 3 ) {
                    windows.resizeOnLowerRightCorner();
                } else {
                    console.error( "Sorry, resizing is not supported for corner " + windows.windowResizeCorner );
                }
            } else if ( windows.currentWindow ) {
                windows.moveWindow();
            }
        } );
    },

    addWindow: function( windowName, fillColor ) {
        this.krpano.call( "addhotspot(" + windowName + ")" );
        this.krpano.set( "hotspot[" + windowName + "].ondown", function() {
            windows.onWindowDown( windowName );
        } );
        this.krpano.set( "hotspot[" + windowName + "].onup", function() {
            windows.onWindowUp( windowName );
        } );
        this.krpano.set( "hotspot[" + windowName + "].fillcolor", fillColor );
        this.krpano.set( "hotspot[" + windowName + "].bordercolor", "0x000000" );
        this.krpano.set( "hotspot[" + windowName + "].fillalpha", 0.4 );
        this.krpano.set( "hotspot[" + windowName + "].zorder", "1" );
        this.krpano.set( "hotspot[" + windowName + "].keep", false );

        this.addResizeIcon( windowName );
        this.addCloseIcon( windowName );
        this.addSelectBoxIcon( windowName );

        this.elements.push( windowName );

        this.krpano.call( "updatescreen();" );
    },

    removeWindow: function( windowName ) {
        this.krpano.call( "removehotspot(" + windowName + ")" );
        this.removeResizeIcon( windowName );
        this.removeCloseIcon( windowName );
        this.removeSelectIcon( windowName );

        var index = this.elements.indexOf( windowName );
        if ( index > -1 ) {
            this.elements[ index ] = undefined;
        }

        // we lost the hole and need to
        // send info to 3d model
        this.sendHolesTo3d();
    },

    addResizeIcon: function( windowName ) {
        this.krpano.set( "hotspot[" + windowName + "-resize].url", this.resizeUrl );
        this.krpano.set( "hotspot[" + windowName + "-resize].distorted", "true" );
        this.krpano.set( "hotspot[" + windowName + "-resize].renderer", "css3d" );
        this.krpano.call( "addhotspot(" + windowName + "-resize)" );

        // resize action
        this.krpano.set( "hotspot[" + windowName + "-resize].ondown", function() {
            this.onResizeDown( windowName );
        }.bind( this ) );
        this.krpano.set( "hotspot[" + windowName + "-resize].onup", function() {
            this.onWindowUp( windowName );
        }.bind( this ) );

        var resizeIcon = this.krpano.get( "hotspot[" + windowName + "-resize].sprite" );
        resizeIcon.className += "resize-icon-of-hole";
    },

    addCloseIcon: function( windowName ) {
        this.krpano.set( "hotspot[" + windowName + "-close].url", this.closeUrl );
        this.krpano.set( "hotspot[" + windowName + "-close].distorted", "true" );
        this.krpano.set( "hotspot[" + windowName + "-close].renderer", "css3d" );
        this.krpano.call( "addhotspot(" + windowName + "-close)" );

        // remove action
        this.krpano.set( "hotspot[" + windowName + "-close].onclick", function() {
            this.removeWindow( windowName );
        }.bind( this ) );

        var closeIcon = this.krpano.get( "hotspot[" + windowName + "-close].sprite" );
        closeIcon.className += "close-icon-of-hole";

    },

    addSelectBoxIcon: function( windowName ) {
        this.krpano.set( "hotspot[" + windowName + "-select].url", this.selectUrl );
        this.krpano.set( "hotspot[" + windowName + "-select].distorted", "true" );
        this.krpano.set( "hotspot[" + windowName + "-select].renderer", "css3d" );
        this.krpano.call( "addhotspot(" + windowName + "-select)" );

        // remove action
        this.krpano.set( "hotspot[" + windowName + "-select].onclick", function() {
            this.toggleSelectBox( windowName );
        }.bind( this ) );

        var closeIcon = this.krpano.get( "hotspot[" + windowName + "-select].sprite" );
        closeIcon.className += "close-icon-of-hole";
    },

    moveResizeIcon: function( windowName, ath, atv ) {
        this.krpano.set( "hotspot[" + windowName + "-resize].ath", ath );
        this.krpano.set( "hotspot[" + windowName + "-resize].atv", atv );
    },

    moveCloseIcon: function( windowName, ath, atv ) {
        this.krpano.set( "hotspot[" + windowName + "-close].ath", ath );
        this.krpano.set( "hotspot[" + windowName + "-close].atv", atv );
    },

    moveSelectBoxIcon: function( windowName, ath, atv ) {
        this.krpano.set( "hotspot[" + windowName + "-select].ath", ath );
        this.krpano.set( "hotspot[" + windowName + "-select].atv", atv );
    },

    removeResizeIcon: function( windowName ) {
        this.krpano.call( "removehotspot(" + windowName + "-resize);" );
    },

    removeCloseIcon: function( windowName ) {
        this.krpano.call( "removehotspot(" + windowName + "-close);" );
    },

    removeSelectIcon: function( windowName ) {
        this.krpano.call( "removehotspot(" + windowName + "-select);" );
        this.krpano.set( "plugin[cb].visible", false );
    },

    toggleSelectBox: function( windowName ) {
        if (this.krpano.get( "plugin[cb].visible" )) {
            this.krpano.set( "plugin[cb].visible", false );
        } else {
            var ath = this.krpano.get( "hotspot[" + windowName + "-select].ath" );
            var atv = this.krpano.get( "hotspot[" + windowName + "-select].atv" );
            this.krpano.call( "plugin[cb].removeAll()" );
            if ( !!window.apartmentData ) {
                this.krpano.call( "plugin[cb].addIdItem('', 'New Room', 'js(window.windows.setFakeScene("+windowName+", "+null+"))')" );
                for ( var room in window.apartmentData ) {
                    if (room !== window.model3d.sceneName)
                        this.krpano.call( "plugin[cb].addIdItem('" + room + "', '" + window.apartmentData[room].name + "', 'js(window.windows.setFakeScene("+windowName+", "+room+"))')" );
                }
            }

            this.krpano.set( "plugin[cb].parent", "hotspot[" + windowName + "-select]" );
            this.krpano.set( "plugin[cb].visible", true );
            this.krpano.set( "plugin[cb].x", 30 );
            this.krpano.set( "plugin[cb].y", -30 );
        }
    },

    setFakeScene: function(windowName, scene) {
        if (scene) this.fakeTargetMap[windowName] = scene;
        else delete this.fakeTargetMap[windowName];

        this.sendHolesTo3d();
    },

    moveWindowToMousePosition: function( windowName, windowWidth, windowHeight ) {
        // TODO: this is not yet correct, the window is distorted - its edges would need
        // to be parallel to the edges of the wall it is "in":
        this.krpano.call( "screentosphere(mouse.x, mouse.y, toh, tov);" );

        var toh = this.repairAngle( this.krpano.get( "toh" ) );
        var tov = this.repairAngle( this.krpano.get( "tov" ) );

        var topLeftH = toh - windowWidth / 2;
        var topLeftV = tov - windowHeight / 2;
        this.setPoint( windowName, 0, topLeftH, topLeftV ); // upper left corner
        this.setPoint( windowName, 1, topLeftH + windowWidth, topLeftV ); // upper right corner
        this.setPoint( windowName, 2, topLeftH + windowWidth, topLeftV + windowHeight ); // lower right corner
        this.setPoint( windowName, 3, topLeftH, topLeftV + windowHeight ); // lower left corner

        this.sendHolesTo3d();
    },

    moveWindowTo: function( windowName, topLeftH, topLeftV, bottomRightH, bottomRightV ) {
        this.setPoint( windowName, 0, topLeftH, topLeftV ); // upper left corner
        this.setPoint( windowName, 1, bottomRightH, topLeftV ); // upper right corner
        this.setPoint( windowName, 2, bottomRightH, bottomRightV ); // lower right corner
        this.setPoint( windowName, 3, topLeftH, bottomRightV ); // lower left corner

        this.sendHolesTo3d();
    },

    setPoint: function( name, point, ath, atv ) {

        // close and resize icons located
        // on 1 and 2 points respectively
        switch ( point ) {
            case 0:
                this.moveSelectBoxIcon( name, ath, atv );
                break;
            case 1:
                this.moveCloseIcon( name, ath, atv );
                break;
            case 2:
                this.moveResizeIcon( name, ath, atv );
                break;
        }

        this.krpano.set( "hotspot[" + name + "].point[" + point + "].ath", ath );
        this.krpano.set( "hotspot[" + name + "].point[" + point + "].atv", atv );
        this.krpano.call( 'updatescreen();' );
    },

    onWindowDown: function( name ) {
        this.krpano.call( "screentosphere(mouse.x, mouse.y, toh, tov);" );
        var mouseH = this.krpano.get( "toh" );
        var mouseV = this.krpano.get( "tov" );
        // lower right corner is used for resizing:
        var winCorner3H = this.krpano.get( "hotspot[" + name + "].point[2].ath" );
        var winCorner3V = this.krpano.get( "hotspot[" + name + "].point[2].atv" );
        var distSquared = Math.pow( Math.abs( mouseH - winCorner3H ), 2 ) + Math.pow( Math.abs( mouseV - winCorner3V ), 2 );
        var dist = Math.sqrt( distSquared );
        if ( dist <= this.resizeThreshold ) {
            this.windowResizeCorner = 3;
        }
        this.currentWindow = name;
    },

    onResizeDown: function( name ) {
        this.windowResizeCorner = 3;
        this.currentWindow = name;
    },

    onWindowUp: function( name ) {
        this.currentWindow = undefined;
        this.windowResizeCorner = undefined;
    },

    resizeOnLowerRightCorner: function() {
        var topLeftH = this.krpano.get( "hotspot[" + this.currentWindow + "].point[0].ath" );
        var topLeftV = this.krpano.get( "hotspot[" + this.currentWindow + "].point[0].atv" );
        this.krpano.call( "screentosphere(mouse.x, mouse.y, toh, tov);" );
        var mouseH = this.krpano.get( "toh" );
        var mouseV = this.krpano.get( "tov" );
        this.moveWindowTo( this.currentWindow, topLeftH, topLeftV, mouseH, mouseV );
    },

    moveWindow: function() {
        // just changing the ath/atv of the point doesn't work, so create a new window:
        var topLeft0H = this.krpano.get( "hotspot[" + this.currentWindow + "].point[0].ath" );
        var topLeft1H = this.krpano.get( "hotspot[" + this.currentWindow + "].point[1].ath" );
        var oldWidth = Math.abs( this.repairAngle( topLeft0H ) - this.repairAngle( topLeft1H ) );
        var topLeft0V = this.krpano.get( "hotspot[" + this.currentWindow + "].point[0].atv" );
        var topLeft3V = this.krpano.get( "hotspot[" + this.currentWindow + "].point[3].atv" );
        var oldHeight = Math.abs( this.repairAngle( topLeft0V ) - this.repairAngle( topLeft3V ) );
        this.moveWindowToMousePosition( this.currentWindow, oldWidth, oldHeight );
    },

    sendHolesTo3d: function() {
        var data = [];

        this.elements.forEach( function( el ) {
            if ( el !== undefined ) {

                var contour = [];
                for ( var j = 0; j < 4; j++ ) {
                    contour.push( {
                        ath: this.krpano.get( "hotspot[" + el + "].point[" + j + "].ath" ),
                        atv: this.krpano.get( "hotspot[" + el + "].point[" + j + "].atv" )
                    } )
                }

                data.push( {
                    name: el,
                    wallIndexes: this.lookHoleOnTheWall( contour ),
                    holeContour: contour,
                    target: this.checkTarget( contour, el )
                } );

            }
        }.bind( this ) );

        var states = window.model3d.updateHolesFromKrpanoHotspots( data );

        states.forEach( function( hole ) {
            this.changeColorOfHole( hole.name, hole.type );
        }.bind( this ) );
    },

    changeColorOfHole: function( name, type ) {
        var color = ( type === 'door' ) ? this.defaultDoorColor : this.defaultWindowColor;
        this.krpano.set( 'hotspot[' + name + '].fillcolor', color );
    },

    isPointInsideArc: function(point, corner1, corner2) {
        if (point <= -180) point += 360;
        if (point > 180) point -= 360;

        if (corner1 > corner2) corner1 -= 360;
        if (point > corner1 && point < corner2) return true;
        if (point > corner1+360 && point < corner2+360) return true; //also periodic segment check
        if (point > corner1-360 && point < corner2-360) return true;

        return false;
    },

    lookHoleOnTheWall: function( contour ) {

        var walls = window.pluginCell.cell;
        var result = false;
        var contourCopy = jQuery.extend(true, [], contour);

        //normalize angles
        if (contourCopy[0].ath > contourCopy[1].ath) contourCopy[0].ath -= 360;
        if (Math.abs(contourCopy[0].ath-contourCopy[1].ath) > 180) { //we assume that basepoint is inside room.
            var temp0 = contourCopy[0].ath;
            var temp1 = contourCopy[1].ath;
            contourCopy[1].ath = temp0;
            contourCopy[0].ath = temp1;
        }

        walls.forEach( function( wall, key, arr ) {
            var nextKey = ( key === arr.length - 1 ) ? 0 : key + 1;

            //no need to check contourCopy[2] and contourCopy[3] points, they are equal to contourCopy[1] and contourCopy[2]
            if ( this.isPointInsideArc(contourCopy[0].ath, arr[key].ath, arr[nextKey].ath) && this.isPointInsideArc(contourCopy[1].ath, arr[key].ath, arr[nextKey].ath) ) {
                result = [ key, nextKey ];
            }
        }.bind( this ) );

        return result;

    },

    checkTarget: function( contour, windowName ) {
        var result = undefined;
        var sceneName = window.model3d.sceneName;
        var hotspots = apartmentData[ sceneName ].hotspots;
        if (!hotspots.length) hotspots = apartmentData[ sceneName ].attachments || [];

        hotspots.forEach( function( link, i ) {
            var panorama = link.filenamePanorama || link.content[0].linkedRoom;
            var panoramaHPos = link.hotspotHPos || link.xPos;
            var panoramaVPos = link.hotspotVPos || link.yPos;

            var ath = this.repairAngle( panoramaHPos );
            var atv = this.repairAngle( panoramaVPos );

            // condition that link point inside the contour
            if (
                this.isPointInsideArc(ath, contour[0].ath, contour[1].ath) &&
                this.isPointInsideArc(ath, contour[3].ath, contour[2].ath) &&

                ( this.repairAngle( contour[ 0 ].atv ) < atv ) &&
                ( this.repairAngle( contour[ 1 ].atv ) < atv ) &&
                ( this.repairAngle( contour[ 2 ].atv ) > atv ) &&
                ( this.repairAngle( contour[ 3 ].atv ) > atv )

            ) { result = panorama; }

        }.bind( this ) );

        //then check selectbox, may be user chose scene manually
        if (result === undefined) {
            var isVisible = this.krpano.get( "plugin[cb].visible" );
            if (isVisible) {
                result = this.fakeTargetMap[windowName];
            }
        }

        console.log(result);
        return result;
    },

    restoreHoles: function( sceneName ) {
        var data = window.model3d.meshArray[ sceneName ].holes;
        if ( !!data ) {
            data.forEach( function( el, index, arr ) {
                this.windowCount = index + 1;
                if ( el !== undefined ) {
                    var windowName = 'window_' + index;
                    this.addWindow( windowName, this.defaultWindowColor );
                    var topLeftH = el.holeContour[ 0 ].ath;
                    var topLeftV = el.holeContour[ 0 ].atv;
                    var bottomRightH = el.holeContour[ 2 ].ath;
                    var bottomRightV = el.holeContour[ 2 ].atv;
                    this.moveWindowTo( windowName, topLeftH, topLeftV, bottomRightH, bottomRightV );
                }
            }.bind( this ) );
        }
    },

    repairAngle: function( degrees ) {
        if ( ( Math.sign( degrees ) === -1 ) && ( degrees > -225 ) && ( degrees < -135 ) ) {
            return degrees + 360;
        } else {
            return degrees;
        }
    },

};
