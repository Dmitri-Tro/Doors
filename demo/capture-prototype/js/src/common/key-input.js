'use strict';

/** 
 * Class for centrally watch key input and fire events
 * @class
 */
const KeyInput = function () {
    this.events = new EventsSystem('Input');
    this.initialized = false;
    this.watched = false;
    
    this.keyCodes = {
        '8': 'BACKSPACE',
        '9': 'TAB',
        '13': 'ENTER',
        '16': 'SHIFT',
        '17': 'CTRL',
        '18': 'ALT',
        '19': 'PAUSE',
        '20': 'CAPS_LOCK',
        '27': 'ESCAPE',
        '32': 'SPACE',
        '33': 'PAGE_UP',
        '34': 'PAGE_DOWN',
        '35': 'END',
        '36': 'HOME',
        '37': 'LEFT_ARROW',
        '38': 'UP_ARROW',
        '39': 'RIGHT_ARROW',
        '40': 'DOWN_ARROW',
        '45': 'INSERT',
        '46': 'DELETE',
        '48': 'KEY_0',
        '49': 'KEY_1',
        '50': 'KEY_2',
        '51': 'KEY_3',
        '52': 'KEY_4',
        '53': 'KEY_5',
        '54': 'KEY_6',
        '55': 'KEY_7',
        '56': 'KEY_8',
        '57': 'KEY_9',
        '65': 'KEY_A',
        '66': 'KEY_B',
        '67': 'KEY_C',
        '68': 'KEY_D',
        '69': 'KEY_E',
        '70': 'KEY_F',
        '71': 'KEY_G',
        '72': 'KEY_H',
        '73': 'KEY_I',
        '74': 'KEY_J',
        '75': 'KEY_K',
        '76': 'KEY_L',
        '77': 'KEY_M',
        '78': 'KEY_N',
        '79': 'KEY_O',
        '80': 'KEY_P',
        '81': 'KEY_Q',
        '82': 'KEY_R',
        '83': 'KEY_S',
        '84': 'KEY_T',
        '85': 'KEY_U',
        '86': 'KEY_V',
        '87': 'KEY_W',
        '88': 'KEY_X',
        '89': 'KEY_Y',
        '90': 'KEY_Z',
        '91': 'LEFT_META',
        '92': 'RIGHT_META',
        '93': 'SELECT',
        '96': 'NUMPAD_0',
        '97': 'NUMPAD_1',
        '98': 'NUMPAD_2',
        '99': 'NUMPAD_3',
        '100': 'NUMPAD_4',
        '101': 'NUMPAD_5',
        '102': 'NUMPAD_6',
        '103': 'NUMPAD_7',
        '104': 'NUMPAD_8',
        '105': 'NUMPAD_9',
        '106': 'MULTIPLY',
        '107': 'ADD',
        '109': 'SUBTRACT',
        '110': 'DECIMAL',
        '111': 'DIVIDE',
        '112': 'F1',
        '113': 'F2',
        '114': 'F3',
        '115': 'F4',
        '116': 'F5',
        '117': 'F6',
        '118': 'F7',
        '119': 'F8',
        '120': 'F9',
        '121': 'F10',
        '122': 'F11',
        '123': 'F12',
        '144': 'NUM_LOCK',
        '145': 'SCROLL_LOCK',
        '186': 'SEMICOLON',
        '187': 'EQUALS',
        '188': 'COMMA',
        '189': 'DASH',
        '190': 'PERIOD',
        '191': 'FORWARD_SLASH',
        '192': 'GRAVE_ACCENT',
        '219': 'OPEN_BRACKET',
        '220': 'BACK_SLASH',
        '221': 'CLOSE_BRACKET',
        '222': 'SINGLE_QUOTE'
    };

    this.downed = {};
    
    /**
     * Register and enable watch events
     */
    this.watch = function () {
        this.watched = true;
        if (!this.initialized) {
            $(document).keyup(function (event) {
                if (this.watched) {
                    this.downed['_' + event.keyCode] = false;

                    var keyCode = this.keyCodes[event.keyCode] ? this.keyCodes[event.keyCode] : 'UNKNOWN_' + event.keyCode;

                    this.events.fire('UP_' + keyCode, {
                        state: 'UP',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });

                    this.events.fire(keyCode, {
                        state: 'UP',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });

                    this.events.fire('UP_ANY', {
                        state: 'UP',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });

                    this.events.fire('ANY', {
                        state: 'UP',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });
                }
            }.bind(this));

            $(document).keydown(function (event) {
                if (this.watched && !this.downed['_' + event.keyCode]) {
                    this.downed['_' + event.keyCode] = true; // prevent spam when button down 
    
                    var keyCode = this.keyCodes[event.keyCode] ? this.keyCodes[event.keyCode] : 'UNKNOWN_' + event.keyCode;

                    this.events.fire('DOWN_' + keyCode, {
                        state: 'DOWN',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });

                    this.events.fire(keyCode, {
                        state: 'DOWN',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });

                    this.events.fire('DOWN_ANY', {
                        state: 'DOWN',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });

                    this.events.fire('ANY', {
                        state: 'DOWN',
                        event: event,
                        key: keyCode,
                        alt: event.altKey,
                        ctrl: event.ctrlKey, 
                        shift: event.shiftKey
                    });
                }
            }.bind(this));

            this.initialized = true;
        }
    }
    
    /**
     * Disable watch events
     */
    this.unwatch = function () {
        this.watched = false;
    }
}