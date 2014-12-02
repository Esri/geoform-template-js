var saved = define.amd;
define.amd = false;
define([
  "application/wrapper/main-jquery-deps",
  "js/vendor/summernote/summernote.min.js",
  "js/vendor/jquery-ui/js/jquery-ui-1.10.4.custom.min.js",
  "js/vendor/jquery.ui.touch-punch.min.js"
], function () {
  define.amd = saved;
});