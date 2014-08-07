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

    /*
     * Converts lower-case characters to upper case, removes spaces, and
     * separates the string into logical parts.
     */
    function parseUsng(usngStr_input) {
        var j = 0,
            k,
            usngStr = [],
            usngStr_temp = [],
            parts = {};

        if (typeof usngStr_input !== 'string') {
            throw "Input to parseUsng must be a USNG string.";
        }

        usngStr_temp = usngStr_input.toUpperCase();

        // put usgn string in 'standard' form with no space delimiters
        usngStr = usngStr_temp.replace(/%20/g, "").replace(/ /g, "");

        if (usngStr.length < 7) {
            throw "This application requires minimum USNG precision of 10,000 meters";
        }

        // break usng string into its component pieces
        parts.zoneNumber = usngStr.match(/^\d{1,2}/)[0];
        j += parts.zoneNumber.length;
        parts.zoneNumber = parseInt(parts.zoneNumber, 10);
        parts.zoneLetter = usngStr.charAt(j); j+= 1;
        parts.sq1 = usngStr.charAt(j); j += 1;
        parts.sq2 = usngStr.charAt(j); j += 1;

        parts.precision = (usngStr.length-j) / 2;
        parts.east='';
        parts.north='';
        for (k = 0; k < parts.precision; k += 1) {
            parts.east += usngStr.charAt(j);
            j += 1;
        }

        if (usngStr[j] === " ") {
            j += 1;
        }
        for (k = 0; k < parts.precision; k += 1) {
            parts.north += usngStr.charAt(j);
            j += 1;
        }

        return parts;
    }

    return function () {
        return parseUsng;
    };
}));
