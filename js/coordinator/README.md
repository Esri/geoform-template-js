Intro
=====

This code converts between coordinate systems, particularly Lat/Long and USNG (MGRS). It is extensible, so if you can come up with an algorithm, fork and add it. Details for adding modules are included.  Happy hacking!

The algorithms and most of the code is not my own. I have refactored the code to be more module-friendly and I have added a few functions. I mostly consider myself a maintainer of the code, but I feel I have made enough changes so I have changed the copyright notices to be in my name. Appropriate credits have been included in this README under `References`.

I do not guarantee any of the algorithms to be accurate, and appropriate testing should be done before this module is relied upon for accuracy.

This code is licensed under the MIT license. Please see the LICENSE file for more information.

Conversion support is nowhere near complete. For now, only these conversions are supported.

* Lat/Long -> MGRS, USNG, UTM
* UTM -> Lat/Long
* USNG -> Lat/Long, UTM

Basic Usage
===========

Everything is modular, which makes things very convenient.  The main file is `index.js`. Include it and you get a function with two parameters:

* `inputType`- type to convert from (so far, only utm and latlong)
* `outType`- type to convert to

For example, to convert lat/long to MGRS with 4 digits of precision (within 10 meters), you would do something like this:

    var converter = require('coordinator'),
        fn = converter('latlong', 'mgrs'),
        mgrs = fn(38.897605896, -77.0365219116, 4);

As you can see, `coordinator` will give you a function. This is nice because you can load it once and just pass the function around.  This simplifies the module a bit as well as expanding your options.

