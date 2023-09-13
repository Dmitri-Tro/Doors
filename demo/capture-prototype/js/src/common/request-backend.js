
'use strict';
var RequestBackend = function(domain, authToken) {
    //query parameters
    this.authToken = authToken;
    this.server = domain || "https://sandy.immoviewer.com";
    this.url = "";
    this.type = this.method = "POST";
    this.data = ""; //data to send

    //response
    this.response = null;
};

/**
 * map of content types
 */
RequestBackend.types = {
    FILE: "file",
    IMAGE: "image",
    JSON: "json"
};

/**
 * Set request method: GET, POST, PUT, etc
 * @param queryType {string}
 * @return {RequestBackend}
 */
RequestBackend.prototype.setMethod = function(queryType) {
    if (!~["GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "OPTIONS", "TRACE", "PATCH"].indexOf(queryType))
        console.warn("Unknown request method");
    this.type = queryType;
    return this;
};

RequestBackend.prototype.setToken = function(token) {
    this.authToken = token;
    return this;
};

RequestBackend.prototype.setBody = function(data) {
    this.data = data;
    return this;
};

/**
 * Send a request.
 * @param contentType {string|null} content-type of query. One from RequestBackend.types list
 * @param ajaxParams {{}|undefined} content-type of query. One from RequestBackend.types list
 * @return {jqXHR}
 */
RequestBackend.prototype.send = function(contentType, ajaxParams) {
    var dfd = $.Deferred(), scope = this;
    ajaxParams = ajaxParams || {};
    var options = {
        type: this.type,
        url: this.server + this.url,
        data: this.data,
        beforeSend: function (xhr){
            if (scope.authToken) xhr.setRequestHeader("Authorization", "Bearer " + scope.authToken);
        },
        success: function (data){
            scope.response = data;
            dfd.resolve(data);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.info(jqXHR, textStatus, errorThrown);
            if (jqXHR.status === 401) {
                var modal = new AuthModal(scope.server);
                //modal.lastFailedQuery = window.dataHandling.queryData();
                modal.render();
            }
        }
    };
    options = Object.assign(options, ajaxParams);
    switch (contentType) {
        case RequestBackend.types.FILE:
        case RequestBackend.types.IMAGE:
            options["contentType"] = false;
            options["processData"] = false;
            break;
        case "json":
            options["contentType"] = "application/json";
            break;
        default: break;
    }
    return $.ajax(options);
};

/**
 * Send fp images to backend
 * @param tourId
 * @param floorId
 * @param arImages array of dataUri images
 * @return {*}
 */
RequestBackend.prototype.sendImage = function(tourId, floorId, arImages) {
    function dataURItoBlob(dataURI) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        var byteString = atob(dataURI.split(',')[1]);
        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var dw = new DataView(ab);
        for(var i = 0; i < byteString.length; i++) {
            dw.setUint8(i, byteString.charCodeAt(i));
        }
        // write the ArrayBuffer to a blob, and you're done
        return new Blob([ab], {type: mimeString});
    }

    if (arImages.length) {
        var apiData = new FormData();
        apiData.append("image_png", dataURItoBlob(arImages[0]));
        apiData.append("image_jpg", dataURItoBlob(arImages[1]));
        if (arImages[2]) apiData.append("image_measurements_png", dataURItoBlob(arImages[2]));
        if (arImages[3]) apiData.append("image_measurements_jpg", dataURItoBlob(arImages[3]));
        this.data = apiData;
    }

    if (tourId && floorId) {
        this.url = "/rest/v1/floorplan/order/" + tourId + "/map/" + floorId;
        return this.send(RequestBackend.types.IMAGE);
    }
    return null;
};

RequestBackend.prototype.sendFloorData = function(tourId, floorId, data, hotspots, floorSquare) {
    if (tourId && floorId) {
        this.url = "/rest/v1/floorplan/order/" + tourId + "/map/" + floorId + "/data";
        this.data = JSON.stringify({
            data: data,
            hotspots: hotspots,
            floorSquare: floorSquare
        });
        return this.send(RequestBackend.types.JSON);
    }
    return null;
};

RequestBackend.prototype.send3DModel = function(tourId, floorId, fileModel) {
    if (tourId && floorId) {
        this.url = "/rest/v1/floorplan/order/" + tourId + "/floor/" + floorId + "/file/type/MODEL3D";

        if (fileModel) {
            var apiData = new FormData();
            apiData.append("file", fileModel);
            this.data = apiData;
        }

        return this.send(RequestBackend.types.FILE);
    }
    return null;
};

RequestBackend.prototype.send3DCameras = function(tourId, floorId, camerasJson) {
    if (tourId && floorId) {
        this.url = "/rest/v1/floorplan/order/" + tourId + "/floor/" + floorId + "/file/type/CAMERASINFO";

        if (camerasJson) {
            var apiData = new FormData();
            apiData.append("file", new Blob([JSON.stringify(camerasJson)], {type : 'application/json'}));
            this.data = apiData;
        }

        return this.send(RequestBackend.types.FILE);
    }
    return null;
};

RequestBackend.prototype.signin = function(email, pass) {
    if (email && pass) {
        this.url = "/rest/v1/user/me/token";
        this.setMethod("GET");
        return this.send(null, {
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", "Basic " + btoa(email + ":" + pass))
            }
        });
    }
    return null;
};

if ( typeof exports !== 'undefined' ) module.exports = RequestBackend;