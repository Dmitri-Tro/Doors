var panoSelector = function() {
    this.dropDown = {};

    this.init = function() {
        var _this = this;
        this.dropDown = $('#urlSelector .dropdown-menu');

        var request = window.dataHandling.dataRequest = window.dataHandling.queryData();
        request.then(function() {
            _this.setRoomsInMenu();
            _this.initDropDownClickHandler();
            _this.initSelectRoomClickHandler();
        });
    };

    /** fly to another camera
     *
     */
    this.changeBasePoint = function(newScene) {
        var url = apartmentData[ newScene ].url;
        setKrpanoImage( url );
        //this.setLabel( apartmentData[ newScene ].name );
        window.pluginCell.changeScene( window.model3d.sceneName, newScene );
    };

    this.setRoomsInMenu = function() {
        if ( !!window.apartmentData ) {
            for ( var room in window.apartmentData ) {
                $( '.apartment-data' ).append( '<li><div class="form-inline"><label class="room-selector-label">' + window.apartmentData[room].name + '</label>' +
                    '<input type="hidden" name="url" value="' + room + '"><button class="btn btn-sm btn-success"><span class="glyphicon glyphicon-ok"></span></button></div></li>' );
            }
        }
    };

    this.initDropDownClickHandler = function() { // for disable closing of dropdown
        this.dropDown.click( function( event ) {
            event.stopPropagation();
        } );
    };

    // choose room from menu
    //also start scene is loaded
    this.initSelectRoomClickHandler = function() {
        var singleTone = false;
        this.dropDown.find( 'button.btn' ).click( function() {
            if ( singleTone ) {
                $( '.mergingContainer button' ).trigger( 'click', 'automerge' );
            }
            var room = $( this ).parent().find( 'input' ).val();
            var url = window.apartmentData[ room ].url;
            //console.log("URL " + url);
            setKrpanoImage( url );
            window.pluginCell.changeScene( window.model3d.sceneName, room );
            singleTone = true;
        } );
        this.dropDown.find( 'button.btn' )[ 0 ].click();
    };

    function createIdOfPanoUrl( url ) {
        return btoa( url );
    }
};
window.panoSelector = new panoSelector();

//it is used from xml actions, thats why its away from panoselector prototype
function setKrpanoImage( url ) {
    var krpano1 = document.getElementById( 'krpanoSWFObject1' );
    var krpano2 = document.getElementById( 'krpanoSWFObject2' );
    if (krpano1) {
        krpano1.call( "setimage(" + url + ");" );
    } else {
        console.warn('krpanoSWFObject1 not exists!');
    }
    if (krpano2) {
        krpano2.call( "setimage(" + url + ");" );
    } else {
        console.warn('krpanoSWFObject2 not exists!');
    }
}
