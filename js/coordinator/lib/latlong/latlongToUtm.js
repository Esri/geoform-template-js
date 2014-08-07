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

    var CONSTANTS = {};

    /*
     * Converts latitude and longitude to UTM.
     *
     * Converts lat/long to UTM coords.  Equations from USGS Bulletin 1532 
     * (or USGS Professional Paper 1395 "Map Projections - A Working Manual", 
     * by John P. Snyder, U.S. Government Printing Office, 1987.)
     * 
     * Note- UTM northings are negative in the southern hemisphere.
     *
     * @param lat- Latitude in decimal; north is positive, south is negative
     * @param lon- Longitude in decimal; east is positive, west is negative
     * @param zone- optional, result zone
     * @return Object with three properties, easting, northing, zone
     */
    function latLongToUtm(lat, lon, zone) {
        var zoneNumber,
            latRad,
            lonRad,
            lonOrigin,
            lonOriginRad,
            utmEasting,
            utmNorthing,
            N,
            T,
            C,
            A,
            M,
            utmcoords = {};

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        // Constrain reporting USNG coords to the latitude range [80S .. 84N]
        if (lat > 84.0 || lat < -80.0) {
            return "undefined";
        }

        // sanity check on input - remove for production
        // Make sure the longitude is between -180.00 .. 179.99..
        if (lon > 180 || lon < -180 || lat > 90 || lat < -90) {
            throw "Bad input. lat: " + lat + " lon: " + lon;
        }

        // convert lat/lon to radians
        latRad = lat * CONSTANTS.DEG_2_RAD;
        lonRad = lon * CONSTANTS.DEG_2_RAD;

        // User-supplied zone number will force coordinates to be computed in a particular zone
        zoneNumber = zone || helpers.getZoneNumber(lat, lon);

        // +3 puts origin in middle of zone
        lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
        lonOriginRad = lonOrigin * CONSTANTS.DEG_2_RAD;

        N = CONSTANTS.EQUATORIAL_RADIUS / Math.sqrt(1 - CONSTANTS.ECC_SQUARED * Math.pow(Math.sin(latRad), 2));
        T = Math.pow(Math.tan(latRad), 2);
        C = CONSTANTS.ECC_PRIME_SQUARED * Math.pow(Math.cos(latRad), 2);
        A = Math.cos(latRad) * (lonRad - lonOriginRad);

        // Note that the term Mo drops out of the "M" equation, because phi 
        // (latitude crossing the central meridian, lambda0, at the origin of the
        //  x,y coordinates), is equal to zero for UTM.
        M = CONSTANTS.EQUATORIAL_RADIUS * (
            (1 - CONSTANTS.ECC_SQUARED / 4 - 3 * (CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED) / 64 - 5 * (CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED) / 256) * latRad -
            (3 * CONSTANTS.ECC_SQUARED / 8 + 3 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 32 + 45 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 1024) * Math.sin(2 * latRad) +
            (15 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 256 + 45 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 1024) * Math.sin(4 * latRad) -
            (35 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 3072) * Math.sin(6 * latRad));

        utmEasting = (CONSTANTS.k0 * N *
            (A + (1 - T + C) * (A * A * A) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * CONSTANTS.ECC_PRIME_SQUARED ) * (A * A * A * A * A) / 120) + CONSTANTS.EASTING_OFFSET);

        utmNorthing = (CONSTANTS.k0 * ( M + N * Math.tan(latRad) * (
              (A * A) / 2 + (5 - T + 9 * C + 4 * C * C ) * (A * A * A * A) / 2 +
              (61 - 58 * T + T * T + 600 * C - 330 * CONSTANTS.ECC_PRIME_SQUARED ) *
              (A * A * A * A * A * A) / 720)
          ) );

        if (utmNorthing < 0) {
            utmNorthing += 10000000;
        }

        utmcoords.easting = Math.round(utmEasting);
        utmcoords.northing = Math.round(utmNorthing);
        utmcoords.zoneNumber = zoneNumber;
        utmcoords.zoneLetter = helpers.utmLetterDesignator(lat);
        utmcoords.hemisphere = lat < 0 ? 'S' : 'N';

        return utmcoords;
    }

    return function (constants) {
        CONSTANTS = constants;

        helpers = helpers(constants);

        return latLongToUtm;
    };
}));
