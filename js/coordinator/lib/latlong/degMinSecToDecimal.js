(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./helpers'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (helpers) {
    "use strict";

    /*
     * Converts degrees, minutes, seconds to decimal degrees.
     * 
     * If objects are passed in, they should define these properties:
     * - degrees: integer (or string representing an integer)
     * - minutes: integer (or string representing an integer)
     * - seconds: float (or string representing a float)
     * - direction: N, S, E, or W
     * 
     * If strings are passed in, they will be parsed according to specs.
     * 
     * @param latitude- formatted string or an object with properties:
     * @param longitude- formatted string or an object
     * @return  Object with both latitude and longitude
     */
    function degMinSecToDecimal(latitude, longitude) {
        var regDir = /[NSEW\-]/,
            lat,
            lon,
            tmp,
            ret = {};

        lat = helpers.dmsToDecimal(latitude);
        lon = helpers.dmsToDecimal(longitude);

        // Check if any error occurred
        if (lat < -90 || lat > 90) {
            throw "Latitude out of bounds: " + lat;
        }
        if (lon < -180 || lon > 180) {
            throw "Longitude out of bounds: " + lon;
        }

        tmp = latitude.match(regDir);

        if (tmp[0] === 'S' || tmp[0] === '-') {
            lat *= -1;
        }
        ret.latitude = lat;

        tmp = longitude.match(regDir);

        if (tmp[0] === 'W' || tmp[0] === '-') {
            lon *= -1;
        }
        ret.longitude = lon;

        return ret;
    }

    return function (constants) {
        helpers = helpers(constants);

        return degMinSecToDecimal;
    };
}));
