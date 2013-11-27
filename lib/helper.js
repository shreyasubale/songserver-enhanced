'use strict';
/* this extend fork*/

module.exports = (function () {
    var toString = Object.prototype.toString,
        hasOwn = Object.prototype.hasOwnProperty,
        class2type = {
            '[object Boolean]': 'boolean',
            '[object Number]': 'number',
            '[object String]': 'string',
            '[object Function]': 'function',
            '[object Array]': 'array',
            '[object Date]': 'date',
            '[object RegExp]': 'regexp',
            '[object Object]': 'object'
        };

    function _isPlainObject(obj) {
        if (!obj || _type(obj) !== 'object') {
            return false;
        }
        try {
            if (obj.constructor && !hasOwn.call(obj, 'constructor') && !hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')) {
                return false;
            }
        } catch (e) {
            return false;
        }
        var key;
        /* jshint noempty: false */
        for (key in obj) {
        }
        return key === undefined || hasOwn.call(obj, key);
    }

    function _type(obj) {
        /* jshint eqnull: true */
        return obj == null ? String(obj) : class2type[toString.call(obj)] || 'object';
    }


    return {
        type: _type,

        isNumeric: function (obj) {
            return !isNaN(parseFloat(obj)) && isFinite(obj);
        },

        isPlainObject: _isPlainObject,

        extend: function () {
            var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
                i = 1,
                length = arguments.length,
                extend = this.extend,
                deep = false;

            if (typeof target === 'boolean') {
                deep = target;
                target = arguments[1] || {};
                i = 2;
            }
            if (typeof target !== 'object' && typeof target !== 'function') {
                target = {};
            }
            if (length === i) {
                target = this;
                --i;
            }
            for (i; i < length; i++) {
                /* jshint eqnull: true */
                if ((options = arguments[i]) != null) {
                    for (name in options) {
                        src = target[name];
                        copy = options[name];
                        if (target === copy) {
                            continue;
                        }
                        if (deep && copy && (_isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
                            if (copyIsArray) {
                                copyIsArray = false;
                                clone = src && Array.isArray(src) ? src : [];
                            } else {
                                clone = src && _isPlainObject(src) ? src : {};
                            }
                            // WARNING: RECURSION
                            target[name] = extend(deep, clone, copy);
                        } else if (copy !== undefined) {
                            target[name] = copy;
                        }
                    }
                }
            }
            return target;
        }
    };

})();