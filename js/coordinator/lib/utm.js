(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./constants', './utm/utmToLatLong', './utm/utmToUsng'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (CONSTANTS, utmToLatLong, utmToUsng) {
    "use strict";

    utmToLatLong = utmToLatLong(CONSTANTS);
    utmToUsng = utmToUsng(CONSTANTS);

    function getConverter (outputType) {
        var fn;

        switch (outputType.toLowerCase()) {
        case 'latlong':
            fn = utmToLatLong;
            break;

        case 'usng':
            fn = utmToUsng;
            break;
        }

        return fn;
    }

    return {
        toLatLong: utmToLatLong,
        toUsng: utmToUsng,
        getConverter: getConverter,
    };
}));
