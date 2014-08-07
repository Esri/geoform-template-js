(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./help'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (helpers) {
    "use strict";

    var CONSTANTS = {};

    /*
     * Converts a UTM coordinate to USNG:
     * 
     * @param coords- object with parts of a UTM coordinate
     * @param precision- How many decimal places (1-5) in USNG (default 5)
     * @param output- Format to output. Options include: 'string' and 'object'
     * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
     */
    function utmToUsng(coords, precision, output) {
        var utmEasting,
            utmNorthing,
            letters,
            usngNorthing,
            usngEasting,
            usng,
            i;

        if (typeof precision === 'string') {
            precision = parseInt(precision, 10);
        }

        precision = precision ? precision : 5;

        utmEasting = coords.easting;
        utmNorthing = coords.northing;

        // southern hemisphere case
        if (coords.hemisphere === 'S') {
            // Use offset for southern hemisphere
            utmNorthing += CONSTANTS.NORTHING_OFFSET; 
        }

        letters  = helpers.findGridLetters(coords.zoneNumber, utmNorthing, utmEasting);
        usngNorthing = Math.round(utmNorthing) % CONSTANTS.BLOCK_SIZE;
        usngEasting  = Math.round(utmEasting)  % CONSTANTS.BLOCK_SIZE;

        // added... truncate digits to achieve specified precision
        usngNorthing = Math.floor(usngNorthing / Math.pow(10,(5-precision)));
        usngEasting = Math.floor(usngEasting / Math.pow(10,(5-precision)));

        // REVISIT: Modify to incorporate dynamic precision ?
        for (i = String(usngEasting).length; i < precision; i += 1) {
             usngEasting = "0" + usngEasting;
        }

        for (i = String(usngNorthing).length; i < precision; i += 1) {
            usngNorthing = "0" + usngNorthing;
        }

        if (typeof output === 'string' && output === 'object') {
            usng = {
                zone: coords.zoneNumber + coords.zoneLetter,
                square: letters,
                easting: usngEasting,
                northing: usngNorthing
            };
        } else {
            usng = coords.zoneNumber + coords.zoneLetter + " " + letters + " " + 
                  usngEasting + " " + usngNorthing;
        }

        return usng;
    }

    return function (constants) {
        CONSTANTS = constants;

        helpers = helpers(constants);

        return utmToUsng;
    };
}));
