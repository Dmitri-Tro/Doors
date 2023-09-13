var mergePlugin = function() {

    var $mergingPopup = $( ".mergingPopup" );
    var $variants = $mergingPopup.find( ".variants" );
    var $mergeButton = $mergingPopup.find( "button" );

    // preparing dialog popup
    $mergingPopup.dialog( {
        resizable: false,
        height: 300,
        width: 600,
        modal: true,
        autoOpen: false
    } ).on( 'click', 'button', function( e ) {
        e.stopPropagation();
        $mergingPopup.dialog( 'close' );
    } );

    $( '.mergingContainer button' ).on( 'click', function( event, data ) {
        mergeConditions( event, data );
    } );


    $mergeButton.on( 'click', function() {

        // select the gate for merging

        var $selected1DoorInput = $mergingPopup.find( 'input[name=firstRoomUuid]' );
        var selected1Door = $( $selected1DoorInput ).filter( ':checked' ).val();
        if ( !selected1Door ) {
            selected1Door = $( $selected1DoorInput ).val();
        }

        var $selected2DoorInput = $mergingPopup.find( 'input[name=secondRoomUuid]' );
        var selected2Door = $( $selected2DoorInput ).filter( ':checked' ).val();
        if ( !selected2Door ) {
            selected2Door = $( $selected2DoorInput ).val();
        }

        window.merging3d.merge( window.model3d.sceneName, selected1Door, selected2Door );

    } );

    // remerging plugin
    $( '.remergingContainer button' ).on( 'click', function() {
        merging3d.remerge();
    } );
};

function mergeConditions( event, data, sceneName ) {

    var $mergingPopup = $( ".mergingPopup" );
    var $variants = $mergingPopup.find( ".variants" );
    var $mergeButton = $mergingPopup.find( "button" );

    var sceneName = ( !!sceneName ) ? sceneName : window.model3d.sceneName;

    var doors = window.model3d.meshArray[ sceneName ].doors;
    var merging3d = window.merging3d;
    var freeDoors = merging3d.doors;

    // functionality for automerging with targeted doors that have
    // same position like it specifying in apartment data

    var success = false;
    var door1 = {};
    var door2 = {};

    freeDoors.forEach( function( targetDoor ) {
        doors.forEach( function( sourceDoor ) {
            if (
                ( targetDoor.source === sourceDoor.target ) &&
                ( targetDoor.target === sourceDoor.source )
            ) {
                success = true;
                door1 = targetDoor;
                door2 = sourceDoor;
            }
        } );
    } );

    if ( success ) {
        window.merging3d.merge( sceneName, door1.uuid, door2.uuid );
        return 'doors find each other with targets'
    }

    $variants.html( '' );
    // different cases of existing data
    if ( $.inArray( sceneName, window.merging3d.mergedRoomsId ) !== -1 ) {

        if ( data !== 'automerge' ) {
            $mergingPopup.dialog( 'open' );
            $variants.html( '<p>This room already merged. Please, select another pano for merging.</p>' );
            $mergeButton.hide();
        }
        return 'This room already merged. Please, select another pano for merging.'

    } else if ( ( freeDoors.length === 0 ) && ( merging3d.mergedRoomsId.length !== 0 ) ) {

        if ( data !== 'automerge' ) {
            $mergingPopup.dialog( 'open' );
            $variants.html( '<p>There are not free doors merging to.</p>' );
            $mergeButton.hide();
        }
        return 'There are not free doors merging to.'

    } else if ( !( sceneName in window.model3d.meshArray ) ) {

        if ( data !== 'automerge' ) {
            $mergingPopup.dialog( 'open' );
            $variants.html( '<p>Contour is absent in current scene. Please, specify contour for merge them to common plan.</p>' );
            $mergeButton.hide();
        }
        return 'Contour is absent in current scene. Please, specify contour for merge them to common plan.'

    } else if ( !doors.length ) {

        if ( data !== 'automerge' ) {
            $mergingPopup.dialog( 'open' );
            $variants.html( '<p>Door is absent in current scene. Please, specify at least 1 door for merging another rooms.</p>' );
            $mergeButton.hide();
        }
        return 'Door is absent in current scene. Please, specify at least 1 door for merging another rooms.'

    } else if ( ( freeDoors.length === 1 ) && ( doors.length === 1 ) && ( freeDoors[ 0 ].target === undefined ) && ( doors[ 0 ].target === undefined ) ) {

        // Only one door of current room case
        window.merging3d.merge( sceneName, freeDoors[ 0 ].uuid, doors[ 0 ].uuid );
        return 'Only one door of current room case.'

    } else if ( ( freeDoors.length !== 0 ) && ( ( freeDoors.length > 1 ) || ( doors.length > 1 ) ) ) {

        // restore all gates for merging for selecting
        $mergingPopup.dialog( 'open' );

        if ( ( freeDoors.length === 1 ) && ( freeDoors[ 0 ].target === undefined ) ) {
            $variants.append( '<input name="firstRoomUuid" type="hidden" value="' + freeDoors[ 0 ].uuid + '">' );
        } else {
            $variants.append( '<h6>Please, specify a free door of already merged contour:</h6>' );
            $.each( freeDoors, function( key, value ) {
                if ( value.target !== undefined ) {
                    $variants.append( '<div class="radio"><label><tt><input type="radio" name="firstRoomUuid" value="' + value.uuid + '">' + value.uuid + '</tt></label></div>' );
                }
            } );
        }

        if ( ( doors.length === 1 ) && ( doors[ 0 ].target === undefined ) ) {
            $variants.append( '<input name="secondRoomUuid" type="hidden" value="' + doors[ 0 ].uuid + '">' );
        } else {
            $variants.append( '<h6>Please, specify door of second (current) room for merging:</h6>' );
            $.each( doors, function( key, value ) {
                if ( value.target === undefined ) {
                    $variants.append( '<div class="radio"><label><tt><input type="radio" name="secondRoomUuid" value="' + value.uuid + '">' + value.uuid + '</tt></label></div>' );
                }
            } );
        }

        $mergeButton.show();
        return 'Restore all gates for merging for selecting.'

    } else if ( freeDoors.length === 0 ) {

        // it's a first room in the plan, and we copy the mesh with simple way
        window.merging3d.addMeshesOfRoomToScene( sceneName );

        // window.merging3d.compassAngle = apartmentData[sceneName].compass;
        return 'It\'s a first room in the plan, and we copy the mesh with simple way.'

    } else {

        $mergingPopup.dialog( 'open' );
        $variants.html( '<p>You have not success conditions for merging. Please, check doors of contour to proceed.</p>' );
        $mergeButton.hide();

        return 'You have not success conditions for merging. Please, check doors of contour to proceed.'

    }
}
