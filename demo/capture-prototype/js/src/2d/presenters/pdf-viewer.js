var pdfViewer = {
    iframeSelector: ".js-pdf",
    floorController: {},
    init: function(floorController) {
        this.floorController = floorController;
    },
    render: function() {
        this.floorController.switchView("pdfView");
        var scope = this;
        var canvas = document.getElementById('floorview');
        var i = new Image();
        i.onload = function() {
            var paddingHorizontal = 15;
            var paddingVertical = 40;
            var doc = new jsPDF('p','pt','a4'); //size: [595.28, 841.89]
            var a4size = [595.28, 841.89];
            var w = a4size[0] - paddingHorizontal * 2;
            var h = w * i.height / i.width;

            doc.setLineWidth(9);
            doc.setDrawColor(218, 181, 100);
            doc.line(0, 4, a4size[0], 4);
            doc.setLineWidth(12);
            doc.line(0, a4size[1]-6, a4size[0], a4size[1]-6);

            doc.setFontSize(40);
            doc.text(a4size[0] / 2, paddingVertical+20, 'Floorplan', undefined, undefined, "center");

            doc.addImage(i.src, 'JPEG', paddingHorizontal, paddingVertical+30, w, h);

            $(scope.iframeSelector).attr('src', doc.output('datauristring'));
            scope.floorController.switchView("normalView");
        };
        i.src = canvas.toDataURL("image/jpeg");
    }
};
