    'use strict';

/**
 * Tab controls
 * @class
 */
const Controls = function (id) {
    this.id = id || 'controls';

    this.events = new EventsSystem(this.id);
    
    // Static controls
    this.controls = {};

    // Accordeon
    this.accordeon = {};

    // Auto assembled controls
    this.assembled = {};

    this.options = {
        saveAccordeonState: false
    };
    
    /**
     * Initialize controls
     * @returns {this}
     */
    this.init = function () {
        Object.keys(this.controls).forEach(function (key) {
            const control = this.controls[key];
            control.element = $('#' + control.id);
            if (control.type === 'button') {
                this.registerEvent('click', key);
            } else if (control.type === 'select') {
                this.registerEvent('change', key);
            } else if (control.type === 'input') {
                this.registerEvent('change', key);
            } else if (control.type === 'checkbox') {
                this.registerEvent('change', key);
            } else if (control.type === 'button-group') {
                this.registerEvents('button-group-change', key);
            }

            if (control.attributes) {
                Object.keys(control.attributes).forEach(function (aKey) {
                    control.element.attr(aKey, control.attributes[aKey]);
                });
            }
        }.bind(this));

        this.initAccordeon();

        if (this.options.saveAccordeonState && window.localStorage !== undefined) {
            Object.keys(this.accordeon).forEach(function (aKey) {
                var accStage = localStorage.getItem(this.id + '-controls-accordeon-' + aKey);
                if (accStage !== null) {
                    accStage = JSON.parse(accStage);

                    if (this.accordeon[aKey].enabled) {
                        if (accStage.hidden === true) {
                            this.hideAccordeon(aKey, false);
                        } else {
                            this.showAccordeon(aKey, false);
                        }
                    }
                }
            }.bind(this));
        }

        return this;
    }

    /**
     * Register events on control elements
     * @param  {string} type
     * @param  {string} key
     * @returns {this}
     */
    this.registerEvent = function (type, key) {
        this.controls[key].element.on(type, function (event) {
            if (this.controls[key].disabled !== true) {
                this.events.fire(type + '-' + key, event);
            }
        }.bind(this));

        return this;
    }

    /**
     * Register custom events on control elements
     * @param  {string} type
     * @param  {string} key
     * @returns {this}
     */
    this.registerEvents = function (type, key) {
        const control = this.controls[key];

        if (type === 'checkbox') {
            control.setValue = function (value) {
                control.element.attr('disabled', !!value);
            }
        } else if (type === 'button-group-change') {
            var elements = control.element.find('input[type="radio"]');

            control.setValue = function (value) {
                var element = control.element.find('input[type="radio"][value="' + value + '"]');

                if (element) {
                    element.click();
                } else {
                    console.warn('Invalid value for button group!', key, value);
                }
            }

            elements.on('change', function (event) {
                if (this.controls[key].disabled !== true) {
                    this.events.fire(type + '-' + key, event);
                }
            }.bind(this));
        }

        return this;
    }
    
    /**
     * Enable control element
     * @param  {string} key
     * @param  {boolean|undefined} update
     * @returns {this}
     */
    this.enable = function (key, update) {
        if (update === undefined) update = true;
        this.controls[key].disabled = false;
        if (update) {
            this.updateDom();
        }
        return this;
    }

    /**
     * Disable control element
     * @param  {string} key
     * @param  {boolean|undefined} update
     * @returns {this}
     */
    this.disable = function (key, update) {
        if (update === undefined) update = true;
        this.controls[key].disabled = true;
        if (update) {
            this.updateDom();
        }
        return this;
    }

    /**
     * Enable all controls elements
     * @returns {this}
     */
    this.enableAll = function () {
        Object.keys(this.controls).forEach(function (key) {
            this.enable(key, false);
        }.bind(this));
        this.updateDom();
        return this;
    }
    
    /**
     * Disable all controls elements
     * @returns {this}
     */
    this.disableAll = function () {
        Object.keys(this.controls).forEach(function (key) {
            this.disable(key, false);
        }.bind(this));
        this.updateDom();
        return this;
    }

    /**
     * Updates document after changes
     * @returns {this}
     */
    this.updateDom = function (withOptions) {
        Object.keys(this.controls).forEach(function (key) {
            const control = this.controls[key];
            if (control.element) {
                if (control.disabled === true) {
                    control.element.attr('disabled', true);
                } else {
                    control.element.attr('disabled', false);
                }

                if (withOptions && control.type === 'select') {
                    control.element.html('');
                    // control.element.append(new Option('Self', ''));
                    control.options.forEach(function (option) {
                        control.element.append(new Option(option.name, option.value));
                    });
                }
            }
        }.bind(this));

        return this;
    }

    /**
     * @param {array} options with keys [{name, value}]
     * @param {string} key control
     * @returns {this}
     */
    this.setOptions = function (options, key) {
        const control = this.controls[key];
        if (control !== undefined && control.type === 'select') {
            control.options = options;
        }

        this.updateDom(true);

        return this;
    }

    /**
     * @param {string} value
     * @param {string} control
     * @returns {this}
     */
    this.setOption = function (value, key) {
        const control = this.controls[key];
        if (control !== undefined && control.type === 'select') {
            control.value = value;
            control.element.val(value);
        }

        return this;
    }

    /**
     * @param  {string} key
     * @returns {string} value
     */
    this.setValue = function (key, value) {
        this.controls[key].element.val(value);
    }
    
    /**
     * @param  {string} key
     * @returns {string} value
     */
    this.getValue = function (key) {
        if (this.controls[key] && this.controls[key].element) {
            return this.controls[key].element.val();
        }
    }
    
    /**
     * Initialize accordeon
     * @returns {this}
     */
    this.initAccordeon = function () {
        this.accordeon = {};
        
        var items = $('.controls__item.' + this.id + '-item');

        items.each(function (index, value) {
            var jqValue =  $(value);

            var key = jqValue.attr('data-key');
            var enabled = jqValue.attr('data-enabled');
            var hidden = jqValue.attr('data-hidden');

            this.accordeon[key ? key : '' + index] = {
                label: jqValue.find('.controls__label'),
                item: jqValue,
                body: jqValue.find('.controls__body'),
                icons: {
                    shown: jqValue.find('.controls__toggler_shown'),
                    hidden: jqValue.find('.controls__toggler_hidden')
                },
                hidden: hidden === 'true' ? true : false,
                enabled: enabled === 'false' ? false : true
            };
        }.bind(this));

        Object.keys(this.accordeon).forEach(function (key) {
            const item = this.accordeon[key];

            if (!item.enabled) {
                this.disableAccordeon(key);
            }

            if (!item.hidden) {
                this.showAccordeon(key);
            } else {
                this.hideAccordeon(key);
            }

            item.label.click(function () {
                this.toggleAccordeon(key);

                this.events.fire('accordeon-' + key, item);

                if (this.options.saveAccordeonState && window.localStorage !== undefined) {
                    localStorage.setItem(
                        this.id + '-controls-accordeon-' + key, 
                        JSON.stringify({hidden: this.accordeon[key].hidden})
                    );
                }
            }.bind(this));
        }.bind(this));

        return this;
    }

    /**
     * Toggle accordeon item
     * @param  {string} key
     * @return {this}
     */
    this.toggleAccordeon = function (key) {
        if (this.accordeon[key].enabled) {
            this.accordeon[key].body.slideToggle(500);
    
            this.accordeon[key].hidden = !this.accordeon[key].hidden;
    
            if (this.accordeon[key].hidden) {
                this.accordeon[key].icons.shown.hide(0);
                this.accordeon[key].icons.hidden.show(0);
                this.accordeon[key].label.removeClass('controls__label_shown');
                this.accordeon[key].label.addClass('controls__label_hidden');
            } else {
                this.accordeon[key].icons.shown.show(0);
                this.accordeon[key].icons.hidden.hide(0);
                this.accordeon[key].label.addClass('controls__label_shown');
                this.accordeon[key].label.removeClass('controls__label_hidden');
            }
        }

        return this;
    }
    
    /**
     * Show accordeon item
     * @param  {string} key
     * @return {this}
     */
    this.showAccordeon = function (key, save) {
        if (save === undefined) save = true;
    
        this.accordeon[key].body.slideDown(500);
        this.accordeon[key].hidden = false;
        
        if (save) {
            if (this.options.saveAccordeonState && window.localStorage !== undefined) {
                localStorage.setItem(
                    this.id + '-controls-accordeon-' + key, 
                    JSON.stringify({hidden: this.accordeon[key].hidden})
                );
            }
        }

        this.accordeon[key].icons.shown.show(0);
        this.accordeon[key].icons.hidden.hide(0);
        this.accordeon[key].label.addClass('controls__label_shown');
        this.accordeon[key].label.removeClass('controls__label_hidden');

        return this;
    }

    /**
     * Hide accordeon item
     * @param  {string} key
     * @return {this}
     */
    this.hideAccordeon = function (key, save) {
        if (save === undefined) save = true;

        this.accordeon[key].body.slideUp(500);
        this.accordeon[key].hidden = true;

        if (save) {
            if (this.options.saveAccordeonState && window.localStorage !== undefined) {
                localStorage.setItem(
                    'controls-accordeon-' + key, 
                    JSON.stringify({hidden: this.accordeon[key].hidden})
                );
            }
        }

        this.accordeon[key].icons.shown.hide(0);
        this.accordeon[key].icons.hidden.show(0);
        this.accordeon[key].label.removeClass('controls__label_shown');
        this.accordeon[key].label.addClass('controls__label_hidden');

        return this;
    }

    /**
     * Enable accordeon item
     * @param  {string} key
     * @return {this}
     */
    this.enableAccordeon = function (key, show) {
        if (show === undefined || show === true) {
            this.showAccordeon(key, false);
        }
        this.accordeon[key].enabled = true;
        this.accordeon[key].label.removeClass('controls__label_disabled');

        return this;
    }

    /**
     * Disable accordeon item
     * @param  {string} key
     * @return {this}
     */
    this.disableAccordeon = function (key) {
        this.hideAccordeon(key, false);
        this.accordeon[key].enabled = false;
        this.accordeon[key].label.addClass('controls__label_disabled');

        return this;
    }
    
    /**
     * Get accordeon item
     * @param  {string} key
     * @returns {object|undefined}
     */
    this.getAccordeon = function (key) {
        return this.accordeon[key];
    }

    /**
     * Assemble controls item
     * @param {string} container
     * @param {string} type
     * @param {object} options
     * @return {this}
     */
    this.assemble = function (container, options) {
        const containerElement = $('#' + container);
        this.assembled[container] = [];

        containerElement.html('');

        Object.keys(options).forEach(function (key) {
            const element = options[key];
            this.assembled[container].push(element);

            var activeElement = typeof(element.active) === 'function' ? element.active() : element.active;

            if (activeElement) {
                var label = document.createElement('label');
                label.className = 'controls__element-label';
                label.innerHTML = element.label;

                var elementContainer = document.createElement('div');
                elementContainer.className = 'controls__element';

                if (element.width) {
                    elementContainer.classList.add('controls__element_flex');
                    elementContainer.style = 'width: ' + element.width + ';';
                }

                if (typeof(element.onLabelClick) === 'function') {
                    label.addEventListener('click', element.onLabelClick);
                    label.classList.add('controls__element-label_clickable')
                }

                if (element.type === 'select') {
                    containerElement.append(elementContainer);

                    var select = document.createElement('select');
                    Object.keys(element.options).forEach(function (oKey) {
                        const option = element.options[oKey];
                        select.append(new Option(option.name, option.value));
                    });
    
                    select.className = 'btn-xs controls__select';
                    select.value = element.value;
    
                    if (typeof(element.onChange) === 'function') {
                        select.addEventListener('change', function (event) {
                            element.onChange({value: event.target.value});
                        });
                    }

                    element.onSetValue = function (value) {
                        select.value = select.value;
                    }
                    
                    elementContainer.append(label);
                    elementContainer.append(select);
                } else if (element.type === 'checkbox') {
                    containerElement.append(elementContainer);

                    elementContainer.classList.add('controls__element_checkbox');

                    var input = document.createElement('input');
                    input.setAttribute('type', 'checkbox');
                    input.className = 'controls__checkbox';
                    input.checked = element.value;

                    if (typeof(element.onChange) === 'function') {
                        input.addEventListener('change', function (event) {
                            element.onChange({value: event.target.checked});
                        });
                    }

                    element.onSetValue = function (value) {
                        input.checked = value;
                    }

                    elementContainer.append(label);
                    elementContainer.append(input);
                } else if (element.type === 'input') {
                    containerElement.append(elementContainer);

                    var input = document.createElement('input');

                    input.className = 'btn-xs controls__input controls__input_width-' + element.inputWidth;

                    input.value = element.value;

                    Object.keys(element.options).forEach(function (oKey) {
                        const option = element.options[oKey];
                        input.setAttribute(oKey, option);
                    });

                    if (typeof(element.onChange) === 'function') {
                        input.addEventListener('change', function (event) {
                            element.onChange({value: event.target.value});
                        });
                    }
    
                    element.onSetValue = function (value) {
                        input.value = value;
                    }

                    elementContainer.append(label);
                    elementContainer.append(input);
                } else if (element.type === 'range') {
                    containerElement.append(elementContainer);

                    var input = document.createElement('input');
                    input.setAttribute('type', 'range');
                    input.className = 'controls__range';

                    Object.keys(element.options).forEach(function (oKey) {
                        const option = element.options[oKey];
                        input.setAttribute(oKey, option);
                    });

                    input.value = element.value;
                    label.innerHTML = element.label;

                    label.addEventListener('click', function (event) {
                        element.onChange({value: 0});
                        label.innerHTML = element.label;
                    });

                    if (typeof(element.onChange) === 'function') {
                        input.addEventListener('input', function (event) {
                            element.onChange({value: parseFloat(event.target.value)});
                            label.innerHTML = element.label;
                        });
                    }

                    element.onSetValue = function (value) {
                        input.value = value;
                    }
                    
                    elementContainer.append(label);
                    elementContainer.append(input);
                } else if (element.type === 'color') {
                    containerElement.append(elementContainer);

                    var input = document.createElement('input');
                    input.setAttribute('type', 'color');

                    input.className = 'btn-xs controls__color';
                    input.value = element.value;

                    Object.keys(element.options).forEach(function (oKey) {
                        const option = element.options[oKey];
                        input.setAttribute(oKey, option);
                    });

                    if (typeof(element.onChange) === 'function') {
                        input.addEventListener('change', function (event) {
                            element.onChange({value: event.target.value});
                        });
                    }
    
                    element.onSetValue = function (value) {
                        input.value = value;
                    }

                    elementContainer.append(label);
                    elementContainer.append(input);
                } else if (element.type === 'button') {
                    containerElement.append(elementContainer);
                    
                    var button = document.createElement('button');
                    button.innerHTML = label.innerHTML;

                    button.className = 'btn btn-xs btn-primary controls__button controls__button_width-1';

                    Object.keys(element.options).forEach(function (oKey) {
                        const option = element.options[oKey];
                        button.setAttribute(oKey, option);
                    });

                    if (typeof(element.onClick) === 'function') {
                        button.addEventListener('click', element.onClick);
                    }
    
                    elementContainer.append(button);
                } else if (element.type === 'button-group') {
                    containerElement.append(elementContainer);
                    elementContainer.append(label);

                    var buttonsGroup = document.createElement('div');
                    buttonsGroup.classList = 'btn-group controls__element-button-group';

                    var opts = {};

                    Object.keys(element.options).forEach(function (oKey, index) {
                        const option = element.options[oKey];

                        var buttonLabel = document.createElement('label');
                        buttonLabel.classList = 
                            'btn btn-xs btn-primary ' + (element.value === option.value ? 'active' : '') ;
                        buttonLabel.innerHTML += option.name;

                        buttonsGroup.append(buttonLabel);

                        if (typeof(element.onClick) === 'function') {
                            buttonLabel.addEventListener('click', function () {
                                element.onClick(option.value);

                                Object.keys(opts).forEach(function (optKey) {
                                    element.value = option.value;

                                    if (optKey === element.value) {
                                        opts[optKey].label.classList.add('active');
                                    } else {
                                        opts[optKey].label.classList.remove('active');
                                    }
                                });
                            });
                        }

                        opts[option.value] = {
                            label: buttonLabel
                        }; 
                    });

                    elementContainer.append(buttonsGroup);
                } else if (element.type === 'line') {
                    var line = document.createElement('hr');

                    line.className = 'controls__hr';

                    Object.keys(element.options).forEach(function (oKey) {
                        const option = element.options[oKey];
                        line.setAttribute(oKey, option);
                    });

                    if (typeof(element.onClick) === 'function') {
                        line.addEventListener('click', element.onClick);
                    }
    
                    containerElement.append(line);
                } else if (element.type === 'brush-select') { // Todo: can moved to editor3d-control
                    containerElement.append(elementContainer);

                    elementContainer.append(label);
    
                    var groupName = 'brush_group_' + _.snakeCase(element.id);
                    var select = document.createElement('select');
                    select.className = 'btn-xs controls__brush-select';
                    select.value = element.value;

                    elementContainer.append(select);

                    var brushButtonsContainer = document.createElement('div');
                    elementContainer.append(brushButtonsContainer);

                    Object.keys(element.options).forEach(function (oKey, index) {
                        const option = element.options[oKey];
                        select.append(new Option(option.name, option.value));

                        const optionButton = document.createElement('button');

                        optionButton.setAttribute('style', 'background-image: url(' + option.image + ');');
                        optionButton.setAttribute(
                            'class', 
                            'controls__brush-button ' + 
                            groupName + (index == 0 ? ' active' : '') +
                            ' brush_' + _.snakeCase(option.value)
                        );
                    
                        if (option.hideName !== true) {
                            var parts = option.name.split(' ');
                            var text = '';

                            parts.forEach(function (part) {
                                text += part.charAt(0);
                            });

                            text = text.substr(0, 4);

                            optionButton.innerHTML = text;
                        } else {
                            optionButton.innerHTML = '&nbsp;';
                        }

                        optionButton.onclick = function () {
                            var group = document.querySelectorAll('.' + groupName);
                            group.forEach(function (element) {
                                element.classList.remove('active');
                            });
                            optionButton.classList.add('active');
                            
                            element.onChange({value: option.value, name: option.name});
                            select.value = option.value;
                            label.innerHTML = element.label;
                        }
                        brushButtonsContainer.append(optionButton);
                    });

                    if (typeof(element.onChange) === 'function') {
                        select.addEventListener('change', function (event) {
                            element.onChange({value: event.target.value, name: event.target.innerHTML});
                            label.innerHTML = element.label;
                        });
                    }

                    element.onSetValue = function (value) {
                        var group = document.querySelectorAll('.' + groupName);
                        group.forEach(function (element) {
                            element.classList.remove('active');
                        });
                        document.querySelector('.brush_' + _.snakeCase(value)).classList.add('active');

                        select.value = value;
                    }
                } else {
                    console.warn('Can\'t assemble elment with type: ' + element.type);
                }
            }
        }.bind(this));

        return this;
    }
}