(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function () {
    "use strict";

    /*
     * Converts decimal degrees to degrees, minutes seconds.
     * 
     * This function can either return a formatted string or an object.
     * 
     * If string or nothing is specified, it will look like this: 41°25'01"N
     * 
     * If object is chosen, it will have two properties, latitude and longitude.
     * Each will have these properties:
     * - degrees: positive integer
     * - minutes: positive integer
     * - seconds: positive float
     * - direction: N, S, E, or W
     * 
     * @param lat- latitude (float or string representing a float)
     * @param lon- longitude (float or string representing a float)
     * @param type- string representing return type (object or string); optional
     * @param digits- max digits in seconds; can be 3rd parameter; default is 2
     * @return Depents on type parameter (map of formatted strings or values)
     */
    function decimalToDegMinSec (lat, lon, type, digits) {
        var latDeg,
            latMin,
            latSec,
            lonDeg,
            lonMin,
            lonSec,
            latDir,
            lonDir,
            ret,
            magic;

        if (typeof digits === 'undefined') {
            digits = type;
        }

        if (typeof digits === 'string') {
            digits = parseInt(digits, 10);
        } else if (typeof digits !== 'number') {
            digits = 2;
        }

        // magic number that helps us round off un-needed digits
        magic = Math.pow(10, digits);

        lat = (typeof lat === 'string') ? parseFloat(lat) : lat;
        lon = (typeof lon === 'string') ? parseFloat(lon) : lon;

        if (lat < -90 || lat > 90) {
            throw "Latitude out of range: " + lat;
        }

        if (lon < -180 || lon > 180) {
            throw "Longitude out of range: " + lon;
        }

        latDir = (lat >= 0) ? 'N' : 'S';
        lonDir = (lon >= 0) ? 'E' : 'W';

        // Change to absolute value
        lat = Math.abs(lat);
        lon = Math.abs(lon);

        // Convert to Degree Minutes Seconds Representation
        latDeg = Math.floor(lat);
        lat -= latDeg;
        latMin = Math.floor(lat * 60);
        lat -= latMin / 60;
        latSec = Math.round((lat * 3600) * magic) / magic;

        lonDeg = Math.floor(lon);
        lon -= lonDeg;
        lonMin = Math.floor(lon * 60);
        lon -= lonMin / 60;
        lonSec = Math.round((lon * 3600) * magic) / magic;

        if (type === 'object') {
            ret = {
                latitude: {
                    degrees: latDeg,
                    minutes: latMin,
                    seconds: latSec,
                    direction: latDir
                },
                longitude: {
                    degrees: lonDeg,
                    minutes: lonMin,
                    seconds: lonSec,
                    direction: lonDir
                }
            };
        } else {
            ret = {
                latitude: latDeg + '°' + latMin + '\'' + latSec + '"' + latDir,
                longitude: lonDeg + '°' + lonMin + '\'' + lonSec + '"' + lonDir
            };
        }

        return ret;
    }

    return function () {
        return decimalToDegMinSec;
    };
}));
