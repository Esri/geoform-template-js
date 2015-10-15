/*global $,define,document*/
/*jslint sloppy:true,nomen:true */
define([
        "dojo/_base/declare",
        "dojo/dom",
        "dojo/string",
        "dojo/_base/lang",
        "dojo/query",
        "dojo/_base/array",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/on",
        "application/themes",
        "dojo/dom-construct",
        "dojo/dom-attr",
        "esri/arcgis/utils",
        "dojo/Deferred",
        "dojo/promise/all",
        "esri/geometry/Point",
        "esri/layers/GraphicsLayer",
        "esri/graphic",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "application/ShareModal",
        "dojo/text!views/modal.html",
        "dojo/text!views/viewer.html",
        "dojo/i18n!application/nls/resources",
        "esri/dijit/Legend",
        "esri/layers/FeatureLayer",
        "esri/tasks/locator",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "esri/dijit/BasemapToggle",
        "esri/lang",
        "esri/dijit/Search",
        "vendor/bootstrapmap",
        "esri/geometry/Extent",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/Color",
        "dijit/registry",
        "dojo/parser",
        "dijit/a11yclick",
        "application/wrapper/main-jquery-deps",
        "dojo/domReady!"
], function (
  declare,
  dom,
  string,
  lang,
  query,
  array,
  domClass,
  domStyle,
  on,
  theme,
  domConstruct,
  domAttr,
  arcgisUtils,
  Deferred,
  all,
  Point,
  GraphicsLayer,
  Graphic, BorderContainer, ContentPane, ShareModal, modalTemplate, ViewerTemplate, nls, Legend, FeatureLayer,
  Locator, Query, QueryTask, BasemapToggle, esriLang, Search, bootstrapmap, Extent, SimpleMarkerSymbol, SimpleLineSymbol, Color, registry, parser, a11yclick) {
  return declare([], {
    layerClickHandle: null,
    nls: nls,
    config: {},
    map: null,
    _mapLegend: null,
    themes: theme,
    localStorageSupport: null,
    currentFeatureIndex: null,
    carouselPaulData: {},
    attributesArray: [],
    iconPathSVG: null,
    featureCount: 0,
    pageIndex: 0,
    layerPagination: [],
    numberOfRecords: 20,
    totalRecordsDisplayed: 0,
    totalNumberOfRecords: 0,
    activeElementId: null,
    constructor: function () {
      this.css = {
        mobileSearchDisplay: "mobile-locate-box-display"
      };
    },

    startup: function () {
      var config = arguments[0];
      // config will contain application and user defined info for the template such as i18n strings, the web map id
      // and application id
      // any url parameters and any application specific configuration information.
      if (config) {
        this.config = config;
        if (this.config.disableViewer) {
          this._reportError(nls.viewer.appLoadingFailedMessage);
        }
        this._init();
      } else {
        alert(nls.viewer.unavailableConfigMessage);
      }
      // modal i18n
      var modalTemplateSub = string.substitute(modalTemplate, {
        id: "myModal",
        labelId: "myModalLabel",
        title: "",
        close: nls.user.close
      });
      // place modal code
      domConstruct.place(modalTemplateSub, document.body, 'last');
      on(dom.byId("shareDialog"), a11yclick, lang.hitch(this, function () {
        this._openShareModal();
      }));
      on(dom.byId("shareDialogMobileView"), a11yclick, lang.hitch(this, function () {
        this._openShareModal();
      }));
      on(dom.byId("btnSortByOrder"), a11yclick, lang.hitch(this, function () {
        this.activeElementId = null;
        domStyle.set(dom.byId("featureDetailsContainer"), "display", "none");
        this.selectedGraphics.clear();
        this._sortByOrder();
      }));
      on(dom.byId("search"), a11yclick, lang.hitch(this, function (evt) {
        this._navigatePanel(evt.currentTarget);
      }));
      on(dom.byId("aboutus"), a11yclick, lang.hitch(this, function (evt) {
        this._navigatePanel(evt.currentTarget);
      }));
      on(dom.byId("mapOption"), a11yclick, lang.hitch(this, function (evt) {
        this._navigatePanel(evt.currentTarget);
      }));
      on(dom.byId("legend"), a11yclick, lang.hitch(this, function (evt) {
        this._navigatePanel(evt.currentTarget);
      }));
      on(dom.byId("closeButton"), a11yclick, function () {
        domStyle.set(dom.byId("featureDetailsContainer"), 'display', 'none');
      });
      this.iconPathSVG = "M 1784,238 1805,238 1805,259 1784,259 1784,238 M 1777,248 1784,248 M 1794,231 1794,238 M 1812,248 1805,248 M 1794,266 1794,259";
      this.selectedGraphics = new GraphicsLayer({
        id: "highlightedGraphic"
      });
      //Set Dynamic height of PanelBody in the left panel for large screen devices
      on(window, "resize", lang.hitch(this, function () {
        var HeaderNode = query('.navbar-nav', dom.byId("panelHeader"));
        if ($(window).width() > 767) {
          domClass.remove(dom.byId("panelHeader"), "navbar-fixed-bottom");
          domClass.replace(dom.byId("panelHeader"), "navbar-default", "navbar-inverse");
          //Set Dynamic height of PanelBody in the left panel for large screen devices
          this._setLeftPanelDimension();
          domConstruct.place(dom.byId("mapDiv"), dom.byId("mapLayoutContainer"), "first");
          domConstruct.place(dom.byId("featureDetailsContainer"), dom.byId("mapLayoutContainer"), "last");
          this._resizeMap();
          //Making search tab active for large screen devices
          if (HeaderNode[0]) {
            array.some(HeaderNode[0].children, function (currentElement, index) {
              if (index === 1) {
                domClass.add(HeaderNode[0].children[index], "active");
              } else {
                setTimeout(function () {
                  HeaderNode[0].children[index].blur();
                }, 0);
                domClass.remove(HeaderNode[0].children[index], "active");
              }
            });
          }
          this._navigatePanel(dom.byId("search"));
        } else {
          domClass.replace(dom.byId("panelHeader"), "navbar-inverse", "navbar-default");
          domClass.add(dom.byId("panelHeader"), "navbar-fixed-bottom");
          this._moveMapContainer();
          this._resizeSearchPanel();
        }
      }));
    },
    //Function to show the panel body of current active tab
    _navigatePanel: function (activeNode) {
      var activeNodeId;
      query(".panelBody").forEach(function (node) {
        domStyle.set(node, 'display', 'none');
      });
      if (domAttr.get(activeNode, "id") === "mapOption") {
        domStyle.set(dom.byId('mapPanelBody'), 'display', 'block');
        domConstruct.place(dom.byId("mapDiv"), dom.byId("mapPanelBody"), "first");
        this._resizeMap();
        domConstruct.place(dom.byId("featureDetailsContainer"), dom.byId("mapPanelBody"), "last");
      } else {
        activeNodeId = activeNode.id + 'PanelBody';
        domStyle.set(dom.byId(activeNodeId), 'display', 'block');
      }
    },

    _showMapTab: function () {
      //Arrange the navigation pane on small screen devices
      this._activateMapTabOption();
      domStyle.set(dom.byId("aboutusPanelBody"), 'display', 'none');
      domStyle.set(dom.byId("legendPanelBody"), 'display', 'none');
      domStyle.set(dom.byId("searchPanelBody"), 'display', 'none');
      domStyle.set(dom.byId("mapPanelBody"), 'display', 'block');
    },

    _reportError: function (error) {
      var node;
      // remove loading class from body
      domClass.remove(document.body, "app-loading");
      domClass.add(document.body, "app-error");
      // an error occurred - notify the user. In this example we pull the string from the
      // resource.js file located in the nls folder because we've set the application up
      // for localization. If you don't need to support multiple languages you can hardcode the
      // strings here and comment out the call in index.html to get the localization strings.
      // set message
      node = dom.byId("loading_message");
      if (node) {
        domAttr.set(node, "innerHTML", error);
      }
    },

    //Change map div's parent as per screen resolution and setting dynamic height to PanelBody contents
    _moveMapContainer: function () {
      var diffHeightMobileView;
      domConstruct.place(dom.byId("mapDiv"), dom.byId("mapPanelBody"), "first");
      domConstruct.place(dom.byId("featureDetailsContainer"), dom.byId("mapPanelBody"), "last");
      this._activateMapTabOption();
      this._navigatePanel(dom.byId("mapOption"));
      //Set Dynamic height of PanelBody in the left panel for small screen devices
      diffHeightMobileView = domStyle.get(dom.byId("navHeader"), "height") + domStyle.get(dom.byId("viewer_pills"), "height");
      query(".panelBody").forEach(function (node) {
        domStyle.set(node, "height", ($(window).height() - diffHeightMobileView) + "px");
      });
      this._resizeMap();
    },

    // set Dynamic height of formList in the left panel for small screen devices
    _resizeSearchPanel: function () {
      var navbarHeight;
      if (domStyle.get(dom.byId("layerSelectBox"), "display") === 'block') {
        navbarHeight = domStyle.get(dom.byId("selectBoxWrapper"), "height") + domStyle.get(dom.byId("submitFormNode"), "height") + 220;
        domStyle.set(dom.byId('formList'), "height", ($('#searchPanelBody').height() - navbarHeight) + "px");
      } else {
        navbarHeight = domStyle.get(dom.byId("selectBoxWrapper"), "height") + domStyle.get(dom.byId("submitFormNode"), "height") + 136;
        domStyle.set(dom.byId('formList'), "height", ($('#searchPanelBody').height() - navbarHeight) + "px");
      }
    },

    //Function to resize map with respect to the screen resolution.
    _resizeMap: function () {
      try {
        var mapCenter;
        registry.byId("mainContainer").resize();
        domStyle.set(dom.byId("mapDiv"), "height", "100%");
        domStyle.set(dom.byId("mapDiv"), "width", "100%");
        mapCenter = this.map.extent.getCenter();
        setTimeout(lang.hitch(this, function () {
          this.map.resize();
          this.map.reposition();
          this.map.centerAt(mapCenter);
        }), 0);
      } catch (err) {}
    },

    //Arrange the navigation pane on small screen devices
    _activateMapTabOption: function () {
      var HeaderNode = query('.navbar-nav', dom.byId("panelHeader"));
      array.some(HeaderNode[0].children, function (currentNode) {
        if (domClass.contains(currentNode, "active") && domAttr.get(currentNode, "id") !== "mapOption") {
          setTimeout(function () {
            currentNode.children[0].blur();
            dom.byId("mapOption").focus();
          }, 0);
          domClass.remove(currentNode, "active");
          return true;
        }
      });
      domClass.add(dom.byId("mapOption"), "active");
    },

    _init: function () {
      var viewerHTML, testTemplate, itemInfo;
      domClass.remove(document.body, "claro");
      viewerHTML = string.substitute(ViewerTemplate, nls);
      testTemplate = domConstruct.toDom(viewerHTML);
      parser.parse(testTemplate);
      if (!this.config.theme) {
        // lets use bootstrap theme!
        this.config.theme = "basic";
      }
      // set theme
      this._switchStyle(this.config.theme);
      domConstruct.place(registry.byId("mainContainer").domNode, document.body);
      registry.byId("mainContainer").startup();
      registry.byId("mainContainer").resize();
      itemInfo = this.config.itemInfo || this.config.webmap;
      this._createWebMap(itemInfo);
    },

    //Function to set the theme for application
    _switchStyle: function (themeName) {
      array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
        if (themeName == currentTheme.id && currentTheme.url) {
          var themeNode = domConstruct.create("link", {
            rel: "stylesheet",
            type: "text/css",
            href: currentTheme.url
          });
          domConstruct.place(themeNode, query("head")[0]);
          // Add identifying theme class to the body
          domClass.add(document.body, "geoform-" + currentTheme.id);
        }
      }));
    },

    // Open modal
    _openShareModal: function () {
      // destroy modal if it exists
      if (this._ShareModal) {
        this._ShareModal.destroy();
      }
      // create modal content
      this._createShareDlgContent();
      // create modal
      this._ShareModal = new ShareModal({
        bitlyLogin: this.config.bitlyLogin,
        bitlyKey: this.config.bitlyKey,
        image: this.config.sharinghost + '/sharing/rest/content/items/' + this.config.itemInfo.item.id + '/info/' + this.config.itemInfo.item.thumbnail,
        title: this.config.details.Title || nls.user.geoformTitleText || '',
        summary: this.config.itemInfo.item.snippet || '',
        hashtags: 'esriGeoForm',
        shareOption: this.config.enableSharing
      });
      this._ShareModal.startup();
      // show modal
      $("#myModal").modal('show');
    },

    // Share modal content
    _createShareDlgContent: function () {
      var iconContainer, group;
      // empty modal node
      domConstruct.empty(query(".modal-body")[0]);
      // set modal title
      domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.user.shareThisForm);
      // create nodes for modal
      iconContainer = domConstruct.create("div", {
        className: "iconContainer"
      }, query(".modal-body")[0]);
      if (this.config.enableSharing) {
        domConstruct.create("p", {
          innerHTML: nls.user.shareUserTextMessage
        }, iconContainer);
        domConstruct.create("a", {
          "tabindex": "0",
          className: "fa fa-facebook-square iconClass text-primary",
          id: "facebookIcon"
        }, iconContainer);
        domConstruct.create("a", {
          "tabindex": "0",
          className: "fa fa-twitter-square iconClass text-primary",
          id: "twitterIcon"
        }, iconContainer);
        domConstruct.create("a", {
          "tabindex": "0",
          className: "fa fa-google-plus-square iconClass text-primary",
          id: "google-plusIcon"
        }, iconContainer);
      }
      domConstruct.create("a", {
        "tabindex": "0",
        className: "fa fa-envelope iconClass text-primary",
        id: "mailIcon"
      }, iconContainer);
      domConstruct.create("div", {
        className: "clearfix"
      }, iconContainer);
      domConstruct.create("h3", {
        innerHTML: nls.user.shareModalFormText
      }, iconContainer);
      group = domConstruct.create("div", {
        className: "input-group"
      }, iconContainer);
      domConstruct.create("span", {
        className: "input-group-addon",
        innerHTML: "<span class=\"glyphicon glyphicon-link\"></span>"
      }, group);
      domConstruct.create("input", {
        type: "text",
        className: "form-control",
        id: "shareMapUrlText"
      }, group);
    },

    // create a map based on the input web map id
    _createWebMap: function (itemInfo) {
      bootstrapmap.createWebMap(itemInfo, dom.byId("mapDiv"), {
        editable: true,
        bingMapsKey: this.config.bingKey,
        scrollWheelZoom: true
      }).then(lang.hitch(this, function (response) {
        //Since different themes in bootstrap has different dimensions we need to set the height dynamically
        setTimeout(lang.hitch(this, function () {
          this._resizeMap();
        }), 0);
        this.layerInfos = arcgisUtils.getLegendLayers(response);
        this.map = response.map;
        domAttr.set(dom.byId('appTitle'), "innerHTML", response.itemInfo.item.title ? response.itemInfo.item.title : this.config.details.Title);
        domAttr.set(dom.byId('aboutusPanelBody'), "innerHTML", response.itemInfo.item.description ? response.itemInfo.item.description : "");
        this._initLegend();
        this.defaultExtent = this.map.extent;
        // make graphics layer
        this._gl = new GraphicsLayer();
        this.map.addLayer(this._gl);
        this._setLayerDefaults();
        //Resize map and takes dimensions according to small screen devices on load
        if ($(window).width() <= 767) {
          domClass.replace(dom.byId("panelHeader"), "navbar-inverse", "navbar-default");
          domClass.add(dom.byId("panelHeader"), "navbar-fixed-bottom");
          this._moveMapContainer();
          this._resizeSearchPanel();
        } else {
          this._setLeftPanelDimension();
        }
      }));
    },

    // Setting dynamic height to PanelBody contents
    _setLeftPanelDimension: function () {
      var navbarHeight, diffHeight;
      //Set Dynamic height of PanelBody in the left panel for large screen devices
      diffHeight = domStyle.get(dom.byId("navHeader"), "height") + domStyle.get(dom.byId("viewer_pills"), "height");
      domStyle.set(dom.byId("searchPanelBody"), "height", ($(window).height() - diffHeight) + "px");
      domStyle.set(dom.byId("legendPanelBody"), "height", ($(window).height() - diffHeight) + "px");
      domStyle.set(dom.byId("aboutusPanelBody"), "height", ($(window).height() - diffHeight) + "px");
      setTimeout(lang.hitch(this, function () {
        navbarHeight = domStyle.get(dom.byId("selectBoxWrapper"), "height") + domStyle.get(dom.byId("submitFormNode"), "height") + 25;
        domStyle.set(dom.byId("formList"), "height", ($('#searchPanelBody').height() - navbarHeight) + "px");
        registry.byId("mainContainer").resize();
        this._resizeMap();
      }), 100);
    },

    _executeLayerTasks: function (_formLayer) {
      var toggle, layers;
      if (!this._formLayer.advancedQueryCapabilities.supportsOrderBy) {
        domAttr.set(dom.byId("btnSortByOrder"), "disabled", true);
      }
      this._calculateTotalFeaturesLength(_formLayer);
      if ($(window).width() > 767) {
        this._setLeftPanelDimension();
      }
      domClass.remove(document.body, "app-loading");
      this._createGeocoders();
      if (this.config.enableBasemapToggle) {
        toggle = new BasemapToggle({
          map: this.map,
          basemap: this.config.nextBasemap,
          defaultBasemap: this.config.defaultBasemap
        }, dom.byId("toggleContainer"));
        toggle.startup();
        on.once(this.map, 'basemap-change', lang.hitch(this, function () {
          for (var i = 0; i < layers.length; i++) {
            var layer;
            if (layers[i]._basemapGalleryLayerType) {
              layer = this.map.getLayer(layers[i].id);
              this.map.removeLayer(layer);
            }
          }
        }));
      }
      layers = this.map.getLayersVisibleAtScale(this.map.getScale());
      this._updatePaginationMessage(false);
      on(this.map, "click", lang.hitch(this, function () {
        if (this.map.infoWindow.isShowing) {
          this.map.infoWindow.hide();
        }
      }));
      on(dom.byId("nextFeature"), a11yclick, lang.hitch(this, function () {
        this._resetPaginationArrows(dom.byId("nextFeature"), true);
      }));
      on(dom.byId("prevFeature"), a11yclick, lang.hitch(this, function () {
        this._resetPaginationArrows(dom.byId("prevFeature"), false);
      }));
      on(dom.byId("submitForm"), a11yclick, lang.hitch(this, function (e) {
        var urlString = "index.html";
        urlString = this.config.appid ? urlString + "?appid=" + this.config.appid : urlString;
        window.location.assign(urlString);
        e.stopPropagation();
        e.preventDefault();
      }));
      on(dom.byId("appTitle"), a11yclick, lang.hitch(this, function (e) {
        var urlString = "index.html";
        urlString = this.config.appid ? urlString + "?appid=" + this.config.appid : urlString;
        window.location.assign(urlString);
        e.stopPropagation();
        e.preventDefault();
      }));
    },

    _resetPaginationArrows: function (node, isNextRecord) {
      if (!domClass.contains(node, "disabled")) {
        domClass.remove(node, "disabled");
        if (isNextRecord) {
          this.currentFeatureIndex++;
          if (this.currentFeatureIndex >= this.carouselPaulData.totalFeatures.length) {
            domClass.add(dom.byId("nextFeature"), "disabled");
          }
          domClass.remove(dom.byId("prevFeature"), "disabled");
        } else {
          this.currentFeatureIndex--;
          if (this.currentFeatureIndex <= 0) {
            domClass.add(dom.byId("prevFeature"), "disabled");
          }
          domClass.remove(dom.byId("nextFeature"), "disabled");
        }
        this._updateFeatureDetails(this.carouselPaulData.tableAttributes[this.currentFeatureIndex]);
        this._highlightMapGraphics(this.carouselPaulData.tableAttributes[this.currentFeatureIndex]);
        if ((this.currentFeatureIndex + 1) === this.carouselPaulData.totalFeatures) {
          domClass.add(node, "disabled");
        }
        this._updatePaginationMessage(true);
      }
    },
    //function will  check whether the layer is hosted or not
    //If layer is hosted or layer supports pagination then data will be fetched in small chunks with geometry
    //Otherwise only objectIds and display fields will be fetched
    _queryLayer: function (layer) {
      var queryTask, queryLayer, currentClass, i = 1;
      queryTask = new QueryTask(this._formLayer.url);
      queryLayer = new Query();
      queryLayer.where = "1=1";
      queryLayer.outSpatialReference = this.map.spatialReference;
      if (domClass.contains(dom.byId("btnSortByOrder"), "fa-caret-up")) {
        currentClass = "ASC";
      } else {
        currentClass = "DESC";
      }
      queryLayer.orderByFields = [dom.byId("sortbyInput").value + " " + currentClass];
      if (array.indexOf(this._formLayer.url.split('/'), "rest") == 5) {
        //Hosted layer, data can be fetched in small chunks
        queryLayer.num = this.numberOfRecords; //This value will be configurable
        queryLayer.start = this.featureCount;
        this.featureCount += this.numberOfRecords;
        this.isHosted = true;
        queryLayer.returnGeometry = true;
        queryLayer.outFields = ["*"];
      } else {
        //Fetch all features
        queryLayer.outFields = [layer.objectIdField + "," + this.displayFields + this._formLayer.renderer.attributeField];
        this.isHosted = false;
      }
      if (this.totalRecordsDisplayed === 0) {
        this.totalRecordsDisplayed = this.numberOfRecords;
      }
      queryTask.execute(queryLayer, lang.hitch(this, function (results) {
        var records = [];
        if (this.isHosted) {
          this.layerPagination.push(results.features);
        } else {
          if (results.features.length > this.numberOfRecords) {
            array.forEach(results.features, lang.hitch(this, function (currentFeatureSet, index) {
              //divide the features in small groups
              if (index % this.numberOfRecords === 0 && index !== 0) {
                this.layerPagination.push(records);
                i++;
                records = [];
              }
              records.push(currentFeatureSet);
            }));
          } else {
            this.layerPagination.push(results.features);
          }
        }
        //populate the features in left panel
        this._populateFeatures(this._formLayer, this.pageIndex);
      }));
    },

    //function to calculate the total number of features in a layer
    _calculateTotalFeaturesLength: function (form_Layer) {
      var queryTask, queryLayer;
      this.layerPagination = [];
      queryTask = new QueryTask(form_Layer.url);
      queryLayer = new Query();
      queryLayer.where = "1=1";
      queryLayer.returnCountOnly = true;
      queryLayer.returnGeometry = false;
      queryLayer.outFields = ["*"];
      queryTask.execute(queryLayer, lang.hitch(this, function (count) {
        this.totalNumberOfRecords = count.features.length;
        this._populateSortOptions(form_Layer);
        this._queryLayer(form_Layer);
        this._clickMap(form_Layer);
      }), function (error) {
        console.log(error);
      });
    },

    //function to create legend of webmap
    _initLegend: function () {
      this._mapLegend = new Legend({
        map: this.map,
        layerInfos: this.layerInfos
      }, dom.byId("legendPanelBody"));
      this._mapLegend.startup();
    },

    //set defaults for layer
    _setLayerDefaults: function () {
      var setLayerDeferred = new Deferred();
      // if no layer id is set, try to use first point-type feature layer
      if (!this.config.form_layer || !this.config.form_layer.id) {
        var isPointFeatureLayer = false;
        array.some(this.config.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
          if (currentLayer.layerType && currentLayer.layerType === "ArcGISFeatureLayer" && currentLayer.resourceInfo.geometryType === 'esriGeometryPoint') {
            isPointFeatureLayer = true;
            // if no object present
            if (!this.config.form_layer) {
              this.config.form_layer = {};
            }
            // set id
            this.config.form_layer.id = currentLayer.id;
            this._formLayer = this.map.getLayer(this.config.form_layer.id);
            return true;
          } else {
            isPointFeatureLayer = false;
          }
        }));
        if (!isPointFeatureLayer) {
          var error = new Error(nls.user.invalidLayerMessage);
          this._reportError(error);
        }
      }
      if (this.config.form_layer.id === "all") {
        var deferredListArray = [];
        domAttr.set(dom.byId("layerSelectBox"), 'display', 'block');
        this.layerCollection = {};
        for (var key in this.config.fields) {
          deferredListArray.push(this._loadNewLayer(key));
        }
        //run this block after all the layers are loaded and are correspondingly pushed in the layer-select-box
        all(deferredListArray).then(lang.hitch(this, function () {
          //if at-least one editable point layer is found then execute the layer based tasks or else show error message
          if (dom.byId("selectLayerInput").options[0]) {
            dom.byId("selectLayerInput").options[0].selected = true;
            this.config.form_layer.id = dom.byId("selectLayerInput")[0].value;
            this._formLayer = this.map.getLayer(this.config.form_layer.id);
            domStyle.set(dom.byId("layerSelectBox"), 'display', 'block');
            if (!this.config.selectedTitleField[this.config.form_layer.id]) {
              this.config.selectedTitleField[this.config.form_layer.id] = this._formLayer.displayField;
            }
            on(dom.byId("selectLayerInput"), "change", lang.hitch(this, function () {
              this.layerPagination = [];
              this.pageIndex = 0;
              this.totalRecordsDisplayed = 0;
              this.featureCount = 0;
              domStyle.set(dom.byId("featureDetailsContainer"), "display", "none");
              this.selectedGraphics.clear();
              this.config.form_layer.id = dom.byId("selectLayerInput").value;
              this._formLayer = this.map.getLayer(this.config.form_layer.id);
              if (!this._formLayer.advancedQueryCapabilities.supportsOrderBy) {
                domClass.add(dom.byId("btnSortByOrder"), "disabled");
              }
              if (!this.config.selectedTitleField[this.config.form_layer.id]) {
                this.config.selectedTitleField[this.config.form_layer.id] = this._formLayer.displayField;
              }
              this._calculateTotalFeaturesLength(this._formLayer);
            }));
            this._executeLayerTasks(this._formLayer);
            setLayerDeferred.resolve();
          } else {
            this._reportError(nls.user.invalidLayerMessage);
          }
        }));
      } else {
        this._formLayer = this.map.getLayer(this.config.form_layer.id);
        // if we have a layer
        if (this._formLayer) {
          // if fields not set or empty
          if (!this.config.fields || (this.config.fields && this.config.fields.length === 0)) {
            this.config.fields = this._formLayer.fields;
          }
          if (!this.config.selectedTitleField[this.config.form_layer.id]) {
            this.config.selectedTitleField[this.config.form_layer.id] = this._formLayer.displayField;
          }
        }
        setTimeout(lang.hitch(this, function () {
          this._executeLayerTasks(this._formLayer);
          setLayerDeferred.resolve();
        }), 100);
      }
      return setLayerDeferred.promise;
    },

    //this function ensures that the layer is either loaded or throws an error in console naming the layer that did not load successfully
    _loadNewLayer: function (key) {
      var layerLoadedEvent, errorLoadEvent, def, layer;
      //Fetch all the layers at once
      def = new Deferred();
      layer = this.map.getLayer(key);
      //this block will be called if the layer is already loaded
      if (layer.url) {
        if (layer.loaded) {
          if (layer.isEditable() && layer.geometryType === 'esriGeometryPoint') {
            this._pushToLayerDrpDwn(key, layer);
          }
          def.resolve();
        } else {
          //this block will be called if there is some error in layer load
          if (layer.loadError) {
            console.log(nls.user.error + ": " + layer.name);
            def.resolve();
          }
          //this block attaches 'load' and 'loadError' events respectively
          else {
            layerLoadedEvent = on.once(layer, "load", lang.hitch(this, function () {
              errorLoadEvent.remove();
              if (layer.isEditable() && layer.geometryType === 'esriGeometryPoint') {
                this._pushToLayerDrpDwn(key, layer);
              }
              def.resolve();
            }));
            errorLoadEvent = on.once(layer, "error", lang.hitch(this, function () {
              layerLoadedEvent.remove();
              console.log(nls.user.error + ": " + layer.name);
              def.resolve();
            }));
          }
        }
      } else {
        //This error will be logged in case the layer is undefined
        //this will happen in case where the key from this.config.fields supplies a layer id not present in the map
        console.log(nls.user.invalidLayerMessage + ": " + key);
        def.resolve();
      }
      return def.promise;
    },
    //function to push the layer name to layer drop down
    _pushToLayerDrpDwn: function (key, layer) {
      this.layerCollection[key] = layer;
      var option = domConstruct.create("option", {}, dom.byId("selectLayerInput"));
      option.text = this.layerCollection[key].name;
      option.value = key;
    },

    //function highlights the selected feature in the list group
    _activateListItem: function (objectIdFieldValue) {
      array.forEach(query('.formList .list-group-item'), lang.hitch(this, function (node) {
        if (domClass.contains(node, "active")) {
          domClass.remove(node, "active");
        }
        if (domAttr.get(node, "fieldValue") === objectIdFieldValue.toString()) {
          domClass.add(node, "active");
          this.activeElementId = node.fieldValue;
        }
      }));
    },

    //function to click on map to select features
    _clickMap: function (_formLayer) {
      if (this.layerClickHandle !== null) {
        this.layerClickHandle.remove();
      }
      this.layerClickHandle = on(_formLayer, "click", lang.hitch(this, function (evt) {
        this.map.infoWindow.hide();
        if (evt.graphic && evt.mapPoint) {
          this._executeQueryTask(evt.mapPoint).then(lang.hitch(this, function (result) {
            if (result.features.length !== 0) {
              this._highlightMapGraphics(evt.graphic);
              var objectIdField = _formLayer.objectIdField;
              this._activateListItem(result.features[0].attributes[objectIdField]);
            } else {
              console.log(nls.user.error + ": " + nls.viewer.geometryUnavailableErrorMessage);
            }
          }));
        }
      }));
    },

    //function to create sort options in dropdown
    _populateSortOptions: function (_formLayer) {
      this.displayFields = [];
      dom.byId("sortbyInput").options.length = 0;
      if (this.config.selectedTitleField[this.config.form_layer.id]) {
        domConstruct.create("option", {
          "innerHTML": this.config.selectedTitleField[this.config.form_layer.id],
          "value": this.config.selectedTitleField[this.config.form_layer.id]
        }, dom.byId("sortbyInput"));
      }
      this.displayFields = this.config.selectedTitleField[this.config.form_layer.id] + ",";
      array.forEach(_formLayer.fields, lang.hitch(this, function (currentfield) {
        //Populate all date type fields in sort drop down
        if (currentfield.type === "esriFieldTypeDate" && this.config.selectedTitleField[this.config.form_layer.id] !== currentfield.name) {
          domConstruct.create("option", {
            "value": currentfield.name,
            "innerHTML": currentfield.alias
          }, dom.byId("sortbyInput"));
          this.displayFields += currentfield.name + ",";
        }
      }));
      $("#sortbyInput option:first").attr('selected', 'selected');
      on(dom.byId("sortbyInput"), "change", lang.hitch(this, function () {
        this.selectedGraphics.clear();
        this.activeElementId = null;
        domStyle.set(dom.byId("featureDetailsContainer"), "display", "none");
        this.layerPagination = [];
        this.pageIndex = 0;
        this.featureCount = 0;
        this.totalRecordsDisplayed = 0;
        this._queryLayer(this._formLayer);
      }));
    },

    // function to populate the list of features of layer in a listview
    _populateFeatures: function (_formLayer, layerPageIndex) {
      var graphicAttribute, listElement, listItem, titleField, listTitle;
      graphicAttribute = this._mergeLayerPages(layerPageIndex);
      domConstruct.empty(dom.byId("formList"));
      if (_formLayer) {
        listElement = domConstruct.create("ul", {
          "id": "featureList",
          "class": "list-group formListContent"
        }, dom.byId("formList"));
        array.forEach(graphicAttribute, lang.hitch(this, function (currentKey, index) {
          listItem = domConstruct.create("li", {
            "class": "list-group-item",
            "tabindex": 0,
            "id": index
          }, listElement);
          titleField = this.config.selectedTitleField[this.config.form_layer.id];
          if (currentKey.attributes[titleField]) {
            listTitle = currentKey.attributes[titleField].toString();
          } else {
            listTitle = currentKey.attributes[titleField];
          }
          domAttr.set(listItem, "fieldValue", currentKey.attributes[_formLayer.objectIdField]);
          this._fetchListTitle(_formLayer, listTitle, titleField, true, listItem);
          on(listItem, a11yclick, lang.hitch(this, function (evt) {
            this.activeElementId = domAttr.get(evt.currentTarget, "fieldValue");
            var activeListElement = query(".active", listElement),
              HeaderNode = query('.navbar-nav', dom.byId("panelHeader"));
            if (activeListElement.length > 0) {
              domClass.remove(query(".active", listElement)[0], "active");
            }
            domClass.add(evt.currentTarget, "active");
            if ($(window).width() <= 767) {
              array.some(HeaderNode[0].children, function (currentNode) {
                if (domClass.contains(currentNode, "active")) {
                  domClass.remove(currentNode, "active");
                  return true;
                }
              });
              this._showMapTab();
            }
            this._updatePaginationMessage(false);
            if (this.map.infoWindow.isShowing) {
              this.map.infoWindow.hide();
            }
            this._showFeatureDetails(evt.currentTarget, graphicAttribute);
          }));
        }));
        if (this.activeElementId) {
          array.some(query('.formList .list-group-item'), lang.hitch(this, function (node) {
            if (domAttr.get(node, "fieldValue") === this.activeElementId) {
              domClass.add(node, "active");
              return true;
            }
          }));
        }
        if (this.totalRecordsDisplayed <= this.totalNumberOfRecords) {
          var loadMoreButton;
          listItem = domConstruct.create("li", {
            "class": "list-group-item"
          }, listElement);
          loadMoreButton = domConstruct.create("button", {
            "class": "btn btn-default center-block",
            "innerHTML": nls.viewer.btnLoadMoreText,
            "id": "loadMoreButton"
          }, listItem);
          on(loadMoreButton, a11yclick, lang.hitch(this, function () {
            this.pageIndex++;
            this._queryLayer(this._formLayer);
            this._formLayer.redraw();
            this.totalRecordsDisplayed += this.numberOfRecords;
          }));
        }
      }
    },

    //Merge features as user clicks on load more button
    _mergeLayerPages: function (index) {
      var newGraphicsArray = [];
      array.forEach(this.layerPagination, function (currentGraphicsArray, pageIndex) {
        if (pageIndex <= index) {
          array.forEach(currentGraphicsArray, function (currentGraphic) {
            newGraphicsArray.push(currentGraphic);
          });
        }
      });
      return newGraphicsArray;
    },

    //Update the list title when list is created or refreshed, and result panel table as user clicks on list or map
    _fetchListTitle: function (_formLayer, listTitle, titleField, isPanelTitle, listItem) {
      array.forEach(_formLayer.fields, function (currentField) {
        if (titleField) {
          if (currentField.name.toLowerCase() === titleField.toLowerCase()) {
            if (currentField.type === "esriFieldTypeDate") {
              listTitle = new Date(listTitle).toLocaleString();
              if (listItem) {
                domAttr.set(listItem, "innerHTML", listTitle ? listTitle : nls.viewer.unavailableTitleText);
              }
            } else {
              // title and string
              if (listTitle && typeof listTitle === "string" && lang.trim(listTitle)) {
                listTitle = lang.trim(listTitle);
              }
              // no title and not a number
              else if(!listTitle && isNaN(listTitle)){
                listTitle = nls.viewer.unavailableTitleText;
              }
              if (listItem) {
                domAttr.set(listItem, "innerHTML", listTitle);
              }
            }
          } else if (listItem && !listTitle) {
            domAttr.set(listItem, "innerHTML", nls.viewer.unavailableTitleText);
          }
        } else if (listItem) {
          domAttr.set(listItem, "innerHTML", nls.viewer.unavailableTitleText);
        }
        //setting the title for feature Details Container
        if (isPanelTitle) {
          domAttr.set(dom.byId("panelTitle"), "innerHTML", listTitle ? listTitle : nls.viewer.unavailableTitleText);
        }
      });
    },

    //function to perform query on layer and update the pagination message
    _executeQueryTask: function (mapPoint) {
      var queryTask, queryLayer, currentDate = new Date().getTime().toString(),
        deferred;
      queryTask = new QueryTask(this._formLayer.url);
      queryLayer = new Query();
      queryLayer.where = currentDate + "=" + currentDate;
      queryLayer.outSpatialReference = this.map.spatialReference;
      queryLayer.returnGeometry = true;
      queryLayer.geometry = this._extentFromPoint(mapPoint);
      queryLayer.outFields = ["*"];
      deferred = new Deferred();
      queryTask.execute(queryLayer, lang.hitch(this, function (results) {
        if (results.features) {
          this.carouselPaulData.totalFeatures = results.features.length;
          this.carouselPaulData.tableAttributes = results.features;
          this.currentFeatureIndex = 0;
          domClass.add(dom.byId("prevFeature"), "disabled");
          domClass.remove(dom.byId("nextFeature"), "disabled");
          this._updateFeatureDetails(results.features[this.currentFeatureIndex]);
          if (results.features.length > 1) {
            this._updatePaginationMessage(true);
          } else {
            this._updatePaginationMessage(false);
          }
          deferred.resolve(results);
        } else {
          console.log(nls.user.error + ": " + nls.viewer.geometryUnavailableErrorMessage);
        }
      }), function (err) {
        alert(err.message);
        deferred.reject();
      });
      return deferred.promise;
    },

    _extentFromPoint: function (point) {
      var tolerance, screenPoint, pnt1, pnt2, mapPoint1, mapPoint2;
      tolerance = 10;
      screenPoint = this.map.toScreen(point);
      pnt1 = new Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
      pnt2 = new Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
      mapPoint1 = this.map.toMap(pnt1);
      mapPoint2 = this.map.toMap(pnt2);
      return new Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, this.map.spatialReference);
    },

    //create svg symbol based on features selected on map
    _createSVGSymbol: function (size, xoffset, yoffset) {
      var sls = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 255, 255]),
          2),
        markerSymbol;
      markerSymbol = new SimpleMarkerSymbol();
      markerSymbol.setPath(this.iconPathSVG);
      markerSymbol.setOutline(sls);
      markerSymbol.setSize(size);
      markerSymbol.setColor(null);
      markerSymbol.xoffset = xoffset;
      markerSymbol.yoffset = yoffset;
      return markerSymbol;
    },

    // function to show the Details of selected feature in result panel
    _showFeatureDetails: function (listItem, graphicAttribute) {
      var queryTask, queryLayer, objectIdField = this._formLayer.objectIdField,
        attributeValue, key, layerGraphicsAttributes;
      domStyle.set(dom.byId("errorMessageBox"), "display", "none");
      if (dom.byId("featureDetailsBody")) {
        domConstruct.empty(dom.byId("featureDetailsBody"));
      }
      $("featureDetaisTable").show();
      if (!this.isHosted) {
        var layerGraphics;
        queryTask = new QueryTask(this._formLayer.url);
        queryLayer = new Query();
        queryLayer.where = objectIdField + "='" + domAttr.get(listItem, "fieldValue") + "'";
        queryLayer.outSpatialReference = this.map.spatialReference;
        queryLayer.returnGeometry = true;
        queryLayer.outFields = ["*"];
        queryTask.execute(queryLayer, lang.hitch(this, function (result) {
          this._highlightMapGraphics(result.features[0]);
          layerGraphicsAttributes = result.features[0].attributes;
          layerGraphics = result.features[0];
          for (key in layerGraphicsAttributes) {
            attributeValue = layerGraphicsAttributes[key];
            if (this.config.selectedTitleField[this.config.form_layer.id] === key) {
              this._fetchListTitle(this._formLayer, attributeValue, this.config.selectedTitleField[this.config.form_layer.id], true, listItem);
            }
            this._validateFeatureDetails(key, attributeValue, layerGraphics);
          }
          if (result.features[0].geometry) {
            this.map.centerAt(result.features[0].geometry);
          }
          return true;
        }));

      } else {
        var selectedFeature, selectedFeatureObjId = domAttr.get(listItem, "fieldValue");
        array.some(graphicAttribute, function (featureItem) {
          if (featureItem.attributes[objectIdField].toString() === selectedFeatureObjId) {
            selectedFeature = featureItem;
            return true;
          }
        });
        layerGraphicsAttributes = selectedFeature.attributes;
        for (key in layerGraphicsAttributes) {
          if (layerGraphicsAttributes[key]) {
            attributeValue = layerGraphicsAttributes[key].toString();
          } else {
            attributeValue = layerGraphicsAttributes[key];
          }
          if (this.config.selectedTitleField[this.config.form_layer.id] === key) {
            this._fetchListTitle(this._formLayer, attributeValue, this.config.selectedTitleField[this.config.form_layer.id], true, listItem);
          }
          this._validateFeatureDetails(key, attributeValue, selectedFeature);
        }
        this._highlightMapGraphics(selectedFeature);
        if (this._formLayer.geometryType === 'esriGeometryPoint') {
          if (selectedFeature.geometry && !isNaN(selectedFeature.geometry.x) && !isNaN(selectedFeature.geometry.y)) {
            this.map.centerAt(selectedFeature.geometry);
          }
        }
      }
    },

    //Function checks if the infoPopup of layer is off or not and updates the featureDetailsContainer accordingly
    _validateFeatureDetails: function (key, attributeValue, selectedFeature) {
      if (this._formLayer.infoTemplate) {
        this._createFeatureDetailsContainer(key, attributeValue, selectedFeature);
      } else {
        domStyle.set(dom.byId("featureDetailsContainer"), "display", "block");
        $("featureDetaisTable").hide();
        domStyle.set(dom.byId("errorMessageBox"), "display", "block");
        domAttr.set(dom.byId('errorMessageBox'), "innerHTML", nls.viewer.infoPopupOffErrorMessage);
        domClass.add(dom.byId('errorMessageBox'), "alert alert-danger");
      }
    },

    //Function internally calls other function to create SVG symbol and then highlights it on map
    _highlightMapGraphics: function (result) {
      var isSymbolFound = false;
      if (this._formLayer.toJson().layerDefinition.drawingInfo.renderer.type === "classBreaks") {
        if (((this._formLayer.renderer.infos) && (this._formLayer.renderer.infos.length > 0))) {
          array.some(this._formLayer.renderer.infos, lang.hitch(this, function (currentInfo) {
            if (result.attributes[this._formLayer.renderer.attributeField] > currentInfo.minValue && result.attributes[this._formLayer.renderer.attributeField] <= currentInfo.maxValue) {
              isSymbolFound = true;
              this._setSymbolSize(currentInfo.symbol, result.geometry);
              return true;
            }
          }));
        }
      } else {
        if (((this._formLayer.renderer.infos) && (this._formLayer.renderer.infos.length > 0))) {
          array.some(this._formLayer.renderer.infos, lang.hitch(this, function (currentInfo) {
            if (currentInfo.value !== null && currentInfo.value !== "") {
              if (currentInfo.value == result.attributes[this._formLayer.renderer.attributeField]) {
                isSymbolFound = true;
                this._setSymbolSize(currentInfo.symbol, result.geometry);
                return true;
              }
            }
          }));
          if (!isSymbolFound) {
            if (this._formLayer.renderer.defaultSymbol) {
              isSymbolFound = true;
              this._setSymbolSize(this._formLayer.renderer.defaultSymbol, result.geometry);
              return true;
            }
          }
        } else {
          if (this._formLayer.renderer.symbol) {
            isSymbolFound = true;
            this._setSymbolSize(this._formLayer.renderer.symbol, result.geometry);
            return true;
          }
        }
      }
    },

    _setSymbolSize: function (symbol, geometry) {
      var height, width, size, symbolSize, xoffset = null,
        yoffset = null;
      symbolSize = 50; //set default Symbol size which will be used in case symbol not found.
      if (symbol.hasOwnProperty("height") && symbol.hasOwnProperty("width")) {
        height = symbol.height;
        width = symbol.width;
        // To display cross hair properly around feature its size needs to be calculated
        size = (height > width) ? height : width;
        size = size + 15;
        symbolSize = size;
      }
      if (symbol.hasOwnProperty("size")) {
        if (!size || size < symbol.size) {
          size = symbol.size + 15;
          symbolSize = size;
        }
      }
      if (symbol.hasOwnProperty("xoffset") && symbol.hasOwnProperty("yoffset")) {
        xoffset = symbol.xoffset;
        yoffset = symbol.yoffset;
      }
      this._drawSymbol(geometry, symbolSize, xoffset, yoffset);
    },

    //function checks if the geometry of the symbol is not a number and then draws the symbol or shows an error message
    _drawSymbol: function (pointGeometry, size, xoffset, yoffset) {
      this.selectedGraphics.clear();
      if (pointGeometry) {
        if (!isNaN(pointGeometry.x) && !isNaN(pointGeometry.y)) {
          var graphicSVG = new Graphic(new Point([pointGeometry.x, pointGeometry.y], this.map.spatialReference), this._createSVGSymbol(size, xoffset, yoffset));
          this.selectedGraphics.add(graphicSVG);
          if (!this.map.getLayer("highlightedGraphic")) {
            this.map.addLayer(this.selectedGraphics);
          }
          this.map.centerAt(pointGeometry);
          return true;
        } else {
          alert(nls.viewer.geometryUnavailableErrorMessage);
        }
      } else {
        alert(nls.viewer.geometryUnavailableErrorMessage);
      }
    },

    //Function to update and show details of feature clicked on map
    _updateFeatureDetails: function (graphics) {
      if (graphics) {
        var objectIdField = this._formLayer.objectIdField;
        this._activateListItem(graphics.attributes[objectIdField]);
        if (dom.byId("featureDetailsBody")) {
          domConstruct.empty(dom.byId("featureDetailsBody"));
        }
        this.map.centerAt(graphics.geometry);
        for (var key in graphics.attributes) {
          var attributeValue = graphics.attributes[key];
          if (this.config.selectedTitleField[this.config.form_layer.id] === key) {
            this._fetchListTitle(this._formLayer, attributeValue, this.config.selectedTitleField[this.config.form_layer.id], true);
          }
          this._validateFeatureDetails(key, attributeValue, graphics);
        }
      }
    },

    //function to create table and show details of features
    _createFeatureDetailsContainer: function (key, attributeValue, graphics) {
      var fields, fieldRow, fieldKeyTD, fieldAttrTD;
      fields = this._formLayer.infoTemplate.info.fieldInfos;
      array.forEach(fields, lang.hitch(this, function (currentfield) {
        array.some(this._formLayer.fields, function (layerField) {
          if (layerField.name == key && layerField.type === "esriFieldTypeDate") {
            attributeValue = new Date(graphics.attributes[key]).toLocaleString();
            return true;
          }
        });
        if (key === currentfield.fieldName && currentfield.visible) {
          fieldRow = domConstruct.create("tr", {}, dom.byId("featureDetailsBody"));
          fieldKeyTD = domConstruct.create("td", {
            className: "drag-cursor",
            innerHTML: key
          }, fieldRow);
          fieldAttrTD = domConstruct.create("td", {
            className: "drag-cursor",
            innerHTML: attributeValue
          }, fieldRow);
          domStyle.set(dom.byId("featureDetailsContainer"), "display", "block");
        }
      }));
      $("#featureDetailsPanelBody").scrollTop(0);
    },

    //function to update pagination to show all feature details
    _updatePaginationMessage: function (isPaginationRequired) {
      if (isPaginationRequired && this._formLayer.infoTemplate) {
        domAttr.set(dom.byId("paginationMessage"), "innerHTML", +(this.currentFeatureIndex + 1) + " of " + (this.carouselPaulData.totalFeatures));
        domStyle.set(dom.byId("featurePagination"), "display", "block");
        domClass.replace(dom.byId("panelTitle"), "panel-title", "panelTitleWithoutPager");
      } else {
        domStyle.set(dom.byId("featurePagination"), "display", "none");
        domConstruct.empty(dom.byId("paginationMessage"));
        domClass.replace(dom.byId("panelTitle"), "panelTitleWithoutPager", "panel-title");
      }
    },

    //function of sort feature
    _sortByOrder: function () {
      this.layerPagination = [];
      this.pageIndex = 0;
      this.featureCount = 0;
      this.totalRecordsDisplayed = 0;
      if (domClass.contains(dom.byId("btnSortByOrder"), "fa-caret-up")) {
        domClass.replace(dom.byId("btnSortByOrder"), "fa-caret-down", "fa-caret-up");
        domAttr.set(dom.byId("btnSortByOrderText"), "innerHTML", nls.viewer.btnDescendingText);
      } else {
        domClass.replace(dom.byId("btnSortByOrder"), "fa-caret-up", "fa-caret-down");
        domAttr.set(dom.byId("btnSortByOrderText"), "innerHTML", nls.viewer.btnAscendingText);
      }
      this._queryLayer(this._formLayer);
    },

    _templateSearchOptions: function (w) {
      var sources = [];
      var searchLayers;
      //setup geocoders defined in common config
      if (this.config.helperServices.geocode) {
        var geocoders = lang.clone(this.config.helperServices.geocode);
        array.forEach(geocoders, lang.hitch(this, function (geocoder) {
          if (geocoder.url.indexOf(".arcgis.com/arcgis/rest/services/World/GeocodeServer") > -1) {
            // use the default esri locator from the search widget
            geocoder = lang.clone(w.sources[0]);
            geocoder.hasEsri = true;
            sources.push(geocoder);
          } else if (esriLang.isDefined(geocoder.singleLineFieldName)) {
            //Add geocoders with a singleLineFieldName defined
            geocoder.locator = new Locator(geocoder.url);
            sources.push(geocoder);
          }
        }));
      }
      //Add search layers defined on the web map item
      if (this.config.itemInfo.itemData && this.config.itemInfo.itemData.applicationProperties && this.config.itemInfo.itemData.applicationProperties.viewing && this.config.itemInfo.itemData.applicationProperties.viewing.search) {
        var searchOptions = this.config.itemInfo.itemData.applicationProperties.viewing.search;
        array.forEach(searchOptions.layers, lang.hitch(this, function (searchLayer) {
          //we do this so we can get the title specified in the item
          var operationalLayers = this.config.itemInfo.itemData.operationalLayers;
          var layer = null;
          array.some(operationalLayers, function (opLayer) {
            if (opLayer.id === searchLayer.id) {
              layer = opLayer;
              return true;
            }
          });
          if (layer && layer.url) {
            var source = {};
            var url = layer.url;
            if (esriLang.isDefined(searchLayer.subLayer)) {
              url = url + "/" + searchLayer.subLayer;
              array.some(layer.layerObject.layerInfos, function (info) {
                if (info.id == searchLayer.subLayer) {
                  return true;
                }
              });
            }
            source.featureLayer = new FeatureLayer(url);
            source.name = layer.title || layer.name;
            source.exactMatch = searchLayer.field.exactMatch;
            source.searchFields = [searchLayer.field.name];
            source.placeholder = searchOptions.hintText;
            sources.push(source);
            searchLayers = true;
          }
        }));
      }
      //set the first non esri layer as active if search layers are defined.
      var activeIndex = 0;
      if (searchLayers) {
        array.some(sources, function (s, index) {
          if (!s.hasEsri) {
            activeIndex = index;
            return true;
          }
        });
      }
      // get back the sources and active index
      return {
        sources: sources,
        activeSourceIndex: activeIndex
      };
    },

    // create geocoder widgets
    _createGeocoders: function () {
      var closeMobileGeocoderNode;

      // create options
      var options = {
        enableHighlight: false,
        enableInfoWindow: false,
        map: this.map
      };
      // create geocoder
      this._geocoder = new Search(options, "geocoderSearch");
      var templateOptions = this._templateSearchOptions(this._geocoder);
      this._geocoder.set("sources", templateOptions.sources);
      this._geocoder.set("activeSourceIndex", templateOptions.activeSourceIndex);
      this._geocoder.startup();
      // geocoder results
      on(this._geocoder, 'search-results', lang.hitch(this, function (response) {
        if (response.numResults) {
          if ($(window).width() <= 767) {
            this._showMapTab();
            this._resizeMap();
          }
        }
      }));

      this._mobileGeocoder = new Search(options, "geocoderMobile");
      this._mobileGeocoder.set("sources", templateOptions.sources);
      this._mobileGeocoder.set("activeSourceIndex", templateOptions.activeSourceIndex);
      this._mobileGeocoder.startup();
      // geocoder results
      on(this._mobileGeocoder, 'search-results', lang.hitch(this, function (response) {
        if (response.numResults) {
          this._showMapTab();
        }
      }));


      //Navigate to the 'Map Tab' on selecting a place
      on(this._mobileGeocoder, 'select-result', lang.hitch(this, function () {
        this._showMapTab();
      }));


      this._mobileGeocoderIconNode = dom.byId("mobileGeocoderIcon");
      this._mobileSearchNode = dom.byId("mobileSearch");
      // mobile geocoder toggle
      if (this._mobileGeocoderIconNode) {
        on(this._mobileGeocoderIconNode, a11yclick, lang.hitch(this, function () {
          if (domStyle.get(this._mobileSearchNode, "display") === "none") {
            this._showMobileGeocoder();
          } else {
            this._hideMobileGeocoder();
          }
        }));
      }
      closeMobileGeocoderNode = dom.byId("btnCloseGeocoder");
      if (closeMobileGeocoderNode) {
        // cancel mobile geocoder
        on(closeMobileGeocoderNode, a11yclick, lang.hitch(this, function () {
          this._hideMobileGeocoder();
        }));
      }
    },

    _showMobileGeocoder: function () {
      var mobileSearchNodeTop;
      if (this._mobileSearchNode && this._mobileGeocoderIconNode) {
        mobileSearchNodeTop = domStyle.get(dom.byId("navHeader"), "height");
        domStyle.set(this._mobileSearchNode, "top", mobileSearchNodeTop + "px");
        domClass.add(this._mobileSearchNode, this.css.mobileSearchDisplay);
      }
    },

    _hideMobileGeocoder: function () {
      if (this._mobileSearchNode && this._mobileGeocoderIconNode) {
        domClass.remove(this._mobileSearchNode, this.css.mobileSearchDisplay);
        domStyle.set(this._mobileSearchNode, "display", "none");
      }
    }
  });
});