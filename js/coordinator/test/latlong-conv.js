var latlong = require('../lib/latlong'),
    checksums = require('./checksums');

checksums.forEach(function (item) {
    var utm = latlong.toUtm(item.latitude.decimal, item.longitude.decimal),
        mgrs = latlong.toMgrs(item.latitude.decimal, item.longitude.decimal, 5, 'string');

    console.log("Check values:");
    console.log(item);

    console.log("UTM:", utm);
    console.log("MGRS:", mgrs);

    console.log();
});
