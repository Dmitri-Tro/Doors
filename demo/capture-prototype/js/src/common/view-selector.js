'use strict';

/** 
 * Tabs selector
 * @class
 * @param  {string} selector
 */
const ViewSelector = function (selector, floorsSelector) {
    this.selector = selector ? selector : '.tab-selector';
    this.floorsSelector = floorsSelector ? floorsSelector : '.floors-selector';

    this.active = false;

    this.current = 'pano-measurements';
    this.currentFloor = 0;
    this.hasFloors = false;

    this.tabs = {
        // 'pano': {
        //     active: false,
        //     floors: false
        // },
        'pano-measurements': {
            active: true,
            floors: false
        },
        'view2d': {
            active: true,
            floors: true
        },
        'view3d': {
            active: true,
            floors: false
        }
    };

    this.floors = {
        "-1": { 
            name: "B1",
            enabled: true,
            avalible: false,
        },
        "-100": { 
            name: "Outside",
            enabled: false,
            avalible: false,
        },
        "-2": { 
            name: "B2",
            enabled: true,
            avalible: false,
        },
        "-3": { 
            name: "B3",
            enabled: true,
            avalible: false,
        },
        "-99": { 
            name: "Aerial photo by drone",
            enabled: false,
            avalible: false,
        },
        "0": {
            name: "Ground floor",
            enabled: true,
            avalible: false,
        },
        "1": {
            name: "1st floor",
            enabled: true,
            avalible: false,
        },
        "10": { 
            name: "10th floor",
            enabled: true,
            avalible: false,
        },
        "2": {
            name: "2nd floor",
            enabled: true,
            avalible: false,
        },
        "3": {
            name: "3rd floor",
            enabled: true,
            avalible: false,
        },
        "4": {
            name: "4th floor",
            enabled: true,
            avalible: false,
        },
        "5": {
            name: "5th floor",
            enabled: true,
            avalible: false,
        },
        "6": {
            name: "6th floor",
            enabled: true,
            avalible: false,
        },
        "7": {
            name: "7th floor",
            enabled: true,
            avalible: false,
        },
        "8":  {
            name: "8th floor",
            enabled: true,
            avalible: false,
        },
        "9":  {
            name: "9th floor",
            enabled: true,
            avalible: false,
        }
    };

    this.events = new EventsSystem('viewSelector');

    /** Initialize
     * @returns {this} thought updateDom method
     */
    this.init = function () {
        $(this.selector).on("keydown", ".btn", function (event) {
            event.preventDefault();
        });

        $(this.selector).on("change", "input[name=views]", function (event) {
            this.setTab($(event.currentTarget).val(), false);
        }.bind(this));

        return this.updateDom();
    }

    /** 
     * Set tab
     * @param  {string} tab
     * @returns {this} thought updateDom method
     */
    this.setTab = function (tab, force) {
        if (force === undefined) force = true; // force by default
        if (!force && (!this.enabled || !this.tabs[tab].active || tab === this.current)) return this;

        this.current = tab;
        this.events.fire('set-' + tab);
        return this.updateDom();
    }

    /**
     * Enable tabs selector
     * @returns {this} thought updateDom method
     */
    this.enable = function () {
        this.enabled = true;
        return this.updateDom();
    }

    /**
     * Disable tabs selector
     *  @returns {this} thought updateDom method
     */
    this.disable = function () {
        this.enabled = false;
        return this.updateDom();
    }

    /**
     * Enable tab
     * @param  {string} tab
     * @returns {this} thought updateDom method
     */
    this.enableTab = function (tab) {
        this.tabs[tab].active = true;
        return this.updateDom();
    }


    /**
     * Disable tab
     * @param  {string} tab
     * @returns {this} thought updateDom method
     */
    this.disableTab = function (tab) {
        this.tabs[tab].active = false;
        return this.updateDom();
    }


    /**
     * @param  {string|null} tab - tab name, by default use current tab
     * @returns {this}
     */
    this.openTabContent = function (tab) {
        $(".tab").removeClass("tab_active");
        $("#" + (tab ? tab : this.current)).addClass("tab_active");

        return this;
    }

    /**
     * Set array of floors numbers
     * @param  {array} floors
     * @returns {this} thought updateDom method
     */
    this.setAvalibleFloors = function (floors) {
        if (Array.isArray(floors)) {
            for (var key in this.floors) {
                if (this.floors[key]) {
                    this.floors[key].avalible = false;
                }
            }
            for (var index in floors) {
                if (this.floors[floors[index]]) {
                    this.floors[floors[index]].avalible = true;
                }
            }

            this.hasFloors = floors.length > 0;
        }

        return this.updateDom();
    }

    /**
     * Set current floor and fire event
     * @param  {number} floor
     * @returns {this}
     */
    this.setFloor = function (floor) {
        this.setCurrentFloor(floor);

        this.events.fire('set-floor', {floor: floor});

        return this;
    }

    /**
     * Get current floor
     * @returns {number} floor
     */
    this.getCurrentFloor = function () {
        return this.currentFloor;
    }

    /**
     * Set current floor without fire event
     * @param  {number} floor
     * @returns {this}
     */
    this.setCurrentFloor = function (floor) {
        this.currentFloor = floor;

        return this;
    }

    this.updateFloorsSelector = function () {
        var items = new EJS({
            url: document.location.origin + document.location.pathname + 'templates/html/floor-selector-items.ejs'
        }).render({
            currentFloor: this.currentFloor,
            floors: this.floors
        });

        $('.floor-selector__items').html(items);

        $('.floor-selector__item').on('click', function (event) {
            var floor = $(event.currentTarget).attr('data-floor');
            this.setFloor(floor);
        }.bind(this));

        return this;
    }

    this.loadFloor = function () {

    }

    /**
     * Updates dom with class data
     * @returns {this} thought openTabContent method
     */
    this.updateDom = function () {
        Object.keys(this.tabs).map(function (key) {
            if (this.enabled && this.tabs[key].active) {
                $(":radio[value=" + key + "]").prop('disabled', false).parent().removeClass("disabled");
            } else {
                $(":radio[value=" + key + "]").prop('disabled', true).parent().addClass("disabled");
            }

            if (key === this.current) {
                $(":radio[value=" + key + "]").parent().addClass("active");
            } else {
                $(":radio[value=" + key + "]").parent().removeClass("active");
            }
        }.bind(this));

        if (this.tabs[this.current].floors && this.hasFloors) {
            $(".floor-selector").addClass('floor-selector_visible');
            this.updateFloorsSelector();
        } else {
            $(".floor-selector").removeClass('floor-selector_visible');
        }

        return this.openTabContent();
    };

    /**
     * Alias to setTab method
     * Need for old cases of use
     */
    this.change = function (tab) {
        console.warn('ViewSelector change metod deprecated and will be removed soon.');
        return this.setTab(tab);
    }
}