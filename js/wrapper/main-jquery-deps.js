var saved = define.amd;
define.amd = false;
define([
  "js/vendor/jquery.min.js",
  "js/vendor/moment-with-langs.min.js",
  "js/vendor/bootstrap-3.3.0-dist/js/bootstrap.min.js",
  "js/vendor/bootstrap-datetimepicker/js/bootstrap-datetimepicker.min.js",
  "js/vendor/touch-spinner/jquery.bootstrap-touchspin.min.js"
], function () {
  define.amd = saved;
});