(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./constants', './usng/usngToUtm', './usng/parseUsng', './usng/isUsng', './utm'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (CONSTANTS, usngToUtmRaw, parseUsng, isUsng, utm) {
    "use strict";

    usngToUtmRaw = usngToUtmRaw(CONSTANTS);
    parseUsng = parseUsng(CONSTANTS);
    isUsng = isUsng(CONSTANTS);

    function usngToUtm (usngStr) {
        var usng = parseUsng(usngStr);
        return usngToUtmRaw(usng);
    }

    /*
     * Turns a USNG string into lat/long coordinates.
     * 
     * @param usngStr_input- USNG source
     * @return Object with two properties- latitude & longitude
     */
    function usngToLatLong(usngStr_input) {
        var usngp,
            coords,
            latlon;

        usngp = parseUsng(usngStr_input);

        // convert USNG coords to UTM; this routine counts digits and sets precision
        coords = usngToUtm(usngStr_input);

        // southern hemisphere case
        if (usngp.zoneLetter < 'N') {
            coords.northing -= CONSTANTS.NORTHING_OFFSET;
        }

        latlon = utm.toLatLong(coords.northing, coords.easting, usngp.zoneNumber);

        return latlon;
    }

    function getConverter (outputType) {
        var fn;

        switch (outputType.toLowerCase()) {
        case 'utm':
            fn = usngToUtm;
            break;
        case 'latlong':
            fn = usngToLatLong;
            break;
        }

        return fn;
    }

    return {
        toUtm: usngToUtm,
        toLatLong: usngToLatLong,
        isUsng: isUsng,
        getConverter: getConverter,
        parseUsng: parseUsng,
    };
}));
