/*
 | Copyright 2016 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([

  "boilerplate/ItemHelper",

  "boilerplate/UrlParamHelper",

  "dojo/i18n!./nls/resources",

  "dojo/_base/declare",
  "dojo/_base/lang",

  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-class",

  "dojo/Deferred",

  "./FormJSON",

  "dojo/domReady!"

], function (
  ItemHelper, UrlParamHelper,
  i18n,
  declare, lang,
  dom, domAttr, domClass,
  Deferred,
  FormJSON
) {

  // todo: ability to pick a second webmap for selecting a location.

  //--------------------------------------------------------------------------
  //
  //  Static Variables
  //
  //--------------------------------------------------------------------------

  var CSS = {
    loading: "boilerplate--loading",
    error: "boilerplate--error",
    errorIcon: "esri-icon-notice-round"
  };

  return declare(null, {

    //--------------------------------------------------------------------------
    //
    //  Lifecycle
    //
    //--------------------------------------------------------------------------

    constructor: function (boilerplateResponse) {
      this._formJSON = new FormJSON();
      this.boilerplateResponse = boilerplateResponse;
    },

    //--------------------------------------------------------------------------
    //
    //  Variables
    //
    //--------------------------------------------------------------------------

    config: null,

    direction: null,

    //--------------------------------------------------------------------------
    //
    //  Public Methods
    //
    //--------------------------------------------------------------------------

    init: function () {
      var boilerplateResponse = this.boilerplateResponse;
      if (boilerplateResponse) {
        this.direction = boilerplateResponse.direction;
        this.config = boilerplateResponse.config;
        this.settings = boilerplateResponse.settings;

        document.documentElement.lang = boilerplateResponse.locale;

        this.urlParamHelper = new UrlParamHelper();
        this.itemHelper = new ItemHelper();

        this._setDirection();

        var boilerplateResults = boilerplateResponse.results;
        var webMapItem = boilerplateResults.webMapItem;
        var webSceneItem = boilerplateResults.webSceneItem;
        var item = webMapItem || webSceneItem;
        var itemData = item && item.data;

        this._setItemDefaults(itemData);

        return this._createMap(item).then(function (map) {
          return map.load().then(function (loadedMap) {
            var layers = this._getFormLayers(loadedMap);
            var layerJSON = this.getLayerJSON(layers[0]);
            this.map = loadedMap;
            this.activeJSON = layerJSON;
            return layerJSON;
          }.bind(this));
        }.bind(this));

      }
      else {
        var def = new Deferred();
        def.reject(new Error("app: Boilerplate is undefined"));
        return def.promise;
      }
    },

    createView: function (element) {
      var map = this.map;
      if (element && map) {
        var type = map.portalItem.type;
        var viewType;
        if (type === "Web Map") {
          viewType = "esri/views/MapView";
        }
        else if (type === "Web Scene") {
          viewType = "esri/views/SceneView";
        }
        if (viewType) {
          require([viewType, "esri/widgets/Search", "esri/widgets/Locate"], function (ViewType, Search, Locate) {
            var view = new ViewType({
              map: map
            });

            var locateWidget = new Locate({
              view: view
            });
            view.ui.add(locateWidget, "top-left");

            var searchWidget = new Search({
              view: view,
              popupEnabled: false,
              popupOpenOnSelect: false
            });
            view.ui.add(searchWidget, "top-right");

            this.view = view;
            setTimeout(function () {
              view.container = element;
            }, 500);
          }.bind(this));
        }
      }
    },

    getLayerJSON: function (layer) {
      if (layer) {
        return this._loadLayer(layer).then(function (layer) {
          var formJSON = this.config.form && this.config.form[layer.id];
          if (!formJSON) {
            formJSON = this._formJSON.generate(layer.fields);
            var fieldInfos = layer.popupTemplate && layer.popupTemplate.fieldInfos;
            if (fieldInfos && fieldInfos.length) {
              this._formJSON.addFieldInfos(fieldInfos, formJSON);
            }
            // todo: remove
            /*
            var layerFormJSON = {};
            layerFormJSON[layer.id] = formJSON;
            var test = JSON.stringify(layerFormJSON);
            console.log(test);
            */
          }
          formJSON.form.push({
            "type": "arcgis",
            "title": "Select a location",
            "description": "Specify the location for this entry by clicking/tapping the map or by using one of the following options."
          }, {
            "type": "actions",
            "items": [{
              "type": "submit",
              "style": "btn-primary",
              "title": i18n.schema.submit
            }, {
              "type": "button",
              "onClick": "resetForm()",
              "title": i18n.schema.reset
            }]
          });
          return formJSON;
        }.bind(this));
      }
      else {
        var def = new Deferred();
        def.reject(new Error("app: No Form layers present"));
        return def.promise;
      }
    },

    ready: function () {
      domClass.remove(document.body, CSS.loading);
      document.title = this.config.title;
    },

    reportError: function (error) {
      // remove loading class from body
      domClass.remove(document.body, CSS.loading);
      domClass.add(document.body, CSS.error);
      // an error occurred - notify the user. In this example we pull the string from the
      // resource.js file located in the nls folder because we've set the application up
      // for localization. If you don't need to support multiple languages you can hardcode the
      // strings here and comment out the call in index.html to get the localization strings.
      // set message
      var node = dom.byId("loading_message");
      if (node) {
        node.innerHTML = "<h1><span class=\"" + CSS.errorIcon + "\"></span> " + i18n.error + "</h1><p>" + error.message + "</p>";
      }
      return error;
    },

    //--------------------------------------------------------------------------
    //
    //  Private Methods
    //
    //--------------------------------------------------------------------------

    _setItemDefaults: function (itemData) {
      if (itemData) {
        if (!this.config.title) {
          this.config.title = itemData.title;
        }
        if (!this.config.description) {
          if (itemData.snippet) {
            this.config.description = "<p>" + itemData.snippet + "</p>";
          }
          else if (itemData.description) {
            this.config.description = itemData.description;
          }
        }
        if (!this.config.logo) {
          this.config.logo = itemData.thumbnailUrl;
        }
      }
    },

    _createMap: function (item) {
      var type = item && item.data && item.data.type;
      if (type === "Web Map") {
        return this.itemHelper.createWebMap(item);
      }
      else if (type === "Web Scene") {
        return this.itemHelper.createWebScene(item);
      }
      else {
        var def = new Deferred();
        def.reject(new Error("app: webmap or webscene not defined"));
        return def.promise;
      }
    },

    _getFormLayers: function (map) {
      var formLayers = [];
      var layers = map.layers;
      var layerId = this.config.layer && this.config.layer.id;

      if (layerId) {
        var layer = layers.find(function (lyr) {
          return lyr.id === layerId;
        });
        if (layer) {
          formLayers.push(layer);
        }
      }

      if (!formLayers.length) {
        layers.forEach(function (lyr) {
          if (lyr.declaredClass === "esri.layers.FeatureLayer") {
            formLayers.push(lyr);
          }
        });
      }

      return formLayers;
    },

    _loadLayer: function (layer) {
      if (!layer.loaded) {
        return layer.load();
      }
      else {
        var def = new Deferred();
        def.resolve(layer);
        return def.promise;
      }
    },

    _setDirection: function () {
      var direction = this.direction;
      var dirNode = document.getElementsByTagName("html")[0];
      domAttr.set(dirNode, "dir", direction);
    }

  });
});
