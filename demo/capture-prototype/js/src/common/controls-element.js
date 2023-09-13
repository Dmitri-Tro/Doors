// Todo: create all elements with that class

const ControlsElement = function (options) {
  options = options instanceof Object ? options : {};

  this.id = options.id || THREE.Math.generateUUID();
  this.labelTemplate = options.labelTemplate || null;
  this.label = options.label || this.getLabel(options);
  this.type = 'input';
  this.value = null;
  this.active = true;
  this.options = [];
  this._onChange = options.onChange || function () {};

  Object.defineProperty(this, 'onChange', {
    set: function (value) {
      return this._onChange = value;
    },
    get: function () {
      return function (object) {
        this.value = object.value;
        this.label = this.getLabel(object);
        this._onChange(object.value); // Todo: return this
        return this;
      }
    }
  });

  this.addOption = function (text, value, additionalData) {
    var option = {
      name: text,
      value: value
    };
    
    if (additionalData instanceof Object) {
      Object.assign(option, additionalData);
    }

    this.options.push(option);

    return this;
  }

  this.setValue = function (value, useCallback) {
    useCallback = useCallback === undefined ? true : useCallback;
    this.value = value;

    if (useCallback && typeof(this.onSetValue) === 'function') {
      this.onSetValue(value); // Callback for dom update
    }

    return this;
  }

  Object.assign(this, options);
}

ControlsElement.prototype.getLabel = function (object) {
  if (this.labelTemplate && object) {
    var newLabel = this.labelTemplate;
    Object.keys(object).forEach(function (key) {
      const value = object[key];
      newLabel = newLabel.replace(new RegExp('{{' + key + '}}', 'g'), value);
    });

    return newLabel;
  } else {
    return this.label;
  }
}