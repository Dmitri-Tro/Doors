var pluginCell = {

    // hotspots
    markerImg: 'images/pano/marker.png',
    borderColor: '0x000000',
    borderWidth: 2,

    krpano: null,
    krpanoSmall: null,
    krpanoSmallCameraAngle: 0,
    krpanoSmallCameraName: "",

    cell: [],
    originHorizontalShift: 0, // in some cases we need to have origin point to be not in 0, but any other degree
    saveCell: null,
    cellIndexes: [],

    helpers: [],
    helperUrl: 'images/pano/target.png',

    initPano: function () {
        embedpano({
            id: 'krpanoSWFObject1',
            xml:"templates/sphere-magnifier.xml",
            target:"panoMagnifier",
            html5:"webgl+only",
            webglsettings:{
                depth:true
            },
            passQueryParameters:true,
            wmode: "opaque"
        });
        embedpano({
            id: 'krpanoSWFObject2',
            xml: "templates/sphere.xml",
            target: "pano",
            html5: "webgl+only",
            webglsettings: {
                depth:true
            },
            passQueryParameters:true,
            wmode: "opaque"
        });
    },

    init: function() {
        this.krpano = document.getElementById( 'krpanoSWFObject2' );
        this.krpanoSmall = document.getElementById( 'krpanoSWFObject3' );
        this.adjustImage();
        this.bindRotating();
        this.attachMagnifier();
    },

    /* adjust image settings (pitch and roll) when its loaded */
    adjustImage: function() {
        this.krpano.set("events.onloadcomplete", setPitchYawRoll);
    },

    bindRotating: function() {
        var timeout;
        $('#rotate-left').on('mousedown', function () {
            timeout = setInterval(function () {
                window.pluginCell.rotateCell(-0.8)
            }, 50);
        }).on('mouseup', function () {
            clearInterval(timeout)
        });

        $('#rotate-right').on('mousedown', function () {
            timeout = setInterval(function () {
                window.pluginCell.rotateCell(0.8)
            }, 50);
        }).on('mouseup', function () {
            clearInterval(timeout)
        });
    },

    changeScene: function( currentScene, newScene ) {

        this.removeHelpers();

        // reset counter of windows/doors
        window.windows.windowCount = 0;
        window.windows.elements = [];

        if ( !window.model3d.meshArray[ newScene ] ) { // scene has not exists
            // danger hack method
            // need to repair from setTimeout
            // to async handler of readyness
            setTimeout( function() {
                window.model3d.changeScene( currentScene, newScene );
                this.buildDefaultContour();
            }.bind( this ), 500 );
        } else { // scene alreadyExists
            this.cell = $.extend(true, [], window.model3d.meshArray[ newScene ].cell);
            window.model3d.changeScene( currentScene, newScene );
            this.buildContour( this.cell );
            window.model3d.changeOfRoom( $.extend([], this.cell) );
            window.windows.restoreHoles( newScene );
        }

        setTimeout( function() {
            this.addHelpers( newScene );
            this.createOrigin();
        }.bind( this ), 500);

    },

    addHelpers: function( room ) {
        if (!this.krpano) return console.warn('pluginCell not initialized!');
        var hotspots = apartmentData[ room ].hotspots;
        if (!hotspots || hotspots.length === 0) hotspots = apartmentData[ room ].attachments || [];

        hotspots.forEach( function( link ) {

            var helper = link.hotspotXMLName;
            var panorama = link.filenamePanorama || link.content[0].linkedRoom;
            var panoramaName = link.namePanorama || "";
            var panoramaHPos = link.hotspotHPos || link.xPos;
            var panoramaVPos = link.hotspotVPos || link.yPos;
            this.helpers.push( helper );

            this.krpano.call( 'addhotspot(' + helper + ')' );
            this.krpano.set( 'hotspot[' + helper + '].keep', false );
            this.krpano.set( 'hotspot[' + helper + '].handcursor', false );
            this.krpano.set( 'hotspot[' + helper + '].url', this.helperUrl );
            this.krpano.set( 'hotspot[' + helper + '].ath', panoramaHPos );
            this.krpano.set( 'hotspot[' + helper + '].atv', panoramaVPos );
            this.krpano.set( 'hotspot[' + helper + '].alpha', 0.7 );
            this.krpano.set( 'hotspot[' + helper + '].zorder', "99" );
            this.krpano.set( 'hotspot[' + helper + '].renderer', "css3d" );
            this.krpano.set( 'hotspot[' + helper + '].onover', function() {
                console.log('Points to ' + panorama + " / " + panoramaName)
            });
            var that = this;
            this.krpano.set( 'hotspot[' + helper + '].onclick', function() {
                window.panoSelector.changeBasePoint(panorama);
            });

        }.bind( this ) );

        this.krpano.call( "updatescreen();" );
    },

    removeHelpers: function() {
        if (!this.krpano) return console.warn('pluginCell not initialized!');
        this.helpers.forEach( function( helper ) {
            this.krpano.call( 'removehotspot(' + helper + ')' );
        }.bind( this ) );

        this.krpano.call( "updatescreen();" );
    },

    buildDefaultContour: function() {
        if (!this.krpano) return console.warn('pluginCell not initialized!');
        // default box
        this.cell = [ {
            ath: -45,
            bottomAtv: 10,
            topAtv: -10
        }, {
            ath: 45,
            bottomAtv: 10,
            topAtv: -10
        }, {
            ath: 135,
            bottomAtv: 10,
            topAtv: -10
        }, {
            ath: 225,
            bottomAtv: 10,
            topAtv: -10
        } ];


        var saveCell = Cookies.get('saveCell') ? JSON.parse(Cookies.get('saveCell')) : this.saveCell;
        //console.log(apartmentData);
        this.buildContour( this.cell );

        // create default 3d box
        window.model3d.changeOfRoom( this.cell );

    },

    getCell: function() {
        var temp = [], _this = this;
        this.cell.forEach( function( el, index, cellArr ) {
            temp.push({
                ath: el.ath + _this.originHorizontalShift,
                bottomAtv: el.bottomAtv,
                topAtv: el.topAtv
            });
        } );
        return temp;
    },

    buildContour: function( dataArr ) {
        // dynamic creating of contour
        var that = this;
        dataArr.forEach( function( el, index, cellArr ) {
            that.createVertical( el.ath, el.bottomAtv, el.topAtv, index );
            var indexNext = ( index === cellArr.length - 1 ) ? 0 : index + 1;
            that.createHorizontals( index, indexNext, cellArr );
            that.createLineLengths(index, indexNext, cellArr);
            that.cellIndexes.push({index: index, indexNext: indexNext});
        } );
    },

    rotateCell : function (step) {
        for (var i = 0; i <= this.cellIndexes.length - 1; i++) {
            var index = this.cellIndexes[i].index;
            var indexNext = this.cellIndexes[i].indexNext;

            var hsPositionV = this.krpano.get( 'hotspot[hs' + index + '].atv');
            var hsPositionH = this.krpano.get( 'hotspot[hs' + index + '].ath');

            var hsuPositionV = this.krpano.get( 'hotspot[hsu' + index + '].atv');
            var hsuPositionH = this.krpano.get( 'hotspot[hsu' + index + '].ath');

            var edgeBetweenPositionV0 = this.krpano.get( 'hotspot[edgeBetween' + index + '].point[0].atv');
            var edgeBetweenPositionV1 = this.krpano.get( 'hotspot[edgeBetween' + index + '].point[1].atv');
            var edgeBetweenPositionH0 = this.krpano.get( 'hotspot[edgeBetween' + index + '].point[0].ath');
            var edgeBetweenPositionH1 = this.krpano.get( 'hotspot[edgeBetween' + index + '].point[1].ath');

            var edgeTopPositionV0 = this.krpano.get( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[0].atv');
            var edgeTopPositionV1 = this.krpano.get( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[1].atv');
            var edgeTopPositionH0 = this.krpano.get( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[0].ath');
            var edgeTopPositionH1 = this.krpano.get( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[1].ath');

            var edgeBottomPositionV0 = this.krpano.get( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[0].atv');
            var edgeBottomPositionV1 = this.krpano.get( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[1].atv');
            var edgeBottomPositionH0 = this.krpano.get( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[0].ath');
            var edgeBottomPositionH1 = this.krpano.get( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[1].ath');

            this.krpano.set( 'hotspot[hs' + index + '].ath', hsPositionH + step);
            this.krpano.set( 'hotspot[hsu' + index + '].ath', hsuPositionH + step);

            this.krpano.set( 'hotspot[edgeBetween' + index + '].point[0].ath', edgeBetweenPositionH0 + step);
            this.krpano.set( 'hotspot[edgeBetween' + index + '].point[1].ath', edgeBetweenPositionH1 + step);

            this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[0].ath', edgeTopPositionH0 + step);
            this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[1].ath', edgeTopPositionH1 + step);

            this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[0].ath', edgeBottomPositionH0 + step);
            this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[1].ath', edgeBottomPositionH1 + step);

            this.cell[i].ath = hsPositionH + step;
        }
        // change 3d model accordinly to array
        window.model3d.changeOfRoom( this.cell );

        // restore hole positions from view
        window.windows.sendHolesTo3d();
    },

    removeContour: function( dataArr ) {
        var that = this;
        dataArr.forEach( function( el, index, cellArr ) {

            var indexNext = ( index === cellArr.length - 1 ) ? 0 : index + 1;

            that.krpano.call( 'removehotspot(hs' + index + ')' );
            that.krpano.call( 'removehotspot(hsu' + index + ')' );
            that.krpano.call( 'removehotspot(edgeBetween' + index + ')' );
            that.krpano.call( 'removehotspot(edgeTop:' + index + '-' + indexNext + ')' );
            that.krpano.call( 'removehotspot(edgeBottom:' + index + '-' + indexNext + ')' );

        } );

    },

    pointDown: function( point ) {
        var isTopPoint = ( point.search( 'hsu' ) === -1 ) ? false : true;
        var index = isTopPoint ? parseInt( point.replace( 'hsu', '' ) ) : parseInt( point.replace( 'hs', '' ) );
        var indexPrev = ( index - 1 >= 0 ) ? ( index - 1 ) : ( this.cell.length - 1 );
        var indexNext = ( index + 1 === this.cell.length ) ? 0 : ( index + 1 );

        var that = this;
        $(this.krpano).on( 'mousemove.pointTracker', function( event ) {
            // get coordinates from screen
            that.krpano.call( 'screentosphere(mouse.x, mouse.y, tath, tatv);' );

            var ath = that.krpano.get( 'tath' );
            var atv = that.krpano.get( 'tatv' );
            that.saveCell = that.changePointPosition( {
                point: point,
                isTopPoint: isTopPoint,
                index: index,
                indexPrev: indexPrev,
                indexNext: indexNext,
                ath: ath,
                atv: atv
            } );
            Cookies.set('saveCell', that.saveCell);

        } );

    },

    pointUp: function( point ) {
        $(this.krpano).off( 'mousemove.pointTracker' );
    },

    edgeClick: function( index, indexNext ) {
        if ( confirm( 'Want you to insert additional edges?' ) ) {
            this.removeContour( this.cell );
            this.insertEdgesToArray( index, indexNext );
            this.buildContour( this.cell );

            // add edges to 3d model
            window.model3d.changeOfRoom( this.cell );

            // restore holes from view
            window.windows.sendHolesTo3d();
        }
    },

    insertEdgesToArray: function( index, indexNext ) {

        var firstAdditionalPoint = {
            ath: this.cell[ index ].ath + ( this.cell[ indexNext ].ath - this.cell[ index ].ath ) / 3,
            bottomAtv: ( this.cell[ index ].bottomAtv + this.cell[ indexNext ].bottomAtv ) / 2,
            topAtv: ( this.cell[ index ].topAtv + this.cell[ indexNext ].topAtv ) / 2
        };
        var secondAdditionalPoint = {
            ath: this.cell[ index ].ath + ( this.cell[ indexNext ].ath - this.cell[ index ].ath ) * 2 / 3,
            bottomAtv: ( this.cell[ index ].bottomAtv + this.cell[ indexNext ].bottomAtv ) / 2,
            topAtv: ( this.cell[ index ].topAtv + this.cell[ indexNext ].topAtv ) / 2
        };

        // 180 degrees mistake
        if ( ( this.cell[ index ].ath > 0 ) && ( this.cell[ indexNext ].ath < 0 ) ) {
            firstAdditionalPoint.ath = this.cell[ index ].ath + ( 360 + this.cell[ indexNext ].ath - this.cell[ index ].ath ) / 3;
            secondAdditionalPoint.ath = this.cell[ index ].ath + ( 360 + this.cell[ indexNext ].ath - this.cell[ index ].ath ) * 2 / 3;
        }

        // push elements into array
        this.cell.splice( indexNext, 0, firstAdditionalPoint, secondAdditionalPoint );
    },

    createVertical: function( ath, bottomAtv, topAtv, index ) {
        if (!this.krpano) return console.warn('pluginCell not initialized!');
        // bottom point properties
        this.krpano.call( 'addhotspot(hs' + index + ')' );
        this.krpano.set( 'hotspot[hs' + index + '].keep', false );
        this.krpano.set( 'hotspot[hs' + index + '].url', this.markerImg );
        this.krpano.set( 'hotspot[hs' + index + '].ath', ath );
        this.krpano.set( 'hotspot[hs' + index + '].atv', bottomAtv );
        this.krpano.set( 'hotspot[hs' + index + '].scale', 2.0 );
        this.krpano.set( 'hotspot[hs' + index + '].alpha', 0.6 );

        // bottom point actions
        this.krpano.set( 'hotspot[hs' + index + '].ondown', function() {
            this.pointDown( 'hs' + index );
        }.bind( this ) );
        this.krpano.set( 'hotspot[hs' + index + '].onup', function() {
            this.pointUp( 'hs' + index );
        }.bind( this ) );

        // top point properties
        this.krpano.call( 'addhotspot(hsu' + index + ')' );
        this.krpano.set( 'hotspot[hsu' + index + '].keep', false );
        this.krpano.set( 'hotspot[hsu' + index + '].url', this.markerImg );
        this.krpano.set( 'hotspot[hsu' + index + '].ath', ath );
        this.krpano.set( 'hotspot[hsu' + index + '].atv', topAtv );
        this.krpano.set( 'hotspot[hsu' + index + '].scale', 2.0 );
        this.krpano.set( 'hotspot[hsu' + index + '].alpha', 0.6 );

        // top point actions
        this.krpano.set( 'hotspot[hsu' + index + '].ondown', function() {
            this.pointDown( 'hsu' + index );
        }.bind( this ) );
        this.krpano.set( 'hotspot[hsu' + index + '].onup', function() {
            this.pointUp( 'hsu' + index );
        }.bind( this ) );

        // edge between top and bottom
        this.krpano.call( 'addhotspot(edgeBetween' + index + ')' );
        this.krpano.set( 'hotspot[edgeBetween' + index + '].keep', false );

        this.krpano.set( 'hotspot[edgeBetween' + index + '].point[0].ath', ath );
        this.krpano.set( 'hotspot[edgeBetween' + index + '].point[0].atv', bottomAtv );

        this.krpano.set( 'hotspot[edgeBetween' + index + '].point[1].ath', ath );
        this.krpano.set( 'hotspot[edgeBetween' + index + '].point[1].atv', topAtv );

        this.krpano.set( 'hotspot[edgeBetween' + index + '].bordercolor', this.borderColor );
        this.krpano.set( 'hotspot[edgeBetween' + index + '].polyline', true );
        this.krpano.set( 'hotspot[edgeBetween' + index + '].borderwidth', this.borderWidth );
    },

    createHorizontals: function( index, indexNext, cellArr ) {
        if (!this.krpano) return console.warn('pluginCell not initialized!');
        // top edge between nearby points
        this.krpano.call( 'addhotspot(edgeTop:' + index + '-' + indexNext + ')' );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].keep', false );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[0].ath', cellArr[ index ].ath );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[0].atv', cellArr[ index ].topAtv );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[1].ath', cellArr[ indexNext ].ath );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].point[1].atv', cellArr[ indexNext ].topAtv );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].bordercolor', this.borderColor );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].polyline', true );
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].borderwidth', this.borderWidth );
        //  top edge actions
        this.krpano.set( 'hotspot[edgeTop:' + index + '-' + indexNext + '].onclick', function() {
            this.edgeClick( index, indexNext );
        }.bind( this ) );

        // bottom edge between nearby points
        this.krpano.call( 'addhotspot(edgeBottom:' + index + '-' + indexNext + ')' );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].keep', false );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[0].ath', cellArr[ index ].ath );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[0].atv', cellArr[ index ].bottomAtv );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[1].ath', cellArr[ indexNext ].ath );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].point[1].atv', cellArr[ indexNext ].bottomAtv );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].bordercolor', this.borderColor );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].polyline', true );
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].borderwidth', this.borderWidth );
        //  bottom edge actions
        this.krpano.set( 'hotspot[edgeBottom:' + index + '-' + indexNext + '].onclick', function() {
            this.edgeClick( index, indexNext );
        }.bind( this ) );

    },

    createLineLengths: function(index, indexNext, arr) {
        if (!this.krpano) return console.warn('pluginCell not initialized!');

        var point = window.model3d.getXgetYgetZ(arr[index].ath, arr[index].bottomAtv, arr[index].topAtv);
        var point2 = window.model3d.getXgetYgetZ(arr[indexNext].ath, arr[indexNext].bottomAtv, arr[indexNext].topAtv);
        var a = point.x - point2.x;
        var b = point.z - point2.z;
        var length = Math.sqrt( a*a + b*b );

        var first = arr[index].ath;
        var second = arr[indexNext].ath;
        if (first < 0) first += 360;
        if (second < 0 || second < first) second += 360;
        var middle = first + (second - first) / 2;

        this.krpano.call( 'removehotspot(measure:' + index + '-' + indexNext + ')' );
        this.krpano.call( 'addhotspot(measure:' + index + '-' + indexNext + ')' );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].type', "text" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].keep', false );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].visible', true );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].enabled', true );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].html', Utils.cmToMeters(length) );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].bgcolor', "0xffffff" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].bgalpha', "0.5" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].vcenter', false);
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].bgborder', "1" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].distorted', true);
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].renderer', "webgl");
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].align', "top" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].edge', "top" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].ath', middle);
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].atv', (arr[indexNext].bottomAtv + arr[index].bottomAtv) / 2);
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].fillcolor', "0x000000" );
        this.krpano.set( 'hotspot[measure:' + index + '-' + indexNext + '].css', "font-family:Arial; font-size:16px; color:#000000;" );
    },

    createOrigin: function() { //make an floor-wall axis to calculate a rotating degree. Used when we need to rotate a floorplan
        /*var _this = this;
        this.krpano.call('addhotspot(origiX);');
        this.krpano.set('hotspot[origiX].type', "image");
        this.krpano.set('hotspot[origiX].url', "images/axis_arrow.png");
        this.krpano.set('hotspot[origiX].distorted', true);
        this.krpano.set('hotspot[origiX].ath', 0);
        this.krpano.set('hotspot[origiX].atv', 0);
        this.krpano.set('hotspot[origiX].scale', "0.5");
        this.krpano.set('hotspot[origiX].ondown', "draghotspot();");
        this.krpano.set('hotspot[origiX].onup', function() {
            _this.originHorizontalShift = _this.krpano.get('hotspot[origiX].ath');
            window.model3d.changeOfRoom( this.getCell() );
        });*/
    },

    changePointPosition: function( params ) {
        if (!this.krpano) return console.warn('pluginCell not initialized!');
        // change pressed point position
        this.krpano.set( 'hotspot[' + params.point + '].ath', params.ath );
        this.krpano.set( 'hotspot[' + params.point + '].atv', params.atv );

        if ( params.isTopPoint ) {

            // change coordinates in cell array
            this.cell[ params.index ].ath = params.ath;
            this.cell[ params.index ].topAtv = params.atv;

            // change position of edgeBetween
            this.krpano.set( 'hotspot[edgeBetween' + params.index + '].point[0].ath', params.ath );
            this.krpano.set( 'hotspot[edgeBetween' + params.index + '].point[1].ath', params.ath );
            this.krpano.set( 'hotspot[edgeBetween' + params.index + '].point[1].atv', params.atv );

            // change position of opposite point
            this.krpano.set( 'hotspot[hs' + params.index + '].ath', params.ath );

            // change position of previous top edge
            this.krpano.set( 'hotspot[edgeTop:' + params.indexPrev + '-' + params.index + '].point[1].ath', params.ath );
            this.krpano.set( 'hotspot[edgeTop:' + params.indexPrev + '-' + params.index + '].point[1].atv', params.atv );

            // change position of previous bottom edge
            this.krpano.set( 'hotspot[edgeBottom:' + params.indexPrev + '-' + params.index + '].point[1].ath', params.ath );

            // change position of next top edge
            this.krpano.set( 'hotspot[edgeTop:' + params.index + '-' + params.indexNext + '].point[0].ath', params.ath );
            this.krpano.set( 'hotspot[edgeTop:' + params.index + '-' + params.indexNext + '].point[0].atv', params.atv );

            // change position of next bottom edge
            this.krpano.set( 'hotspot[edgeBottom:' + params.index + '-' + params.indexNext + '].point[0].ath', params.ath );

        } else {

            // change coordinates in cell array
            this.cell[ params.index ].ath = params.ath;
            this.cell[ params.index ].bottomAtv = params.atv;

            // change position of edgeBetween
            this.krpano.set( 'hotspot[edgeBetween' + params.index + '].point[0].ath', params.ath );
            this.krpano.set( 'hotspot[edgeBetween' + params.index + '].point[0].atv', params.atv );
            this.krpano.set( 'hotspot[edgeBetween' + params.index + '].point[1].ath', params.ath );

            // change position of opposite point
            this.krpano.set( 'hotspot[hsu' + params.index + '].ath', params.ath );

            // change position of previous top edge
            this.krpano.set( 'hotspot[edgeTop:' + params.indexPrev + '-' + params.index + '].point[1].ath', params.ath );

            // change position of previous bottom edge
            this.krpano.set( 'hotspot[edgeBottom:' + params.indexPrev + '-' + params.index + '].point[1].ath', params.ath );
            this.krpano.set( 'hotspot[edgeBottom:' + params.indexPrev + '-' + params.index + '].point[1].atv', params.atv );

            // change position of next top edge
            this.krpano.set( 'hotspot[edgeTop:' + params.index + '-' + params.indexNext + '].point[0].ath', params.ath );

            // change position of next bottom edge
            this.krpano.set( 'hotspot[edgeBottom:' + params.index + '-' + params.indexNext + '].point[0].ath', params.ath );
            this.krpano.set( 'hotspot[edgeBottom:' + params.index + '-' + params.indexNext + '].point[0].atv', params.atv );

        }

        // change 3d model accordinly to array
        //window.model3d.changeOfRoom( this.getCell() );
        window.model3d.changeOfRoom( this.cell );

        // restore hole positions from view
        window.windows.sendHolesTo3d();

        this.createLineLengths(params.indexPrev, params.index, this.cell);
        this.createLineLengths(params.index, params.indexNext, this.cell);

        return this.cell;

    },

    /* Small pano actions*/

    /* get current looking angle
     * @return {number} from -180 to 180
    */
    getSmallCellAngle: function() {
        return this.krpanoSmallCameraAngle;
    },

    setSmallCellAngle: function(angle) {
        this.krpanoSmallCameraAngle = angle;
    },

    /* Change scene of small pano
     */
    changeSceneSmall: function(newScene) { //used directly in xml
        //this.krpanoSmall.call("loadscene("+newScene+")");
        //this.changeSceneSmallAfterHandler(newScene);
    },

    /* handler which is fired after changing scene
     */
    changeSceneSmallAfterHandler: function(newScene) { //used directly in xml
        //window.merging3d.threeMergingScene.trigger("camerachange", newScene);
    },

    reloadSmallPano: function(url) {
        //Moved to panoController

        if (url) {
            var path = new URL(url);
            var urlWithParams = path.origin + path.pathname;
            if (path.search.length > 1) urlWithParams += (path.search + "&");
            else urlWithParams += "?";
            urlWithParams += "psm.showFloorPlan=false" +
                "&psm.floorplanCreationMode=true" +
                "&psm.showRotate=false" +
                "&psm.showLogo=false" +
                "&psm.showContact=false" +
                "&psm.showInfopointsList=false" +
                "&psm.showExposeInfo=false" +
                "&p.measurementTool=true" +
                "&messagingEnabled=1"; //measurement tool + iframe messaging
            $(this.krpanoSmall).html("<iframe id='iframeTour' style='width: 100%; height:100%' src='" + urlWithParams + "'></iframe>");
        } else {
            function krpanoReady(krpano){
                var pathname = document.location.pathname;
                if (document.location.pathname.indexOf(".html") !== -1) pathname = pathname.substring(0, pathname.lastIndexOf('/')) + "/";

                var krpanoXML = new EJS({url: document.location.origin + pathname + 'templates/sphere-small.ejs'}).render(window.apartmentData);
                krpano.call("loadxml(" + krpanoXML + ")");
            }
            function krpanoError(error){
                console.log("Error on init krpano", error);
            }
            $(this.krpanoSmall).remove();
            embedpano({
                id: 'krpanoSWFObject3',
                xml: null,
                target: "2dpano",
                html5: "webgl+only",
                webglsettings: {
                    depth:true
                },
                passQueryParameters:true,
                wmode: "opaque",
                onready:krpanoReady,
                onerror:krpanoError,
                consolelog: true
            });
        }
    },
    attachMagnifier: function() {
        var krpano1 = document.getElementById( "krpanoSWFObject1" ); // the magnifier
        var krpano2 = document.getElementById( "krpanoSWFObject2" );
        $(window).mousemove( function( event ) {
            var msg = "Handler for .mousemove() called at ";
            msg += event.pageX + ", " + event.pageY;
            var mousex = krpano2.get( "mouse.x" );
            var mousey = krpano2.get( "mouse.y" );
            var mousePos = krpano2.screentosphere( mousex, mousey );
            krpano1.set( "view.hlookat", mousePos.x );
            krpano1.set( "view.vlookat", mousePos.y );
            krpano1.set( "view.fov", 12 );
        } );
    }
};

