/*global $,define,document,Storage */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/ready",
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dojo/domReady!"
], function (ready, declare, _WidgetBase) {
    return declare([_WidgetBase], {
        startup: function () {
            var localStorageSupport;
            try {
                var mod = 'modernizr';
                localStorage.setItem(mod, mod);
                localStorage.removeItem(mod);
                localStorageSupport = true;
            } catch (e) {
                localStorageSupport = false;
            }
            return localStorageSupport
        }
    });
});