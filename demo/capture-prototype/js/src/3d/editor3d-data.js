const Editor3DData = function () {
    this.parameters = {
        domain: null,
        tourId: null,
        orderId: null
    };

    this.token = null;

    this.setToken = function (token) {
        this.token = token;
        return this;
    }

    this.setParameters = function (domain, tourId, orderId) {
        this.parameters.domain = domain;
        this.parameters.tourId = tourId;
        this.parameters.orderId = orderId;

        return this;
    }

    this.getAutorization = function () {
        return {
            string: 'Bearer ' + this.token
        };
    }

    /**
     * Return file to user
     * @returns {this}
     */
    this.returnFile = function (data, filename) {
        var blob = new Blob([data], {type: 'text/plain'});
        var anchor = document.createElement('a');

        anchor.download = (filename || "unnamed.txt");
        anchor.href = (window.URL || window.webkitURL).createObjectURL(blob);
        anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':');
        anchor.click();

        return this;
    }

    this.getFloorModelLink = function (floor) {
        var url =
            this.parameters.domain +
            '/rest/v1/floorplan/order/' +
            this.parameters.orderId +
            '/map/' +
            floor +
            '/data';

        var autorization = this.getAutorization('token');
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader(
            "Authorization", 
            autorization.string
        );

        
        return new Promise(function (resolve, reject) {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    var response = {};

                    try {
                        response = JSON.parse(xhr.response);
                    } catch (error) {
                        console.log(error);
                    }
    
                    if (response.type === 'HTTP_OK' && response.details.model3DUrl) {
                        resolve(response.details.model3DUrl);
                    } else {
                        reject(xhr.response);
                    }
                }
            }.bind(this);
    
            xhr.send();
        });
    }

    this.saveJsonToServer = function (json, onSuccess) {
        var url =
            this.parameters.domain +
            '/rest/v1/floorplan/order/' +
            this.parameters.orderId +
            '/structure3d/data';

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
                var response = {};

                try {
                    response = JSON.parse(xhr.response);
                } catch (error) {
                    console.log(error);
                }

                if (response.type === 'HTTP_OK') {
                    console.log('%cSave editor3d json data ok.', 'color: green;');
                    
                    if (typeof(onSuccess) === 'function') {
                        onSuccess();
                    }
                } else {
                    var tryAgain = confirm('Save failed, try save editor3D data again?');

                    if (tryAgain) {
                        this.saveJsonToServer(json);
                    }
                }
            }
        }.bind(this);

        // console.log('Save to server:', json, json.length);

        xhr.send(json);

        return this;
    }

    /**
     * Save data of measurement to server
     * @param  {object} data
     * @returns {this}
     */
    this.saveObjToServer = function (floor, file, onSuccess) {
        var url =
            this.parameters.domain +
            '/rest/v1/floorplan/order/' +
            this.parameters.orderId +
            '/floor/' +
            floor +
            '/file/type/MODEL3D';

        var autorization = this.getAutorization('token');

        var xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader(
            "Authorization", 
            autorization.string
        );
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var response = {};

                try {
                    response = JSON.parse(xhr.response);
                } catch (error) {
                    console.log(error);
                }

                if (response.type === 'ATTACHMENT_UPLOADED') {
                    console.log('%cSave model ok.', 'color: green;');
                    
                    if (typeof(onSuccess) === 'function') {
                        onSuccess();
                    }
                } else {
                    var tryAgain = confirm('Save failed, try save model again?');

                    if (tryAgain) {
                        this.saveToServer(data);
                    }
                }
            }
        }.bind(this);

        var fileBlob = new Blob([file], {type: 'text/plain;charset=utf-8'});
        var formData = new FormData();
        formData.append("file", fileBlob);

        // console.log('Save obj to server:', file);

        xhr.send(formData);

        return this;
  }
};