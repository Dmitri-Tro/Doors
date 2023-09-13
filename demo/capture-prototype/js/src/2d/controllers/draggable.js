
'use strict';
const Draggable = function() {
    var sDraggable = ".js-draggable";

    $.fn.tinyDraggable = function(options){
        var settings = $.extend({ handle: 0, exclude: 0 }, options);
        var w = $(window).width(), h = $(window).height();
        return this.each(function(){
            var dx, dy, el = $(this), handle = settings.handle ? $(settings.handle, el) : el;
            handle.on({
                mousedown: function(e){
                    if (settings.exclude && ~$.inArray(e.target, $(settings.exclude, el))) return;
                    e.preventDefault();
                    var os = el.offset(); os.width = el.width(); os.height = el.height();
                    dx = e.pageX-os.left; dy = e.pageY-os.top;
                    $(document).on('mousemove.drag', function(e){
                        if (os.top + os.height/2 < h/2) {
                            el.css("top", e.pageY-dy);
                            el.css("bottom", "auto");
                        } else {
                            el.css("bottom", h-(e.pageY-dy+os.height));
                            el.css("top", "auto");
                        }

                        if (os.left + os.width/2 < w/2) {
                            el.css("left", e.pageX-dx);
                            el.css("right", "auto");
                        } else {
                            el.css("right", w-(e.pageX-dx+os.width));
                            el.css("left", "auto");
                        }

                        el.css("transform", "none");
                    });
                }
            });
            el.on("mouseup", function(e){
                $(document).off('mousemove.drag');
            });
            $(window).on("resize.draggable", function() {
                w = $(window).width(); h = $(window).height();
            });
        });
    };

    $(sDraggable).each(function(key, item) {
        var handle = $("#" + $(item).data("drag-id"))[0];
        $(item).tinyDraggable({ handle: handle });
    });
};