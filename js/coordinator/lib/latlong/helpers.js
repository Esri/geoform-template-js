/*jshint node:true */
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
     * Finds the set for a given zone.
     *
     * There are six unique sets, corresponding to individual grid numbers in
     * sets 1-6, 7-12, 13-18, etc. Set 1 is the same as sets 7, 13, ..; Set 2
     * is the same as sets 8, 14, ..
     *
     * See p. 10 of the "United States National Grid" white paper.
     */
    function findSet (zoneNum) {
        var tReturn;

        zoneNum = parseInt(zoneNum, 10);
        zoneNum = zoneNum % 6;

        switch (zoneNum) {
        case 0:
            tReturn = 6;
            break;

        case 1:
            tReturn = 1;
            break;

        case 2:
            tReturn = 2;
            break;

        case 3:
            tReturn = 3;
            break;

        case 4:
            tReturn = 4;
            break;

        case 5:
            tReturn = 5;
            break;

        default:
            tReturn = -1;
            break;
        }

        return tReturn;
    }

    /*
     * Retrieve the Square Identification (two-character letter code), for the
     * given row, column and set identifier (set refers to the zone set:
     * zones 1-6 have a unique set of square identifiers; these identifiers are
     * repeated for zones 7-12, etc.)

     * See p. 10 of the "United States National Grid" white paper for a diagram
     * of the zone sets.
     */
    function lettersHelper(set, row, col) {
        var l1, l2;

        // handle case of last row
        if (row === 0) {
            row = CONSTANTS.GRIDSQUARE_SET_ROW_SIZE - 1;
        } else {
            row -= 1;
        }

        // handle case of last column
        if (col === 0) {
            col = CONSTANTS.GRIDSQUARE_SET_COL_SIZE - 1;
        } else {
            col -= 1;
        }

        switch (set) {
        case 1:
            l1 = "ABCDEFGH";              // column ids
            l2 = "ABCDEFGHJKLMNPQRSTUV";  // row ids
            break;

        case 2:
            l1 = "JKLMNPQR";
            l2 = "FGHJKLMNPQRSTUVABCDE";
            break;

        case 3:
            l1 = "STUVWXYZ";
            l2 = "ABCDEFGHJKLMNPQRSTUV";
            break;

        case 4:
            l1 = "ABCDEFGH";
            l2 = "FGHJKLMNPQRSTUVABCDE";
            break;

        case 5:
            l1 = "JKLMNPQR";
            l2 = "ABCDEFGHJKLMNPQRSTUV";
            break;

        case 6:
            l1 = "STUVWXYZ";
            l2 = "FGHJKLMNPQRSTUVABCDE";
            break;

        default:
            throw "Unrecognized set passed to lettersHelper";
        }

        return l1.charAt(col) + l2.charAt(row);
    }

    /*
     * Retrieves the square identification for a given coordinate pair & zone.
     * See "lettersHelper" function documentation for more details.
     */
    function findGridLetters(zoneNum, northing, easting) {
        var north_1m, east_1m, row, col;

        zoneNum  = parseInt(zoneNum, 10);
        northing = parseFloat(northing);
        easting  = parseFloat(easting);
        row = 1;

        // northing coordinate to single-meter precision
        north_1m = Math.round(northing);

        // Get the row position for the square identifier that contains the point
        while (north_1m >= CONSTANTS.BLOCK_SIZE) {
            north_1m = north_1m - CONSTANTS.BLOCK_SIZE;
            row += 1;
        }

        // cycle repeats (wraps) after 20 rows
        row = row % CONSTANTS.GRIDSQUARE_SET_ROW_SIZE;
        col = 0;

        // easting coordinate to single-meter precision
        east_1m = Math.round(easting);

        // Get the column position for the square identifier that contains the point
        while (east_1m >= CONSTANTS.BLOCK_SIZE){
            east_1m = east_1m - CONSTANTS.BLOCK_SIZE;
            col += 1;
        }

        // cycle repeats (wraps) after 8 columns
        col = col % CONSTANTS.GRIDSQUARE_SET_COL_SIZE;

        return lettersHelper(findSet(zoneNum), row, col);
    }

    /*
     * Retrieves grid zone designator letter.
     *
     * This routine determines the correct UTM letter designator for the given
     * latitude returns 'Z' if latitude is outside the UTM limits of 84N to 80S
     *
     * Returns letter designator for a given latitude.
     * Letters range from C (-80 lat) to X (+84 lat), with each zone spanning
     * 8 degrees of latitude.
     */
    function utmLetterDesignator(lat) {
        var letterDesignator;

        lat = parseFloat(lat);

        if ((84 >= lat) && (lat >= 72)) {
            letterDesignator = 'X';
        } else if ((72 > lat) && (lat >= 64)) {
            letterDesignator = 'W';
        } else if ((64 > lat) && (lat >= 56)) {
            letterDesignator = 'V';
        } else if ((56 > lat) && (lat >= 48)) {
            letterDesignator = 'U';
        } else if ((48 > lat) && (lat >= 40)) {
            letterDesignator = 'T';
        } else if ((40 > lat) && (lat >= 32)) {
            letterDesignator = 'S';
        } else if ((32 > lat) && (lat >= 24)) {
            letterDesignator = 'R';
        } else if ((24 > lat) && (lat >= 16)) {
            letterDesignator = 'Q';
        } else if ((16 > lat) && (lat >= 8)) {
            letterDesignator = 'P';
        } else if (( 8 > lat) && (lat >= 0)) {
            letterDesignator = 'N';
        } else if (( 0 > lat) && (lat >= -8)) {
            letterDesignator = 'M';
        } else if ((-8> lat) && (lat >= -16)) {
            letterDesignator = 'L';
        } else if ((-16 > lat) && (lat >= -24)) {
            letterDesignator = 'K';
        } else if ((-24 > lat) && (lat >= -32)) {
            letterDesignator = 'J';
        } else if ((-32 > lat) && (lat >= -40)) {
            letterDesignator = 'H';
        } else if ((-40 > lat) && (lat >= -48)) {
            letterDesignator = 'G';
        } else if ((-48 > lat) && (lat >= -56)) {
            letterDesignator = 'F';
        } else if ((-56 > lat) && (lat >= -64)) {
            letterDesignator = 'E';
        } else if ((-64 > lat) && (lat >= -72)) {
            letterDesignator = 'D';
        } else if ((-72 > lat) && (lat >= -80)) {
            letterDesignator = 'C';
        } else {
            letterDesignator = 'Z'; // This is here as an error flag to show
                                  // that the latitude is outside the UTM limits
        }

        return letterDesignator;
    }

    /*
     * Verifies a coordinate object by following these steps:
     * - converts string members (degrees, minutes, seconds) to numbers
     * - if direction is present, makes degree positive or negative accordingly
     *
     * @param coord- object with at least degrees, minutes, and seconds
     * @return New, cleaned object (doesn't have direction)
     */
    function dmsVerify(coord) {
        var newCoord = {};

        if (typeof coord !== 'object' || !coord.degrees || !coord.minutes || !coord.seconds) {
            return false;
        }

        if (typeof coord.degrees === 'string') {
            newCoord.degrees = parseInt(coord.degrees, 10);
        } else {
            newCoord.degrees = coord.degrees;
        }

        if (coord.direction) {
            if (coord.direction === 'S' || coord.direction === 'W') {
                newCoord.degrees *= -Math.abs(newCoord.degrees);
            } else {
                newCoord.degrees *= Math.abs(newCoord.degrees);
            }
        }

        if (typeof coord.minutes === 'string') {
            newCoord.minutes = Math.abs(parseInt(coord.minutes, 10));
        } else {
            newCoord.minutes = Math.abs(coord.minutes);
        }

        if (typeof coord.seconds === 'string') {
            newCoord.seconds = Math.abs(parseInt(coord.seconds, 10));
        } else {
            newCoord.seconds = Math.abs(coord.seconds);
        }
    }

    function dmsToDecimal(angle) {
        var reg = /^[NSEW\-]?\d{1,3}[° ]\d{1,2}[' ]\d{1,2}(\.\d{1,3})?[" ][NSEW]?$/,
            regSplit = /-?\d+(\.\d+)?/g,
            dms = {},
            tmp,
            ret;

        if (typeof angle === 'object') {
            dms = dmsVerify(angle);
        } else {
            if (!reg.test(angle)) {
                throw "Angle not formatted correctly: " + angle;
            }
            tmp = angle.match(regSplit);

            dms.degrees = parseInt(tmp[0], 10);
            dms.minutes = parseInt(tmp[1], 10);
            dms.seconds = parseFloat(tmp[2]);
        }

        tmp = String(dms.minutes / 60 + dms.seconds / 3600);
        ret = dms.degrees + '.' + tmp.substring(tmp.indexOf('.') + 1);

        return parseFloat(ret);
    }

    /*
     * Retrieves zone number from latitude and longitude.
     *
     * Zone numbers range from 1 - 60 over the range [-180 to +180]. Each
     * range is 6 degrees wide. Special cases for points outside normal
     * [-80 to +84] latitude zone.
     */
    function getZoneNumber(lat, lon) {
        var zoneNumber;

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        // sanity check on input, remove for production
        if (lon > 360 || lon < -180 || lat > 90 || lat < -90) {
            throw "Bad input. lat: " + lat + " lon: " + lon;
        }

        zoneNumber = parseInt((lon + 180) / 6, 10) + 1;

        // Handle special case of west coast of Norway
        if (lat >= 56.0 && lat < 64.0 && lon >= 3.0 && lon < 12.0) {
            zoneNumber = 32;
        }

        // Special zones for Svalbard
        if (lat >= 72.0 && lat < 84.0) {
            if (lon >= 0.0  && lon <  9.0) {
                zoneNumber = 31;
            } else if (lon >= 9.0  && lon < 21.0) {
                zoneNumber = 33;
            } else if (lon >= 21.0 && lon < 33.0) {
                zoneNumber = 35;
            } else if (lon >= 33.0 && lon < 42.0) {
                zoneNumber = 37;
            }
        }

        return zoneNumber;
    }

    return function (constants) {
        // set global functions
        CONSTANTS = constants;

        return {
            dmsVerify: dmsVerify,
            dmsToDecimal: dmsToDecimal,
            getZoneNumber: getZoneNumber,
            utmLetterDesignator: utmLetterDesignator,
            findGridLetters: findGridLetters
        };
    };
}));
