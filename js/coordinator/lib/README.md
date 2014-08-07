Intro
=====

This README details the exported functions in each file. Basic usage of the library is located in the main README.

helpers.js
==========

Contains various helper functions that have no home.

utmLetterDesignator
-------------------

Retrieves the UTM grid zone designator letter given a latitude. Letters range from C (-80 latitude) to X (84 latitude). Anything outside of that will return Z.

This function is only really useful for doing lat/long -> UTM conversions.

getZoneNumber
-------------

Retrieves zone number from latitude and longitude. Zone numbers range from 1-60. There are two special cases, Norway and Svalbard.

This function is only really useful in lat/long -> UTM conversions.

findGridLetters
---------------

Retrieves the square id for a given coordinate pair & zone.

latlong.js
==========

decimalToDegMinSec
------------------

Converts decimal degrees to degrees, minutes seconds. It can take in either numbers or formatted strings as parameters and it can either return a formatted string or an object. This is just a convenience method and is not used in any of the conversions.

dmsVerify
---------

Not exported.  It is used by degMinSecToDecimal to make sure that the properties are in the correct format.

degMinSecToDecimal
------------------

Converts degrees, minutes, seconds to decimal degrees. Like decimalToDegMinSec, this is not used in any conversions and is merely a convenience method. It can take in either a formatted string or an object with degrees, minutes, and seconds and convert it to a decimal degree.
