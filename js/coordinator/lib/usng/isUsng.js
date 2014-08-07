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
     * Checks a string to see if it is valid USNG;
     * If so, returns the string in all upper case, no delimeters
     * If not, returns false
     */
    function isUsng(inputStr) {
        var usngStr = [],
            strregexp;

       // convert all letters to upper case
       usngStr = inputStr.toUpperCase();
     
       // get rid of space delimeters
       usngStr = usngStr.replace(/%20/g, "");
       usngStr = usngStr.replace(/ /g, "");

       if (usngStr.length > 15) {
          return false;
       }

       strregexp = /^[0-9]{2}[CDEFGHJKLMNPQRSTUVWX]$/;
       if (usngStr.match(strregexp)) {
          throw "Input appears to be a UTM zone, but more precision is required to display an accurate result: " + usngStr;
       }

       strregexp = /^[0-9]{2}[CDEFGHJKLMNPQRSTUVWX][ABCDEFGHJKLMNPQRSTUVWXYZ][ABCDEFGHJKLMNPQRSTUV]([0-9][0-9]){0,5}/;
       if (!usngStr.match(strregexp)) {
          return false;
       }

       if (usngStr.length < 7) {
          throw "Format looks right, but precision should be to least 10,000 meters: " + usngStr;
       }

       // all tests passed...return the upper-case, non-delimited string
       return usngStr;
    }

    return function () {
        return isUsng;
    };
}));
