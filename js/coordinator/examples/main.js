(function () {
    "use strict";

    var coordinator = require('../coordinator'),
        latLong = coordinator.converters.latlong;

    $.domReady(function () {
        $('#latlngConvert').bind('click', function () {
            var fn = coordinator('latlong', 'mgrs'),
                res;

            console.log(fn.toString());
            res = fn($('#srcLatitude').val(), $('#srcLongitude').val(), 5);

            $('#resMgrs').val(res);
        }, false);

        $('#mgrsConvert').bind('click', function () {
            var fn = coordinator('mgrs', 'latlong'),
                res,
                resFmt;

            res = fn($('#srcMgrs').val());

            resFmt = latLong.toDegMinSec(res.latitude, res.longitude);

            $('#resLatitude').val("" + res.latitude);
            $('#resLongitude').val("" + res.longitude);

            $('#resFmtLatitude').val(resFmt.latitude);
            $('#resFmtLongitude').val(resFmt.longitude);
        }, false);
    });
}());
