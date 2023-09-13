
'use strict';
const Modal = function(id, text, header, footer) {
    this.id = "modal" + (id || THREE.Math.generateUUID());
    this.universalSelector = ".modal";
    this.selector = "#" + this.id;
    this.text = text || "";
    this.header = header || "";
    this.footer = footer || "";
    this.html = '<div class="modal fade" id="<%=id%>" tabindex="-1" role="dialog" aria-labelledby="<%=id%>Label">\n' +
        '  <div class="modal-dialog" role="document">\n' +
        '    <div class="modal-content">' +
        '      <%=header %>\n' +
        '      <div class="modal-body">\n' +
        '        <%=body %>' +
        '      </div>\n' +
        '      <%=footer %>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</div>';
};


Modal.prototype.render = function() {
    var replacement = {id: this.id, selector: this.selector, header: this.getHeader(), body: this.text, footer: this.getFooter()};
    const html = _.template(this.html)(replacement);
    $("body").append(html);
    $(this.selector).modal().modal('show');
};

Modal.prototype.getHeader = function () {
    return this.header ? '<div class="modal-header">' + this.header + '</div>' : "";
};

Modal.prototype.getFooter = function () {
    return this.footer ? '<div class="modal-footer">' + this.footer + '</div>' : "";
};