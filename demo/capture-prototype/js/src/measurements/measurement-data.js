'use strict';

/** 
 * Class responsible to measurement data uploading and download
 * @class
 * @param  {string} loadSelector
 * @param  {string} saveSelector
 */
const MeasurementData = function (loadSelector, saveSelector) {
    this.events = new EventsSystem('MeasurementData');

    this.loadSelector = loadSelector ? loadSelector : 'measurement-data-load';
    this.saveSelector = saveSelector ? saveSelector : 'measurement-data-save';

    this.loadButton = null;
    this.loadInput = null;
    this.saveButton = null;

    this.parameters = {
        domain: null,
        tourId: null,
        orderId: null
    };

    this.token = null;

    this.autorization = {
        domains: {}
    };

    /**
     * @returns {this}
     */
    this.init = function (domain, tourId, orderId) { // Todo: buttons move to MeasurementControl
        this.loadButton = document.getElementById(this.loadSelector);
        this.loadInput = document.getElementById(this.loadSelector + '-input');
        this.saveButton = document.getElementById(this.saveSelector);

        this.loadButton.addEventListener('click', this.onLoad.bind(this));
        this.loadInput.addEventListener('change', this.onInput.bind(this));
        this.saveButton.addEventListener('click', this.onSave.bind(this));

        this.parameters.domain = domain;
        this.parameters.tourId = tourId;
        this.parameters.orderId = orderId;

        return this;
    }
    
    /**
     * @param  {string} token
     * @returns  {this}
     */
    this.setToken = function (token) {
        this.token = token;
        return this;
    }

    /**
     * @returns {this}
     */
    this.onLoad = function () {
        this.loadInput.click();

        return this;
    }

    /**
     * Fire event 'load' with decoded json file data
     * @returns {this}
     */
    this.onInput = function (event) {
        const input = event.target;
        if ('files' in input && input.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function (e) {
                this.events.fire('load', {
                    result: JSON.parse(e.target.result)
                });
            }.bind(this);
            reader.readAsText(input.files[0]);
        }
        
        return this;
    }

    /**
     * Fire event 'save'
     * @returns {this}
     */
    this.onSave = function () {
        this.events.fire('save');
        
        return this;
    }

    /**
     * Return json file to user
     * @returns {this}
     */
    this.returnFile = function (data, filename) {
        var text = JSON.stringify(data);
        var blob = new Blob([text], {type: 'text/plain'});
        var anchor = document.createElement('a');

        anchor.download = (filename || "save") + '.json';
        anchor.href = (window.URL || window.webkitURL).createObjectURL(blob);
        anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':');
        anchor.click();

        return this;
    }

    /**
     * Load floor data from server
     * @param {number} floor
     * @returns {object} data
     */
    this.loadFloorFromServer = function (floor) {
        return new Promise(function (resolve, reject) {
            var url =
                this.parameters.domain +
                '/rest/v1/floorplan/order/' +
                this.parameters.orderId +
                '/floor/' +
                floor +
                '/collected/data';
            
            var autorization = this.getAutorization('token');

            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.setRequestHeader(
                "Authorization", 
                autorization.string
            );
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    var response = xhr.response ? JSON.parse(xhr.response) : {};

                    if (response && response.type !== 'ITEM_NOT_FOUND') {
                        if (!response.floorRooms) {
                            response.floorRooms = {};
                        }
                        
                        if (typeof(response.floorRooms) === 'string') { // crutch for backend
                            response.floorRooms = JSON.parse(response.floorRooms);
                        }

                        console.log('%cLoad measurement data of floor «' + floor + '» ok.', 'color: green;', response);
                        
                        resolve(response);
                    } else if (response && response.type === 'ITEM_NOT_FOUND') {
                        resolve(null);
                    } else {
                        this.resetAutorization(this.parameters.domain);
                        var tryAgain = confirm('Username or password not correct, try save measurement data again?');
    
                        if (tryAgain) {
                            this.loadFloorFromServer(floor);
                        }
                    }
                }
            }.bind(this);
            
            xhr.send();
        }.bind(this));
    }

    this.resetAutorization = function () {
        if (this.autorization.domains[this.parameters.domain]) {
            this.autorization.domains[this.parameters.domain].password = null;
        }
        localStorage.setItem('measurementAutorization', JSON.stringify(this.autorization));
    }

    /**
     * Get autorization with type
     * @param {string} type
     * @returns {object} autorization
     */
    this.getAutorization = function (type) {
        if (!type) type = 'basic';

        if (type === 'basic') {
            var loaded = localStorage.getItem('measurement_autorization_basic');
            if (loaded) this.autorization = JSON.parse(loaded);
    
            if (!this.autorization.domains[this.parameters.domain]) this.autorization.domains[this.parameters.domain] = {};
            if (
                !this.autorization.domains[this.parameters.domain].username ||
                !this.autorization.domains[this.parameters.domain].password 
            ) {
                var username = prompt(
                    'Save measurement data: Please enter your username for ' + this.parameters.domain, 
                    this.autorization.domains[this.parameters.domain].username
                );
        
                if (
                    username !== this.autorization.domains[this.parameters.domain].username || 
                    !this.autorization.domains[this.parameters.domain].password
                ) {
                    this.autorization.domains[this.parameters.domain].password = prompt(
                        'Save measurement data: Please enter your password for ' + this.parameters.domain, 
                        ''
                    );
                }
    
                this.autorization.domains[this.parameters.domain].username = username;
            }
            
            this.autorization.domains[this.parameters.domain].string = "Basic " + btoa(
                this.autorization.domains[this.parameters.domain].username + 
                ':' + 
                this.autorization.domains[this.parameters.domain].password
            );

            localStorage.setItem('measurement_autorization_basic', JSON.stringify(this.autorization));
    
            return this.autorization.domains[this.parameters.domain];
        } else if (type === 'token') {
            return {
                string: 'Bearer ' + this.token
            };
        }
    }

    /**
     * @param  {number} length
     * @returns {string} 
     */
    this.getRandomString = function (length) {
        var string = '';
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < length; i++) {
            string += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return string;
    }

    /**
     * Save data of measurement to server
     * @param  {object} data
     * @returns {this}
     */
    this.saveToServer = function (data) {
        const file = {
            tourId: this.parameters.tourId,
            orderId: this.parameters.orderId,
            createdAt: new Date(Date.now()).toLocaleString(),
            testData: this.getRandomString(window.tdmsts || 0),
            floorRooms: JSON.stringify(data.rooms), // crutch for backend
            floor: data.floor,
            floorData: data.hotspots
        };

        var url =
            this.parameters.domain +
            '/rest/v1/floorplan/order/' +
            this.parameters.orderId +
            '/floor/' +
            data.floor +
            '/collected/data';

        var autorization = this.getAutorization('token');

        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader(
            "Authorization", 
            autorization.string
        );
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var response = xhr.response ? JSON.parse(xhr.response) : {};

                if (response.type === 'HTTP_OK') {
                    console.log('%cSave measurement data ok.', 'color: green;');
                } else {
                    this.resetAutorization();
                    var tryAgain = confirm('Save failed, try save measurement data again?');

                    if (tryAgain) {
                        this.saveToServer(data);
                    }
                }
            }
        }.bind(this);

        var saveString = JSON.stringify(file);

        // console.log('Save to server:', file, saveString.length);

        xhr.send(saveString);

        return this;
    }

    //https://app.docusketch.com/rest/v1/tour/%tour_id%/pano/%panorama_id%/eulerAngles
    // data: {pitch: pitch, roll: roll}
    this.savePitchAndRoll = function (data) {
        const file = {
            pitch: data.pitch, 
            roll: data.roll
        };

        jsonData.tour.rooms[data.pano].pitch = data.pitch;
        jsonData.tour.rooms[data.pano].roll = data.roll;

        var url =
            this.parameters.domain +
            '/rest/v1/tour/' +
            this.parameters.tourId +
            '/pano/' +
            data.pano +
            '/eulerAngles';

        var autorization = this.getAutorization('token');

        var xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);
        xhr.setRequestHeader(
            "Authorization", 
            autorization.string
        );
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var response = xhr.response ? JSON.parse(xhr.response) : {};

                if (response.type === 'TOUR_MODIFIED') {
                    console.log('%cSave pitch and roll data ok.', 'color: green;');
                } else {
                    this.resetAutorization();
                    var tryAgain = confirm('Save failed, try save pitch and roll data again?');

                    if (tryAgain) {
                        this.savePitchAndRoll(data);
                    }
                }
            }
        }.bind(this);

        var saveString = JSON.stringify(file);

        xhr.send(saveString);

        return this;
    }
}