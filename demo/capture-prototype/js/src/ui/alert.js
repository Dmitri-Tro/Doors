
'use strict';
var Alert = function(text, heading, autoClosingTime) {
    this.text = text || "";
    this.heading = heading || "";
    this.autoClosingTime = Number.isInteger(autoClosingTime) ? autoClosingTime : 2500;
    this.selector = ".js-alert";
    this.html = '<div class="alert alert-default noselect '+this.selector.substr(1)+'" style="display:none">' +
        '<button type="button" class="close alert__close" data-dismiss="alert">x</button>' +
        (this.heading ? '<strong>'+this.heading+'</strong>' : '') +
        this.text +
        '</div>';

    this.render = function() {
        var scope = this;
        $("body").append( $(this.html) );
        $(this.selector).alert().fadeIn(100);
        if (this.autoClosingTime > 0) {
            $(this.selector).delay(this.autoClosingTime).fadeOut(300, function() {
                $(scope.selector).remove();
            });
        }
    };

    this.close = function(withoutFade) {
        var scope = this;
        if (withoutFade === true) return $(scope.selector).remove();

        $(this.selector).fadeOut(300, function() {
            $(scope.selector).remove();
        });
    };
};