var tourLoader = {
    scope: ".nav__searchbox",
    textfield: ".js-searchbox-input",
    button: ".js-searchbox-btn",
    init: function() {
        this.bindInput();
        this.bindChange();
    },
    bindInput: function() {
        var _this = this;
        $(this.scope).on("input", this.textfield, function() {
            $(_this.textfield).css("width", "auto");
        });
    },
    bindChange: function() {
        var _this = this;
        $(this.scope)
            .on("paste", this.textfield, function(e) {
                var pastedData = e.originalEvent.clipboardData.getData('text');
                pastedData = pastedData.replace("?", "%3F");
                pastedData = pastedData.replace("=", "%3D");
                document.location.href = document.location.origin + document.location.pathname + "?jsonUrl=" + pastedData;
            }).on("click", this.button, function() {
                var data = $(_this.textfield).val();
                data = data.replace("?", "%3F");
                data = data.replace("=", "%3D");
                document.location.href = document.location.origin + document.location.pathname + "?jsonUrl=" + data;
            });
    }
};
