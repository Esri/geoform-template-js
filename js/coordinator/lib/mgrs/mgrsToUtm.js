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

    var MGRS_Ellipsoid_Code = "WE",
        CLARKE_1866 = "CC", // Ellipsoid code for CLARKE_1866
        CLARKE_1880 = "CD", // Ellipsoid code for CLARKE_1880
        BESSEL_1841 = "BR", // Ellipsoid code for BESSEL_1841
        BESSEL_1841_NAMIBIA = "BN", // Ellipsoid code for BESSEL 1841 (NAMIBIA)
        Latitude_Band_Table = {
            'C': { min_northing: 1100000.0, north: -72.0, south: -80.5},
            'D': { min_northing: 2000000.0, north: -64.0, south: -72.0},
            'E': { min_northing: 2800000.0, north: -56.0, south: -64.0},
            'F': { min_northing: 3700000.0, north: -48.0, south: -56.0},
            'G': { min_northing: 4600000.0, north: -40.0, south: -48.0},
            'H': { min_northing: 5500000.0, north: -32.0, south: -40.0},
            'J': { min_northing: 6400000.0, north: -24.0, south: -32.0},
            'K': { min_northing: 7300000.0, north: -16.0, south: -24.0},
            'L': { min_northing: 8200000.0, north: -8.0, south: -16.0},
            'M': { min_northing: 9100000.0, north: 0.0, south: -8.0},
            'N': { min_northing: 0.0, north: 8.0, south: 0.0},
            'P': { min_northing: 800000.0, north: 16.0, south: 8.0},
            'Q': { min_northing: 1700000.0, north: 24.0, south: 16.0},
            'R': { min_northing: 2600000.0, north: 32.0, south: 24.0},
            'S': { min_northing: 3500000.0, north: 40.0, south: 32.0},
            'T': { min_northing: 4400000.0, north: 48.0, south: 40.0},
            'U': { min_northing: 5300000.0, north: 56.0, south: 48.0},
            'V': { min_northing: 6200000.0, north: 64.0, south: 56.0},
            'W': { min_northing: 7000000.0, north: 72.0, south: 64.0},
            'X': { min_northing: 7900000.0, north: 84.5, south: 72.0}
        };

    /*
     * The function breakMGRS breaks down an MGRS
     * coordinate string into its component parts.
     *
     *   MGRS           : MGRS coordinate string          (input)
     *   Zone           : UTM Zone                        (output)
     *   Letters        : MGRS coordinate string letters  (output)
     *   Easting        : Easting value                   (output)
     *   Northing       : Northing value                  (output)
     *   Precision      : Precision level of MGRS string  (output)
     */
    function breakMGRS(MGRS) {
        /* Break_MGRS_String */
        var temp,
            tReturn = {},
            east,
            north,
            multiplier;

        tReturn.Zone = parseInt(MGRS.match(/(\d+)/g)[0], 10);

        if (tReturn.Zone < 1 || tReturn.Zone > 60) {
            throw "MGRS formatting wrong";
        }

        /* get letters */
        temp = MGRS.match(/[a-zA-Z]{3}/)[0];
        if (!temp) {
            throw "MGRS formatting error";
        }

        tReturn.Letters = temp;

        if (tReturn.Letters.indexOf('I') >= 0 || tReturn.Letters.indexOf('O') >= 0) {
            throw "MGRS formatting wrong";
        }

        temp = MGRS.match(/\d+$/)[0];
        if (temp.length <= 10 && temp.length % 2 === 0) {
            /* get easting & northing */
            tReturn.Precision = temp.length / 2;
            if (tReturn.Precision > 0) {
                east = parseInt(temp.substring(0, temp.length / 2), 10);
                north = parseInt(temp.substring(temp.length / 2), 10);
                multiplier = Math.pow(10.0, 5 - tReturn.Precision);
                tReturn.Easting = east * multiplier;
                tReturn.Northing = north * multiplier;
            } else {
                tReturn.Easting = 0;
                tReturn.Northing = 0;
            }
        } else {
            throw "MGRS formatting wrong";
        }

        return tReturn;
    }

    /*
     * The function getGridValues sets the letter range used for
     * the 2nd letter in the MGRS coordinate string, based on the set
     * number of the utm zone. It also sets the false northing using a
     * value of A for the second letter of the grid square, based on
     * the grid pattern and set number of the utm zone.
     *
     *    zone            : Zone number             (input)
     *    ltr2_low_value  : 2nd letter low number   (output)
     *    ltr2_high_value : 2nd letter high number  (output)
     *    false_northing  : False northing          (output)
     */
    function getGridValues (zone) {
        var set_number,    /* Set number (1-6) based on UTM zone number */
            aa_pattern,    /* Pattern based on ellipsoid code */
            ltr2_low_value,
            ltr2_high_value,
            false_northing;

        set_number = zone % 6 || 6;

        if (MGRS_Ellipsoid_Code === CLARKE_1866 || MGRS_Ellipsoid_Code === CLARKE_1880 || MGRS_Ellipsoid_Code === BESSEL_1841 || MGRS_Ellipsoid_Code === BESSEL_1841_NAMIBIA) {
            aa_pattern = false;
        } else {
            aa_pattern = true;
        }

        if ((set_number === 1) || (set_number === 4)) {
            ltr2_low_value = 'A';
            ltr2_high_value = 'H';
        } else if ((set_number === 2) || (set_number === 5)) {
            ltr2_low_value = 'J';
            ltr2_high_value = 'R';
        } else if ((set_number === 3) || (set_number === 6)) {
            ltr2_low_value = 'S';
            ltr2_high_value = 'Z';
        }

        /* False northing at A for second letter of grid square */
        if (aa_pattern) {
            if (set_number % 2 ===  0) {
                false_northing = 1500000.0;
            } else {
                false_northing = 0.0;
            }
        } else {
            if (set_number % 2 === 0) {
                false_northing =  500000.0;
            } else {
                false_northing = 1000000.00;
            }
        }

        return {
            ltr2_low_value: ltr2_low_value,
            ltr2_high_value: ltr2_high_value,
            false_northing: false_northing
        };
    }

    /*
     * The function getLatitudeBandMinNorthing receives a latitude band letter
     * and uses the Latitude_Band_Table to determine the minimum northing for that
     * latitude band letter.
     *
     *   letter        : Latitude band letter             (input)
     *   min_northing  : Minimum northing for that letter(output)
     */
    function getLatitudeBandMinNorthing(letter) {
       var min_northing;

       if (letter >= 'C' && letter <= 'H') {
           min_northing = Latitude_Band_Table[letter].min_northing;
       } else if (letter >= 'J' && letter <= 'N') {
           min_northing = Latitude_Band_Table[letter].min_northing;
       } else if (letter >= 'P' && letter <= 'X') {
           min_northing = Latitude_Band_Table[letter].min_northing;
       } else {
           throw "MGRS not formatted correctly";
       }

       return min_northing;
    }

    /*
     * Converts an MGRS coordinate string
     * to UTM projection (zone, hemisphere, easting and northing) coordinates
     * according to the current ellipsoid parameters.  If any errors occur, they are
     * thrown and everything crashes. Cool, huh?
     *
     *    MGRS       : MGRS coordinate string           (input)
     *    Zone       : UTM zone                         (output)
     *    Hemisphere : North or South hemisphere        (output)
     *    Easting    : Easting (X) in meters            (output)
     *    Northing   : Northing (Y) in meters           (output)
     */
    function mgrsToUtm(MGRS) {
        var scaled_min_northing,
            min_northing,
            ltr2_low_value,
            ltr2_high_value,
            false_northing,
            grid_easting,        /* Easting for 100,000 meter grid square      */
            grid_northing,       /* Northing for 100,000 meter grid square     */
            letters = [],
            in_precision,
            tmp,
            Hemisphere,
            Zone,
            Easting,
            Northing;

        tmp = breakMGRS(MGRS);

        if (typeof tmp !== 'object') {
            throw "MGRS not formatted correctly";
        }

        letters = tmp.Letters;
        Zone = tmp.Zone;
        Easting = tmp.Easting;
        Northing = tmp.Northing;
        in_precision = tmp.in_precision;

        if (!Zone) {
            throw "Zone not readable";
        }

        if (typeof letters !== 'string') {
            throw "Invalid MGRS string: no letters";
        }

        if ((letters.charAt(0) === 'X') && (Zone === 32 || Zone === 34 || Zone === 36)) {
            throw "Malformed MGRS";
        }

        if (letters.charAt(0) < 'N') {
            Hemisphere = 'S';
        } else {
            Hemisphere = 'N';
        }

        tmp = getGridValues(Zone);

        ltr2_low_value = tmp.ltr2_low_value;
        ltr2_high_value = tmp.ltr2_high_value;
        false_northing = tmp.false_northing;

        /* Check that the second letter of the MGRS string is within
         * the range of valid second letter values
         * Also check that the third letter is valid */
        if (letters.charAt(1) < ltr2_low_value || letters.charAt(1) > ltr2_high_value || letters.charAt(2) > 'V') {
            throw "Malformed";
        }

        grid_northing = parseFloat(letters.charCodeAt(2) - 'A'.charCodeAt(0)) * 100000 + false_northing;

        grid_easting = parseFloat(letters.charCodeAt(1) - ltr2_low_value.charCodeAt(0) + 1) * 100000;
        if ((ltr2_low_value === 'J') && letters.charAt(1) > 'O') {
            grid_easting = grid_easting - 100000;
        }

        if (letters.charAt(2) > 'O') {
            grid_northing = grid_northing - 100000;
        }

        if (letters.charAt(2) > 'I') {
            grid_northing = grid_northing - 100000;
        }

        if (grid_northing >= 2000000) {
            grid_northing = grid_northing - 2000000;
        }

        min_northing = getLatitudeBandMinNorthing(letters[0]);
        scaled_min_northing = min_northing;
        while (scaled_min_northing >= 2000000) {
            scaled_min_northing = scaled_min_northing - 2000000;
        }

        grid_northing = grid_northing - scaled_min_northing;
        if (grid_northing < 0) {
            grid_northing = grid_northing + 2000000;
        }

        grid_northing = min_northing + grid_northing;

        Easting = grid_easting + Easting;
        Northing = grid_northing + Northing;

        return {
            Zone: Zone,
            Hemisphere: Hemisphere,
            Easting: Easting,
            Northing: Northing
        };
    }

    return function () {
        return mgrsToUtm;
    };
}));
