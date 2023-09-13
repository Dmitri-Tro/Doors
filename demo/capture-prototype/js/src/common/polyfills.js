if (typeof Object.assign != 'function') {
    Object.assign = function(target, varArgs) { // .length of function is 2
        'use strict';
        if (target == null) { // TypeError if undefined or null
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];

            if (nextSource != null) { // Skip over if undefined or null
                for (var nextKey in nextSource) {
                    // Avoid bugs when hasOwnProperty is shadowed
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

Math.sign = Math.sign || function(x) {
    x = +x;
    if (x === 0 || isNaN(x)) {
        return x;
    }
    return x > 0 ? 1 : -1;
}

Math.hypot = Math.hypot || function() {
    var y = 0, i = arguments.length;
    while (i--) y += arguments[i] * arguments[i];
    return Math.sqrt(y);
};

// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
        value: function(searchElement, fromIndex) {

            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            // 1. Let O be ? ToObject(this value).
            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ≥ 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return true.
                if (sameValueZero(o[k], searchElement)) {
                    return true;
                }
                // c. Increase k by 1. 
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}

(function(global) {
    /**
     * Polyfill URLSearchParams
     *
     * Inspired from : https://github.com/WebReflection/url-search-params/blob/master/src/url-search-params.js
     */

    var checkIfIteratorIsSupported = function() {
        try {
            return !!Symbol.iterator;
        } catch(error) {
            return false;
        }
    };


    var iteratorSupported = checkIfIteratorIsSupported();

    var createIterator = function(items) {
        var iterator = {
            next: function() {
                var value = items.shift();
                return { done: value === void 0, value: value };
            }
        };

        if(iteratorSupported) {
            iterator[Symbol.iterator] = function() {
                return iterator;
            };
        }

        return iterator;
    };

    /**
     * Search param name and values should be encoded according to https://url.spec.whatwg.org/#urlencoded-serializing
     * encodeURIComponent() produces the same result except encoding spaces as `%20` instead of `+`.
     */
    var serializeParam = function(value) {
        return encodeURIComponent(value).replace(/%20/g, '+');
    };

    var deserializeParam = function(value) {
        return decodeURIComponent(value).replace(/\+/g, ' ');
    };

    var polyfillURLSearchParams= function() {

        var URLSearchParams = function(searchString) {
            Object.defineProperty(this, '_entries', { value: {} });

            if(typeof searchString === 'string') {
                if(searchString !== '') {
                    searchString = searchString.replace(/^\?/, '');
                    var attributes = searchString.split('&');
                    var attribute;
                    for(var i = 0; i < attributes.length; i++) {
                        attribute = attributes[i].split('=');
                        this.append(
                            deserializeParam(attribute[0]),
                            (attribute.length > 1) ? deserializeParam(attribute[1]) : ''
                        );
                    }
                }
            } else if(searchString instanceof URLSearchParams) {
                var _this = this;
                searchString.forEach(function(value, name) {
                    _this.append(value, name);
                });
            }
        };

        var proto = URLSearchParams.prototype;

        proto.append = function(name, value) {
            if(name in this._entries) {
                this._entries[name].push(value.toString());
            } else {
                this._entries[name] = [value.toString()];
            }
        };

        proto.delete = function(name) {
            delete this._entries[name];
        };

        proto.get = function(name) {
            return (name in this._entries) ? this._entries[name][0] : null;
        };

        proto.getAll = function(name) {
            return (name in this._entries) ? this._entries[name].slice(0) : [];
        };

        proto.has = function(name) {
            return (name in this._entries);
        };

        proto.set = function(name, value) {
            this._entries[name] = [value.toString()];
        };

        proto.forEach = function(callback, thisArg) {
            var entries;
            for(var name in this._entries) {
                if(this._entries.hasOwnProperty(name)) {
                    entries = this._entries[name];
                    for(var i = 0; i < entries.length; i++) {
                        callback.call(thisArg, entries[i], name, this);
                    }
                }
            }
        };

        proto.keys = function() {
            var items = [];
            this.forEach(function(value, name) { items.push(name); });
            return createIterator(items);
        };

        proto.values = function() {
            var items = [];
            this.forEach(function(value) { items.push(value); });
            return createIterator(items);
        };

        proto.entries = function() {
            var items = [];
            this.forEach(function(value, name) { items.push([name, value]); });
            return createIterator(items);
        };

        if(iteratorSupported) {
            proto[Symbol.iterator] = proto.entries;
        }

        proto.toString = function() {
            var searchString = '';
            this.forEach(function(value, name) {
                if(searchString.length > 0) searchString+= '&';
                searchString += serializeParam(name) + '=' + serializeParam(value);
            });
            return searchString;
        };

        global.URLSearchParams = URLSearchParams;
    };

    if(!('URLSearchParams' in global) || (new URLSearchParams('?a=1').toString() !== 'a=1')) {
        polyfillURLSearchParams();
    }

    // HTMLAnchorElement

})(
    (typeof global !== 'undefined') ? global
        : ((typeof window !== 'undefined') ? window
        : ((typeof self !== 'undefined') ? self : this))
);

(function(global) {
    /**
     * Polyfill URL
     *
     * Inspired from : https://github.com/arv/DOM-URL-Polyfill/blob/master/src/url.js
     */

    var checkIfURLIsSupported = function() {
        try {
            var u = new URL('b', 'http://a');
            u.pathname = 'c%20d';
            return (u.href === 'http://a/c%20d') && u.searchParams;
        } catch(e) {
            return false;
        }
    };


    var polyfillURL = function() {
        var _URL = global.URL;

        var URL = function(url, base) {
            if(typeof url !== 'string') url = String(url);

            var doc = document.implementation.createHTMLDocument('');
            window.doc = doc;
            if(base) {
                var baseElement = doc.createElement('base');
                baseElement.href = base;
                doc.head.appendChild(baseElement);
            }

            var anchorElement = doc.createElement('a');
            anchorElement.href = url;
            doc.body.appendChild(anchorElement);
            anchorElement.href = anchorElement.href; // force href to refresh

            if(anchorElement.protocol === ':' || !/:/.test(anchorElement.href)) {
                throw new TypeError('Invalid URL');
            }

            Object.defineProperty(this, '_anchorElement', {
                value: anchorElement
            });
        };

        var proto = URL.prototype;

        var linkURLWithAnchorAttribute = function(attributeName) {
            Object.defineProperty(proto, attributeName, {
                get: function() {
                    return this._anchorElement[attributeName];
                },
                set: function(value) {
                    this._anchorElement[attributeName] = value;
                },
                enumerable: true
            });
        };

        ['hash', 'host', 'hostname', 'port', 'protocol', 'search']
        .forEach(function(attributeName) {
            linkURLWithAnchorAttribute(attributeName);
        });

        Object.defineProperties(proto, {

            'toString': {
                get: function() {
                    var _this = this;
                    return function() {
                        return _this.href;
                    };
                }
            },

            'href' : {
                get: function() {
                    return this._anchorElement.href.replace(/\?$/,'');
                },
                set: function(value) {
                    this._anchorElement.href = value;
                },
                enumerable: true
            },

            'pathname' : {
                get: function() {
                    return this._anchorElement.pathname.replace(/(^\/?)/,'/');
                },
                set: function(value) {
                    this._anchorElement.pathname = value;
                },
                enumerable: true
            },

            'origin': {
                get: function() {
                    // get expected port from protocol
                    var expectedPort = {'http:': 80, 'https:': 443, 'ftp:': 21}[this._anchorElement.protocol];
                    // add port to origin if, expected port is different than actual port
                    // and it is not empty f.e http://foo:8080
                    // 8080 != 80 && 8080 != ''
                    var addPortToOrigin = this._anchorElement.port != expectedPort &&
                        this._anchorElement.port !== ''

                    return this._anchorElement.protocol +
                        '//' +
                        this._anchorElement.hostname +
                        (addPortToOrigin ? (':' + this._anchorElement.port) : '');
                },
                enumerable: true
            },

            'password': { // TODO
                get: function() {
                    return '';
                },
                set: function(value) {
                },
                enumerable: true
            },

            'username': { // TODO
                get: function() {
                    return '';
                },
                set: function(value) {
                },
                enumerable: true
            },

            'searchParams': {
                get: function() {
                    var searchParams = new URLSearchParams(this.search);
                    var _this = this;
                    ['append', 'delete', 'set'].forEach(function(methodName) {
                        var method = searchParams[methodName];
                        searchParams[methodName] = function() {
                            method.apply(searchParams, arguments);
                            _this.search = searchParams.toString();
                        };
                    });
                    return searchParams;
                },
                enumerable: true
            }
        });

        URL.createObjectURL = function(blob) {
            return _URL.createObjectURL.apply(_URL, arguments);
        };

        URL.revokeObjectURL = function(url) {
            return _URL.revokeObjectURL.apply(_URL, arguments);
        };

        global.URL = URL;

    };

    if(!checkIfURLIsSupported()) {
        polyfillURL();
    }

    if((global.location !== void 0) && !('origin' in global.location)) {
        var getOrigin = function() {
            return global.location.protocol + '//' + global.location.hostname + (global.location.port ? (':' + global.location.port) : '');
        };

        try {
            Object.defineProperty(global.location, 'origin', {
                get: getOrigin,
                enumerable: true
            });
        } catch(e) {
            setInterval(function() {
                global.location.origin = getOrigin();
            }, 100);
        }
    }

})(
    (typeof global !== 'undefined') ? global
        : ((typeof window !== 'undefined') ? window
        : ((typeof self !== 'undefined') ? self : this))
);

if (!Int8Array.__proto__.from) {
    (function () {
        Int8Array.__proto__.from = function (obj, func, thisObj) {

            var typedArrayClass = Int8Array.__proto__;
            if(typeof this !== 'function') {
                throw new TypeError('# is not a constructor');
            }
            if (this.__proto__ !== typedArrayClass) {
                throw new TypeError('this is not a typed array.');
            }

            func = func || function (elem) {
                return elem;
            };

            if (typeof func !== 'function') {
                throw new TypeError('specified argument is not a function');
            }

            obj = Object(obj);
            if (!obj['length']) {
                return new this(0);
            }
            var copy_data = [];
            for(var i = 0; i < obj.length; i++) {
                copy_data.push(obj[i]);
            }

            copy_data = copy_data.map(func, thisObj);

            var typed_array = new this(copy_data.length);
            for(var i = 0; i < typed_array.length; i++) {
                typed_array[i] = copy_data[i];
            }
            return typed_array;
        }
    })();
}

if (!("outerHTML" in SVGElement.prototype)) {
    Object.defineProperty(SVGElement.prototype, 'outerHTML', {
        get: function () {
            var $node, $temp;
            $temp = document.createElement('div');
            $node = this.cloneNode(true);
            $temp.appendChild($node);
            return $temp.innerHTML;
        },
        enumerable: false,
        configurable: true
    });
}

function isIE() {
    var ua = window.navigator.userAgent;

    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        // IE 10 or older => return version number
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');
    if (edge > 0) {
        // Edge (IE 12+) => return version number
        return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }

    // other browser
    return false;
}