var latlong = require('../lib/latlong'),
    helpers = require('../lib/latlong/helpers'),
    coords = latlong.toDecimal("53°19'14\"N", "1°43'47\"W"),
    bearing = helpers.dmsToDecimal("96°01'18\""),
    dist = 124.8,
    t = latlong.translate(coords.latitude, coords.longitude, dist, bearing),
    m = latlong.toDegMinSec(t.latitude, t.longitude);

console.log(t);
console.log(m);
