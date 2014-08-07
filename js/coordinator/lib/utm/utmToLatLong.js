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

    var CONSTANTS = {};

    /*
     * Converts UTM coordinates to decimal degrees.
     *
     * Equations from USGS Bulletin 1532 (or USGS Professional Paper 1395)
     * East Longitudes are positive, West longitudes are negative. 
     * North latitudes are positive, South latitudes are negative.
     *
     * @param UTMNorthing- northing-m (numeric), eg. 432001.8  
     * @param UTMEasting- easting-m  (numeric), eg. 4000000.0
     * @param UTMZoneNumber- 6-deg longitudinal zone (numeric), eg. 18
     * @return Property with two properties, lat & lon
     */
    function utmToLatLong(UTMNorthing, UTMEasting, UTMZoneNumber) {
        var xUTM,
            yUTM,
            zoneNumber,
            lonOrigin,
            M, // M is the "true distance along the central meridian from the Equator to phi (latitude)
            mu,
            phi1Rad,
            phi1,
            N1,
            T1,
            C1,
            R1,
            D,
            lat,
            lon,
            ret = {};

        // remove 500,000 meter offset for longitude
        xUTM = parseFloat(UTMEasting) - CONSTANTS.EASTING_OFFSET; 
        yUTM = parseFloat(UTMNorthing);
        zoneNumber = parseInt(UTMZoneNumber, 10);

        // origin longitude for the zone (+3 puts origin in zone center) 
        lonOrigin = (zoneNumber - 1) * 6 - 180 + 3; 

        M = yUTM / CONSTANTS.k0;
        mu = M / ( CONSTANTS.EQUATORIAL_RADIUS * (1 - CONSTANTS.ECC_SQUARED / 4 - 3 * CONSTANTS.ECC_SQUARED * 
                        CONSTANTS.ECC_SQUARED / 64 - 5 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 256 ));

        // phi1 is the "footprint latitude" or the latitude at the central meridian which
        // has the same y coordinate as that of the point (phi (lat), lambda (lon) ).
        phi1Rad = mu + (3 * CONSTANTS.E1 / 2 - 27 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 / 32 ) * Math.sin( 2 * mu) + ( 21 * CONSTANTS.E1 * CONSTANTS.E1 / 16 - 55 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 / 32) * Math.sin( 4 * mu) + (151 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 / 96) * Math.sin(6 * mu);
        phi1 = phi1Rad * CONSTANTS.RAD_2_DEG;

        // Terms used in the conversion equations
        N1 = CONSTANTS.EQUATORIAL_RADIUS / Math.sqrt( 1 - CONSTANTS.ECC_SQUARED * Math.sin(phi1Rad) * 
                    Math.sin(phi1Rad));
        T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
        C1 = CONSTANTS.ECC_PRIME_SQUARED * Math.cos(phi1Rad) * Math.cos(phi1Rad);
        R1 = CONSTANTS.EQUATORIAL_RADIUS * (1 - CONSTANTS.ECC_SQUARED) / Math.pow(1 - CONSTANTS.ECC_SQUARED * 
                      Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
        D = xUTM / (N1 * CONSTANTS.k0);

        // Calculate latitude, in decimal degrees
        lat = phi1Rad - ( N1 * Math.tan(phi1Rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 *
                C1 - 4 * C1 * C1 - 9 * CONSTANTS.ECC_PRIME_SQUARED) * D * D * D * D / 24 + (61 + 90 * 
                T1 + 298 * C1 + 45 * T1 * T1 - 252 * CONSTANTS.ECC_PRIME_SQUARED - 3 * C1 * C1) * D * D *
                D * D * D * D / 720);
        lat = lat * CONSTANTS.RAD_2_DEG;

        // Calculate longitude, in decimal degrees
        lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * 
                  C1 * C1 + 8 * CONSTANTS.ECC_PRIME_SQUARED + 24 * T1 * T1) * D * D * D * D * D / 120) /
                  Math.cos(phi1Rad);

        lon = lonOrigin + lon * CONSTANTS.RAD_2_DEG;

        ret.latitude = lat;
        ret.longitude = lon;

        return ret;
    }

    return function (constants) {
        CONSTANTS = constants;

        return utmToLatLong;
    };
}));
