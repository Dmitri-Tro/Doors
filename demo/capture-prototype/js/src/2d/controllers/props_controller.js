
'use strict';
var PropsController = function(controller) {
    this.selectedObject = null;
    var propsSelector = ".propspanel";
    var propsFormSelector = ".propspanel__form";
    var propsTitle = ".popup__title";

    //todo move to views/control.js
    var stringTypeHtml =
        '<div class="form-group propspanel__group"%(width)s>' +
        '<label class="propspanel__item-title">%(label)s</label>' +
        '<input type="text" class="form-control propspanel__item-input" %(disabled)s data-prop="%(prop)s" data-object_id="%(object_id)s" data-instance="%(instance)s" value="%(value)s">' +
        '</div>';
    var buttonTypeHtml =
        '<div class="form-group propspanel__group"%(width)s>' +
        '<label class="propspanel__item-title">%(label)s</label>' +
        '<div class="btn-group propspanel__btn-group"><button class="btn btn-default" data-object_id="%(object_id)s">Change</button></div>' +
        '</div>';
    var checkboxTypeHtml = '<div class="checkbox %(attrActive)s">' +
        '<label>' +
        '<input type="checkbox" name="%(prop)s" value="%(value)s" %(attrChecked)s autocomplete="off"> %(label)s' +
        '</label>' +
        '</div>';
    var switchTypeHtml =
        '<div class="form-group propspanel__group"%(width)s>' +
        '<label class="propspanel__item-title">%(label)s</label>' +
        '<div class="btn-group propspanel__btn-group" data-toggle="buttons" data-prop="%(prop)s" data-object_id="%(object_id)s" data-instance="%(instance)s" data-casttype="%(casttype)s" value="%(value)s">' +
        '%(vars)s' +
        '</div>' +
        '</div>';
    var switchVariant = '<label class="btn btn-default propspanel__toggler %(attrActive)s">' +
        '<input type="radio" name="%(prop)s" value="%(value)s" %(attrChecked)s autocomplete="off">%(label)s' +
        '</label>';
    var selectTypeHtml = '<div class="form-group propspanel__group"%(width)s>' +
        '<label class="propspanel__item-title">%(label)s</label>' +
        '<select class="propspanel__select form-control" data-toggle="buttons" data-prop="%(prop)s" data-object_id="%(object_id)s" ' +
        'data-instance="%(instance)s" data-casttype="%(casttype)s" autocomplete="off">' +
        '%(vars)s' +
        '</select>' +
        '</div>';
    var selectVariant = '<option value="%(value)s" class="propspanel__option">%(label)s</option>';

    function init() {
        //prevent from random submit, all values are collected manually
        $(propsFormSelector).on("submit", function() {
            return false;
        });

        bindHandlers();
    }

    /**
     * handle different inputs on properties panel
     */
    function bindHandlers() {
        $(propsFormSelector).on("keyup", "input[type=text]", function(e) {
            e.stopPropagation(); //stop firing other events, eg. rotating camera
            var prop = $(this).data("prop");
            var object_id = $(this).data("object_id");
            var instance = $(this).data("instance");
            var object = controller.floormodel.getObjectById(object_id);
            var value = $(this).val();
            if (object.editable[prop].type === "number") value = parseFloat(value);
            setModelValue(prop, object, value, instance, this);
            controller.view.draw();
        }).on("change", "input[type=radio]", function() {
            var $parent = $(this).parent().parent(".btn-group");
            var prop = $parent.data("prop");
            var object_id = $parent.data("object_id");
            var casttype = $parent.data("casttype");
            var object = controller.floormodel.getObjectById(object_id);

            var textValue = this.value; //todo move out parsing somewhere. value can be a string
            if (textValue === "true") textValue = true;
            else if (textValue === "false") textValue = false;
            else if (casttype === "number") textValue = parseInt(this.value, 10);

            setModelValue(prop, object, textValue);
            controller.view.draw();
        }).on("change", "select", function() {
            var prop = $(this).data("prop");
            var object_id = $(this).data("object_id");
            var casttype = $(this).data("casttype");
            var object = controller.floormodel.getObjectById(object_id);

            var textValue = this.value; //todo move out parsing somewhere. value can be a string
            if (casttype === "number") textValue = parseInt(this.value, 10);

            setModelValue(prop, object, textValue);
            controller.view.draw();
        });
    }

    /* Common function to set a value from properties form
     * @param {string} prop changed property name
     * @param {object} object changed object connected to form element
     * @param {value} value changed value
     * @param {string} instance object instance, e.g. door/window/wall
     * @param {object} jqObject form element
     */
    function setModelValue(prop, object, value, instance, jqObject) {
        switch (instance) {
            case "door":
            case "window":
                if (prop === "length") handleDoorsInput(prop, object, value, instance, jqObject);
                else handleFormElement(prop, object, value);
                break;
            default: //other inputs
                handleFormElement(prop, object, value);
                break;
        }
    }

    /* When change any form element's value, system immediately saves it to appropriate object.
     * @param {string} prop changed property name
     * @param {object} object changed object connected to form element
     * @param {value} value changed value
     */
    function handleFormElement(prop, object, value) {
        if (object && "set" + Utils.capitalizeFirstLetter(prop) in object && typeof object[ "set" + Utils.capitalizeFirstLetter(prop) ] === 'function') {
            object["set" + Utils.capitalizeFirstLetter(prop)].call(object, value);
        } else if (prop in object) {
            object[prop] = value;
        }
    }

    /* Custom input for doors/windows length. When change value as usual - door's start corner changes.
     * When changed with CTRL+ARROW_UP or CTRL+ARROW_DOWN also start corner changes
     * When changed with CTRL+ALT+ARROW_UP or CTRL+ALT+ARROW_DOWN end corner changes
     * @param {string} prop changed property name
     * @param {object} object changed object connected to form element
     * @param {value} value changed value
     * @param {string} instance object instance, e.g. door/window/wall
     * @param {object} jqObject form element
     */
    function handleDoorsInput(prop, object, value, instance, jqObject) {
        var ARROW_UP = 38;
        var ARROW_DOWN = 40;
        $(jqObject).on("keydown", function(e) {
            if (e.ctrlKey && e.altKey && e.keyCode === ARROW_UP) {
                e.preventDefault(); value += 1; object.setWidth(value, "end");
            } else if (e.ctrlKey && e.altKey && e.keyCode === ARROW_DOWN) {
                e.preventDefault(); value -= 1; object.setWidth(value, "end");
            } else if (e.ctrlKey && e.keyCode === ARROW_UP) {
                e.preventDefault(); value += 1; object.setWidth(value, "start");
            } else if (e.ctrlKey && e.keyCode === ARROW_DOWN) {
                e.preventDefault(); value -= 1; object.setWidth(value, "start");
            }
            $(this).val(value);
        });
    }

    /* Prepare Replace object for later sprintf replacement in html
     * @param {object} object model instance
     * @param {object} field model property
     * @return {object} object with replacement bindings
     */
    this.prepareReplace = function(object, field) {
        return Object.assign(
            {},
            object.editable[field],
            {
                prop: field,
                object_id: object.id,
                instance: object.constructor.name.toLowerCase(),
                value: object[field],
                width: ("width" in object.editable[field] ? " style='width:"+object.editable[field].width+";'" : ""),
                disabled: ("disabled" in object.editable[field] ? " disabled='disabled'" : "")
            }
        );
    };

    this.showSelectionPanel = function(object) {
        if (this.prepareProperties(object)) {
            $(propsSelector).slideDown();
            this.updateTitle(object);
        } else {
            $(propsSelector).slideUp();
        }
    };

    this.closeSelectionPanel = function() {
        $(propsSelector).slideUp();
    };

    this.updateTitle = function(object) {
        if (object instanceof Door) $(propsSelector).find(propsTitle).text("Door");
        else if (object instanceof Window) $(propsSelector).find(propsTitle).text("Window");
        else if (object instanceof Room) $(propsSelector).find(propsTitle).text("Room");
        else if (object instanceof Wall) $(propsSelector).find(propsTitle).text("Wall");
        else if (object instanceof EmbedObject) $(propsSelector).find(propsTitle).text("Object");
    };

    /* Update properties on panel, for example, if they were changed somewhere outside.
     */
    this.update = function() {
        if (this.selectedObject !== null) this.prepareProperties(this.selectedObject);
    };

    /* Prepare editable properties and output them in panel
     * @param {object} object model instance
     * @return {boolean} true on success, false if there are no such properties in object or on any other failure
     */
    this.prepareProperties = function(object) {
        var scope = this, isRoom = false;
        if (object instanceof Room) {
            object = object.getPlacement();
            isRoom = true;
        }
        if (object) {
            $(propsFormSelector).empty();
            if ("getEditable" in object) object.editable = object.getEditable();
            for (var field in object.editable) { //loop editable properties and add inputs to propsPanel.
                var arReplace = scope.prepareReplace(object, field);
                switch (object.editable[field].type) {
                    case "string":
                    case "number":
                        $(propsFormSelector).append(sprintf(stringTypeHtml, arReplace));
                        break;
                    case "switch":
                        arReplace["vars"] = "";
                        arReplace["variants"].forEach(function(switchItem) {
                            scope.applySwitchActions(switchItem, field);
                            switchItem.prop = field;
                            if (switchItem.value === arReplace.value) {
                                switchItem.attrChecked = "checked='checked'";
                                switchItem.attrActive = "active";
                            } else {
                                switchItem.attrChecked = "";
                                switchItem.attrActive = "";
                            }
                            arReplace["vars"] += sprintf(switchVariant, switchItem);
                        });
                        $(propsFormSelector).append(sprintf(switchTypeHtml, arReplace));

                        //it works like a callback function for append (switch adding above)
                        setTimeout(function(fieldName) {
                            $("input[name="+fieldName+"]:checked", propsFormSelector).trigger("changeOnLoad");
                        }, 0, field);
                        break;
                    case "select":
                        arReplace["vars"] = "";
                        arReplace["variants"].forEach(function(selectItem) {
                            selectItem.prop = field;
                            arReplace["vars"] += sprintf(selectVariant, selectItem);
                        });
                        $(propsFormSelector).append(sprintf(selectTypeHtml, arReplace));
                        break;
                    case "button":
                        $(propsFormSelector).append(sprintf(buttonTypeHtml, arReplace));
                        $(document)
                            .off("click", "[data-object_id=" + arReplace["object_id"] +"]")
                            .on("click", "[data-object_id=" + arReplace["object_id"] +"]", arReplace["callback"])
                            .on("click", "[data-object_id=" + arReplace["object_id"] +"]", function() { controller.fireRedraw() });
                        break;
                    case "checkbox":
                        arReplace.attrChecked = object[field] ? "checked='checked'" : "";
                        arReplace.attrActive = object[field] ? "active" : "";
                        $(propsFormSelector).append(sprintf(checkboxTypeHtml, arReplace));
                        break;
                }
            }
            if (isRoom) {
                var camerasController = CameraListController.getInstance(controller, object.id, propsFormSelector);
                camerasController.init();
            }
            return true;
        }
        return false;
    };

    /* Apply show/hide actions. Needs when some property excludes the use of other properties, so system makes some of them hidden
     * Special "showProps" and "hideProps" keys must be in editable object.
     */
    this.applySwitchActions = function(switchItem, propName) {
        if ("showProps" in switchItem) {
            var showValue = switchItem.value;
            //todo off this events somewhere because every door's click it bounds new ones.
            $(propsFormSelector).on("change changeOnLoad", "input[name="+propName+"]", function() {
                if (this.value === showValue.toString()) {
                    switchItem.showProps.forEach(function(prop) {
                        var $pElement = $("[data-prop="+prop+"]", propsFormSelector).parent(".propspanel__group");
                        $pElement.removeClass("propspanel__group_disabled");
                    });
                }
            });
        }
        if ("hideProps" in switchItem) {
            var hideValue = switchItem.value;
            $(propsFormSelector).on("change changeOnLoad", "input[name="+propName+"]", function() {
                if (this.value === hideValue.toString()) {
                    switchItem.hideProps.forEach(function(prop) {
                        var $pElement = $("[data-prop="+prop+"]", propsFormSelector).parent(".propspanel__group");
                        $pElement.addClass("propspanel__group_disabled");
                    });
                }
            });
        }
    };

    init();
};