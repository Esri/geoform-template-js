(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./latlong', './usng', './utm', './mgrs'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.returnExports = factory();
  }
}(this, function (latlong, usng, utm, mgrs) {
    "use strict";

    var converters = {
            'latlong': latlong,
            'usng': usng,
            'utm': utm,
            'mgrs': mgrs
        };

    function getConverter(inputType, outType) {
        if (typeof inputType !== 'string') {
            throw new Error('Parameter not a string: ' + inputType);
        }

        if (typeof outType !== 'string') {
            throw new Error('Parameter not a string: ' + outType);
        }

        if (!converters[inputType]) {
            throw "Converter doesn't exist. Complain on GitHub.";
        }

        return converters[inputType].getConverter(outType);
    }

    getConverter.converters = converters;
    return getConverter;
}));
