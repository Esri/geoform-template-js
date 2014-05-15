/*global Offline */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "esri/toolbars/edit",
    "esri/layers/FeatureLayer",
    "edit/offlineFeaturesManager",
    "edit/editsStore",
    "esri/dijit/editing/Editor",
    "esri/dijit/editing/TemplatePicker"
], function (
    declare,
    lang,
    array,
    on,
    Edit,
    FeatureLayer,
    OfflineFeaturesManager,
    editsStore,
    Editor,
    TemplatePicker
) {
    return declare(null, {
        
        // create class
        constructor: function (options) {
            
            this.defaults = options;
            
            // create offline manager
            this.offlineFeaturesManager = new OfflineFeaturesManager();
            
            // add layer
            var fsUrl = "http://services2.arcgis.com/CQWCKwrSm5dkM28A/arcgis/rest/services/Military/FeatureServer/1";
            var layer = new FeatureLayer(fsUrl, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                outFields: ['*']
            });
            this.defaults.map.addLayer(layer);
            on.once(layer, 'load', lang.hitch(this, this.initEditor));

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
            this.offlineFeaturesManager.goOnline(lang.hitch(this, function () {
                this.updateConnectivityIndicator();
            }));
            this.updateConnectivityIndicator();
        },

        // now offline
        goOffline: function () {
            this.offlineFeaturesManager.goOffline();
        },

        // setup editing
        initEditor: function (evt) {
            var layer = evt.layer;
 
                /* extend layer with offline detection functionality */
    
       
                this.offlineFeaturesManager.extend(layer);
                
            
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

                    if (errors.length) {
                        console.log(errors);
                    }
                });
         

            

                /* template picker */
            
                // var templateLayers = array.map(evt.layers, function(result){return result.layer;});
            
      
                var templatePicker = new TemplatePicker({
                    featureLayers: [layer],
                    grouping: true,
                    rows: "auto",
                    columns: 3,
                }, "templateDiv");
                templatePicker.startup();

                /* editor */
                //var layers = evt.layers.map(function(result){return {featureLayer: result.layer};});
         
                var settings = {
                    map: this.defaults.map,
                    templatePicker: templatePicker,
                    layerInfos: [{
                        featureLayer: layer
                    }],
                    toolbarVisible: true,
                    enableUndoRedo: true,
                    maxUndoRedoOperations: 15,
                    createOptions: {
                        polylineDrawTools: [
                           Editor.CREATE_TOOL_FREEHAND_POLYLINE,
                           Editor.CREATE_TOOL_POLYLINE
                        ],
                        polygonDrawTools: [
                           Editor.CREATE_TOOL_FREEHAND_POLYGON,
                           Editor.CREATE_TOOL_POLYGON,
                           Editor.CREATE_TOOL_RECTANGLE
                        ]
                    },
                    toolbarOptions: {
                        reshapeVisible: false
                    }
                };

                var editor = new Editor({
                    settings: settings
                }, 'editorDiv');
            
                editor.startup();

                console.log("ok!");
       
           
                if (Offline.state === 'up') {
                    // if we have pending edits from previous executions and we are online, then try to replay them
                    this.goOnline();
                }
           
        }
    });
});