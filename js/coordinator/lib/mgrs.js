(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./constants', './mgrs/mgrsToUtm', './usng'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (CONSTANTS, mgrsToUtm, usng) {
    "use strict";

    mgrsToUtm = mgrsToUtm(CONSTANTS);

    function getConverter(outputType) {
        var fn;

        switch (outputType.toLowerCase()) {
        case 'latlong':
            fn = usng.toLatLong;
            break;
        
        case 'utm':
            fn = usng.toUtm;
            break;
        }

        return fn;
    }

    return {
        getConverter: getConverter,
        toLatLong: usng.toLatLong,
        toUtm: mgrsToUtm,
    };
}));
