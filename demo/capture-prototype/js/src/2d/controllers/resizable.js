
'use strict';
const Resizable = function() {
    var sResizable = ".js-resizable";

    $.fn.tinyResizable = function(options) {
        const element = this[0];
        var original_width = 0;
        var original_height = 0;
        var original_x = 0;
        var original_y = 0;
        var original_mouse_x = 0;
        var original_mouse_y = 0;
        const currentResizer = options.handle;
        currentResizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
            original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
            original_x = element.getBoundingClientRect().left;
            original_y = element.getBoundingClientRect().top;
            original_mouse_x = e.pageX;
            original_mouse_y = e.pageY;
            window.addEventListener('mousemove', resize)
            window.addEventListener('mouseup', stopResize)
        });

        function resize(e) {
            element.style.width = original_width - (e.pageX - original_mouse_x)  + 'px';
            element.style.height = original_height + (e.pageY - original_mouse_y)  + 'px';
            element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
            $(e.target).parent().trigger("resize");
        }

        function stopResize() {
            window.removeEventListener('mousemove', resize);
        }
    }

    $(sResizable).each(function(key, item) {
        var handle = $("#" + $(item).data("resize-id"))[0];
        $(item).tinyResizable({ handle: handle });
    });
};