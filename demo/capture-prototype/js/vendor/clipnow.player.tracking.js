var lastTrackTime = Date.now();

var sessionClosed = false;
//8 seconds
var panoDelayTime = 8000;
//20 seconds
var sessionTimeoutCheck=20000
//3min
var maxInactivity=180000

//Global variables which define the actual coordinates of the image
var timeoutDelay=0
var oldVlookat;
var oldHlookat;
var oldFov;
var oldSceneName;

function Tracking() {
    return{
        doTrack: doTrack,
        closeSession: closeSession,
        onStart: onStart
    };

    //After the tracking coordinates have been updated,
    //and when the image has changed or the position of the image has changed
    //this method will be triggered to perform a controller call and save in DB
    //the actual tracking value
    function doTrack(email) {
        sessionClosed=false;
        // Web Sockets would be better but require MSIE >= 10, so we use the old way for now:
        var actualFilename=$("#actualPano").prop('value')
        var actualTracking=$("#pano-" + actualFilename)
        var session = $("#session")
        var url=window.jsonData.urls.backendUrls.track.replace("%7BEMAIL%7D", window.jsonData.email && window.jsonData.email.length > 0 ? window.jsonData.email : "nobody");
        url = url.replace("%7BID%7D", actualTracking.prop("name") ? actualTracking.prop("name"): "");
        url = url.replace("%7BROOM_FILENAME%7D", actualFilename);
        url = url.replace("%7BSESSION_ID%7D", session.val())
        $.getJSON(url, function( data ) {
            timeoutDelay=0;
            actualTracking.prop("name", data.id);
            session.prop("value", data.sessionID);
        });
    }

    //Close session function
    function closeSession(){
        if(!sessionClosed){
            var email=$("#pbEmail").val()
            var actualTracking=$("#pano-" + $("#actualPano").prop('value'))
            var session = $("#session")
            var url=window.jsonData.urls.backendUrls.trackFinish.replace("%7BEMAIL%7D", window.jsonData.email && window.jsonData.email.length > 0 ? window.jsonData.email : "nobody");
            url = url.replace("%7BID%7D", actualTracking.prop("name") ? actualTracking.prop("name"): "");
            url = url.replace("%7BSESSION_ID%7D", session.val())
            $.getJSON(url, function( data ) {});
            actualTracking.prop("name","");
            $("#session").val("");
            sessionClosed=true
        }
    }

    function onStart(immoviewer){
        //Callback triggered before the user close a tab/window
        $(window).on("beforeunload", function() {
            closeSession();
        })

        //Scheduled function (every 20sec)
        //which close the session after
        //an inactivity time of 3min
        window.setTimeout(timeoutSession, sessionTimeoutCheck);
        function timeoutSession() {
            if(timeoutDelay >= maxInactivity && !sessionClosed){
                closeSession()
            }
            window.setTimeout(timeoutSession, sessionTimeoutCheck);
        }

        //Scheduled function (every 8sec, starting at second 2)
        //which check if the image has moved (user interaction)
        //and updates the needed cursors consequently
        window.setTimeout(immoviewer.trackPanoEvent, 2000);
    }
}