var mgrs = require('../lib/mgrs'),
    checksums = require('./checksums');

checksums.forEach(function (item) {
    console.log("Landmark:", item.landmark);
    console.log("MGRS Orig:", item.mgrs);
    console.log("UTM Orig:", item.utm);

    var ret = mgrs.toUtm(item.mgrs);
    console.log("Return value:", ret);

    console.log();
});

