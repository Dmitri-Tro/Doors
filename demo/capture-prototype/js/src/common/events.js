'use strict';

/**
 * Simple system to handle local events in classes
 * Dont modify this without need, and dont make this global
 * https://en.wikipedia.org/wiki/Observer_pattern
 * @class
 */
const EventsSystem = function (id) {
    this._id = id || THREE.Math.generateUUID();
    this._events = {};

    /**
     * @param  {string} action
     * @param  {string} namespace
     * @param  {function} event
     * @returns {EventsSystem}
     */
    this.setOn = function (action, namespace, event) {
        if (!this._events[action]) {
            this._events[action] = {};
        }

        if (typeof(event) === 'function') {
            this._events[action][namespace] = event;
        } else {
            console.warn('Event has to be a function!');
        }

        return this;
    }

    /**
     * @param  {string} action
     * @param  {string|null} namespace
     * @returns {EventsSystem}
     */
    this.removeOn = function (action, namespace) {
        if (namespace === null && this._events[action]) { //remove all when namespace is null
            Object.keys(this._events[action]).map(function (key) {
                this._events[action][key] = null;
            }.bind(this));
        } else if (this._events[action] && this._events[action][namespace]) {
            this._events[action][namespace] = null;
        }

        return this;
    }
    
    /**
     * @param  {string} action
     * @param  {*} data to pass to callback
     * @returns {EventsSystem}
     */
    this.fire = function (action, data) {
        if (this._events[action]) {
            Object.keys(this._events[action]).map(function (key) {
                if (typeof(this._events[action][key]) === 'function') {
                    this._events[action][key](data);
                }
            }.bind(this));
        }

        return this;
    }
}