/*global $,define,document,require */
define([
   "dojo/_base/declare",
    "dojo/on",
    "dojo/dom",
    "esri/request",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/string",
    "dojo/promise/all",
    "dojo/number",
    "dojo/text!views/modal.html",
    "dojo/text!views/builder.html",
    "application/builder/browseIdDlg",
    "application/ShareModal",
    "application/localStorageHelper",
    "application/builder/signInHelper",
    "dojo/i18n!application/nls/resources",
    "esri/arcgis/utils",
    "application/themes",
    "application/pushpins",
    "esri/layers/FeatureLayer",
    "dojo/Deferred",
    "esri/basemaps",
    "dijit/a11yclick",
    "application/wrapper/builder-jquery-deps",
    "dojo/domReady!"
], function (declare, on, dom, esriRequest, array, domConstruct, domAttr, query, domClass, domStyle, lang, string, all, number, modalTemplate, builderTemplate, BrowseIdDlg, ShareModal, localStorageHelper, signInHelper, nls, arcgisUtils, theme, pushpins, FeatureLayer, Deferred, esriBasemaps, a11yclick) {
  return declare([], {
    nls: nls,
    currentState: "webmap",
    previousState: null,
    currentConfig: null,
    response: null,
    userInfo: null,
    browseDlg: null,
    fieldInfo: {},
    layerInfo: null,
    themes: theme,
    localStorageSupport: null,
    pins: pushpins,
    onDemandResources: null,
    buttonConflict: null,
    appSettings: null,
    locationSearchOption: null,

    constructor: function (config, response) {
      this.config = config;
      this.response = response;
      this.onDemandResources = [
        {
          "type": "css",
          "path": "css/browseDialog.css"
                },
        {
          "type": "css",
          "path": "js/vendor/summernote/summernote.css"
                },
        {
          "type": "css",
          "path": "js/vendor/jquery-ui/css/ui-lightness/jquery-ui-1.10.4.custom.css"
                }
         ];
    },

    startup: function () {
      domClass.add(document.body, "bodyPaddingTop");
      var def = new Deferred();
      var signIn = new signInHelper(),
        userInfo = {};
      this.locationSearchOption = {
        "enableMyLocation": true,
        "enableSearch": true,
        "enableLatLng": true,
        "enableUSNG": false,
        "enableMGRS": false,
        "enableUTM": false
      };
      if (this.config && this.config.i18n && this.config.i18n.direction == "rtl") {
        this._loadCSS();
      }
      signIn.createPortal().then(lang.hitch(this, function (loggedInUser) {
        var isValidUser = signIn.authenticateUser(true, this.response, loggedInUser);
        if (isValidUser) {
          userInfo.username = loggedInUser.username;
          userInfo.token = loggedInUser.credential.token;
          userInfo.portal = signIn.getPortal();
          this._initializeBuilder(this.config, userInfo, this.response);
          this._setTabCaption();
          domClass.remove(document.body, "app-loading");
          def.resolve();
        } else {
          def.reject(new Error("Invalid User"));
        }
      }), lang.hitch(this, function (error) {
        def.reject(error);
      }));
      return def.promise;
    },

    _loadCSS: function () {
      var cssStyle;
      cssStyle = dom.byId("rtlCSS");
      cssStyle.href = "js/vendor/bootstrap/css/bootstrap.rtl.css";
    },

    _swapContents: function () {
      array.forEach(query(".invertedArrows"), lang.hitch(this, function (currentNode) {
        if (domClass.contains(currentNode, "glyphicon-arrow-left")) {
          domClass.replace(currentNode, "glyphicon-arrow-right", "glyphicon-arrow-left");
        } else {
          domClass.replace(currentNode, "glyphicon-arrow-left", "glyphicon-arrow-right");
        }
      }));
    },

    _initializeBuilder: function (config, userInfo, response) {
      // set builder html
      var builderHTML = string.substitute(builderTemplate, nls);
      dom.byId("parentContainter").innerHTML = builderHTML;
      dom.byId('builder_description').innerHTML = string.substitute(nls.builder.descriptionText, {
        link1: "<a target=\"_blank\" href=\"http://server.arcgis.com/en/server/latest/publish-services/windows/what-is-a-feature-service-.htm\">",
        link2: "<a target=\"_blank\" href=\"http://doc.arcgis.com/en/arcgis-online/reference/what-is-web-map.htm\">",
        closeLink: "</a>"
      });
      this.buttonConflict = $.fn.button.noConflict();
      var $tabs = $('.tab-links li');
      domClass.add($('.navigationTabs')[0], "activeTab");
      var modalTemplateSub = string.substitute(modalTemplate, {
        id: "myModal",
        title: "",
        labelId: "myModalLabel",
        close: nls.user.close
      });
      // place modal code
      domConstruct.place(modalTemplateSub, document.body, 'last');
      on(query(".prevtab"),a11yclick, lang.hitch(this, function () {
        $tabs.filter('.active').prev('li').find('a[data-toggle="tab"]').tab('show');
      }));

      on(query(".nexttab"), a11yclick, lang.hitch(this, function () {
        $tabs.filter('.active').next('li').find('a[data-toggle="tab"]').tab('show');
      }));

      on(query(".navigationTabs"), a11yclick, lang.hitch(this, function (evt) {
        if (domClass.contains(evt.currentTarget, "previewButton")) {
          query('.tab-links li').forEach(function (node) {
            domClass.remove(node, "active");
          });
          query('a[tab="preview"]').forEach(function (node) {
            if (node.parentNode.tagName === "LI") {
              domClass.add(node.parentNode, "active");
            }
          });
        }
        this._getPrevTabDetails(evt);
      }));

      on(dom.byId("saveButton"),a11yclick, lang.hitch(this, function () {
        this._updateItem(false);
      }));

      on(dom.byId("done"), a11yclick, lang.hitch(this, function () {
        this._updateItem(true);
      }));
      
      on(dom.byId("jumbotronDisableOption"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.useSmallHeader = true;
      }));
      
      on(dom.byId("jumbotronEnableOption"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.useSmallHeader = false;
      }));
      on(dom.byId("shareOption"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.enableSharing = $('#shareOption')[0].checked;
      }));
      on(dom.byId("defaultExtent"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.defaultMapExtent = $('#defaultExtent')[0].checked;
      }));
      
      on(dom.byId("ShowHideLayerOption"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.showLayer = $('#ShowHideLayerOption')[0].checked;
      }));
      on(dom.byId("disableLogo"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.disableLogo = !this.currentConfig.disableLogo;
      }));
      
      on(dom.byId("enableBasemapToggle"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.enableBasemapToggle = $('#enableBasemapToggle')[0].checked;
        if (this.currentConfig.enableBasemapToggle) {
          $('#basemapContainer').show();
        } else {
          $('#basemapContainer').hide();
        }
      }));
      
      on(dom.byId("locateOnLoad"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.locate = !this.currentConfig.locate;
      }));
      
      on(dom.byId("disableViewer"), a11yclick, lang.hitch(this, function () {
        this.currentConfig.disableViewer = !this.currentConfig.disableViewer;
      }));
      this._loadResources();
      this.currentConfig = config;
      //This logic will convert the old array structure to equivalent object
      if (this.config.fields.length) {
        var fieldsArray = lang.clone(this.config.fields);
        this.currentConfig.fields = {};
        this.currentConfig.fields[this.currentConfig.form_layer.id] = fieldsArray;
      }
      this.userInfo = userInfo;
      this.response = response;
      this.localStorageSupport = new localStorageHelper();
      this._addOperationalLayers();
      this._populateDetails();
      this._populateJumbotronOption(this.currentConfig.useSmallHeader);
      this._populateShareOption(this.currentConfig.enableSharing);
      this._populateDefaultExtentOption(this.currentConfig.defaultMapExtent);
      this._populateThemes();
      this._populatePushpins();
      this._enableDisableLogo();
      this._enableDisableBasemapToggle();
      this._locateCurrentLocation();
      this._enableDisableViewer();
      //Check if the object is messed up with other type.if yes replace it with default object
      if (!this.currentConfig.locationSearchOptions.length) {
        for (var searchOption in this.locationSearchOption) {
          if (!this.currentConfig.locationSearchOptions.hasOwnProperty(searchOption)) {
            this.currentConfig.locationSearchOptions[searchOption] = this.locationSearchOption[searchOption];
          }
        }
      } else {
        this.currentConfig.locationSearchOptions = this.locationSearchOption;
      }
      //check for the invalid options and delete them
      for (var locationKey in this.currentConfig.locationSearchOptions) {
        if (!this.locationSearchOption.hasOwnProperty(locationKey)) {
          delete this.currentConfig.locationSearchOptions[locationKey];
        }
      }
      this._populateLocations();
      this._initWebmapSelection();
      this._populateBasemapOptions(dom.byId('defaultBasemap'), this.currentConfig.defaultBasemap, dom.byId('defaultBasemapThumbnail'), dom.byId('defaultBasemapLabel'));
      this._populateBasemapOptions(dom.byId('secondaryBasemap'), this.currentConfig.nextBasemap, dom.byId('secondaryBasemapThumbnail'), dom.byId('secondaryBasemapLabel'));
      on(dom.byId("defaultBasemap"), "change", lang.hitch(this, function (evt) {
        if (dom.byId('secondaryBasemap').value != evt.currentTarget.value) {
          this._setBasemap(dom.byId('defaultBasemapThumbnail'), evt.currentTarget.value, dom.byId('defaultBasemapLabel'));
          this.currentConfig.defaultBasemap = evt.currentTarget.value;
        } else {
          dom.byId("defaultBasemap").value = this.currentConfig.defaultBasemap;
        }
      }));
      on(dom.byId("secondaryBasemap"), "change", lang.hitch(this, function (evt) {
        if (dom.byId('defaultBasemap').value != evt.currentTarget.value) {
          this._setBasemap(dom.byId('secondaryBasemapThumbnail'), evt.currentTarget.value, dom.byId('secondaryBasemapLabel'));
          this.currentConfig.nextBasemap = evt.currentTarget.value;
        } else {
          dom.byId("secondaryBasemap").value = this.currentConfig.nextBasemap;
        }
      }));
      if (!this.localStorageSupport.supportsStorage()) {
        array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
          if (domAttr.get(currentTab, "tab") == "preview") {
            this._disableTab(currentTab);
          }
        }));
      }
      on(dom.byId("selectLayer"), "change", lang.hitch(this, function (evt) {
        //support for all layers in webmap
        if (evt.currentTarget.value === "all") {
          domStyle.set(dom.byId("layerSelectPane"), 'display', 'block');
          array.forEach(dom.byId("layerSelect").options, lang.hitch(this, function (opt) {
            this._populateFields(opt.value);
            this._updateAppConfiguration("fields", opt.value);
            this.previousValue = opt.value;
          }));
          dom.byId("layerSelect")[dom.byId("layerSelect").options.length - 1].selected = true;
          this.currentConfig.form_layer.id = "all";
          $("#ShowHideLayerOption")[0].checked = false;
          $("#ShowHideLayerOption")[0].disabled = true;
        } else if (evt.currentTarget.value !== "") {
          domStyle.set(dom.byId("layerSelectPane"), 'display', 'none');
          this._populateFields(evt.currentTarget.value);
          this._updateAppConfiguration("fields", evt.currentTarget.value);
          this.previousValue = evt.currentTarget.value;
          this.currentConfig.form_layer.id = evt.currentTarget.value;
          $("#ShowHideLayerOption")[0].disabled = false;
        }
        if (evt.currentTarget.value === "") {
          array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
            if (domAttr.get(currentTab, "tab") == "fields" || domAttr.get(currentTab, "tab") == "preview" || domAttr.get(currentTab, "tab") == "publish") {
              this._disableTab(currentTab);
            }
          }));
        } else {
          array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
            if (domAttr.get(currentTab, "tab") == "fields" || ((domAttr.get(currentTab, "tab") === "preview" || domAttr.get(currentTab, "tab") === "publish") && query(".fieldCheckbox:checked").length !== 0)) {
              this._enableTab(currentTab);
            } else {
              if (domAttr.get(currentTab, "tab") == "fields" || ((domAttr.get(currentTab, "tab") === "preview" || domAttr.get(currentTab, "tab") === "publish") && query(".fieldCheckbox:checked").length === 0)) {
                this._disableTab(currentTab);
              }
            }
          }));
        }
        this._viewerSettings();
      }));

      on(dom.byId("layerSelect"), "change", lang.hitch(this, function (evt) {
        this._updateAppConfiguration("fields", this.previousValue);
        this._populateFields(evt.currentTarget.value);
        this.previousValue = evt.currentTarget.value;
      }));
      on(dom.byId('selectAll'), "change", lang.hitch(this, function (evt) {
        array.forEach(query(".fieldCheckbox"), lang.hitch(this, function (currentCheckBox) {
          if (!currentCheckBox.disabled) {
            currentCheckBox.checked = evt.currentTarget.checked;
          }
        }));
        this._getFieldCheckboxState();
      }));
      on($('#pushpinInput'), 'change', lang.hitch(this, function (evt) {
        this.currentConfig.pushpinColor = evt.currentTarget.value;
        array.some(this.pins, lang.hitch(this, function (pin) {
          if (pin.id === evt.currentTarget.value) {
            domStyle.set(dom.byId("pushpinSymbol"), {
              "backgroundImage": 'url(' + pin.url + ')'
            });
            return true;
          }
        }));
      }));
      var appTitle = '';
      // if app has a title
      if (this.currentConfig.details && this.currentConfig.details.Title) {
        // add title
        appTitle += this.currentConfig.details.Title + ' - ';
      }
      // builder text
      appTitle += nls.user.geoformTitleText + ' ' + nls.builder.titleText;
      // set title
      window.document.title = appTitle;
      //Change the arrow directions for next and previous buttons if application runs in RTL mode
      if (this.config && this.config.i18n && this.config.i18n.direction == "rtl") {
        this._swapContents();
      }
    },

    _viewerFields: function (layerInfo, layer) {
      var layerName = layerInfo.id;
      var fields = layer.fields;
      var container = domConstruct.create("div", {
        className: "form-group"
      });
      var label = domConstruct.create("label", {
        textContent: layer.name + " " + nls.builder.displayFieldText
      }, container);
      var select = domConstruct.create("select", {
        className: "form-control"
      }, container);
      for (var j = 0; j < fields.length; j++) {
        var field = fields[j];
        var opt = domConstruct.create("option", {
          value: field.name,
          textContent: field.alias || field.name
        }, select);
        var selectedField = this.currentConfig.selectedTitleField[layerName];
        if (!selectedField) {
          selectedField = layer.displayField;
        }
        this.currentConfig.selectedTitleField[layerName] = selectedField;
        if (selectedField) {
          if (field.name === selectedField) {
            domAttr.set(opt, "selected", true);
          }
        }
      }
      on(select, "change", lang.hitch(this, function (evt) {
        this.currentConfig.selectedTitleField[layerName] = evt.currentTarget.value;
      }));
      var help = domConstruct.create("div", {
        className: "help-block",
        textContent: nls.builder.displayFieldHintText
      }, container);
      return container;
    },

    _viewerSettings: function () {
      var layers = this._validLayers;
      var responseLayers = this._validLayersResponse;
      var selectLayer = dom.byId("selectLayer");
      var displayFieldArea = dom.byId("displayFieldArea");
      displayFieldArea.innerHTML = "";
      for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var layerObject = responseLayers[i];
        var node;
        if (this.currentConfig.form_layer.id === "all") {
          node = this._viewerFields(layer, layerObject);
          domConstruct.place(node, displayFieldArea);
        } else if (this.currentConfig.form_layer.id === layer.id) {
          node = this._viewerFields(layer, layerObject);
          domConstruct.place(node, displayFieldArea);
          break;
        }
      }
    },

    _enableDisableLogo: function () {
      dom.byId("disableLogo").checked = this.currentConfig.disableLogo;
    },
    _enableDisableBasemapToggle: function () {
      dom.byId("enableBasemapToggle").checked = this.currentConfig.enableBasemapToggle;
      if (this.currentConfig.enableBasemapToggle) {
        $('#basemapContainer').show();
      } else {
        $('#basemapContainer').hide();
      }
    },

    _locateCurrentLocation: function () {
      dom.byId("locateOnLoad").checked = this.currentConfig.locate;
    },

    _enableDisableViewer: function () {
      dom.byId("disableViewer").checked = this.currentConfig.disableViewer;
    },

    _setTabCaption: function () {
      //set sequence numbers to tabs
      array.forEach(query(".navbar-right")[0].children, lang.hitch(this, function (currentTab, index) {
        domAttr.set(currentTab.children[0], "innerHTML", number.format(++index) + ". " + currentTab.children[0].innerHTML);
      }));
      array.forEach(query(".nav-stacked")[0].children, lang.hitch(this, function (currentTab, index) {
        domAttr.set(currentTab.children[0], "innerHTML", number.format(++index) + ". " + currentTab.children[0].innerHTML);
      }));
    },

    //function to get the details of previously selected tab
    _getPrevTabDetails: function (evt) {
      if (evt) {
        this.previousState = this.currentState;
        this.currentState = evt.currentTarget.getAttribute("tab");
        this._updateAppConfiguration(this.previousState, this.previousValue);
        if (this.currentState == "preview") {
          require([
                       "application/main"
                      ], lang.hitch(this, function (userMode) {
            var index = new userMode();
            index.startup(this.currentConfig, this.response, true, dom.byId('iframeContainer'));
          }));
        } else {
          localStorage.clear();
        }
      }
    },

    //function will validate and add operational layers in dropdown
    _addOperationalLayers: function (isLoadRequired) {
      var layerListArray = [],
        validLayers = [],
        attribute;
      this._clearLayerOptions();
      array.forEach(this.currentConfig.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
        if (currentLayer.layerType && currentLayer.layerType === "ArcGISFeatureLayer") {
          layerListArray.push(this._queryLayer(currentLayer.url, currentLayer.id));
          validLayers.push(currentLayer);
        }
      }));
      all(layerListArray).then(lang.hitch(this, function (response) {
        this._checkForLayers();
        if (dom.byId("selectLayer").options.length <= 1) {
          domAttr.set(dom.byId("selectLayer"), "disabled", true);
          var html = '';
          html += "<p>" + nls.builder.invalidWebmapSelectionAlert + "</p>";
          html += "<p>" + string.substitute(nls.builder.invalidWebmapSelectionAlert2, {
            openLink: "<a target=\"_blank\" href=\"http://resources.arcgis.com/en/help/main/10.2/index.html#//0154000002w8000000\">",
            closeLink: "</a>"
          }) + "</p>";
          this._showErrorMessageDiv(html);
          array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
            attribute = currentTab.getAttribute("tab");
            if (attribute === "webmap" || attribute === "layer") {
              this._enableTab(currentTab);
            } else {
              this._disableTab(currentTab);
            }
          }));
        } else {
          if (isLoadRequired) {
            if (dom.byId("selectLayer").options.length > 2) {
              array.forEach(dom.byId("layerSelect").options, lang.hitch(this, function (opt) {
                this._populateFields(opt.value);
                this._updateAppConfiguration("fields", opt.value);
                this.previousValue = opt.value;
              }));
              dom.byId("selectLayer").options[dom.byId("selectLayer").length - 1].selected = true;
            }
            domAttr.set(dom.byId("selectLayer"), "disabled", false);
            domStyle.set(dom.byId("layerSelectPane"), 'display', 'block');
            dom.byId("layerSelect")[dom.byId("layerSelect").options.length - 1].selected = true;
            this.currentConfig.form_layer.id = "all";
          } else {
            this.previousValue = this.currentConfig.form_layer.id;

          }
          var errorNode = dom.byId('builderMessageDiv');
          array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
            domConstruct.empty(errorNode);
            attribute = currentTab.getAttribute("tab");
            if (((attribute == "publish" || attribute == "preview") && (query(".fieldCheckbox:checked").length === 0)) || (attribute == "fields" && dom.byId("selectLayer").value === "")) {
              this._disableTab(currentTab);
            } else {
              this._enableTab(currentTab);
            }
          }));
        }
        this._populateShowLayerOption(this.currentConfig.showLayer);

        this._validLayers = validLayers;
        this._validLayersResponse = response;

        this._viewerSettings();
      }));
    },

    //function to set the title, logo-path and description from config
    _populateDetails: function () {
      dom.byId("detailTitleInput").value = this.currentConfig.details.Title;
      dom.byId("detailLogoInput").value = this.currentConfig.details.Logo;
      dom.byId("detailDescriptionInput").innerHTML = this.currentConfig.details.Description;
      $(document).ready(function () {
        $('#detailDescriptionInput').summernote({
          height: 200,
          minHeight: null,
          maxHeight: null,
          focus: true
        });
      });
    },

    //function to populate all available themes in application
    _populateThemes: function () {
      var options;
      on(dom.byId("themeSelector"), "change", lang.hitch(this, function (evt) {
        this._configureTheme(evt.currentTarget.value);
      }));

      array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
        options = domConstruct.create("option", {
          id: currentTheme.id
        }, dom.byId("themeSelector"));
        options.text = currentTheme.name;
        options.value = currentTheme.id;
        if (currentTheme.id === this.currentConfig.theme) {
          domAttr.set(options, "selected", "selected");
          this._configureTheme(currentTheme.id);
        }
      }));
    },

    _populatePushpins: function () {
      var currentOption;
      array.forEach(this.pins, lang.hitch(this, function (currentPin) {
        currentOption = domConstruct.create("option", {
          "value": currentPin.id,
          "innerHTML": currentPin.name
        }, dom.byId("pushpinInput"));
        if (currentOption.value == this.currentConfig.pushpinColor) {
          currentOption.selected = "selected";
          domStyle.set(dom.byId("pushpinSymbol"), {
            "backgroundImage": 'url(' + currentPin.url + ')'
          });
        }
      }));
    },

    _locationInputChange: function (evt) {
      this.currentConfig.locationSearchOptions[domAttr.get(evt.currentTarget, "checkedField")] = evt.currentTarget.checked;
    },

    _populateLocations: function () {
      var currentInput, key, count = 0;
      for (key in this.currentConfig.locationSearchOptions) {
        if (this.currentConfig.locationSearchOptions.hasOwnProperty(key)) {
          currentInput = query("input", dom.byId('location_options'))[count];
          if (currentInput) {
            if (this.currentConfig.locationSearchOptions[key]) {
              currentInput.checked = true;
            }
            domAttr.set(currentInput, "checkedField", key);
            on(currentInput, "change", lang.hitch(this, this._locationInputChange));
          }
          count++;
        }
      }
    },

    _populateBasemapOptions: function (basemapSelect, configuredBasemap, thumbnailContainer, basemapLabel) {
      for (var basemapKey in esriBasemaps) {
        var basemapOption = domConstruct.create("option");
        basemapOption.text = esriBasemaps[basemapKey].title;
        basemapOption.value = basemapKey;
        if (basemapOption.value == configuredBasemap) {
          this._setBasemap(thumbnailContainer, basemapOption.value, basemapLabel);
          basemapOption.selected = "selected";
        }
        basemapSelect.appendChild(basemapOption);
      }
    },

    _setBasemap: function (domNode, currentValue, basemapLabel) {
      domStyle.set(domNode, "background", 'url(' + esriBasemaps[currentValue].thumbnailUrl + ') no-repeat center center');
      domAttr.set(basemapLabel, "innerHTML", esriBasemaps[currentValue].title);
    },

    _populateShowLayerOption: function (showlayeropt) {
      array.some(dom.byId("selectLayer").options, function (currentElement) {
        if (currentElement.value === "all" && currentElement.selected) {
          $("#ShowHideLayerOption")[0].checked = false;
          $("#ShowHideLayerOption")[0].disabled = true;
          return true;
        } else {
          $("#ShowHideLayerOption")[0].disabled = false;
          $("#ShowHideLayerOption")[0].checked = showlayeropt;
        }
      });
    },
    _populateJumbotronOption: function (jumbotronOption) {
      $("#jumbotronDisableOption")[0].checked = jumbotronOption;
      $("#jumbotronEnableOption")[0].checked = !jumbotronOption;
    },
    _populateShareOption: function (shareOption) {
      $("#shareOption")[0].checked = shareOption;
    },
    _populateDefaultExtentOption: function (defaultExtentOption) {
      $("#defaultExtent")[0].checked = defaultExtentOption;
    },
    //function to select the previously configured theme.
    _configureTheme: function (selectedTheme) {
      var themeThumbnail, imageAnchor;
      this.currentConfig.theme = selectedTheme;
      array.some(this.themes, lang.hitch(this, function (currentTheme) {
        if (currentTheme.id === selectedTheme) {
          domConstruct.empty(dom.byId('thumbnailContainer'));
          imageAnchor = domConstruct.create("a", {
            "target": "_blank",
            "href": currentTheme.refUrl
          }, dom.byId('thumbnailContainer'));
          themeThumbnail = domConstruct.create("img", {
            src: currentTheme.thumbnail,
            alt: "",
            className: "img-thumbnail img-responsive"
          }, imageAnchor);
          return true;
        }
      }));
    },

    //function will populate all editable fields with validations
    _populateFields: function (layerName) {
      var fieldRow, fieldName, fieldModal, fieldModalContent, fieldConfigure, fieldConfigureButton, fieldConfigureIcon, fieldLabel, fieldLabelInput, fieldDescription, fieldDescriptionInput, fieldCheckBox,
        fieldCheckBoxInput, layerIndex, fieldDNDIndicatorTD, fieldDNDIndicatorIcon, matchingField = false,
        newAddedFields = [],
        sortedFields = [],
        fieldPlaceholder, fieldPlaceholderInput, fieldType, typeSelect, labelPopupContent, helpTextPopupContent, placeholderPopupContent;
      var formFieldsNode = dom.byId('geoFormFieldsTable');
      labelPopupContent = '<div class="form-group"><label class="text-danger">' + nls.builder.labelHelpMessage + '</label><input type="text" class="form-control" data-input-type="String" placeholder="' + nls.builder.placeHolderHintMessage + '" data-display-type="text"><p class="help-block">' + nls.builder.placeHolderHelpMessage + '</p></div>';
      helpTextPopupContent = '<div class="form-group"><label>' + nls.builder.labelHelpMessage + '</label><input type="text" class="form-control" data-input-type="String" placeholder="' + nls.builder.placeHolderHintMessage + '" data-display-type="text"><p class="text-danger">' + nls.builder.placeHolderHelpMessage + '</p></div>';
      placeholderPopupContent = '<div class="form-group"><label>' + nls.builder.labelHelpMessage + '</label><input type="text" class="form-control hintBackgroundColor" data-input-type="String" placeholder="' + nls.builder.placeHolderHintMessage + '" data-display-type="text"><p class="help-block">' + nls.builder.placeHolderHelpMessage + '</p></div>';
      $('#LabelInfo').popover({
        placement: 'bottom',
        content: labelPopupContent,
        html: true,
        trigger: 'focus'
      });
      if (formFieldsNode) {
        domConstruct.empty(formFieldsNode);
      }
      var sortInstance = $(formFieldsNode).data("sortable");
      if (sortInstance) {
        sortInstance.destroy();
      }
      $(document).ready(function () {
        var tbody = $('#geoFormFieldsTable');
        if (tbody) {
          tbody.sortable({
            handle: ".drag-cursor"
          });
        }
      });

      array.forEach(this.currentConfig.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer, index) {
        if (this.fieldInfo[layerName]) {
          if (this.fieldInfo[layerName].layerUrl == currentLayer.url) {
            layerIndex = index;
          }
        }
        if (!this.config.fields.hasOwnProperty(layerName)) {
          this.config.fields[layerName] = this.fieldInfo[layerName].Fields;
        }
      }));
      if (this.fieldInfo[layerName]) {
        array.forEach(this.fieldInfo[layerName].Fields, lang.hitch(this, function (currentField) {
          matchingField = false;
          array.forEach(this.config.fields[layerName], lang.hitch(this, function (configLayerField) {
            if ((currentField.editable && configLayerField.name == currentField.name)) {
              matchingField = true;
              if (!(currentField.type === "esriFieldTypeOID" || currentField.type === "esriFieldTypeGeometry" || currentField.type === "esriFieldTypeBlob" || currentField.type === "esriFieldTypeRaster" || currentField.type === "esriFieldTypeGUID" || currentField.type === "esriFieldTypeGlobalID" || currentField.type === "esriFieldTypeXML")) {
                newAddedFields.push(lang.mixin(currentField, configLayerField));
              }
            }
          }));
          if (!matchingField) {
            if ((currentField.editable && !(currentField.type === "esriFieldTypeOID" || currentField.type === "esriFieldTypeGeometry" || currentField.type === "esriFieldTypeBlob" || currentField.type === "esriFieldTypeRaster" || currentField.type === "esriFieldTypeGUID" || currentField.type === "esriFieldTypeGlobalID" || currentField.type === "esriFieldTypeXML"))) {
              currentField.visible = true;
              currentField.isNewField = true;
              newAddedFields.push(currentField);
            }
          }
        }));
      }

      array.forEach(this.config.fields[layerName], lang.hitch(this, function (configField) {
        array.some(newAddedFields, lang.hitch(this, function (currentField) {
          if (currentField.name === configField.name) {
            sortedFields.push(currentField);
            return true;
          }
        }));
      }));
      array.forEach(newAddedFields, lang.hitch(this, function (currentField) {
        if (sortedFields.indexOf(currentField) === -1) {
          sortedFields.push(currentField);
        }
      }));
      //newAddedFields & this.currentConfig.fields
      array.forEach(sortedFields, lang.hitch(this, function (currentField, currentIndex) {
        fieldRow = domConstruct.create("tr", {
          rowIndex: currentIndex
        }, formFieldsNode);
        domAttr.set(fieldRow, "visibleProp", currentField.visible);
        fieldDNDIndicatorTD = domConstruct.create("td", {
          className: "drag-cursor"
        }, fieldRow);
        domAttr.set(fieldDNDIndicatorTD, "title", nls.builder.dragTooltipText);
        fieldDNDIndicatorIcon = domConstruct.create("span", {
          className: "ui-icon ui-icon-arrowthick-2-n-s"
        }, fieldDNDIndicatorTD);
        fieldCheckBox = domConstruct.create("td", {}, fieldRow);
        fieldCheckBoxInput = domConstruct.create("input", {
          className: "fieldCheckbox",
          type: "checkbox",
          index: currentIndex
        }, fieldCheckBox);
        if (currentField.name == this.fieldInfo[layerName].typeIdField || !currentField.nullable) {
          domAttr.set(fieldCheckBoxInput, "checked", true);
          domAttr.set(fieldCheckBoxInput, "disabled", true);
        } else {
          domAttr.set(fieldCheckBoxInput, "checked", currentField.visible);
        }
        on(fieldCheckBoxInput, "change", lang.hitch(this, function () {
          if (query(".fieldCheckbox:checked").length == query(".fieldCheckbox").length) {
            dom.byId('selectAll').checked = true;
          } else {
            dom.byId('selectAll').checked = false;
          }
          this._getFieldCheckboxState();
        }));

        fieldName = domConstruct.create("td", {
          className: "fieldName layerFieldsName",
          innerHTML: currentField.name,
          index: currentIndex
        }, fieldRow);
        fieldLabel = domConstruct.create("td", {}, fieldRow);

        fieldLabelInput = domConstruct.create("input", {
          className: "form-control fieldLabel",
          index: currentIndex,
          value: currentField.alias
        }, fieldLabel);

        fieldConfigure = domConstruct.create("td", {}, fieldRow);

        fieldConfigureButton = domConstruct.create("span", {
          className: "btn btn-default"
        }, fieldConfigure);

        fieldConfigureIcon = domConstruct.create("span", {
          className: "glyphicon glyphicon-cog"
        }, fieldConfigureButton);

        on(fieldConfigureButton, a11yclick, function () {
          $("#configure_modal_" + currentIndex).modal("show");
        });




        fieldModal = domConstruct.create("div", {
          innerHTML: string.substitute(modalTemplate, {
            id: "configure_modal_" + currentIndex,
            labelId: "configure_modal_label_" + currentIndex,
            title: string.substitute(nls.builder.configureField, {
              fieldName: currentField.name
            }),
            close: nls.user.close
          })
        }, fieldConfigure);

        fieldModalContent = dom.byId("configure_modal_" + currentIndex + "_modal_body");

        var descriptionControl = domConstruct.create("div", {
          className: "form-group"
        }, fieldModalContent);

        domConstruct.create("label", {
          innerHTML: nls.builder.fieldDescriptionLabelText
        }, descriptionControl);

        domConstruct.create("span", {
          innerHTML: " <a tabindex=\"0\" data-toggle=\"popover\" class=\"helpTextInfo glyphicon glyphicon-info-sign\"></a>"
        }, descriptionControl);


        fieldDescriptionInput = domConstruct.create("input", {
          className: "form-control fieldDescription",
          value: currentField.fieldDescription || ""
        }, descriptionControl);

        domConstruct.create("div", {
          className: "help-block",
          textContent: nls.builder.fieldDescriptionHelpText,
        }, descriptionControl);

        if (!currentField.domain) {

          var hintControl = domConstruct.create("div", {
            className: "form-group"
          }, fieldModalContent);

          domConstruct.create("label", {
            innerHTML: nls.builder.fieldTabPlaceHolderHeaderText
          }, hintControl);

          domConstruct.create("span", {
            innerHTML: " <a tabindex=\"0\" data-toggle=\"popover\" class=\"hintTextInfo glyphicon glyphicon-info-sign\"></a>"
          }, hintControl);

          fieldPlaceholderInput = domConstruct.create("input", {
            className: "form-control fieldPlaceholder",
            index: currentIndex
          }, hintControl);
          if (currentField.tooltip) {
            fieldPlaceholderInput.value = currentField.tooltip;
          }

          domConstruct.create("div", {
            className: "help-block",
            textContent: nls.builder.fieldHintHelpText,
          }, hintControl);


        }

        var displayAsControl = domConstruct.create("div", {
          className: "form-group"
        }, fieldModalContent);

        domConstruct.create("label", {
          innerHTML: nls.builder.fieldTabDisplayTypeHeaderText
        }, displayAsControl);

        if (currentField.type === "esriFieldTypeDate") {
          domConstruct.create("input", {
            "class": "form-control",
            "value": nls.builder.selectDateOption,
            "disabled": "disabled"
          }, displayAsControl);
          // date options
          var dateGroup = domConstruct.create("div", {
            className: "form-group"
          }, fieldModalContent);
          domConstruct.create("label", {
            innerHTML: nls.builder.dateSettings
          }, dateGroup);
          // hdiden date field
          var hiddenCheck = domConstruct.create("div", {
            className: "checkbox"
          }, dateGroup);
          var hiddenLabel = domConstruct.create("label", {
            textContent: nls.builder.hiddenDateField
          }, hiddenCheck);
          var hiddenInput = domConstruct.create("input", {
            "className": "hiddenDate",
            "type": "checkbox",
            "checked": currentField.hiddenDate || false
          });
          domConstruct.place(hiddenInput, hiddenLabel, "first");
          // prevent past date
          var preventPastCheck = domConstruct.create("div", {
            className: "checkbox"
          }, dateGroup);
          var preventPastLabel = domConstruct.create("label", {
            textContent: nls.builder.preventPastDates
          }, preventPastCheck);
          var preventPastInput = domConstruct.create("input", {
            "className": "preventPast",
            "type": "checkbox",
            "checked": currentField.preventPast || false
          });
          domConstruct.place(preventPastInput, preventPastLabel, "first");
          // prevent future date
          var preventFutureCheck = domConstruct.create("div", {
            className: "checkbox"
          }, dateGroup);
          var preventFutureLabel = domConstruct.create("label", {
            textContent: nls.builder.preventFutureDates
          }, preventFutureCheck);
          var preventFutureInput = domConstruct.create("input", {
            "className": "preventFuture",
            "type": "checkbox",
            "checked": currentField.preventFuture || false
          });
          domConstruct.place(preventFutureInput, preventFutureLabel, "first");
          // set with current date
          var setCurrentDateCheck = domConstruct.create("div", {
            className: "checkbox"
          }, dateGroup);
          var setCurrentDateLabel = domConstruct.create("label", {
            textContent: nls.builder.useCurrentDate
          }, setCurrentDateCheck);
          var setCurrentDateInput = domConstruct.create("input", {
            "className": "setCurrentDate",
            "type": "checkbox",
            "checked": currentField.setCurrentDate || false
          });
          domConstruct.place(setCurrentDateInput, setCurrentDateLabel, "first");
          return;
        }
        if ((currentField.domain && currentField.domain.codedValues) || (currentField.name === this.fieldInfo[layerName].typeIdField)) {
          if ((currentField.domain && currentField.domain.codedValues && currentField.domain.codedValues.length <= 4) || (currentField.name === this.fieldInfo[layerName].typeIdField && this.fieldInfo[layerName].types && this.fieldInfo[layerName].types.length <= 4)) {
            typeSelect = domConstruct.create("select", {
              "class": "form-control displayType"
            }, displayAsControl);
            domConstruct.create("option", {
              innerHTML: nls.builder.selectMenuOption,
              value: "dropdown"
            }, typeSelect);
            domConstruct.create("option", {
              innerHTML: nls.builder.selectRadioOption,
              value: "radio"
            }, typeSelect);
          } else {
            typeSelect = domConstruct.create("select", {
              "class": "form-control displayType"
            }, displayAsControl);
            domConstruct.create("option", {
              innerHTML: nls.builder.selectMenuOption,
              value: "dropdown"
            }, typeSelect);
            domConstruct.create("option", {
              innerHTML: nls.builder.selectTextOptionValue,
              value: nls.builder.selectTextOptionValue
            }, typeSelect);
          }
        } else {
          if (!currentField.domain) {
            if (currentField.type == "esriFieldTypeSmallInteger" || currentField.type == "esriFieldTypeInteger" || currentField.type == "esriFieldTypeSingle" || currentField.type == "esriFieldTypeDouble") {
              typeSelect = domConstruct.create("select", {
                "class": "form-control displayType"
              }, displayAsControl);
              domConstruct.create("option", {
                innerHTML: nls.builder.selectTextOption,
                value: "textbox"
              }, typeSelect);
              domConstruct.create("option", {
                innerHTML: nls.builder.selectCheckboxOption,
                value: "checkbox"
              }, typeSelect);
              on(typeSelect, "change", lang.hitch(this, function (evt) {
                var placeHolder = evt.currentTarget.parentNode.previousSibling.children[0];
                if (evt.currentTarget.value === "checkbox") {
                  placeHolder.value = "";
                  domClass.add(placeHolder, "hide");
                } else {
                  domClass.remove(placeHolder, "hide");
                }
              }));
            } else {
              if (currentField.type == "esriFieldTypeString" && currentField.length >= 20) {
                typeSelect = domConstruct.create("select", {
                  "class": "form-control displayType"
                }, displayAsControl);
                domConstruct.create("option", {
                  innerHTML: nls.builder.selectTextOption,
                  value: "text"
                }, typeSelect);
                domConstruct.create("option", {
                  innerHTML: nls.builder.selectMailOption,
                  value: "email"
                }, typeSelect);
                domConstruct.create("option", {
                  innerHTML: nls.builder.selectUrlOption,
                  value: "url"
                }, typeSelect);
                domConstruct.create("option", {
                  innerHTML: nls.builder.selectTextAreaOption,
                  value: "textarea"
                }, typeSelect);
              } else {
                domConstruct.create("input", {
                  "class": "form-control",
                  "value": nls.builder.selectTextOption,
                  "disabled": "disabled"
                }, displayAsControl);
              }
            }
          } else {
            domConstruct.create("input", {
              "class": "form-control",
              "value": nls.builder.selectRangeOption,
              "disabled": "disabled"
            }, displayAsControl);

          }
        }
        if (currentField.displayType) {
          this._setSelectedDisplayText(currentField.displayType, typeSelect);
        }
        if (this.currentConfig.itemInfo.itemData.operationalLayers[layerIndex].popupInfo) {
          array.forEach(this.currentConfig.itemInfo.itemData.operationalLayers[layerIndex].popupInfo.fieldInfos, function (currentFieldPopupInfo) {
            if (currentFieldPopupInfo.fieldName == currentField.name) {
              if (currentFieldPopupInfo.tooltip) {
                fieldDescriptionInput.value = currentFieldPopupInfo.tooltip;
              }
            }
          });
        }
        domAttr.set(fieldLabelInput, "value", currentField.alias);

        if (currentField.fieldDescription) {
          domAttr.set(fieldDescriptionInput, "value", currentField.fieldDescription);
        }

      }));
      if (query(".fieldCheckbox:checked").length == query(".fieldCheckbox").length) {
        dom.byId('selectAll').checked = true;
      } else {
        dom.byId('selectAll').checked = false;
      }
      if (this.fieldInfo[layerName]) {
        if (!this.currentConfig.attachmentInfo[layerName]) {
          //If not present create attachment object
          this.currentConfig.attachmentInfo[layerName] = {};
          this.currentConfig.attachmentInfo[layerName].enableAttachments = "";
          this.currentConfig.attachmentInfo[layerName].attachmentIsRequired = "";
          this.currentConfig.attachmentInfo[layerName].attachmentLabel = "";
          this.currentConfig.attachmentInfo[layerName].attachmentHelpText = "";
        }
        this.currentConfig.attachmentInfo[layerName].enableAttachments = this.currentConfig.attachmentInfo[layerName].enableAttachments ? this.currentConfig.attachmentInfo[layerName].enableAttachments : true;
        this.currentConfig.attachmentInfo[layerName].attachmentIsRequired = this.currentConfig.attachmentInfo[layerName].attachmentIsRequired ? this.currentConfig.attachmentInfo[layerName].attachmentIsRequired : false;
        this.currentConfig.attachmentInfo[layerName].attachmentLabel = this.currentConfig.attachmentInfo[layerName].attachmentLabel ? this.currentConfig.attachmentInfo[layerName].attachmentLabel : "";
        this.currentConfig.attachmentInfo[layerName].attachmentHelpText = this.currentConfig.attachmentInfo[layerName].attachmentHelpText ? this.currentConfig.attachmentInfo[layerName].attachmentHelpText : "";
        this._createAttachmentInput(this.fieldInfo[layerName].layerUrl, this.currentConfig.attachmentInfo[layerName], this.fieldInfo[layerName].hasAttachments);
      }
      var currentLayer = [];
      currentLayer[layerName] = lang.clone(formFieldsNode);
      this.currentSelectedLayer = currentLayer[layerName];
      $('.helpTextInfo').popover({
        content: helpTextPopupContent,
        html: true,
        trigger: 'focus'
      });
      $('.hintTextInfo').popover({
        content: placeholderPopupContent,
        html: true,
        trigger: 'focus'
      });
    },

    //To make the configured type as selected
    _setSelectedDisplayText: function (displayText, typeSelect) {
      array.some(typeSelect.options, function (currentOption) {
        if (currentOption.value == displayText) {
          domAttr.set(currentOption, 'selected', 'selected');
          return true;
        }
      });
    },

    //function to query layer in order to obtain all the information of layer
    _queryLayer: function (layerUrl, layerId) {
      var capabilities = null,
        layer, layerDeferred;
      if (layerUrl) {
        layer = new FeatureLayer(layerUrl);
        layerDeferred = new Deferred();
        on(layer, "load", lang.hitch(this, function () {
          capabilities = layer.getEditCapabilities();
          this._validateFeatureServer(layer, capabilities.canCreate, layerId);
          layerDeferred.resolve(layer);
        }));
        on(layer, "error", function () {
          layerDeferred.resolve();
        });
        return layerDeferred.promise;
      }
    },

    _checkForLayers: function () {
      if (!this.currentConfig.form_layer.id) {
        this.currentConfig.form_layer.id = "all";
      }
      var filteredLayer = document.createElement("option");
      filteredLayer.text = nls.builder.allLayerSelectOptionText;
      filteredLayer.value = "all";
      domConstruct.place(filteredLayer, dom.byId("selectLayer"), "first");
      array.some(dom.byId("selectLayer").options, lang.hitch(this, function (currentOption) {
        if (currentOption.value == this.currentConfig.form_layer.id) {
          currentOption.selected = true;
          return true;
        }
      }));
      if (this.currentConfig.form_layer.id == "all") {
        domStyle.set(dom.byId("layerSelectPane"), "display", "block");
        for (var key in this.fieldInfo) {
          this._populateFields(key);
        }
      } else {
        this._populateFields(this.currentConfig.form_layer.id);
        domStyle.set(dom.byId("layerSelectPane"), "display", "none");
      }

    },

    //function to filter editable layers from all the layers in webmap
    _validateFeatureServer: function (layer, canCreate, layerId) {
      if (canCreate && layer.geometryType === 'esriGeometryPoint') {
        var filteredLayer, fLayer;
        filteredLayer = document.createElement("option");
        fLayer = document.createElement("option");
        filteredLayer.text = fLayer.text = layer.name;
        filteredLayer.value = fLayer.value = layerId;
        dom.byId("selectLayer").appendChild(filteredLayer);
        dom.byId("layerSelect").appendChild(fLayer);
        fLayer.selected = true;
        this.previousValue = layerId;
        this.fieldInfo[layerId] = {};
        this.fieldInfo[layerId].Fields = layer.fields;
        this.fieldInfo[layerId].layerUrl = layer.url;
        this.fieldInfo[layerId].hasAttachments = layer.hasAttachments;
        this.fieldInfo[layerId].displayField = layer.displayField;
        if (layer.typeIdField !== "") {
          this.fieldInfo[layerId].types = layer.types;
          this.fieldInfo[layerId].typeIdField = layer.typeIdField;
        }
      }
    },

    //function to allow user to udate/select webmap from the list
    _initWebmapSelection: function () {
      var browseParams = {
          portal: this.userInfo.portal,
          galleryType: "webmap" //valid values are webmap or group
        },
        webmapButton, bootstrapButton;
      this.browseDlg = new BrowseIdDlg(browseParams, this.userInfo);
      on(this.browseDlg, "close", lang.hitch(this, function () {
        if (this.browseDlg.get("selected") !== null && this.browseDlg.get("selectedWebmap") !== null) {
          if (this.browseDlg.get("selectedWebmap").thumbnailUrl) {
            domAttr.set(query(".img-thumbnail")[0], "src", this.browseDlg.get("selectedWebmap").thumbnailUrl);
            this.currentConfig.webmapThumbnailUrl = this.browseDlg.get("selectedWebmap").thumbnailUrl;
          } else {
            domAttr.set(query(".img-thumbnail")[0], "src", "./images/default.png");
          }
          this.currentConfig.webmap = this.browseDlg.get("selectedWebmap").id;
          dom.byId("webmapLink").href = this.userInfo.portal.url + "/home/webmap/viewer.html?webmap=" + this.currentConfig.webmap;
          webmapButton = $(dom.byId("selectWebmapBtn"));
          bootstrapButton = this.buttonConflict;
          $.fn.newButton = bootstrapButton;
          webmapButton.newButton('loading');
          arcgisUtils.getItem(this.currentConfig.webmap).then(lang.hitch(this, function (itemInfo) {
            this.currentConfig.fields = {};
            this.currentConfig.form_layer.id = "";
            this.currentConfig.selectedTitleField = {};
            this.currentConfig.attachmentInfo = {};
            domConstruct.empty(dom.byId('geoFormFieldsTable'));
            this.currentConfig.itemInfo = itemInfo;
            this._addOperationalLayers(true);
            webmapButton.newButton('reset');
            dom.byId("webmapDetailText").innerHTML = string.substitute(nls.builder.webmapDetailsText, {
              webMapTitleLink: "<a target=\"_blank\" href=\"" + this.userInfo.portal.url + "/home/webmap/viewer.html?webmap=" + this.currentConfig.webmap + "\">",
              webMapTitle: this.currentConfig.itemInfo.item.title,
              closeLink: "</a>"
            });
          }), function (error) {
            console.log(error);
          });
        }
      }));

      on(dom.byId("selectWebmapBtn"), a11yclick, lang.hitch(this, function () {
        this.browseDlg.show();
      }));

      if (this.currentConfig.itemInfo.item.thumbnail) {
        domAttr.set(query(".img-thumbnail")[0], "src", this.currentConfig.sharinghost + "/sharing/rest/content/items/" + this.currentConfig.webmap + "/info/" + this.currentConfig.itemInfo.item.thumbnail + "?token=" + this.userInfo.token);
      } else {
        domAttr.set(query(".img-thumbnail")[0], "src", "./images/default.png");
      }
      dom.byId("webmapLink").href = this.userInfo.portal.url + "/home/webmap/viewer.html?webmap=" + this.currentConfig.webmap;
      dom.byId("webmapDetailText").innerHTML = string.substitute(nls.builder.webmapDetailsText, {
        webMapTitleLink: "<a target=\"_blank\" href=\"" + this.userInfo.portal.url + "/home/webmap/viewer.html?webmap=" + this.currentConfig.webmap + "\">",
        webMapTitle: this.currentConfig.itemInfo.item.title,
        closeLink: "</a>"
      });
    },

    //function to load the css/script dynamically
    _loadResources: function () {
      var cssStyle, head, geoForm;
      head = query('head')[0];
      geoForm = dom.byId("geoform");
      array.forEach(this.onDemandResources, lang.hitch(this, function (currentResource) {
        if (currentResource.type === "css") {
          cssStyle = document.createElement('link');
          cssStyle.rel = 'stylesheet';
          cssStyle.type = 'text/css';
          cssStyle.href = currentResource.path;
          domConstruct.place(cssStyle, head);
        }
      }));

    },

    //function to remove all the layers from the select box
    _clearLayerOptions: function () {
      var i;
      for (i = dom.byId("selectLayer").options.length - 1; i >= 0; i--) {
        if (dom.byId("selectLayer").options[i].value !== "") {
          dom.byId("selectLayer").remove(i);
        }
      }
      for (i = dom.byId("layerSelect").options.length - 1; i >= 0; i--) {
        if (dom.byId("layerSelect").options[i].value !== "") {
          dom.byId("layerSelect").remove(i);
        }
      }
    },

    //function takes the previous tab's details as input parameter and saves the setting to config
    _updateAppConfiguration: function (prevNavigationTab, layerObj) {
      switch (prevNavigationTab) {
      case "webmap":
        break;
      case "details":
        this.currentConfig.details.Title = dom.byId("detailTitleInput").value;
        this.currentConfig.details.Logo = dom.byId("detailLogoInput").value;
        this.currentConfig.details.Description = $('#detailDescriptionInput').code();
        break;
      case "fields":
        if (layerObj !== "all") {
          var innerObj = [];
          var fieldName, fieldLabel, fieldDescription, visible, preventPast, preventFuture, setCurrentDate, hiddenDate;
          this.currentSelectedLayer[layerObj] = dom.byId('geoFormFieldsTable');
          array.forEach(this.currentSelectedLayer[layerObj].children, lang.hitch(this, function (currentRow, currentFieldIndex) {
            if (currentRow.getAttribute("rowIndex")) {
              fieldName = query(".layerFieldsName", currentRow)[0].innerHTML;
              fieldLabel = query(".fieldLabel", currentRow)[0].value;
              fieldDescription = query(".fieldDescription", currentRow)[0].value;
              visible = query(".fieldCheckbox", currentRow)[0].checked;
              var layerFields = {};
              layerFields.name = fieldName;
              layerFields.alias = fieldLabel;
              layerFields.fieldDescription = fieldDescription;
              layerFields.visible = visible;
              var pastNodes = query(".preventPast", currentRow);
              if (pastNodes && pastNodes.length) {
                preventPast = pastNodes[0].checked;
                layerFields.preventPast = preventPast;
              }
              var futureNodes = query(".preventFuture", currentRow);
              if (futureNodes && futureNodes.length) {
                preventFuture = futureNodes[0].checked;
                layerFields.preventFuture = preventFuture;
              }
              var setDateNodes = query(".setCurrentDate", currentRow);
              if (setDateNodes && setDateNodes.length) {
                setCurrentDate = setDateNodes[0].checked;
                layerFields.setCurrentDate = setCurrentDate;
              }
              var hiddenNodes = query(".hiddenDate", currentRow);
              if (hiddenNodes && hiddenNodes.length) {
                hiddenDate = hiddenNodes[0].checked;
                layerFields.hiddenDate = hiddenDate;
              }
              innerObj.push(layerFields);
              this.currentConfig.fields[layerObj] = innerObj;
              if (query(".fieldPlaceholder", currentRow)[0] && query(".fieldPlaceholder", currentRow)[0].value) {
                this.currentConfig.fields[layerObj][currentFieldIndex].tooltip = query(".fieldPlaceholder", currentRow)[0].value;
              }
              if (query(".displayType", currentRow)[0]) {
                this.currentConfig.fields[layerObj][currentFieldIndex].displayType = query(".displayType", currentRow)[0].value;
              }
            }
            if (dom.byId("enableAttachmentInfo")) {
              this.currentConfig.attachmentInfo[layerObj].enableAttachments = dom.byId("enableAttachmentInfo").checked;
            }
            if (dom.byId("requiredAttachmentInfo")) {
              this.currentConfig.attachmentInfo[layerObj].attachmentIsRequired = dom.byId("requiredAttachmentInfo").checked;
            }
            if (dom.byId("attachmentDescription")) {
              this.currentConfig.attachmentInfo[layerObj].attachmentHelpText = dom.byId("attachmentDescription").value;
            }
            if (dom.byId("attachmentLabelInfo")) {
              this.currentConfig.attachmentInfo[layerObj].attachmentLabel = dom.byId("attachmentLabelInfo").value;
            }
          }));
        }
        break;
      default:
      }
    },

    //function to update the item on arcGis online
    _updateItem: function (saveAndExit) {
      this.appSettings = {
        "attachmentInfo": this.currentConfig.attachmentInfo,
        "enableAttachments": this.currentConfig.enableAttachments,
        "attachmentIsRequired": this.currentConfig.attachmentIsRequired,
        "attachmentHelpText": this.currentConfig.attachmentHelpText,
        "attachmentLabel": this.currentConfig.attachmentLabel,
        "defaultMapExtent": this.currentConfig.defaultMapExtent,
        "details": this.currentConfig.details,
        "showLayer": this.currentConfig.showLayer,
        "enableSharing": this.currentConfig.enableSharing,
        "fields": this.currentConfig.fields,
        "form_layer": this.currentConfig.form_layer,
        "locationSearchOptions": this.currentConfig.locationSearchOptions,
        "pushpinColor": this.currentConfig.pushpinColor,
        "theme": this.currentConfig.theme,
        "useSmallHeader": this.currentConfig.useSmallHeader,
        "webmap": this.currentConfig.webmap,
        "disableLogo": this.currentConfig.disableLogo,
        "enableBasemapToggle": this.currentConfig.enableBasemapToggle,
        "defaultBasemap": this.currentConfig.defaultBasemap,
        "nextBasemap": this.currentConfig.nextBasemap,
        "locate": this.currentConfig.locate,
        "disableViewer": this.currentConfig.disableViewer,
        "selectedTitleField": this.currentConfig.selectedTitleField
      };
      this.response.itemData.values = this.appSettings;
      this.response.item.tags = typeof (this.response.item.tags) == "object" ? this.response.item.tags.join(',') : this.response.item.tags;
      this.response.item.typeKeywords = typeof (this.response.item.typeKeywords) == "object" ? this.response.item.typeKeywords.join(',') : this.response.item.typeKeywords;
      var rqData = lang.mixin(this.response.item, {
        id: this.currentConfig.appid,
        item: this.currentConfig.appid,
        itemType: "text",
        f: 'json',
        token: this.userInfo.token,
        title: this.currentConfig.details.Title ? this.currentConfig.details.Title : nls.builder.geoformTitleText,
        text: JSON.stringify(this.response.itemData),
        type: "Web Mapping Application",
        overwrite: true
      });
      this._addProgressBar();
      $("#myModal").modal('show');
      arcgisUtils.getItem(this.currentConfig.appid).then(lang.hitch(this, function (response) {
        var updateURL = this.userInfo.portal.url + "/sharing/content/users/" + this.userInfo.username + (response.item.ownerFolder ? ("/" + response.item.ownerFolder) : "") + "/items/" + this.currentConfig.appid + "/update";
        esriRequest({
          url: updateURL,
          content: rqData,
          handleAs: 'json'
        }, {
          usePost: true
        }).then(lang.hitch(this, function (result) {
          if (result.success) {
            if (saveAndExit) {
              $("#myModal").modal('hide');
              var detailsPageURL = this.currentConfig.sharinghost + "/home/item.html?id=" + this.currentConfig.appid;
              window.location.assign(detailsPageURL);
              return true;
            }
            if (this._ShareModal) {
              this._ShareModal.destroy();
            }
            this._createShareDlgContent();
            this._ShareModal = new ShareModal({
              bitlyLogin: this.currentConfig.bitlyLogin,
              bitlyKey: this.currentConfig.bitlyKey,
              image: this.currentConfig.sharinghost + '/sharing/rest/content/items/' + this.currentConfig.itemInfo.item.id + '/info/' + this.currentConfig.itemInfo.item.thumbnail,
              title: this.currentConfig.details.Title || nls.builder.geoformTitleText || '',
              summary: this.currentConfig.itemInfo.item.snippet || '',
              hashtags: 'esriGeoForm',
              shareOption: this.currentConfig.enableSharing
            });
            this._ShareModal.startup();
          }
        }), function () {
          $("#myModal").modal('hide');
        });
      }));
    },

    //function to show a progress bar before the content of share dialog is loaded
    _addProgressBar: function () {
      var progressIndicatorContainer;
      domConstruct.empty($("#myModal .modal-body")[0]);
      domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.builder.shareBuilderInProgressTitleMessage);
      progressIndicatorContainer = domConstruct.create("div", {
        className: "progress progress-striped active progress-remove-margin"
      }, $("#myModal .modal-body")[0]);
      domConstruct.create("div", {
        className: "progress-bar progress-percent",
        innerHTML: nls.builder.shareBuilderProgressBarMessage
      }, progressIndicatorContainer);
    },
    //function to create and show the contents of the share dialog
    _createShareDlgContent: function () {
      var iconContainer, group;
      domConstruct.empty($("#myModal .modal-body")[0]);
      domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.builder.shareBuilderTitleMessage);
      iconContainer = domConstruct.create("div", {
        className: "iconContainer"
      }, $("#myModal .modal-body")[0]);
      domConstruct.create("div", {
        className: "alert alert-success",
        role: "alert",
        innerHTML: nls.builder.shareBuilderSuccess
      }, iconContainer);
      if ($("#shareOption")[0].checked) {
        domConstruct.create("h3", {
          innerHTML: nls.user.shareThisForm
        }, iconContainer);
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
    //function to enable the tab passed in input parameter
    _enableTab: function (currentTab) {
      if (!this.localStorageSupport.supportsStorage() && domAttr.get(currentTab, "tab") == "preview")
        return;
      if (domClass.contains(currentTab, "btn")) {
        domClass.remove(currentTab, "disabled");
      } else {
        domClass.remove(currentTab.parentNode, "disabled");
      }
      domAttr.set(currentTab, "data-toggle", "tab");
    },

    //function to disable the tab passed in input parameter
    _disableTab: function (currentTab) {
      if (domClass.contains(currentTab, "btn")) {
        domClass.add(currentTab, "disabled");
      } else {
        domClass.add(currentTab.parentNode, "disabled");
      }
      domAttr.set(currentTab, "data-toggle", "");
    },

    _currentFieldVisible: function (currentField) {
      if (!currentField.visible) {
        return true;
      }
    },

    _getFieldCheckboxState: function () {
      array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
        if ((domAttr.get(currentTab, "tab") === "preview" || domAttr.get(currentTab, "tab") === "publish") && (query(".fieldCheckbox:checked").length === 0)) {
          if (this.config.form_layer.id == "all") {
            var isFieldEmpty = false;
            for (var layerId in this.config.fields) {
              var val = array.some(this.config.fields[layerId], lang.hitch(this, this._currentFieldVisible));
              if (val) {
                isFieldEmpty = true;
              }
            }
            if (isFieldEmpty) {
              this._disableTab(currentTab);
            } else {
              this._enableTab(currentTab);
            }
          } else {
            this._disableTab(currentTab);
          }
        } else {
          this._enableTab(currentTab);
        }
      }));
    },

    _showErrorMessageDiv: function (errorMessage) {
      var errorNode = dom.byId('builderMessageDiv');
      domConstruct.empty(errorNode);
      domConstruct.create("div", {
        className: "alert alert-danger errorMessage",
        innerHTML: errorMessage
      }, errorNode);
    },

    _createAttachmentInput: function (layerUrl, attachmentInfo, isAttachmentRequired) {
      var featureLayer, enableAttachmentContainer, enableAttachmentContent, enableAttachmentLabel, attachmentLabel,
        requiredAttachmentContainer, requiredAttachmentContent, requiredAttachmentLabel, attachmentDetails;
      this._layerLoaded = false;
      featureLayer = new FeatureLayer(layerUrl);
      domConstruct.empty(dom.byId('attachmentDetails'));
      if (isAttachmentRequired) {
        //code to enable/disable the attachment in the user form.
        enableAttachmentContainer = domConstruct.create("div", {
          "id": "enableAttachmentContainer",
          "class": "form-group"
        }, dom.byId('attachmentDetails'));
        enableAttachmentContent = domConstruct.create("div", {
          "id": "enableAttachmentContent",
          "class": "checkbox"
        }, enableAttachmentContainer);
        enableAttachmentLabel = domConstruct.create("label", {
          "for": "enableAttachmentInfo"
        }, enableAttachmentContent);
        domConstruct.create("input", {
          "type": "checkbox",
          "id": "enableAttachmentInfo"
        }, enableAttachmentLabel);
        if (attachmentInfo.enableAttachments) {
          domAttr.set(dom.byId("enableAttachmentInfo"), "checked", "checked");
        }
        enableAttachmentLabel.innerHTML += string.substitute(nls.builder.enableAttachmentLabelText, {
          openStrong: "<strong>",
          closeStrong: "</strong>"
        });
        domConstruct.create("span", {
          "class": "attachmentHint",
          "innerHTML": nls.builder.enableAttachmentLabelHint
        }, enableAttachmentContainer);
        //code to make the checkbox for making the attachment as a mandatory field.
        requiredAttachmentContainer = domConstruct.create("div", {
          "id": "requiredAttachmentContainer",
          "class": "form-group"
        }, dom.byId('attachmentDetails'));
        requiredAttachmentContent = domConstruct.create("div", {
          "id": "requiredAttachmentContent",
          "class": "checkbox"
        }, requiredAttachmentContainer);
        requiredAttachmentLabel = domConstruct.create("label", {
          "for": "requiredAttachmentInfo"
        }, requiredAttachmentContent);
        domConstruct.create("input", {
          "type": "checkbox",
          "id": "requiredAttachmentInfo"
        }, requiredAttachmentLabel);
        if (attachmentInfo.attachmentIsRequired) {
          domAttr.set(dom.byId("requiredAttachmentInfo"), "checked", "checked");
        }
        requiredAttachmentLabel.innerHTML += string.substitute(nls.builder.attachmentIsRequiredLabelText, {
          openStrong: "<strong>",
          closeStrong: "</strong>"
        });
        domConstruct.create("span", {
          "class": "attachmentHint",
          "innerHTML": nls.builder.attachmentIsRequiredLabelHint
        }, requiredAttachmentContainer);
        //code to make the attachment label
        attachmentLabel = domConstruct.create("div", {
          "id": "attachmentLabel",
          "class": "form-group"
        }, dom.byId('attachmentDetails'));
        domConstruct.create("label", {
          "for": "attachmentLabelInfo",
          "innerHTML": nls.builder.attachmentLabelText
        }, attachmentLabel);
        domConstruct.create("input", {
          "type": "text",
          "class": "form-control",
          "id": "attachmentLabelInfo",
          "value": attachmentInfo.attachmentLabel ? attachmentInfo.attachmentLabel : ""
        }, attachmentLabel);
        domConstruct.create("span", {
          "class": "attachmentHint",
          "innerHTML": nls.builder.attachmentLabelHint
        }, attachmentLabel);
        attachmentDetails = domConstruct.create("div", {
          "id": "attachmentDetails",
          "class": "form-group"
        }, dom.byId('attachmentDetails'));
        domConstruct.create("label", {
          "for": "attachmentDescription",
          "innerHTML": nls.builder.attachmentDescription
        }, attachmentDetails);
        domConstruct.create("input", {
          "type": "text",
          "class": "form-control",
          "id": "attachmentDescription",
          "value": attachmentInfo.attachmentHelpText ? attachmentInfo.attachmentHelpText : ""
        }, attachmentDetails);
        domConstruct.create("span", {
          "class": "attachmentHint",
          "innerHTML": nls.builder.attachmentHint
        }, attachmentDetails);
        this._setAttachmentInputState();
        on(dom.byId("enableAttachmentInfo"), "change", lang.hitch(this, function () {
          this._setAttachmentInputState();
        }));
      }
    },

    _setAttachmentInputState: function () {
      if (!dom.byId("enableAttachmentInfo").checked) {
        domAttr.set(dom.byId("requiredAttachmentInfo"), "disabled", true);
        domAttr.set(dom.byId("attachmentLabelInfo"), "disabled", true);
        domAttr.set(dom.byId("attachmentDescription"), "disabled", true);
      } else {
        domAttr.set(dom.byId("requiredAttachmentInfo"), "disabled", false);
        domAttr.set(dom.byId("attachmentLabelInfo"), "disabled", false);
        domAttr.set(dom.byId("attachmentDescription"), "disabled", false);
      }
    }
  });
});
