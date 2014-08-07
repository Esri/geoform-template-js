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
            throw "Invalid set passed to lettersHelper";
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

    return function (constants) {
        CONSTANTS = constants;

        return {
            findGridLetters: findGridLetters
        };
    };
}));
