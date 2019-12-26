(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.TogCollector = factory());
}(this, (function () { 'use strict';

    var has = Object.prototype.hasOwnProperty;
    var isArray = Array.isArray;

    var hexTable = (function () {
        var array = [];
        for (var i = 0; i < 256; ++i) {
            array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
        }

        return array;
    }());

    var compactQueue = function compactQueue(queue) {
        while (queue.length > 1) {
            var item = queue.pop();
            var obj = item.obj[item.prop];

            if (isArray(obj)) {
                var compacted = [];

                for (var j = 0; j < obj.length; ++j) {
                    if (typeof obj[j] !== 'undefined') {
                        compacted.push(obj[j]);
                    }
                }

                item.obj[item.prop] = compacted;
            }
        }
    };

    var arrayToObject = function arrayToObject(source, options) {
        var obj = options && options.plainObjects ? Object.create(null) : {};
        for (var i = 0; i < source.length; ++i) {
            if (typeof source[i] !== 'undefined') {
                obj[i] = source[i];
            }
        }

        return obj;
    };

    var merge = function merge(target, source, options) {
        /* eslint no-param-reassign: 0 */
        if (!source) {
            return target;
        }

        if (typeof source !== 'object') {
            if (isArray(target)) {
                target.push(source);
            } else if (target && typeof target === 'object') {
                if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                    target[source] = true;
                }
            } else {
                return [target, source];
            }

            return target;
        }

        if (!target || typeof target !== 'object') {
            return [target].concat(source);
        }

        var mergeTarget = target;
        if (isArray(target) && !isArray(source)) {
            mergeTarget = arrayToObject(target, options);
        }

        if (isArray(target) && isArray(source)) {
            source.forEach(function (item, i) {
                if (has.call(target, i)) {
                    var targetItem = target[i];
                    if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                        target[i] = merge(targetItem, item, options);
                    } else {
                        target.push(item);
                    }
                } else {
                    target[i] = item;
                }
            });
            return target;
        }

        return Object.keys(source).reduce(function (acc, key) {
            var value = source[key];

            if (has.call(acc, key)) {
                acc[key] = merge(acc[key], value, options);
            } else {
                acc[key] = value;
            }
            return acc;
        }, mergeTarget);
    };

    var assign = function assignSingleSource(target, source) {
        return Object.keys(source).reduce(function (acc, key) {
            acc[key] = source[key];
            return acc;
        }, target);
    };

    var decode = function (str, decoder, charset) {
        var strWithoutPlus = str.replace(/\+/g, ' ');
        if (charset === 'iso-8859-1') {
            // unescape never throws, no try...catch needed:
            return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
        }
        // utf-8
        try {
            return decodeURIComponent(strWithoutPlus);
        } catch (e) {
            return strWithoutPlus;
        }
    };

    var encode = function encode(str, defaultEncoder, charset) {
        // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
        // It has been adapted here for stricter adherence to RFC 3986
        if (str.length === 0) {
            return str;
        }

        var string = str;
        if (typeof str === 'symbol') {
            string = Symbol.prototype.toString.call(str);
        } else if (typeof str !== 'string') {
            string = String(str);
        }

        if (charset === 'iso-8859-1') {
            return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
                return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
            });
        }

        var out = '';
        for (var i = 0; i < string.length; ++i) {
            var c = string.charCodeAt(i);

            if (
                c === 0x2D // -
                || c === 0x2E // .
                || c === 0x5F // _
                || c === 0x7E // ~
                || (c >= 0x30 && c <= 0x39) // 0-9
                || (c >= 0x41 && c <= 0x5A) // a-z
                || (c >= 0x61 && c <= 0x7A) // A-Z
            ) {
                out += string.charAt(i);
                continue;
            }

            if (c < 0x80) {
                out = out + hexTable[c];
                continue;
            }

            if (c < 0x800) {
                out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
                continue;
            }

            if (c < 0xD800 || c >= 0xE000) {
                out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
                continue;
            }

            i += 1;
            c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
            out += hexTable[0xF0 | (c >> 18)]
                + hexTable[0x80 | ((c >> 12) & 0x3F)]
                + hexTable[0x80 | ((c >> 6) & 0x3F)]
                + hexTable[0x80 | (c & 0x3F)];
        }

        return out;
    };

    var compact = function compact(value) {
        var queue = [{ obj: { o: value }, prop: 'o' }];
        var refs = [];

        for (var i = 0; i < queue.length; ++i) {
            var item = queue[i];
            var obj = item.obj[item.prop];

            var keys = Object.keys(obj);
            for (var j = 0; j < keys.length; ++j) {
                var key = keys[j];
                var val = obj[key];
                if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                    queue.push({ obj: obj, prop: key });
                    refs.push(val);
                }
            }
        }

        compactQueue(queue);

        return value;
    };

    var isRegExp = function isRegExp(obj) {
        return Object.prototype.toString.call(obj) === '[object RegExp]';
    };

    var isBuffer = function isBuffer(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
    };

    var combine = function combine(a, b) {
        return [].concat(a, b);
    };

    var utils = {
        arrayToObject: arrayToObject,
        assign: assign,
        combine: combine,
        compact: compact,
        decode: decode,
        encode: encode,
        isBuffer: isBuffer,
        isRegExp: isRegExp,
        merge: merge
    };

    var replace = String.prototype.replace;
    var percentTwenties = /%20/g;



    var Format = {
        RFC1738: 'RFC1738',
        RFC3986: 'RFC3986'
    };

    var formats = utils.assign(
        {
            'default': Format.RFC3986,
            formatters: {
                RFC1738: function (value) {
                    return replace.call(value, percentTwenties, '+');
                },
                RFC3986: function (value) {
                    return String(value);
                }
            }
        },
        Format
    );

    var has$1 = Object.prototype.hasOwnProperty;

    var arrayPrefixGenerators = {
        brackets: function brackets(prefix) {
            return prefix + '[]';
        },
        comma: 'comma',
        indices: function indices(prefix, key) {
            return prefix + '[' + key + ']';
        },
        repeat: function repeat(prefix) {
            return prefix;
        }
    };

    var isArray$1 = Array.isArray;
    var push = Array.prototype.push;
    var pushToArray = function (arr, valueOrArray) {
        push.apply(arr, isArray$1(valueOrArray) ? valueOrArray : [valueOrArray]);
    };

    var toISO = Date.prototype.toISOString;

    var defaultFormat = formats['default'];
    var defaults = {
        addQueryPrefix: false,
        allowDots: false,
        charset: 'utf-8',
        charsetSentinel: false,
        delimiter: '&',
        encode: true,
        encoder: utils.encode,
        encodeValuesOnly: false,
        format: defaultFormat,
        formatter: formats.formatters[defaultFormat],
        // deprecated
        indices: false,
        serializeDate: function serializeDate(date) {
            return toISO.call(date);
        },
        skipNulls: false,
        strictNullHandling: false
    };

    var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
        return typeof v === 'string'
            || typeof v === 'number'
            || typeof v === 'boolean'
            || typeof v === 'symbol'
            || typeof v === 'bigint';
    };

    var stringify = function stringify(
        object,
        prefix,
        generateArrayPrefix,
        strictNullHandling,
        skipNulls,
        encoder,
        filter,
        sort,
        allowDots,
        serializeDate,
        formatter,
        encodeValuesOnly,
        charset
    ) {
        var obj = object;
        if (typeof filter === 'function') {
            obj = filter(prefix, obj);
        } else if (obj instanceof Date) {
            obj = serializeDate(obj);
        } else if (generateArrayPrefix === 'comma' && isArray$1(obj)) {
            obj = obj.join(',');
        }

        if (obj === null) {
            if (strictNullHandling) {
                return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key') : prefix;
            }

            obj = '';
        }

        if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
            if (encoder) {
                var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key');
                return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value'))];
            }
            return [formatter(prefix) + '=' + formatter(String(obj))];
        }

        var values = [];

        if (typeof obj === 'undefined') {
            return values;
        }

        var objKeys;
        if (isArray$1(filter)) {
            objKeys = filter;
        } else {
            var keys = Object.keys(obj);
            objKeys = sort ? keys.sort(sort) : keys;
        }

        for (var i = 0; i < objKeys.length; ++i) {
            var key = objKeys[i];

            if (skipNulls && obj[key] === null) {
                continue;
            }

            if (isArray$1(obj)) {
                pushToArray(values, stringify(
                    obj[key],
                    typeof generateArrayPrefix === 'function' ? generateArrayPrefix(prefix, key) : prefix,
                    generateArrayPrefix,
                    strictNullHandling,
                    skipNulls,
                    encoder,
                    filter,
                    sort,
                    allowDots,
                    serializeDate,
                    formatter,
                    encodeValuesOnly,
                    charset
                ));
            } else {
                pushToArray(values, stringify(
                    obj[key],
                    prefix + (allowDots ? '.' + key : '[' + key + ']'),
                    generateArrayPrefix,
                    strictNullHandling,
                    skipNulls,
                    encoder,
                    filter,
                    sort,
                    allowDots,
                    serializeDate,
                    formatter,
                    encodeValuesOnly,
                    charset
                ));
            }
        }

        return values;
    };

    var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
        if (!opts) {
            return defaults;
        }

        if (opts.encoder !== null && opts.encoder !== undefined && typeof opts.encoder !== 'function') {
            throw new TypeError('Encoder has to be a function.');
        }

        var charset = opts.charset || defaults.charset;
        if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
            throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
        }

        var format = formats['default'];
        if (typeof opts.format !== 'undefined') {
            if (!has$1.call(formats.formatters, opts.format)) {
                throw new TypeError('Unknown format option provided.');
            }
            format = opts.format;
        }
        var formatter = formats.formatters[format];

        var filter = defaults.filter;
        if (typeof opts.filter === 'function' || isArray$1(opts.filter)) {
            filter = opts.filter;
        }

        return {
            addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
            allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
            charset: charset,
            charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
            delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
            encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
            encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
            encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
            filter: filter,
            formatter: formatter,
            serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
            skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
            sort: typeof opts.sort === 'function' ? opts.sort : null,
            strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
        };
    };

    var stringify_1 = function (object, opts) {
        var obj = object;
        var options = normalizeStringifyOptions(opts);

        var objKeys;
        var filter;

        if (typeof options.filter === 'function') {
            filter = options.filter;
            obj = filter('', obj);
        } else if (isArray$1(options.filter)) {
            filter = options.filter;
            objKeys = filter;
        }

        var keys = [];

        if (typeof obj !== 'object' || obj === null) {
            return '';
        }

        var arrayFormat;
        if (opts && opts.arrayFormat in arrayPrefixGenerators) {
            arrayFormat = opts.arrayFormat;
        } else if (opts && 'indices' in opts) {
            arrayFormat = opts.indices ? 'indices' : 'repeat';
        } else {
            arrayFormat = 'indices';
        }

        var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

        if (!objKeys) {
            objKeys = Object.keys(obj);
        }

        if (options.sort) {
            objKeys.sort(options.sort);
        }

        for (var i = 0; i < objKeys.length; ++i) {
            var key = objKeys[i];

            if (options.skipNulls && obj[key] === null) {
                continue;
            }
            pushToArray(keys, stringify(
                obj[key],
                key,
                generateArrayPrefix,
                options.strictNullHandling,
                options.skipNulls,
                options.encode ? options.encoder : null,
                options.filter,
                options.sort,
                options.allowDots,
                options.serializeDate,
                options.formatter,
                options.encodeValuesOnly,
                options.charset
            ));
        }

        var joined = keys.join(options.delimiter);
        var prefix = options.addQueryPrefix === true ? '?' : '';

        if (options.charsetSentinel) {
            if (options.charset === 'iso-8859-1') {
                // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
                prefix += 'utf8=%26%2310003%3B&';
            } else {
                // encodeURIComponent('✓')
                prefix += 'utf8=%E2%9C%93&';
            }
        }

        return joined.length > 0 ? prefix + joined : '';
    };

    var has$2 = Object.prototype.hasOwnProperty;
    var isArray$2 = Array.isArray;

    var defaults$1 = {
        allowDots: false,
        allowPrototypes: false,
        arrayLimit: 20,
        charset: 'utf-8',
        charsetSentinel: false,
        comma: false,
        decoder: utils.decode,
        delimiter: '&',
        depth: 5,
        ignoreQueryPrefix: false,
        interpretNumericEntities: false,
        parameterLimit: 1000,
        parseArrays: true,
        plainObjects: false,
        strictNullHandling: false
    };

    var interpretNumericEntities = function (str) {
        return str.replace(/&#(\d+);/g, function ($0, numberStr) {
            return String.fromCharCode(parseInt(numberStr, 10));
        });
    };

    // This is what browsers will submit when the ✓ character occurs in an
    // application/x-www-form-urlencoded body and the encoding of the page containing
    // the form is iso-8859-1, or when the submitted form has an accept-charset
    // attribute of iso-8859-1. Presumably also with other charsets that do not contain
    // the ✓ character, such as us-ascii.
    var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

    // These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
    var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

    var parseValues = function parseQueryStringValues(str, options) {
        var obj = {};
        var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
        var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
        var parts = cleanStr.split(options.delimiter, limit);
        var skipIndex = -1; // Keep track of where the utf8 sentinel was found
        var i;

        var charset = options.charset;
        if (options.charsetSentinel) {
            for (i = 0; i < parts.length; ++i) {
                if (parts[i].indexOf('utf8=') === 0) {
                    if (parts[i] === charsetSentinel) {
                        charset = 'utf-8';
                    } else if (parts[i] === isoSentinel) {
                        charset = 'iso-8859-1';
                    }
                    skipIndex = i;
                    i = parts.length; // The eslint settings do not allow break;
                }
            }
        }

        for (i = 0; i < parts.length; ++i) {
            if (i === skipIndex) {
                continue;
            }
            var part = parts[i];

            var bracketEqualsPos = part.indexOf(']=');
            var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

            var key, val;
            if (pos === -1) {
                key = options.decoder(part, defaults$1.decoder, charset, 'key');
                val = options.strictNullHandling ? null : '';
            } else {
                key = options.decoder(part.slice(0, pos), defaults$1.decoder, charset, 'key');
                val = options.decoder(part.slice(pos + 1), defaults$1.decoder, charset, 'value');
            }

            if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
                val = interpretNumericEntities(val);
            }

            if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
                val = val.split(',');
            }

            if (part.indexOf('[]=') > -1) {
                val = isArray$2(val) ? [val] : val;
            }

            if (has$2.call(obj, key)) {
                obj[key] = utils.combine(obj[key], val);
            } else {
                obj[key] = val;
            }
        }

        return obj;
    };

    var parseObject = function (chain, val, options) {
        var leaf = val;

        for (var i = chain.length - 1; i >= 0; --i) {
            var obj;
            var root = chain[i];

            if (root === '[]' && options.parseArrays) {
                obj = [].concat(leaf);
            } else {
                obj = options.plainObjects ? Object.create(null) : {};
                var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
                var index = parseInt(cleanRoot, 10);
                if (!options.parseArrays && cleanRoot === '') {
                    obj = { 0: leaf };
                } else if (
                    !isNaN(index)
                    && root !== cleanRoot
                    && String(index) === cleanRoot
                    && index >= 0
                    && (options.parseArrays && index <= options.arrayLimit)
                ) {
                    obj = [];
                    obj[index] = leaf;
                } else {
                    obj[cleanRoot] = leaf;
                }
            }

            leaf = obj;
        }

        return leaf;
    };

    var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
        if (!givenKey) {
            return;
        }

        // Transform dot notation to bracket notation
        var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

        // The regex chunks

        var brackets = /(\[[^[\]]*])/;
        var child = /(\[[^[\]]*])/g;

        // Get the parent

        var segment = options.depth > 0 && brackets.exec(key);
        var parent = segment ? key.slice(0, segment.index) : key;

        // Stash the parent if it exists

        var keys = [];
        if (parent) {
            // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
            if (!options.plainObjects && has$2.call(Object.prototype, parent)) {
                if (!options.allowPrototypes) {
                    return;
                }
            }

            keys.push(parent);
        }

        // Loop through children appending to the array until we hit depth

        var i = 0;
        while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
            i += 1;
            if (!options.plainObjects && has$2.call(Object.prototype, segment[1].slice(1, -1))) {
                if (!options.allowPrototypes) {
                    return;
                }
            }
            keys.push(segment[1]);
        }

        // If there's a remainder, just add whatever is left

        if (segment) {
            keys.push('[' + key.slice(segment.index) + ']');
        }

        return parseObject(keys, val, options);
    };

    var normalizeParseOptions = function normalizeParseOptions(opts) {
        if (!opts) {
            return defaults$1;
        }

        if (opts.decoder !== null && opts.decoder !== undefined && typeof opts.decoder !== 'function') {
            throw new TypeError('Decoder has to be a function.');
        }

        if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
            throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
        }
        var charset = typeof opts.charset === 'undefined' ? defaults$1.charset : opts.charset;

        return {
            allowDots: typeof opts.allowDots === 'undefined' ? defaults$1.allowDots : !!opts.allowDots,
            allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults$1.allowPrototypes,
            arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults$1.arrayLimit,
            charset: charset,
            charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults$1.charsetSentinel,
            comma: typeof opts.comma === 'boolean' ? opts.comma : defaults$1.comma,
            decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults$1.decoder,
            delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults$1.delimiter,
            // eslint-disable-next-line no-implicit-coercion, no-extra-parens
            depth: (typeof opts.depth === 'number' || opts.depth === false) ? +opts.depth : defaults$1.depth,
            ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
            interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults$1.interpretNumericEntities,
            parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults$1.parameterLimit,
            parseArrays: opts.parseArrays !== false,
            plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults$1.plainObjects,
            strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults$1.strictNullHandling
        };
    };

    var parse = function (str, opts) {
        var options = normalizeParseOptions(opts);

        if (str === '' || str === null || typeof str === 'undefined') {
            return options.plainObjects ? Object.create(null) : {};
        }

        var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
        var obj = options.plainObjects ? Object.create(null) : {};

        // Iterate over the keys and setup the new object

        var keys = Object.keys(tempObj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var newObj = parseKeys(key, tempObj[key], options);
            obj = utils.merge(obj, newObj, options);
        }

        return utils.compact(obj);
    };

    var lib = {
        formats: formats,
        parse: parse,
        stringify: stringify_1
    };

    /**
    * 计算字符串多少字节
    * @params: charset: 编码格式utf-8 utf-16， str: 字符串
    * 高版本浏览器textEncoder(str, charset)替代
    * */
    const sizeOfStr = function (str, charset) {
      let total = 0,
          charCode,
          i,
          len;
      charset = charset ? charset.toLowerCase() : '';

      if (charset === 'utf-16' || charset === 'utf16') {
        for (i = 0, len = str.length; i < len; i++) {
          charCode = str.charCodeAt(i);

          if (charCode <= 0xffff) {
            total += 2;
          } else {
            total += 4;
          }
        }
      } else {
        for (i = 0, len = str.length; i < len; i++) {
          charCode = str.charCodeAt(i);

          if (charCode <= 0x007f) {
            total += 1;
          } else if (charCode <= 0x07ff) {
            total += 2;
          } else if (charCode <= 0xffff) {
            total += 3;
          } else {
            total += 4;
          }
        }
      }

      return total;
    };
    /**
    * 判断是否是ie浏览器
    * */

    const isIE = function () {
      if (!!window.ActiveXObject || "ActiveXObject" in window) {
        return true;
      } else {
        return false;
      }
    };
    /**
    * 判断是否是移动设备
    * */

    const isMobile = function () {
      return /Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent);
    };
    /**
    * 重写localstorage的方法
    * 便于监听
    * @params name:方法名字， alias：别名
    * */

    const rwlc = function (name, alias) {
      const orig = window.localStorage[name];
      return function (key, value) {
        const rv = orig.apply(this, arguments);
        const e = new Event(alias);
        e.key = key;
        window.dispatchEvent(e);
        return rv;
      };
    };
    /**
    * 重写sessionstorage的方法
    * @params name:方法名字， alias：别名
    * */

    const rwsc = function (name, alias) {
      const orig = window.sessionStorage[name];
      return function (key, value) {
        const rv = orig.apply(this, arguments);
        const e = new Event(alias);
        e.key = key;
        window.dispatchEvent(e);
        return rv;
      };
    };
    /**
    * 重写history的方法
    * @params name: 方法名
    * */

    const rwhs = function (name) {
      const orig = window.history[name];
      return function () {
        const rv = orig.apply(this, arguments);
        const e = new Event(name.toLowerCase());
        e.arguments = arguments;
        window.dispatchEvent(e);
        return rv;
      };
    };
    /**
    * 重写console方法
    * @params: name: 重写的方法名， alias: 别名
    * */

    const rwConsole = function (name, alias) {
      const orig = window.console[name];
      return function () {
        const rv = orig.apply(this, arguments);
        const e = new Event(alias);
        e.arguments = arguments;
        window.dispatchEvent(e);
        return rv;
      };
    };
    /**
    * 防抖 延迟执行
    * @params func: 待执行方法，wait: 等待时间
    * */

    const debounce = function (func, wait) {
      let timeout;
      return function () {
        const context = this;
        const args = arguments;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    };
    /**
    *截流
    * */

    const throttle = function (fn, delay) {
      let prevTime = Date.now();
      return function () {
        const curTime = Date.now();

        if (curTime - prevTime > delay) {
          fn.apply(this, arguments);
          prevTime = curTime;
        }
      };
    };
    /**
    * 获取滚动高度
    * */

    const getScrollTop = function () {
      if (!window || !document.documentElement || !document.body) {
        return 0;
      }

      return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    /**
    * 默认收集的东西 clickEvents errors;
    * */

    class TogCollector_p {
      constructor(option) {
        const {
          data,
          config
        } = option; // 默认配置

        const defaultConfig = {
          url: 'http://127.0.0.1:8888',
          // todo
          timeInterval: 60000,
          // ms
          dataSize: 104076,
          // 尽量不要大(b) ie8 浏览器get限制
          transformRequest: null,
          // function
          clickCallback: null,
          // fn 收集的点击事件的回调逻辑 promise
          isSingePage: true // 是否是单页应用 自己设置收集页面信息的临界点 emit('pageStartCollect') emit('pageEndCollect')

        };
        this.defaultData = {
          userInfo: null,
          // 用户信息
          device: null,
          // 设备信息
          pageInfo: {
            performance: null,
            // 性能指标
            currentUrl: '',
            // 当前页面地址
            stayPageTime: '',
            // 页面停留时间 ms
            targetUrl: '',
            // 跳转目标页
            scrollTop: getScrollTop() //滚动位置

          }
        }; //非实时收集数据 非实时数据

        this.data = {
          constant: this.defaultData,
          ...data
        };
        this.config = { ...defaultConfig,
          ...config
        };

        this._timeInterval();
      }
      /**
       * 设置配置
       * */


      setConfig(config) {
        this.config = { ...this.config,
          ...config
        };
      }
      /**
       * 查看配置
       * */


      getConfig() {
        return this.config;
      }
      /**
       * 设置统计结果 实时数据
       * */


      setData(data) {
        this.data = { ...this.data,
          ...data
        };
      }
      /**
       * 设置统计数据，非实时数据
       * */


      setDefaultData(data) {
        this.data.constant = { ...this.data.constant,
          ...data
        };
      }
      /**
       * 获取统计结果
       * */


      getData() {
        return this.data;
      }
      /**
       * 数据量是否超出限制
       * */


      _isExcMaxSize(data) {
        const {
          dataSize
        } = this.config;

        let _dataSize = parseInt(dataSize);

        const _data = JSON.stringify(data);

        return sizeOfStr(_data) > _dataSize;
      }
      /**
       * 发送数据通过图片（频繁修改src可能拥挤）待测
       * */


      _sendDataByImg(url, data) {
        if (!this.xhrImg) {
          this.xhrImg = new Image();
        }

        this.xhrImg.src = `${url}?${data}&time=${new Date().getTime()}`;
      }
      /**
       * 发送收集结果
       * */


      sendCollectData(params) {
        const {
          config,
          data
        } = this;
        const {
          url,
          transformRequest
        } = config;
        let _data = { ...data.constant,
          ...data,
          ...params
        };

        if (!this._isExcMaxSize(_data)) {
          delete _data.constant;
          console.log(_data);
          _data = transformRequest ? lib.stringify(transformRequest(_data)) : lib.stringify(_data);

          if (isIE()) {
            this._sendDataByImg(url, _data); //get

          } else {
            navigator.sendBeacon(url, _data); //post 返会的是bool，true发送成功
          }
        } else {
          this.data = {
            constant: this.data.constant
          }; //初始化成默认数据
        }
      }
      /**
       * 轮循发送
       * */


      _timeInterval() {
        const {
          timeInterval
        } = this.config;
        setInterval(() => {
          this.sendCollectData();
        }, timeInterval);
      }

    }

    /**
    * 事件处理器
    * */
    class EventEmitter {
      constructor() {
        this._events = Object.create(null);
      } // 添加事件监听


      addListener(type, listener, prepend) {
        if (!this._events) {
          this._events = Object.create(null);
        }

        if (this._events[type]) {
          // 添加到数组最前面
          if (prepend) {
            this._events[type].unshift(listener);
          } else {
            this._events[type].push(listener);
          }
        } else {
          this._events[type] = [listener];
        }
      } // 移除事件监听


      removeListener(type, listener) {
        if (Array.isArray(this._events[type])) {
          if (!listener) {
            delete this._events[type];
          } else {
            this._events[type] = this._events[type].filter(e => e !== listener && e.origin !== listener);
          }
        }
      } // 执行一次的事件


      once(type, listener) {
        const only = (...args) => {
          listener.apply(this, args);
          this.removeListener(type, listener);
        };

        only.origin = listener;
        this.addListener(type, only);
      } // 执行事件


      emit(type, ...args) {
        if (Array.isArray(this._events[type])) {
          this._events[type].forEach(fn => {
            fn.apply(this, args);
          });
        }
      }

    }

    /**
    * 收集页面信息
    * 1.当前页面的url
    * 2.页面停留的时间 (单页面可以利用onEnter,onLeave钩子)
    * 3.页面视口
    * */

    const collectPage = {
      /**
      * 初始化
      * */
      init(option) {
        const {
          eventEmitter,
          isSingePage,
          pageInfo
        } = option;
        this.handler = eventEmitter;
        this.isSingePage = isSingePage;
        this.enterPageTime = 0; // 打开页面时间

        this.pageInfo = pageInfo;

        this._initListener();

        this._rwPageJump();

        this._registerEnterPage();

        this._registerLeavePage();
      },

      /**
      * 重写页面跳转
      * */
      _rwPageJump() {
        window.history.pushState = rwhs('pushState');
        window.history.replaceState = rwhs('replaceState');
      },

      /**
       * 注册自定义进入页面
       * */
      _registerEnterPage() {
        this.handler.addListener('pageStartCollect', () => {
          this.enterPageTime = Date.now();

          this._setPageInfo({
            currentUrl: window.location.href,
            stayPageTime: 0,
            targetUrl: '',
            scrollTop: getScrollTop(),
            performance: window.performance
          });
        });
      },

      /**
       * 注册自定义退出页面
       * */
      _registerLeavePage() {
        // 离开的时候已经路由已经切换了
        this.handler.addListener('pageEndCollect', () => {
          this._setPageInfo({
            currentUrl: this.pageInfo.currentUrl,
            stayPageTime: Date.now() - this.enterPageTime,
            scrollTop: getScrollTop(),
            isSend: true
          });
        });
      },

      /**
      * 处理多页应用的页面信息
      * */
      _handleMultPageCollect(e) {
        // 收集页面数据
        this._setPageInfo({
          stayPageTime: Date.now() - this.enterPageTime,
          targetUrl: window.location.href,
          scrollTop: getScrollTop(),
          performance: window.performance,
          isSend: true
        }); //新页面需要 重置数据 有误差 界限难以确定


        this._setPageInfo({
          currentUrl: window.location.href,
          stayPageTime: 0,
          targetUrl: '',
          scrollTop: 0,
          performance: window.performance
        });

        this.enterPageTime = Date.now();
      },

      /**
      * 重置页面数据
      * */
      _setPageInfo(fields) {
        this.pageInfo = { ...this.pageInfo,
          isSend: false,
          ...fields
        };
        this.handler.emit('pageInfo', this.pageInfo);
      },

      /**
      * 初始化监听
      * */
      _initListener() {
        // 加载
        window.addEventListener('load', () => {
          this._setPageInfo({
            currentUrl: window.location.href,
            performance: window.performance
          });

          this.enterPageTime = Date.now();
        }); // tab切换

        window.addEventListener('visibilitychange', () => {
          // 页面挂起
          if (document.hidden) {
            this._setPageInfo({
              stayPageTime: Date.now() - this.enterPageTime,
              isSend: true
            });
          } else {
            this.enterPageTime = Date.now();
          }
        }); // 跳转 (有误差)

        window.addEventListener('pushstate', e => {
          if (!this.isSingePage) {
            this._handleMultPageCollect(e);
          } else {
            // 收集跳转的目的地址
            this._setPageInfo({
              targetUrl: window.location.href
            });
          }
        });
        window.addEventListener('replacestate', e => {
          if (!this.isSingePage) {
            this._handleMultPageCollect(e);
          } else {
            this._setPageInfo({
              targetUrl: window.location.href
            });
          }
        });
        window.addEventListener('popstate', e => {
          if (!this.isSingePage) {
            this._handleMultPageCollect(e);
          } else {
            this._setPageInfo({
              targetUrl: window.location.href
            });
          }
        }); // 卸载

        window.addEventListener('beforeunload', e => {
          this._setPageInfo({
            stayPageTime: Date.now() - this.enterPageTime,
            isSend: true
          });
        });
        this.getViewportPos();
      },

      /**
      * 获取页面视口位置
      * */
      getViewportPos() {
        window.addEventListener('scroll', throttle(() => this._setPageInfo({
          scrollTop: getScrollTop()
        }), 300));
      }

    };

    class TogCollector extends TogCollector_p {
      constructor(option = {}) {
        super(option);

        if (window) {
          this._collectEvents();

          this._rwWindowEvents();

          this._collectDeviceInfo();

          this._collectErrors();

          this._collectCl_Tu();
        }
      }
      /**
      * 重写windows事件
      * */


      _rwWindowEvents() {
        window.localStorage.setItem = rwlc('setItem', 'l_setItem');
        window.sessionStorage.setItem = rwsc('setItem', 's_setItem');
        window.console.error = rwConsole('error', '_consoleError');

        this._collectUserInfo();
      }
      /**
       * 注册事件
       * */


      _collectEvents() {
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.addListener('pageInfo', data => this._setPageInfo(data));
        const {
          eventEmitter,
          config: {
            isSingePage
          },
          defaultData: {
            pageInfo
          }
        } = this;
        collectPage.init({
          eventEmitter,
          isSingePage,
          pageInfo
        });
      }
      /**
      * 设置页面信息
      * */


      _setPageInfo(data) {
        const {
          isSend,
          currentUrl,
          targetUrl
        } = data;
        delete data.isSend;
        this.data.pageInfo = { ...this.defaultData.pageInfo,
          ...data,
          currentUrl: currentUrl ? encodeURIComponent(currentUrl) : '',
          targetUrl: targetUrl ? encodeURIComponent(targetUrl) : ''
        };
        isSend && this.sendCollectData();
      }
      /**
      * 收集用户信息
      * */


      _collectUserInfo() {
        if (isMobile()) {
          this._collectMobileUserInfo();
        } else {
          this._collectPcUserInfo();
        }
      }
      /**
      * 收集移动端userInfo
      * */


      _collectMobileUserInfo() {
        this.setDefaultData({
          userInfo: window.localStorage.getItem('userInfo')
        });
        window.addEventListener('l_setItem', e => {
          if (e.key === 'userInfo') {
            const userInfo = window.localStorage.getItem('userInfo');
            this.setDefaultData({
              userInfo
            });
          }
        });
      }
      /**
      * 收集pc端userInfo
      * */


      _collectPcUserInfo() {
        this.setDefaultData({
          userInfo: window.sessionStorage.getItem('userInfo')
        });
        window.addEventListener('s_setItem', e => {
          if (e.key === 'userInfo') {
            const userInfo = window.sessionStorage.getItem('userInfo');
            this.setDefaultData({
              userInfo
            });
          }
        });
      }
      /**
      * 收集设备信息
      * */


      _collectDeviceInfo() {
        this.setDefaultData({
          device: window.navigator
        });
      }
      /**
      * 整理错误的数据并发送(实时)
      * */


      _sendCollectErrors(error) {
        this.sendCollectData({
          errors: error
        });
      }
      /**
      *收集错误信息(兼容)
      * 非同源的外部js会script error, 可以通过一些配置来处理
      **/


      _collectErrors() {
        // 自定义收集错误， 通过emit('collectError', data) 触发
        this.eventEmitter.addListener('collectError', error => {
          this._sendCollectErrors(error);
        });

        window.onerror = function (message, source, lineno, colno, error) {
          this._sendCollectErrors(error);
        };

        window.addEventListener('error', error => {
          this._sendCollectErrors(error);
        }, true); // promise

        window.addEventListener('unhandledrejection', function (error) {
          this._sendCollectErrors(error);
        }); // console.error

        window.addEventListener('_consoleError', function (error) {
          this._sendCollectErrors(error);
        });
      }
      /**
      * 收集点击事件
      * */


      _collectCl_Tu() {
        if (isMobile()) {
          this._collectTouch();
        } else {
          this._collectClick();
        }
      }
      /**
      *将事件信息存入data 具体判断todo
      **/


      _setEventsData(e) {
        const {
          clickCallback
        } = this.config;

        if (clickCallback) {
          clickCallback(e).then(data => {
            this.sendCollectData({
              clickEvents: data
            });
          });
        } else {
          // todo(默认条件待定)
          this.sendCollectData({
            clickEvents: e
          });
        }
      }
      /**
      * pc端点击事件
      * */


      _collectClick() {
        window.addEventListener('click', debounce(e => this._setEventsData(e), 300));
      }
      /**
      * 移动端点击事件
      * */


      _collectTouch() {
        window.addEventListener('touchstart', debounce(e => this._setEventsData(e), 300));
      }
      /**
      * 单例模式
      * */


      static getInstance(option) {
        if (!this.instance) {
          this.instance = new TogCollector(option);
        }

        return this.instance;
      }

    }

    return TogCollector;

})));
//# sourceMappingURL=tog-collector.js.map
