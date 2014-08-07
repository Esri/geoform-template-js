var usng = require('../lib/usng'),
    checksums = require('./checksums');

checksums.forEach(function (item) {
    var ret = usng.toUtm(item.mgrs);

    console.log("Original:");
    console.log(item);

    console.log("Return:");
    console.log(ret);

    console.log();
});

