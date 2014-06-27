/*global $,define,document,Storage */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/_base/declare",
    "dojo/domReady!"
], function (declare) {
    return declare(null, {
        supportsStorage: function () {
            var localStorageSupport;
            try {
                var mod = 'modernizr';
                localStorage.setItem(mod, mod);
                localStorage.removeItem(mod);
                localStorageSupport = true;
            } catch (e) {
                localStorageSupport = false;
            }
            return localStorageSupport;
        }
    });
});