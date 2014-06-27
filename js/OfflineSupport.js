/*global Offline, $ */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-construct",
    "edit/offlineFeaturesManager",
    "esri/dijit/editing/Editor",
    "dojo/i18n!application/nls/resources"
], function (
    declare,
    lang,
    on,
    dom, domConstruct,
    OfflineFeaturesManager,
    Editor,
    i18n
) {
    return declare(null, {
        // create class
        constructor: function (options) {
            // save defaults
            this.defaults = options;
            // create offline manager
            this.offlineFeaturesManager = new OfflineFeaturesManager();
            // once layer is loaded
            if (this.defaults.layer.loaded) {
                this.initEditor();
            } else {
                on.once(this.defaults.layer, 'load', lang.hitch(this, this.initEditor));
            }
            Offline.check();
            Offline.on('up', lang.hitch(this, function () {
                this.goOnline();

            }));
            Offline.on('down', lang.hitch(this, function () {
                this.goOffline();
            }));
        },

        // update online status
        updateConnectivityIndicator: function () {
            var html;
            var status = this.offlineFeaturesManager.getOnlineStatus();
            switch (status) {
            case this.offlineFeaturesManager.OFFLINE:
                html = '<span class="text-danger"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + i18n.onlineStatus.offline + '</span>';
                break;
            case this.offlineFeaturesManager.RECONNECTING:
                html = '<span class="text-warning"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + i18n.onlineStatus.reconnecting + '</span>';
                break;
            }
            var submitButton = $('#submit_container');
            if (submitButton) {
                submitButton.popover('destroy');
                if (html) {
                    var options = {
                        html: true,
                        animation: true,
                        trigger: 'manual',
                        title: i18n.onlineStatus.title,
                        content: html
                    };
                    submitButton.popover(options);
                    submitButton.popover('show');
                    if (status !== this.offlineFeaturesManager.OFFLINE) {
                        setTimeout(function () {
                            submitButton.popover('hide');
                        }, 5000);
                    }
                }
            }
        },

        // now online
        goOnline: function () {
            // go online and then update status
            this.offlineFeaturesManager.goOnline(lang.hitch(this, function () {
                this.updateConnectivityIndicator();
            }));
        },

        // now offline
        goOffline: function () {
            // go offline
            this.offlineFeaturesManager.goOffline();
            this.updateConnectivityIndicator();
        },

        // setup editing
        initEditor: function () {
            /* extend layer with offline detection functionality */
            this.offlineFeaturesManager.extend(this.defaults.layer);
            /* handle errors that happen while storing offline edits */
            this.offlineFeaturesManager.on(this.offlineFeaturesManager.events.EDITS_ENQUEUED, function (results) {
                var errors = Array.prototype.concat(
                    results.addResults.filter(function (r) {
                        return !r.success;
                    }),
                    results.updateResults.filter(function (r) {
                        return !r.success;
                    }),
                    results.deleteResults.filter(function (r) {
                        return !r.success;
                    })
                );
                // log errors  
                if (errors.length) {
                    console.log(errors);
                }
            });
            // editor settings
            var settings = {
                map: this.defaults.map,
                layerInfos: [{
                    featureLayer: this.defaults.layer
                }]
            };
            // create editor
            var editor = new Editor({
                settings: settings
            }, domConstruct.create('div'));
            // start editor
            editor.startup();
            // if online
            if (Offline.state === 'up') {
                // if we have pending edits from previous executions and we are online, then try to replay them
                this.goOnline();
            }
            // update indicator and check status
            this.updateConnectivityIndicator();
        }
    });
});