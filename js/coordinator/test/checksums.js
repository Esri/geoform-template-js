(function () {
    "use strict";

    /*
     * The original coordinates (formatted) come from Wikipedia.
     * 
     * Conversions have been made using the tool on this page:
     * - http://www.earthpoint.us/Convert.aspx
     * 
     * Lat/long formatting conversions were checked against the fcc's tool:
     * - http://transition.fcc.gov/mb/audio/bickel/DDDMMSS-decimal.html
     */
    var checksums = [
            {
                landmark: "Great Pyramid of Giza",
                latitude: {
                    decimal: 29.979175,
                    formatted: "29°58'45.03\"N"
                },
                longitude: {
                    decimal: 31.1343583,
                    formatted: "31°08'03.69\"E"
                },
                utm: "36R 320010mE 3317942mN",
                mgrs: "36RUU2001017942"
            },
            {
                landmark: "Colloseum",
                latitude: {
                    decimal: 41.8901694,
                    formatted: "41°53'24.61\"N"
                },
                longitude: {
                    decimal: 12.4922694,
                    formatted: "12°29'32.17\"E"
                },
                utm: "33T 291952mE 4640623mN",
                mgrs: "33TTG9195240623"
            },
            {
                landmark: "Great Wall of China (Shanhai Pass)",
                latitude: {
                    decimal: 39.9666333,
                    formatted: "39°57'59.88\"N"
                },
                longitude: {
                    decimal: 119.7947056,
                    formatted: "119°47'40.94\"E"
                },
                utm: "50S 738688mE 4427795mN",
                mgrs: "50SQK3868827795"
            },
            {
                landmark: "Hagia Sophia",
                latitude: {
                    decimal: 41.0086111,
                    formatted: "41°0'31\"N"
                },
                longitude: {
                    decimal: 28.98,
                    formatted: "28°58'48\"E"
                },
                utm: "35T 666504mE 4541601mN",
                mgrs: "35TPF6650441601"
            },
            {
                landmark: "Stonehenge",
                latitude: {
                    decimal: 51.1788444,
                    formatted: "51°10'43.84\"N"
                },
                longitude: {
                    decimal: -1.826189,
                    formatted: "1°49'34.28\"W"
                },
                utm: "30U 582048mE 5670368mN",
                mgrs: "30UWB8204870368"
            },
            {
                landmark: "Taj Mahal",
                latitude: {
                    decimal: 27.174167,
                    formatted: "27°10'27\"N"
                },
                longitude: {
                    decimal: 78.042222,
                    formatted: "78°02'32\"E"
                },
                utm: "44R 206921mE 3009183mN",
                mgrs: "44RKR0692109183"
            },
            {
                landmark: "Golden Gate Bridge",
                latitude: {
                    decimal: 37.8197222,
                    formatted: "37°49'11\"N"
                },
                longitude: {
                    decimal: -122.4786111,
                    formatted: "122°28'43\"W"
                },
                utm: "10S 545889mE 4185941mN",
                mgrs: "10SEG4588985941"
            },
            {
                landmark: "Chichen Itza",
                latitude: {
                    decimal: 20.6829,
                    formatted: "20°40'58.44\"N"
                },
                longitude: {
                    decimal: -88.56865,
                    formatted: "88°34'7.14\"W"
                },
                utm: "16Q 336615mE 2287844mN",
                mgrs: "16QCH3661587844"
            },
            {
                landmark: "Old City of Jerusalem",
                latitude: {
                    decimal: 31.7766667,
                    formatted: "31°46'36\"N"
                },
                longitude: {
                    decimal: 35.2341667,
                    formatted: "35°14'03\"E"
                },
                utm: "36R 711563mE 3517854mN",
                mgrs: "36RYA1156317854"
            },
            {
                landmark: "Grand Canyon",
                latitude: {
                    decimal: 36.1,
                    formatted: "36°06'N"
                },
                longitude: {
                    decimal: -112.1,
                    formatted: "112°06'W"
                },
                utm: "12S 400983mE 3995600mN",
                mgrs: "12SVE0098395600"
            },
            {
                landmark: "Heron Island: Great Barrier Reef",
                latitude: {
                    decimal: -23.442,
                    formatted: "23°26'31.20\"S" 
                },
                longitude: {
                    decimal: 151.914,
                    formatted: "151°54'50.40\"E"
                },
                utm: "56K 389066mE 7407131mN",
                mgrs: "56KLV8906607131"
            },
            {
                landmark: "Machu Picchu",
                latitude: {
                    decimal: -13.1630556,
                    formatted: "13°09'47\"S" 
                },
                longitude: {
                    decimal: -72.5455556,
                    formatted: "72°32'44\"W"
                },
                utm: "18L 766062mE 8543534mN",
                mgrs: "18LYL6606243534"
            }
        ];

    module.exports = checksums;
}());
