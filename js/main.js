/*global define,document */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/arcgis/utils",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/on",
    "application/bootstrapmap",
    "esri/toolbars/edit",
    "esri/layers/FeatureLayer",
    "edit/offlineFeaturesManager",
    "edit/editsStore",
    "esri/dijit/editing/Editor",
    "esri/dijit/editing/TemplatePicker",
    "dojo/_base/array",
    "dojo/domReady!"
], function (
    ready,
    declare,
    lang,
    arcgisUtils,
    dom,
    domClass,
    on,
    bootstrapmap,
    Edit, FeatureLayer,
    OfflineFeaturesManager, editsStore,
    Editor, TemplatePicker,
    array
) {
    return declare(null, {
        config: {},
        startup: function (config) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                // document ready
                ready(lang.hitch(this, function () {
                    //supply either the webmap id or, if available, the item info
                    var itemInfo = this.config.itemInfo || this.config.webmap;
                    this._createWebMap(itemInfo);
                }));
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }
        },
        reportError: function (error) {
            // remove loading class from body
            domClass.remove(document.body, "app-loading");
            domClass.add(document.body, "app-error");
            // an error occurred - notify the user. In this example we pull the string from the
            // resource.js file located in the nls folder because we've set the application up
            // for localization. If you don't need to support multiple languages you can hardcode the
            // strings here and comment out the call in index.html to get the localization strings.
            // set message
            var node = dom.byId("loading_message");
            if (node) {
                if (this.config && this.config.i18n) {
                    node.innerHTML = this.config.i18n.map.error + ": " + error.message;
                } else {
                    node.innerHTML = "Unable to create map: " + error.message;
                }
            }
        },
        // Map is ready
        _mapLoaded: function () {
            // remove loading class from body
            domClass.remove(document.body, "app-loading");
            // your code here!
            function updateConnectivityIndicator()
            {
                switch( offlineFeaturesManager.getOnlineStatus() )
                {
                    case offlineFeaturesManager.OFFLINE:
                        console.log('offline');
                        break;
                    case offlineFeaturesManager.ONLINE:
                        console.log('online');
                        break;
                    case offlineFeaturesManager.RECONNECTING:
                        console.log('reconnecting');
                        break;
                }
            }
            
            function goOnline()
            {
                offlineFeaturesManager.goOnline(function()
                {
                    
                    updateConnectivityIndicator();
                });
                updateConnectivityIndicator();
            }

            function goOffline()
            {
                offlineFeaturesManager.goOffline();
            }
 
            var offlineFeaturesManager = new OfflineFeaturesManager();
         
            
            updateConnectivityIndicator();
      
            Offline.check();
            Offline.on('up', goOnline );
            Offline.on('down', goOffline );
            
            
            
            
            
            //this.map.on('layer-add-result', initEditor);

		var fsUrl = "http://services2.arcgis.com/CQWCKwrSm5dkM28A/arcgis/rest/services/Military/FeatureServer/1";

			var layer = new FeatureLayer(fsUrl, {
				mode: FeatureLayer.MODE_SNAPSHOT,
				outFields: ['*']
			});
		      
		

		this.map.addLayer(layer);
        on.once(layer, 'load', initEditor); 
        //initEditor(layer);

		//////////////////////////////////////

        var that = this;
		function initEditor(evt)
		{
            var layer = evt.layer;
            //console.log(evt);
			try {
			
				/* extend layer with offline detection functionality */
		
                
					
					offlineFeaturesManager.extend(layer);
					
                
               
				/* handle errors that happen while storing offline edits */
				offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_ENQUEUED, function(results)
				{
					var errors = Array.prototype.concat(
						results.addResults.filter(function(r){ return !r.success }),
						results.updateResults.filter(function(r){ return !r.success }),
						results.deleteResults.filter(function(r){ return !r.success }) 
					);

					if( errors.length )
					{
                        console.log(errors);
						//var messages = errors.map(function(e){ return e.error.message });
						//alert("Error editing features: " + messages.join('\n'));
					}
				});
			}
			catch(err)
			{
				console.log(err);
			}

			try {
                
				/* template picker */
				//var templateLayers = evt.layers.map(function(result){return result.layer;});
				
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
					map: that.map,
					templatePicker: templatePicker,
					layerInfos: [{featureLayer:layer}],
					toolbarVisible: true,
					enableUndoRedo: true,
					maxUndoRedoOperations: 15,
					createOptions: {
						polylineDrawTools: [ 
							Editor.CREATE_TOOL_FREEHAND_POLYLINE,
							Editor.CREATE_TOOL_POLYLINE ],
						polygonDrawTools: [
							Editor.CREATE_TOOL_FREEHAND_POLYGON,
							Editor.CREATE_TOOL_POLYGON,
							Editor.CREATE_TOOL_RECTANGLE ]
					},
					toolbarOptions: {
						reshapeVisible: false
					}
				};

				editor = new Editor({ settings: settings }, 'editorDiv');
				editor.startup();

				console.log("ok!");
			}
			catch(err)
			{
				console.log(err);
			}

			try {
				if( Offline.state === 'up' )
				{
					// if we have pending edits from previous executions and we are online, then try to replay them
					goOnline();
				}
			} 
			catch(err)
			{
				console.log(err);
			}
		}
            
            
            
            
          
            $( document ).ready(function() {
              $('.datepicker').datepicker();
            });
          
          
        },
        // create a map based on the input web map id
        _createWebMap: function (itemInfo) {
            arcgisUtils.createMap(itemInfo, "mapDiv", {
                mapOptions: {
                    smartNavigation: false,
                    autoResize: false
                    // Optionally define additional map config here for example you can
                    // turn the slider off, display info windows, disable wraparound 180, slider position and more.
                },
                bingMapsKey: this.config.bingKey
            }).then(lang.hitch(this, function (response) {
                // Once the map is created we get access to the response which provides important info
                // such as the map, operational layers, popup info and more. This object will also contain
                // any custom options you defined for the template. In this example that is the 'theme' property.
                // Here' we'll use it to update the application to match the specified color theme.
                // console.log(this.config);
                this.map = response.map;
              
                var bsm = new bootstrapmap(this.map);
              
              
                // make sure map is loaded
                if (this.map.loaded) {
                    // do something with the map
                    this._mapLoaded();
                } else {
                    on.once(this.map, "load", lang.hitch(this, function () {
                        // do something with the map
                        this._mapLoaded();
                    }));
                }
            }), this.reportError);
        }
    });
});