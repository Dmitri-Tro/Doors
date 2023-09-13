
'use strict';
const MeasurementValues = function () {
    this.selector = ".measurements-panel";
    this.formSelector = ".measurements-panel__form";

    this.values = [];
    
    this.visible = false;
    this.maxValuesLength = 7;
    this.unitSystem = 'metric'; // imperial

    this.getElements = function () {
      return {
        panel: document.querySelector(this.selector),
        form: document.querySelector(this.formSelector)
      };
    }

    this.addMeasurementValue = function (data) {
      if (this.values.length === this.maxValuesLength) {
        this.values.splice(-1, 1);
      }

      this.values.unshift(data);

      this.drawValues();
    }

    this.setUnitSystem = function (system) {
      if (system === 'metric') {
        this.unitSystem = 'metric';
      } else if (system === 'imperial' || system === 'imperial2') {
        this.unitSystem = 'imperial';
      } else {
        this.unitSystem = 'metric';
      }

      this.drawValues();
    }

    this.drawValues = function () {
      var elements = this.getElements();

      if (this.values.length > 0) {
        elements.panel.classList.remove('hidden');
      }

      elements.form.innerHTML = '';

      this.values.forEach(function (value, index) {
        var itemElement = document.createElement('div');
        var numberElement = document.createElement('div');
        var valueElement = document.createElement('div');

        itemElement.className = 'measurements-panel__list-item';
        numberElement.className = 'measurements-panel__list-item-number';
        valueElement.className = 'measurements-panel__list-item-value';

        numberElement.innerHTML = index + 1;

        if (this.unitSystem === 'imperial') {
          valueElement.innerHTML = _.round((value.lengths.raw / 30.48), 3) + ' ft '; 

          // if (value.lengths.raw !== value.lengths.aligned) {
          //   valueElement.innerHTML += '(' + _.round((value.lengths.aligned / 30.48), 3) + ' ft)'; 
          // }
        } else if (this.unitSystem === 'metric') {
          valueElement.innerHTML = _.round(value.lengths.raw / 100, 2) + ' m '; 

          // if (value.lengths.raw !== value.lengths.aligned) {
          //   valueElement.innerHTML += '(' + _.round(value.lengths.aligned / 100, 2) + ' m)'; 
          // }
        }

        itemElement.append(numberElement);
        itemElement.append(valueElement);

        elements.form.append(itemElement);
      }.bind(this));
    }

    this.getMeasurementValueByNumber = function (number) {
      return this.values[number - 1];
    }
};