$( document ).ready( function() {
    window.pluginCell = pluginCell;
} );

function loadScene( name ) {
    var krpano = document.getElementById( "krpanoSWFObject2" );
    krpano.call( "loadscene(" + name + ")" );
    var magnifierKrpano = document.getElementById( "krpanoSWFObject1" );
    magnifierKrpano.call( "loadscene(" + name + ")" );
}

function setPitchYawRoll() {
    var krpano2 = document.getElementById( 'krpanoSWFObject2' );
    var xml = krpano2.get("scene[changed].content");
    if (xml.length > 0) {
        //get url as string
        var start = xml.indexOf("url=");
        var end = xml.indexOf("/></image>");
        var url = xml.substr(start+5, end-(start+5)-1);

        //get pitch and roll settings from jpeg xmp data
        var newImg = new Image;
        newImg.onload = function() {
            EXIF.enableXmp();
            EXIF.getData(this, function() {
                try {
                    var pitch = this.xmpdata["x:xmpmeta"]["rdf:RDF"]["rdf:Description"]["GPano:PosePitchDegrees"]["#text"];
                    var roll = this.xmpdata["x:xmpmeta"]["rdf:RDF"]["rdf:Description"]["GPano:PoseRollDegrees"]["#text"];
                    krpano2.call("setPitch('"+(-pitch)+"|0|"+(-roll)+"')");
                    console.log("Pitch and roll changed according to xmp image data");
                } catch(e) {
                    console.log("No xmp data");
                }
            });
        };
        newImg.src = url;
    }
}