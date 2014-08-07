var coordinator = require('../coordinator'),
    fn = coordinator('latlong', 'mgrs');

console.log(fn.toString());
