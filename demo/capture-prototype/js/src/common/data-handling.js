
'use strict';

/**
 * Data handler from url
 * @class
 */
const dataHandling = function () {
    this.params = {};
    this.planJSON = null;
    this.underlyingLevelJSON = null;
    this.dataRequest = null; //jsonData request promise object
    this.jpgRegexp = /\.jpg/gi;

    this.planUrl = "/rest/v1/floorplan/order/%1/map/%2/data";

    this.init = function() {
        this.params = this.getParameters();
        this.removeTokensFromUrl();
    };

    this.queryToObject = function (query) {
      var json = 
        '{"' + 
          query
            .replace(/\?/i, '')
            .replace(/\&$/i, '')
            .replace(/"/g, '\\"')
            .replace(/&/g, '","')
            .replace(/=/g,'":"') + 
        '"}';

      try {
        return JSON.parse(json);
      } catch(e) {
        return {};
      }
    }

    this.getParameters = function () {
        const query = decodeURIComponent(window.location.search.substring(1));

        const matches = query.match(/(.*)jsonUrl=(.*)/i);
              
        var parametersString = matches && matches.length >= 3 ? matches[2] : '';
        var otherParametersString = matches && matches.length >= 2 ? matches[1] : query;

        const parser = document.createElement('a');
        parser.href = parametersString;

        var parameters = this.queryToObject(parser.search);
        var otherParameters = this.queryToObject(otherParametersString);

        parameters = Object.assign(parameters, otherParameters);

        parameters._origin = parser.origin;
        parameters._query = parametersString;
        parameters._base =  parser.origin + parser.pathname;
        parameters.jsonUrl = parameters._query;

        console.log('Parameters:', parameters);
        return parameters;
    };

    this.parametersToUrl = function (parameters) {
      if (parameters === undefined) parameters = this.params;

      return parameters._base + 
        '?accessToken=' + parameters.accessToken +
        '&authToken=' + parameters.authToken +
        '&floor=' + parameters.floor +
        '&height=' + parameters.height +
        '&orderId=' + parameters.orderId;
    }

    this.getNewUrl = function (parameters) {
      return window.location.origin + 
        window.location.pathname + 
        '?jsonUrl=' + 
        this.parametersToUrl(parameters);
    }

    this.removeTokensFromUrl = function () {
        var searchSanitized = document.location.search;
        if (this.params.debug !== "1" && (this.params.accessToken || this.params.authToken)) {
            //todo case when accessToken or authToken is the first param
            searchSanitized = searchSanitized.replace("&accessToken=" + this.params.accessToken, "");
            searchSanitized = searchSanitized.replace("&authToken=" + this.params.authToken, "");
            if (window.history) history.replaceState(null , null, document.location.pathname + searchSanitized);
        }
    };

    /* Query floorplan data from "planUrl" url parameter, download if available
     * @return {Promise} $.deferred promise object
     */
    this.queryPlan = function(currentFloor, floors) {
        var scope = this;
        try {
            //for testing purposes only!
            if (this.params["planUrl"]) { //direct from file url
                /*$.ajaxPrefilter( function (options) { //cors proxy
                    //todo set another check instead of domain check
                    if (options.useProxy === true && options.crossDomain && jQuery.support.cors) {
                        var http = (window.location.protocol === 'http:' ? 'http:' : 'https:');
                        options.url = http + '//cors-anywhere.herokuapp.com/' + options.url;
                    }
                });*/
                return $.ajax({
                    url: this.params["planUrl"],
                    crossDomain: true,
                    useProxy: true,
                    dataType: 'html',
                    success: function(data){
                        scope.planJSON = JSON.parse(data);
                    },
                    error: function(){
                        console.error("request error");
                    }
                });
            } else if (this.params["orderId"] && this.params["floor"]) { //from immoviewer server
                var domain = this.getDomain();

                var req = new RequestBackend(domain, this.params["authToken"]), dfd = new $.Deferred();
                req.url = this.planUrl.replace("%1", this.params["orderId"]).replace("%2", currentFloor);
                req.setMethod("GET");
                req.send(RequestBackend.types.JSON)
                    .done(function() {
                        if (req.response && req.response.type === "HTTP_OK") scope.planJSON = req.response.details.data;
                        dfd.resolve();
                    })
                    .error(function (jqXHR) {
                        dfd.reject(jqXHR);
                    })
                    .always(function(jqXHR) {
                        if (jqXHR.status === 404) { //if no floorplan
                            $.when(scope.queryUnderlyingFloorPlan(currentFloor, floors)).then(function() {
                                dfd.resolve();
                            });
                        } else {
                            dfd.resolve();
                        }
                    });
                return dfd.promise();
            } else {
                return $.Deferred().resolve().promise();
            }
        } catch (e) {
            console.error(e);
            return false; //not a valid string
        }
    };

    /**
     * Get json of underlying floor relative to currentFloor
     * @param currentFloor {string} id of current floor
     * @param floors {object} a list of available floors
     */
    this.queryUnderlyingFloorPlan = function(currentFloor, floors) {
        var arLevels = [], item, dfd = new $.Deferred();
        for (var key in floors) {
            if (floors[key].avalible === true) {
                item = {key: key, enabled: floors[key].enabled, name: floors[key].name};
                arLevels.push(item);
            }
        }
        arLevels.sort(function(a, b) {
            return parseInt(a.key) - parseInt(b.key);
        });

        var underlyingFloor = "", lastKey = "";
        for (var k in arLevels) {
            if (arLevels[k].key === currentFloor) {
                underlyingFloor = lastKey;
            }
            lastKey = arLevels[k].key;
        }
        if (underlyingFloor.length > 0) {
            var req = new RequestBackend(this.getDomain(), this.params["authToken"]);
            req.url = this.planUrl.replace("%1", this.params["orderId"]).replace("%2", underlyingFloor);
            req.setMethod("GET");
            $.when(req.send(RequestBackend.types.JSON)).then(function() {
                if (req.response && req.response.type === "HTTP_OK") this.underlyingLevelJSON = req.response.details.data;
                dfd.resolve();
            }.bind(this));
        } else {
            dfd.resolve();
        }
        return dfd.promise();
    };

    this.getTestJsonData = function (name) {
        if (!name || name === 'true') name = 'jsonData1';

        return $.ajax({
            url: 'js/data/' + name + '.json',
            success: function(data) { 
                window.jsonData = data;
                if ("tour" in jsonData && "rooms" in jsonData.tour) {
                    window.apartmentData = this.correct(
                        jsonData.tour.rooms, 
                        this.params["jsonUrl"] || data.urls.currentUrl
                    );
                    window.jsonData = jsonData;
                }
            }.bind(this)
        });
    };

    // resolve data urls and fix filenames for panorama
    this.correct = function (roomsObject, jsonUrl) {
        var scope = this;

        var path = new URL(jsonUrl); //no ie support https://developer.mozilla.org/en-US/docs/Web/API/URL
        function correctUrl(url) {
            if (url === undefined) return "";
            if (url.indexOf("//") !== 0 && url.indexOf("/") === 0) {
                url = path.origin + url;
            }
            return url;
        }

        for (var room in roomsObject) {
            var roomObj = roomsObject[room];
            roomObj.thumbnail = correctUrl(roomObj.thumbnail);
            roomObj.url = correctUrl(roomObj.url);
            roomObj.urlMobile = correctUrl(roomObj.urlMobile);
            //roomObj.filename = roomObj.filename.replace(scope.jpgRegexp, ""); //fix filenames, krpano doesn't like that
            var hotspots = roomObj.hotspots;
            if (!hotspots || !hotspots.length) hotspots = roomObj.attachments || [];
            hotspots.forEach(function(spot, key, arHotspots) {
                if ("filenamePanorama" in arHotspots[key]) arHotspots[key].filenamePanorama = spot.filenamePanorama.replace(scope.jpgRegexp, ""); //hotspots syntax
                else if ("linkedRoom" in spot.content[0]) arHotspots[key].content[0].linkedRoom = arHotspots[key].content[0].linkedRoom.replace(scope.jpgRegexp, ""); //attachments syntax
                else delete arHotspots[key]; //its not a room's basepoint
            });
            delete roomsObject[room];
            roomsObject[roomObj.filename] = roomObj;
        }
        return roomsObject;
    }

    /* Query apartment data from "jsonUrl" url parameter, download if available
     * @return {Promise} $.deferred promise object
     */
    this.queryData = function() {
        var scope = this;

        try {
            //for testing purposes only!
            if (this.params["jsonUrl"]) {
                if (
                    (document.location.hostname === "localhost" || document.location.hostname === "127.0.0.1") &&
                    this.params.cors !== 'off' // for https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome
                ) {
                    $.ajaxPrefilter( function (options) { //cors proxy
                        if (options.useProxy === true && options.crossDomain && jQuery.support.cors) {
                            var http = (window.location.protocol === 'http:' ? 'http:' : 'https:');
                            var corsProxy = '';
                            switch (this.params.cors) {
                                case '1':
                                    corsProxy = "//crossorigin.me/"; // :/
                                    break;
                                default:
                                    corsProxy = '//cors-anywhere.herokuapp.com/'; // :|
                                    break;
                            }
                            if (true || !~options.url.indexOf(corsProxy)) {
                                options.url = http + corsProxy + options.url;
                            }
                        }
                    }.bind(this));
                }

                if (this.params.useTestJsonData) {
                    return this.getTestJsonData(this.params.useTestJsonData);
                } else {
                    if (this.params["authToken"]) {
                        var req = new RequestBackend(this.getDomain(), this.params["authToken"]);
                        var options = {
                            url: this.params["jsonUrl"],
                            crossDomain: true,
                            useProxy: true,
                            dataType: 'html',
                            data: {authToken: this.params["authToken"], accessToken: this.params["accessToken"]},
                            success: function(data){
                                this.collectData(data);
                            }.bind(this)
                        };
                        req.setMethod("GET");
                        return req.send(null, options);
                    } else {
                        var modal = new AuthModal(this.getDomain());
                        modal.render();
                        return $.Deferred().reject();
                    }
                }
            } else {
                console.log('Load default apartment data');
                return this.getTestJsonData();
                // return $.Deferred().done(function() {
                //     window.apartmentData = this.correct(window.apartmentData, document.location.href);
                // }.bind(this)).resolve().promise();
            }
        } catch (e) {
            console.error(e);
            return false; //not a valid string
        }
    };

    this.collectData = function (data) {
        // console.log('Request success');
        var pattern = /window.jsonData=((.|[\n\r])*?)};/im;
        var array_matches = pattern.exec(data);
        if (array_matches && array_matches[0]) {
            var json = array_matches[0].substring(16);
            json = json.substring(0, json.length-1);
            var jsonData = JSON.parse(json);
            if ("tour" in jsonData && "rooms" in jsonData.tour) {
                window.apartmentData = this.correct(jsonData.tour.rooms, this.params["jsonUrl"]);
                window.jsonData = jsonData;
            } else {
                console.warn('jsonData not valid!');
            }
        } else {
            console.warn('jsonData not found!');
        }
    };

    this.getDomain = function() {
        var domain = "https://sandy.immoviewer.com";
        if (this.params.jsonUrl) {
            var domainMatches = this.params.jsonUrl.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            domain = domainMatches && domainMatches[0].substring(0, domainMatches[0].length-1);
        }
        return domain;
    };
    this.isImmoviewer = function() { return this.getDomain().indexOf("https://app.immoviewer.com") === 0; };
    this.isDocusketch = function() { return this.getDomain().indexOf("https://app.docusketch.com") === 0; };
};

if ( typeof exports !== 'undefined' ) module.exports = new dataHandling();
else window.dataHandling = new dataHandling();