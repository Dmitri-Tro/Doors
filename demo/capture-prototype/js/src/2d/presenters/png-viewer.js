var pngViewer = {
    downloadLink: ".js-download-png",
    downloadLinkFake: ".js-fake-download-png",
    dataUrl: "",
    floorController: {},
    canvasWidth: 0,
    canvasHeight: 0,
    imageWidth: 0,
    imageHeight: 0,
    imageMargin: 100,
    imageMimeType: "image/png",

    init: function(floorController) {
        this.floorController = floorController;
        this.bindClicking();
        if ("image_margin" in window.dataHandling.params && window.dataHandling.params.image_margin >= 0) this.imageMargin = Number(window.dataHandling.params.image_margin);
    },
    bindClicking: function() {
        var scope = this;
        $(this.downloadLink).on("click", function() {
            scope.render(true);
        });
    },
    render: function(doSendToBrowser, options) {
        var dfd = $.Deferred();
        var i = new Image();
        this.floorController.switchView("imageView");
        this.setDimensions();
        this.prepare();
        if (this.getExtension() === ".jpeg") {
            if (options !== undefined) Object.assign(options, {background: "rgba(255, 255, 255, 1)"});
            else options = {background: "rgba(255, 255, 255, 1)"};
            this.floorController.view.draw(options);
        }
        else if (options !== undefined) this.floorController.view.draw(options);
        else this.floorController.view.draw();
        i.onload = function() {
            this.dataUrl = i.src;
            this.crop(i, doSendToBrowser);
            dfd.resolve();
        }.bind(this);
        i.src = this.floorController.view.canvasElement.toDataURL(this.imageMimeType);
        this.recover();
        return dfd.promise();
    },
    download: function() {
        var scope = this;
        var download = $(scope.downloadLinkFake);
        var tourName = "floorplan";
        if ("jsonData" in window && "tour" in window.jsonData && "name" in window.jsonData.tour) tourName = window.jsonData.tour.name.toLowerCase().replace(/[-+()\s]/g, '');
        if (download.size() <= 0) {
            download = $("<a download='" + tourName + this.getExtension() + "' class='"+scope.downloadLinkFake+"'>Download</a>");
            $('body').append(download);
        }
        download[0].href = scope.dataUrl.replace(/^data:image\/[^;]+/, 'data:application/octet-stream');
        download[0].download = tourName + this.getExtension();
        download[0].click();
        download.remove(); // remove the fake element from page (FireFox needs)
    },
    getExtension: function() {
        var dotPosition = this.imageMimeType.indexOf("/");
        return "." + this.imageMimeType.substr(dotPosition+1, this.imageMimeType.length);
    },
    setDimensions: function() {
        var dimensions = this.floorController.floormodel.getBoundingBox(true);
        this.imageWidth = Math.floor(dimensions.width * this.floorController.imageView.pixelsPerCm + this.imageMargin);
        this.imageHeight = Math.floor(dimensions.height * this.floorController.imageView.pixelsPerCm + this.imageMargin);
        this.canvasWidth = this.imageWidth;
        this.canvasHeight = this.imageHeight;
        this.floorController.view.canvasElement.width = this.imageWidth;
        this.floorController.view.canvasElement.height = this.imageHeight;
        this.floorController.view.canvasElement.style.width = this.imageWidth + "px";
        this.floorController.view.canvasElement.style.height = this.imageHeight + "px";
    },
    crop: function(img, doSendToBrowser) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        if (this.imageWidth > this.canvasWidth) {
            this.canvasWidth = this.imageWidth;
        }
        if (this.imageHeight > this.canvasHeight) {
            this.canvasHeight = this.imageHeight;
        }
        canvas.width = this.imageWidth;
        canvas.height = this.imageHeight;

        ctx.drawImage( //void ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            img,
            Math.abs(this.imageWidth / 2 - this.canvasWidth / 2),
            Math.abs(this.imageHeight / 2 - this.canvasHeight / 2),
            this.imageWidth,
            this.imageHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );
        this.dataUrl = canvas.toDataURL(this.imageMimeType);

        if (doSendToBrowser) this.download();
        this.floorController.switchView("normalView");
    },
    /* mostly get rid of invisible walls */
    prepare: function() {
        var model = this.floorController.floormodel;
        var exportInstance = new Export(model), removeValFromIndex = [], tempRooms = [], tempPlacements = {};
        model.resetState = exportInstance.toJSON();

        $.extend(true, tempRooms, model.rooms);
        $.extend(true, tempPlacements, model.placements);
        model.getWalls().forEach(function (wall, index) {
            if (wall.bearing === wall.modes.INVISIBLE) removeValFromIndex.push(index);
        });
        for (var i = removeValFromIndex.length-1; i >= 0; i--)
            model.walls[removeValFromIndex[i]].remove();
        model.update();

        model.rooms = tempRooms;
        model.placements = tempPlacements;

        return true;
    },
    recover: function() {
        var model = this.floorController.floormodel;
        model.loadJSON(model.resetState);
        model.resetState = null;
        delete model.resetState;
    }
};