This module assumes a datum of NAD83 (or its international equivalent WGS84). If NAD27 is used instead, set IS_NAD83_DATUM (in constants.js) to 'false'. (This does not do a datum conversion; it only allows either datum to be used for geographic-UTM/USNG calculations.

Now on to the API.

Lat/Long Conversions
--------------------

**To USNG**

Converts Lat/Long (in decimal degrees) to a USNG string.

`toUsng(lat, long, precision)`

* `lat`- Latitude in decimal degrees
* `long`- Longitude in decimal degrees
* `precision`- number of digits from 1-5
  * One digit:    10 km precision      eg. `18S UJ 2 1`
  * Two digits:   1 km precision       eg. `18S UJ 23 06`
  * Three digits: 100 meters precision eg. `18S UJ 234 064`
  * Four digits:  10 meters precision  eg. `18S UJ 2348 0647`
  * Five digits:  1 meter precision    eg. `18S UJ 23480 06470`
* `return`- a formatted string (with spaces) of the form `NNC CC NNNNN NNNNN`

**To MGRS**

MGRS is basically USNG but has no space delimiters. This is NOT a full implementation of MGRS.  It does not deal with numbers near the poles; it only works for numbers in the UTM domain (84N - 80S).

`toMgrs(lat, long, precision)`


USNG conversions
----------------

**To Lat/Long**

`toLatLong(usng_string)`

* `usngStr`- supports three formats and all precisions of easting and northing
  * NNCCCNNNNNNNNNN
  * NNC CC NNNNNNNNNN
  * NNC CC NNNNN NNNNN
* `return`- property with two properties, latitude & longitude
  * `latitude`- decimal degrees (west is negative)
  * `longitude`- decimal degrees (south is negative)

**USNG Validation**

There is no interface for this using the default, so the usng module will have to be imported directly.

Evaluates a string to see if it is a legal USNG coordinate; if so, returns the string modified to be all upper-case, non-delimited; if not, returns 0.

`isUSNG(inputStr)`

* `inputStr`- coordinate to evaluate
* `return`- the string converted to be upper-case, non-delimited or 0 if invalid

UTM Conversions
---------------

**To Lat/Long**

Converts UTM to Lat/Long.

`toLatLong(UTMNorthing, UTMEasting, UTMZoneNumber)`

* `UTMNorthing`- northing-m (numeric), eg. 432001.8  
* `UTMEasting`- easting-m (numeric), eg. 4000000.0
* `UTMZoneNumber`- 6-deg longitudinal zone (numeric), eg. 18
* `return`- object with two properties, latitude and longitude

Adding Modules
==============

Modules right now are kind of stupid, so the `index.js` file will have to be edited manually, but this seemed simple enough.

Create a module that exports a single function, `getConverter`.  This should take a single argument (the system to convert to) and return a function that handles the conversion.

To add a module, just add an entry to the converters object with the from coordinate system (say `xyz`) and require your converter module. Names are case-insensitive.

Code Overview
-------------

For detailed information about functions, constants, etc, please see the README in the lib directory.  It explains exactly what is in each file.

There are a few files that are of interest for someone adding to the module:

* `lib/constants.js`- has common constants needed for conversion
* `index.js`- main file; this file is the preferred interface
* `lib/helpers.js`- helper functions to reduce clutter

Right now, only lat/long, UTM, and USNG/MGRS are supported:

* `lib/latlong.js`- exports four functions, the most important being getConverter
  * `getConverter`- required to integrate with the module; returns conversion function
  * `toUtm`- converts lat/long to UTM
  * `toMgrs`- converts lat/long to MGRS using UTM in the background
  * `toUsng`- converts lat/long to USNG using UTM in the background
* `lib/usng.js`- exports four functions, the most important being getConverter
  * `getConverter`- required to integrate with the module; returns conversion function
  * `toUtm`- converts USNG coordinate to UTM
  * `toLatLong`- converts USNG to lat/long
  * `isUsng`- validates an input string. Returns 0 if not valid or the string in upper-case without space delimiters
* `lib/utm.js`- exports two functions, the most important being being getConverter
  * `getConverter`- required to integrate with the module; returns conversion function
  * `toLatLong`- converts UTM to lat/long

This module assumes a datum of NAD83 (or its international equivalent WGS84). 

If NAD27 is used instead, set IS_NAD83_DATUM to 'false'. (This does not do a datum conversion; it only allows either datum to be used for geographic-UTM/USNG calculations. NAD27 computations are irrelevant to Google Maps applications). NAD83 and WGS84 are equivalent for all practical purposes.

Note regarding UTM coordinates: UTM calculations are an intermediate step in lat/lng-USNG conversions.  These functions are not exported.  If they are used, remember that the functions in this module use negative numbers for UTM Y values in the southern hemisphere.  The calling application must check for this, and convert to correct southern-hemisphere values by adding 10,000,000 meters.

References
==========

This code was originally written by Larry Moore, <larmoor@gmail.com>, and came from this address: <http://dhost.info/usngweb/help_usng.html>.  The code has undergone some changes (mostly formatting) in order to make it cleaner and to publish it to NPM. If there are any errors, they are probably my fault.

For detailed information on the U.S. National Grid coordinate system, see <http://www.fgdc.gov/usng>

Reference ellipsoids
--------------------

Reference ellipsoids derived from Peter H. Dana:

* <http://www.utexas.edu/depts/grg/gcraft/notes/datum/elist.html>
* Department of Geography, University of Texas at Austin.
* pdana@mail.utexas.edu   

Technical references
--------------------

Defense Mapping Agency. 1987b. DMA Technical Report: Supplement to 
Department of Defense World Geodetic System 1984 Technical Report. Part I
and II. Washington, DC: Defense Mapping Agency

History of the Code
-------------------

Originally based on C code written by Chuck Gantz for UTM calculations:

* http://www.gpsy.com/gpsinfo/geotoutm/
* chuck.gantz@globalstar.com

Converted from C to JavaScript by Grant Wong for use in the USGS National Map Project in August 2002.

Modifications and developments continued by Doug Tallman from December 2002 through 2004 for the USGS National Map viewer

Adopted with modifications by Larry Moore, January 2007, for GoogleMaps application.

Adopted with formatting and organization modifications by T. Jameson Little, May 2011, for addition to NPM. Some additional conversions were also made by the same.
