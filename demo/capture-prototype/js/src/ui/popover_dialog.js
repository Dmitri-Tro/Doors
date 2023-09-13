
'use strict';
var PopoverDialog = function(x, y, text, heading) {
    Popover.apply(this, arguments);
    this.selector = ".js-popoverdialog";
    this.html = '<div class="alert alert-default alert-popover noselect '+this.selector.substr(1)+'" style="display:none">' +
        '<button type="button" class="close alert__close" data-dismiss="alert">&times;</button>' +
        (this.heading ? '<div class="alert__header"><strong>'+this.heading+'</strong></div>' : '') +
        this.text +
        '<div class="alert__footer"></div></div>';
    $("body").append( $(this.html) );

    this.addButton = function(text, callback) {
        var scope = this;
        var btn = $(" <button>" + text + "</button>");
        btn.on("click", callback);
        $(this.selector).find(".alert__footer").append(btn);
    };

    this.render = function() {
        var scope = this, pos;
        if (this.x === "center") {
            pos = {left: "50%", top: this.y, transform: "translateX(-50%)", marginLeft: 0};
        } else {
            pos = {left: this.x, top: this.y, marginLeft: 0};
        }
        $(this.selector).alert().css(pos).fadeIn(100);
    };
};