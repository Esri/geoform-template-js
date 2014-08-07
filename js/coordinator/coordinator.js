(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./lib/convert'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (convert) {
    "use strict";

    return convert;
}));
