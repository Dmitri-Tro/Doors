'use strict';

/** 
 * Class responsible to carousel pano selector
 * @class
 * @param  {string} selector
 */
const CarouselPanoSelector = function (selector) {
    this.initialized = false;
    this.selector = selector;

    this.data = null;

    this.floor = null;
    this.room = null;

    this.lastUpdateTime = 0;
    this.updateDelay = 250;

    this.carousels = {};
    this.needUpdate = true;

    this.events = new EventsSystem('CarouselPanoSelector');
    
    /** Initialize catousel from data object
     * @param  {object} data
     * @returns {this}
     */
    this.init = function (data) {
        if (!this.initialized) {
            this
                .setData(data)
                .prepareData()
                .attachTo(this.selector)
                .activateCarousels()
                .updateDom();

            this.initialized = true;
        }

        return this;
    }
    
    /**
     * @param  {object} data
     * @returns {this}
     */
    this.setData = function (data) {
        this.data = data;

        return this;
    }

    /**
     * @returns {this}
     */
    this.attachTo = function () {
        var container = document.getElementById(this.selector);

        container.innerHTML = this.getHTML();

        return this;
    }

    // todo: need be removed in future, need for ejs template copied from from krpano-development git
    this.prepareData = function () {
        var floors = [];
        Object.keys(this.data.tour.maps).map(function (key) {
            floors.push({
                number: parseInt(key),
                name: this.data.tour.maps[key].name
            });
        }.bind(this));

        this.data.floors = floors;

        return this;
    }

    /**
     * @returns {string} html
     */
    this.getHTML = function () {
        const html = new EJS({
            url: document.location.origin + document.location.pathname + 'templates/html/gallerySlider.ejs'
        }).render(this.data);

        return html;
    }

    /**
     * @returns {this}
     */
    this.syncCarouselToRoom = function () {
        Object.keys(this.carousels).forEach(function (cKey) {
            const carousel = this.carousels[cKey];

            carousel.items.each(function (index, item) {
                if (this.repairFilename(item.getAttribute('data-filename')) === this.room) {
                    this.lastUpdateTime = Date.now();
                    carousel.carousel.trigger('to.owl.carousel', [index, 100, true]);
                }
            }.bind(this));
        }.bind(this));

        return this;
    }

    /**
     * @returns {this}
     */
    this.updateDom = function () {
        // todo: all translations need be implemented in one class / this is fast decision

        var translations = {
            "right.menu.floor.-1": "B1",
            "right.menu.floor.-100": "Outside",
            "right.menu.floor.-2": "B2",
            "right.menu.floor.-3": "B3",
            "right.menu.floor.-99": "Aerial photo by drone",
            "right.menu.floor.0": "Ground floor",
            "right.menu.floor.1": "1st floor",
            "right.menu.floor.10": "10th floor",
            "right.menu.floor.2": "2nd floor",
            "right.menu.floor.3": "3rd floor",
            "right.menu.floor.4": "4th floor",
            "right.menu.floor.5": "5th floor",
            "right.menu.floor.6": "6th floor",
            "right.menu.floor.7": "7th floor",
            "right.menu.floor.8": "8th floor",
            "right.menu.floor.9": "9th floor"
        };

        $('.floor-item .number_tag').each(function (index, item) {      
            var key = ($(item).text()).trim();

            if (translations[key] !== undefined) {
                $(item).text(translations[key]);
            }
        });

        var text = $('.floor-item[data-floor="' + this.floor +'"] .number_tag').text();
        $('.toggle-header').text(text);

        var activeFloor = this.getFloor();
        Object.keys(this.carousels).forEach(function (key) {
            var floorKey = parseInt(key.substring(6, key.length)); // cut `floor-`
            if (floorKey === activeFloor) {
                this.carousels[key].carousel.addClass('pano-carousel__body_active');
            } else {
                this.carousels[key].carousel.removeClass('pano-carousel__body_active');
            }
        }.bind(this));

        this.syncCarouselToRoom();

        return this;
    }
    
    /**
     * @returns {number}
     */
    this.getFirstFloor = function () {
        var first = Infinity;

        Object.keys(this.data.tour.maps).forEach(function (key) {
            first = first < key ? first : key;
        });

        return first;
    }

    /**
     * @returns {number}
     */
    this.getFloor = function () {
        return parseInt(this.floor !== null ? this.floor : this.getFirstFloor());
    }

    /**
    * @param  {string|undefined} room
    * @returns {this}
     */
    this.getFloorFromRoom = function (room) {
        if (!room) room = this.room;

        if (Object.keys(this.data.tour.maps).length > 1) {
            if (this.data.tour.rooms[room]) {
                this.setFloor(this.data.tour.rooms[room].plan, false);
            }
        }

        return this;
    }

    /**
     * @param  {number} floor
     * @param  {boolean} updateRoom
     * @returns {this}
     */
    this.setFloor = function (floor, updateRoom) {
        if (updateRoom === undefined) updateRoom = true;

        this.floor = parseInt(floor);
        if (updateRoom === true) {
            this.room = this.getFirstRoom(); // reset room
        }

        return this;
    }

    /** get first room key
     * @returns {string}
     */
    this.getFirstRoom = function () {
        var floor = this.getFloor();
        var first = null;

        Object.keys(this.data.tour.rooms).map(function (key) {
            if (!first && this.data.tour.rooms[key].plan === floor) {
                first = key;
            }
        }.bind(this));

        return first;
    }
    
    /** get current room key
     * @returns {string}
     */
    this.getRoom = function () {
        return this.room ? this.room : this.getFirstRoom();
    }
    
    /**
     * @param  {string} room
     * @returns {this}
     */
    this.setRoom = function (room) {
        this.room = room;

        return this;
    }
    
    /**
     * fire update event
     * @returns {this}
     */
    this.fireUpdate = function () {
        var floor = this.getFloor();
        var room = this.getRoom();

        this.events.fire('updated', {
            floor: floor,
            room: room,
            pitch: this.data.tour.rooms[room].pitch,
            roll: this.data.tour.rooms[room].roll,
            roomUrl: this.data.tour.rooms[room].url
        });

        this.updateDom();

        return this;
    }

    /**
     * @returns {this}
     */
    this.activateCarousels = function () {  
        if (!Object.keys(this.carousels).length) {
            Object.keys(this.data.tour.maps).forEach(function (key) {
                this.carousels['floor-' + key] = {};
                this.carousels['floor-' + key].carousel = $('.owl-carousel[data-floor="' + key + '"]');

                this.carousels['floor-' + key].carousel.owlCarousel({
                    items: 5,
                    center: true,
                    nav: false,
                    dots: false,
                    fluidSpeed: 100,
                    loop: false,
                    navText: [
                        '<i class="left"></i>', 
                        '<i class="right"></i>'
                    ],
                    margin: 10,
                    responsive: {
                        0: {items: 1},
                        470: {items: 2},
                        600: {items: 3},
                        768: {items: 5},
                        992: {items: 7},
                        1200: {items: 8},
                        1600: {items: 8}
                    },
                    URLhashListener: true,
                    startPosition: 'URLHash'
                });
            }.bind(this));

            this.registerCarouselsEvents();
            this.events.fire('activate-carousels'); 
        }

        return this;
    }

    /**
     * @returns {this}
     */
    this.registerCarouselsEvents = function () {
        var panoCarouselBody = $('.pano-carousel');
        var panoSelectorRooms = $('.pano-carousel__selector_rooms');

        panoSelectorRooms.on('click', function (e) {
            if (panoCarouselBody.hasClass('pano-carousel_hidden')) {
                panoCarouselBody.removeClass('pano-carousel_hidden');
            } else {
                panoCarouselBody.addClass('pano-carousel_hidden');
            }
        });

        Object.keys(this.carousels).forEach(function (key) {
            var floorKey = key.substring(6, key.length); // cut `floor-`

            this.carousels[key].carousel.on('mousewheel', '.owl-stage', function (e) {
                this.needUpdate = false;
                if (e.originalEvent.deltaY > 0) {
                    this.carousels[key].carousel.trigger('next.owl');
                } else {
                    this.carousels[key].carousel.trigger('prev.owl');
                }
                e.preventDefault();
            }.bind(this));

            this.carousels[key].carousel.on('changed.owl.carousel', function (event) {
                if (this.lastUpdateTime < Date.now() - this.updateDelay) {
                    if (this.needUpdate) {
                        var index = typeof(event.property.value) === 'number' ? event.property.value : 0;
                        var slides = this.carousels['floor-' + floorKey].carousel.find('.slider-element');
        
                        var filename = this.repairFilename($(slides[index]).attr('data-filename'));
                        
                        this
                            .setFloor(floorKey)
                            .setRoom(filename)
                            .fireUpdate();
                    } else {
                        this.needUpdate = true;
                    }
                }
            }.bind(this));

            var carouselItems = $('#owl-carousel-' + floorKey + ' .owl-item div');

            carouselItems.each(function (index, item) {
                var jqItem = $(item);
                jqItem.on('click', function (event) {
                    this.needUpdate = false;
                    this.carousels[key].carousel.trigger('to.owl.carousel', [index, 1000, true]);

                    var filename = this.repairFilename($(jqItem).attr('data-filename'));

                    this
                        .setFloor(floorKey)
                        .setRoom(filename)
                        .fireUpdate();
                }.bind(this));
            }.bind(this));

            this.carousels[key].items = carouselItems;
        }.bind(this));

        $('.floor-item').on('click', function (event) {
            if (this.lastUpdateTime < Date.now() - this.updateDelay) {
                var jqItem = $(event.currentTarget);

                this
                    .setFloor(jqItem.attr('data-floor'))
                    .fireUpdate();
            }
        }.bind(this));

        return this;
    }

    /**
     * @param  {string} filename
     * @returns {string} repaired filename
     */
    this.repairFilename = function (filename) {
        if (typeof(filename) === 'string') {
            return filename.replace('-_-', '.');
        } else {
            console.warn('Filename for repair need be a string!', filename);
        }
    }
};