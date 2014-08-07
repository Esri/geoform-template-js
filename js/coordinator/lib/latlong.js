(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./constants', './latlong/decimalToDegMinSec', './latlong/degMinSecToDecimal', './latlong/latlongToUtm', './latlong/translate', './utm'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (CONSTANTS, decimalToDegMinSec, degMinSecToDecimal, latLongToUtm, translate, utm) {
    "use strict";

    decimalToDegMinSec = decimalToDegMinSec(CONSTANTS);
    degMinSecToDecimal = degMinSecToDecimal(CONSTANTS);
    latLongToUtm = latLongToUtm(CONSTANTS);
    translate = translate(CONSTANTS);

    /*
     * Convenience function that basically just:
     *  * Converts lat/long to UTM
     *  * Converts UTM to USNG
     * 
     * @param lat- Latitude in decimal degrees
     * @param lon- longitude in decimal degrees
     * @param precision- How many decimal places (1-5) in USNG (default 5)
     * @param output- Output format. Accepted values are: 'string' and 'object'
     * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
     */
    function latLongToUsng(lat, lon, precision, output) {
        var coords;

        if (typeof precision === 'string') {
            precision = parseInt(precision, 10);
        }

        precision = precision ? precision : 5;

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        // convert lat/lon to UTM coordinates
        coords = latLongToUtm(lat, lon);

        return utm.toUsng(coords, precision, output);
    }

    /*
     * Creates a Military Grid Reference System string.
     * This is the same as a USNG string, but without spaces.
     * 
     * Space delimiters are optional but allowed in USNG, but are not allowed in MGRS.
     * 
     * The numbers are the same between the two coordinate systems.
     * 
     * @param lat- Latitude in decimal degrees
     * @param lon- longitude in decimal degrees
     * @param precision- How many decimal places (1-5) in USNG (default 5)
     * @param output- Output format. Accepted values are: 'string' and 'object'
     * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
     */
    function latLongToMgrs(lat, lon, precision, output) {
        var mgrs,
            usng = latLongToUsng(lat, lon, precision, output);

        if (typeof usng === 'string') {
            // remove space delimiters to conform to mgrs spec
            mgrs = usng.replace(/ /g, "");
        } else {
            mgrs = usng;
        }

        return mgrs;
    }

    function getConverter (outputType) {
        var fn;

        switch (outputType.toLowerCase()) {
            case 'utm':
                fn = latLongToUtm;
                break;

            case 'usng':
                fn = latLongToUsng;
                break;

            case 'mgrs':
                fn = latLongToMgrs;
                break;
        }

        return fn;
    }
    
    return {
        toDecimal: degMinSecToDecimal,
        toDegMinSec: decimalToDegMinSec,
        toUsng: latLongToUsng,
        toUtm: latLongToUtm,
        toMgrs: latLongToMgrs,
        getConverter: getConverter,
        translate: translate,
    };
}));
