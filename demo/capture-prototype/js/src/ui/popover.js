
'use strict';
var Popover = function(x, y, text, heading) {
    Alert.call(this, text, heading, 0);

    this.x = x;
    this.y = y;

    this.render = function() {
        var scope = this;
        $("body").append( $(this.html) );
        $(this.selector).alert().css({left: this.x, top: this.y, marginLeft: 0}).fadeIn(100);
    };
};