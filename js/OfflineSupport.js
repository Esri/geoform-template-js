/*global Offline */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom-construct",
    "esri/toolbars/edit",
    "edit/offlineFeaturesManager",
    "edit/editsStore",
    "esri/dijit/editing/Editor"
], function (
    declare,
    lang,
    array,
    on,
    domConstruct,
    Edit,
    OfflineFeaturesManager,
    editsStore,
    Editor
) {
    return declare(null, {
        // create class
        constructor: function (options) {
            // save defaults
            this.defaults = options;
            // create offline manager
            this.offlineFeaturesManager = new OfflineFeaturesManager();
            // once layer is loaded
            if(this.defaults.layer.loaded){
                this.initEditor();
            }
            else{
                on.once(this.defaults.layer, 'load', lang.hitch(this, this.initEditor));   
            }
            // update indicator and check status
            this.updateConnectivityIndicator();
            Offline.check();
            Offline.on('up', lang.hitch(this, this.goOnline));
            Offline.on('down', lang.hitch(this, this.goOffline));
        },

        // update online status
        updateConnectivityIndicator: function () {
            switch (this.offlineFeaturesManager.getOnlineStatus()) {
            case this.offlineFeaturesManager.OFFLINE:
                console.log('offline');
                break;
            case this.offlineFeaturesManager.ONLINE:
                console.log('online');
                break;
            case this.offlineFeaturesManager.RECONNECTING:
                console.log('reconnecting');
                break;
            }
        },

        // now online
        goOnline: function () {
            // go online and then update status
            this.offlineFeaturesManager.goOnline(lang.hitch(this, function () {
                this.updateConnectivityIndicator();
            }));
            // update status
            this.updateConnectivityIndicator();
        },

        // now offline
        goOffline: function () {
            // go offline
            this.offlineFeaturesManager.goOffline();
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

        }
    });
});