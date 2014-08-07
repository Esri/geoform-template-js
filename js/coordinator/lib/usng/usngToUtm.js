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
     * Converts USNG to UTM.
     *
     * @param usngStr- string representing a USNG string
     * @return Returns an object with zoneNumber, zoneLetter, easting and northing
     */ 
    function usngToUtm(usng) { 
        var zoneBase,
            segBase,
            eSqrs,
            appxEast,
            appxNorth,
            letNorth,
            nSqrs,
            zoneStart,
            USNGSqEast = "ABCDEFGHJKLMNPQRSTUVWXYZ",
            ret = {};

        //Starts (southern edge) of N-S zones in millons of meters
        zoneBase = [
            1.1, 2.0, 2.8, 3.7, 4.6, 5.5, 6.4, 7.3, 8.2, 9.1,
            0, 0.8, 1.7, 2.6, 3.5, 4.4, 5.3, 6.2, 7.0, 7.9
        ];

        //Starts of 2 million meter segments, indexed by zone 
        segBase = [
            0, 2, 2, 2, 4, 4, 6, 6, 8, 8,
            0, 0, 0, 2, 2, 4, 4, 6, 6, 6
        ];

        // convert easting to UTM
        eSqrs = USNGSqEast.indexOf(usng.sq1);          
        appxEast = 1 + eSqrs % 8; 

        // convert northing to UTM
        letNorth = "CDEFGHJKLMNPQRSTUVWX".indexOf(usng.zoneLetter);
        if (usng.zoneNumber % 2) {
            //odd number zone
            nSqrs = "ABCDEFGHJKLMNPQRSTUV".indexOf(usng.sq2);
        } else {
            // even number zone
            nSqrs = "FGHJKLMNPQRSTUVABCDE".indexOf(usng.sq2);
        }

        zoneStart = zoneBase[letNorth];
        appxNorth = segBase[letNorth] + nSqrs / 10;
        if (appxNorth < zoneStart) {
            appxNorth += 2;
        }

        ret.northing = appxNorth * 1000000 + usng.north * Math.pow(10, 5 - String(usng.north).length);
        ret.easting = appxEast * 100000 + usng.east * Math.pow(10, 5 - String(usng.east).length);
        ret.zoneNumber = usng.zoneNumber;
        ret.zoneLetter = usng.zoneLetter;

        return ret;
    }

    return function () {
        return usngToUtm;
    };
}));
