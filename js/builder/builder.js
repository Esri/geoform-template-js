/*global $ */
define([
   "dojo/ready",
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
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/number",
    "dojo/text!views/modal.html",
    "dojo/text!views/author.html",
    "application/builder/browseIdDlg",
    "application/ShareModal",
    "application/localStorageHelper",
    "application/builder/signInHelper",
    "dojo/i18n!application/nls/builder",
    "dojo/i18n!application/nls/resources",
    "esri/arcgis/utils",
    "application/themes",
    "application/pushpins",
    "esri/layers/FeatureLayer",
    "dojo/domReady!"
], function (ready, declare, on, dom, esriRequest, array, domConstruct, domAttr, query, domClass, domStyle, lang, string, Deferred, all, number, modalTemplate, authorTemplate, BrowseIdDlg, ShareModal, localStorageHelper, signInHelper, nls, resources, arcgisUtils, theme, pushpins, FeatureLayer) {
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
            { "type": "script", "path": "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js" },
            { "type": "css", "path": "css/browseDialog.css" },
            { "type": "css", "path": "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.10.4/css/jquery-ui.min.css" },
            { "type": "script", "path": "//cdnjs.cloudflare.com/ajax/libs/jqueryui-touch-punch/0.2.2/jquery.ui.touch-punch.min.js" }
	        ];
        },

        startup: function () {
            var def = new Deferred();
            var signIn = new signInHelper(), userInfo = {};
            this.locationSearchOption = {
                "enableMyLocation": true,
                "enableSearch": true,
                "enableLatLng": true,
                "enableUSNG": false,
                "enableMGRS": false,
                "enableUTM": false
            };

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
                }
                else {
                    def.reject(new Error("Invalid User"));
                }
            }), lang.hitch(this, function (error) {
                def.reject(error);
            }));
            return def.promise;
        },

        _initializeBuilder: function (config, userInfo, response) {
            // set to default theme. (first in array)
            dom.byId("themeLink").href = this.themes[0].url;
            // set author html
            var combinedNLS = lang.mixin(nls, resources);
            var authorHTML = string.substitute(authorTemplate, combinedNLS);
            dom.byId("parentContainter").innerHTML = authorHTML;
            this.buttonConflict = $.fn.button.noConflict();
            var $tabs = $('.tab-links li');
            domClass.add($('.navigationTabs')[0], "activeTab");
            // document ready
            ready(lang.hitch(this, function () {
                modalTemplate = string.substitute(modalTemplate, resources);
                // place modal code
                domConstruct.place(modalTemplate, document.body, 'last');
            }));
            $('.prevtab').on('click', lang.hitch(this, function () {
                $tabs.filter('.active').prev('li').find('a[data-toggle="tab"]').tab('show');
            }));

            $('.nexttab').on('click', lang.hitch(this, function () {
                $tabs.filter('.active').next('li').find('a[data-toggle="tab"]').tab('show');
            }));

            $('.navigationTabs').on('click', lang.hitch(this, function (evt) {
                this._getPrevTabDetails(evt);
            }));

            $('#saveButton').on('click', lang.hitch(this, function () {
                this._updateItem();
            }));

            $('#done').on('click', lang.hitch(this, function () {
                var detailsPageURL = this.currentConfig.sharinghost + "/home/item.html?id=" + this.currentConfig.appid;
                window.open(detailsPageURL);
            }));

            $('#jumbotronOption').on('click', lang.hitch(this, function () {
                this.currentConfig.useSmallHeader = $('#jumbotronOption')[0].checked;
            }));
            $('#shareOption').on('click', lang.hitch(this, function () {
                this.currentConfig.enableSharing = $('#shareOption')[0].checked;
            }));
            $('#defaultExtent').on('click', lang.hitch(this, function () {
                this.currentConfig.defaultMapExtent = $('#defaultExtent')[0].checked;
            }));
            this._loadResources();
            this.currentConfig = config;
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
            if (!this.localStorageSupport.supportsStorage()) {
                array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
                    if (domAttr.get(currentTab, "tab") == "preview") {
                        this._disableTab(currentTab);
                    }
                }));
            }
            on(dom.byId("selectLayer"), "change", lang.hitch(this, function (evt) {
                this.currentConfig.form_layer.id = evt.currentTarget.value;
                this._populateFields(evt.currentTarget.value);
                if (evt.currentTarget.value == nls.builder.selectLayerDefaultOptionText) {
                    array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
                        if (domAttr.get(currentTab, "tab") == "fields" || domAttr.get(currentTab, "tab") == "preview" || domAttr.get(currentTab, "tab") == "publish" || domAttr.get(currentTab, "tab") == "options") {
                            this._disableTab(currentTab);
                        }
                    }));
                } else {
                    array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
                        if (domAttr.get(currentTab, "tab") == "fields" || ((domAttr.get(currentTab, "tab") === "preview" || domAttr.get(currentTab, "tab") === "publish" || domAttr.get(currentTab, "tab") == "options") && query(".fieldCheckbox:checked").length !== 0)) {
                            this._enableTab(currentTab);
                        }
                    }));
                }
            }));

            on(dom.byId('selectAll'), "change", lang.hitch(this, function (evt) {
                array.forEach(query(".fieldCheckbox"), lang.hitch(this, function (currentCheckBox) {
                    currentCheckBox.checked = evt.currentTarget.checked;
                }));
                this._getFieldCheckboxState();
            }));
            on($('#pushpinInput'), 'change', lang.hitch(this, function (evt) {
                this.currentConfig.pushpinColor = evt.currentTarget.value;
                array.some(this.pins, lang.hitch(this, function (pin) {
                    if (pin.id === evt.currentTarget.value) {
                        domStyle.set(dom.byId("pushpinSymbol"), { "backgroundImage": 'url(' + pin.url + ')' });
                        return true;
                    }
                }));
            }));
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
                this._updateAppConfiguration(this.previousState);
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
        _addOperationalLayers: function () {
            var layerListArray = [], attribute;
            this._clearLayerOptions();
            array.forEach(this.currentConfig.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
                if (currentLayer.url && currentLayer.url.split("/")[currentLayer.url.split("/").length - 2].toLowerCase() == "featureserver") {
                    layerListArray.push(this._queryLayer(currentLayer.url, currentLayer.id));
                }
            }));
            all(layerListArray).then(lang.hitch(this, function () {
                if (dom.byId("selectLayer").options.length <= 1) {
                    domAttr.set(dom.byId("selectLayer"), "disabled", true);
                    this._showErrorMessageDiv(nls.builder.invalidWebmapSelectionAlert);
                    array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
                        attribute = currentTab.getAttribute("tab");
                        if (attribute === "webmap" || attribute === "layer") {
                            this._enableTab(currentTab);
                        } else {
                            this._disableTab(currentTab);
                        }
                    }));
                } else {
                    var errorNode = dom.byId('builderMessageDiv');
                    array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
                        domConstruct.empty(errorNode);
                        attribute = currentTab.getAttribute("tab");
                        if (((attribute == "publish" || attribute == "preview") && (query(".fieldCheckbox:checked").length === 0)) || (attribute == "fields" && dom.byId("selectLayer").value === "Select Layer")) {
                            this._disableTab(currentTab);
                        } else {
                            this._enableTab(currentTab);
                        }
                    }));
                    domAttr.set(dom.byId("selectLayer"), "disabled", false);
                }
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
                currentOption = domConstruct.create("option", { "value": currentPin.id, "innerHTML": currentPin.name }, dom.byId("pushpinInput"));
                if (currentOption.value == this.currentConfig.pushpinColor) {
                    currentOption.selected = "selected";
                    domStyle.set(dom.byId("pushpinSymbol"), { "backgroundImage": 'url(' + currentPin.url + ')' });
                }
            }));
        },

        _populateLocations: function () {
            var currentInput, key, count = 0;
            for (key in this.currentConfig.locationSearchOptions) {
                currentInput = query("input", dom.byId('location_options'))[count];
                if (currentInput) {
                    if (this.currentConfig.locationSearchOptions[key]) {
                        currentInput.checked = true;
                    }
                    domAttr.set(currentInput, "checkedField", key);
                    on(currentInput, "change", lang.hitch(this, function (evt) {
                        this.currentConfig.locationSearchOptions[domAttr.get(evt.currentTarget, "checkedField")] = evt.currentTarget.checked;
                    }));
                }
                count++;
            }
        },

        _populateJumbotronOption: function (jumbotronOption) {
            $("#jumbotronOption")[0].checked = jumbotronOption;
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
                    imageAnchor = domConstruct.create("a", { "target": "_blank", "href": currentTheme.refUrl }, dom.byId('thumbnailContainer'));
                    themeThumbnail = domConstruct.create("img", {
                        src: currentTheme.thumbnail,
                        className: "img-thumbnail img-responsive"
                    }, imageAnchor);
                    return true;
                }
            }));
        },

        //function will populate all editable fields with validations
        _populateFields: function (layerName) {
            var configuredFields = [],
                configuredFieldName = [],
                fieldRow, fieldName, fieldLabel, fieldLabelInput, fieldDescription, fieldDescriptionInput, fieldCheckBox,
                fieldCheckBoxInput, layerIndex, fieldDNDIndicatorTD, fieldDNDIndicatorIcon, matchingField = false,
                newAddedFields = [], sortedFields = [], fieldPlaceholder, fieldPlaceholderInput, fieldType, typeSelect;
            var formFieldsNode = dom.byId('geoFormFieldsTable');
            if (formFieldsNode) {
                domConstruct.empty(formFieldsNode);
            }
            var sortInstance = $(formFieldsNode).data("sortable");
            if(sortInstance){
                sortInstance.destroy();
            }
            $(formFieldsNode).sortable();
            array.forEach(this.currentConfig.fields, lang.hitch(this, function (currentField) {
                configuredFieldName.push(currentField.name);
                configuredFields.push(currentField);
            }));

            array.forEach(this.currentConfig.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer, index) {
                if (this.fieldInfo[layerName]) {
                    if (this.fieldInfo[layerName].layerUrl == currentLayer.url) {
                        layerIndex = index;
                    }
                }
            }));
            if (this.fieldInfo[layerName]) {
                array.forEach(this.fieldInfo[layerName].Fields, lang.hitch(this, function (currentField) {
                    matchingField = false;
                    array.forEach(this.currentConfig.fields, lang.hitch(this, function (configLayerField) {
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

            array.forEach(this.currentConfig.fields, lang.hitch(this, function (configField) {
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
                fieldDNDIndicatorIcon = domConstruct.create("span", {
                    className: "ui-icon ui-icon-arrowthick-2-n-s"
                }, fieldDNDIndicatorTD);
                fieldCheckBox = domConstruct.create("td", {}, fieldRow);
                fieldCheckBoxInput = domConstruct.create("input", {
                    className: "fieldCheckbox",
                    type: "checkbox",
                    index: currentIndex
                }, fieldCheckBox);
                if (currentField.name !== this.fieldInfo[layerName].typeIdField) {
                    domAttr.set(fieldCheckBoxInput, "checked", currentField.visible);
                }
                else {
                    domAttr.set(fieldCheckBoxInput, "checked", true);
                    domAttr.set(fieldCheckBoxInput, "disabled", true);
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
                fieldLabel = domConstruct.create("td", {
                }, fieldRow);
                fieldLabelInput = domConstruct.create("input", {
                    className: "form-control fieldLabel",
                    index: currentIndex,
                    value: currentField.alias
                }, fieldLabel);
                fieldDescription = domConstruct.create("td", {
                }, fieldRow);
                fieldDescriptionInput = domConstruct.create("input", {
                    className: "form-control fieldDescription",
                    value: ""
                }, fieldDescription);
                fieldPlaceholder = domConstruct.create("td", {
                }, fieldRow);

                if (!currentField.domain) {
                    fieldPlaceholderInput = domConstruct.create("input", {
                        className: "form-control fieldPlaceholder",
                        index: currentIndex
                    }, fieldPlaceholder);
                    if (currentField.tooltip) {
                        fieldPlaceholderInput.value = currentField.tooltip;
                    }
                }
                fieldType = domConstruct.create("td", {
                }, fieldRow);
                if (currentField.type === "esriFieldTypeDate") {
                    return;
                }
                if ((currentField.domain && currentField.domain.codedValues) || (currentField.name === this.fieldInfo[layerName].typeIdField)) {
                    if ((currentField.domain && currentField.domain.codedValues.length <= 4) || (this.fieldInfo[layerName].types && this.fieldInfo[layerName].types.length <= 4)) {
                        typeSelect = domConstruct.create("select", { "class": "form-control displayType" }, fieldType);
                        domConstruct.create("option", { innerHTML: nls.builder.selectMenuOption, value: "dropdown" }, typeSelect);
                        domConstruct.create("option", { innerHTML: nls.builder.selectRadioOption, value: "radio" }, typeSelect);
                    }
                } else {
                    if (!currentField.domain) {
                        typeSelect = domConstruct.create("select", { "class": "form-control displayType" }, fieldType);
                        if (currentField.type == "esriFieldTypeSmallInteger" || currentField.type == "esriFieldTypeInteger" || currentField.type == "esriFieldTypeSingle" || currentField.type == "esriFieldTypeDouble") {
                            domConstruct.create("option", { innerHTML: nls.builder.selectTextOption, value: "textbox" }, typeSelect);
                            domConstruct.create("option", { innerHTML: nls.builder.selectCheckboxOption, value: "checkbox" }, typeSelect);
                        } else {
                            if (currentField.type == "esriFieldTypeString") {
                                domConstruct.create("option", { innerHTML: nls.builder.selectTextOption, value: "text" }, typeSelect);
                                if (currentField.length >= 30) {
                                    domConstruct.create("option", { innerHTML: nls.builder.selectMailOption, value: "email" }, typeSelect);
                                    domConstruct.create("option", { innerHTML: nls.builder.selectUrlOption, value: "url" }, typeSelect);
                                }
                                domConstruct.create("option", { innerHTML: nls.builder.selectTextAreaOption, value: "textarea" }, typeSelect);
                            }
                        }
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
            this._updateAppConfiguration("fields");
            if (this.fieldInfo[layerName]) {
                this._createAttachmentInput(this.fieldInfo[layerName].layerUrl);
            }
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
            var capabilities = null;
            var layer = new FeatureLayer(layerUrl);
            var layerDeferred = new Deferred();
            on(layer, "load", lang.hitch(this, function () {
                capabilities = layer.getEditCapabilities();
                this._validateFeatureServer(layer, capabilities.canCreate, layerId);
                layerDeferred.resolve(true);
            }));
            on(layer, "error", function () {
                layerDeferred.resolve(true);
            });
            return layerDeferred.promise;
        },

        //function to filter editable layers from all the layers in webmap
        _validateFeatureServer: function (layer, canCreate, layerId) {
            if (canCreate) {
                var filteredLayer;
                filteredLayer = document.createElement("option");
                filteredLayer.text = layer.name;
                filteredLayer.value = layerId;
                dom.byId("selectLayer").appendChild(filteredLayer);
                this.fieldInfo[layerId] = {};
                this.fieldInfo[layerId].Fields = layer.fields;
                this.fieldInfo[layerId].layerUrl = layer.url;
                if (layerId == this.currentConfig.form_layer.id) {
                    this._populateFields(layerId);
                    filteredLayer.selected = "selected";
                }
            }
        },

        //function to allow user to udate/select webmap from the list
        _initWebmapSelection: function () {
            var browseParams = {
                portal: this.userInfo.portal,
                galleryType: "webmap" //valid values are webmap or group
            }, webmapButton, bootstrapButton;
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
                        this.currentConfig.fields.length = 0;
                        this.currentConfig.form_layer.id = "";
                        domConstruct.empty(dom.byId('geoFormFieldsTable'));
                        this.currentConfig.itemInfo = itemInfo;
                        this._addOperationalLayers();
                        webmapButton.newButton('reset');
                    }), function (error) {
                        console.log(error);
                    });
                }
            }));

            on(dom.byId("selectWebmapBtn"), "click", lang.hitch(this, function () {
                this.browseDlg.show();
            }));

            if (this.currentConfig.itemInfo.item.thumbnail) {
                domAttr.set(query(".img-thumbnail")[0], "src", this.currentConfig.sharinghost + "/sharing/rest/content/items/" + this.currentConfig.webmap + "/info/" + this.currentConfig.itemInfo.item.thumbnail + "?token=" + this.userInfo.token);
            } else {
                domAttr.set(query(".img-thumbnail")[0], "src", "./images/default.png");
            }
            dom.byId("webmapLink").href = this.userInfo.portal.url + "/home/webmap/viewer.html?webmap=" + this.currentConfig.webmap;
        },

        //function to load the css/script dynamically
        _loadResources: function () {
            var cssStyle, scriptFile;
            array.forEach(this.onDemandResources, lang.hitch(this, function (currentResource) {
                if (currentResource.type === "css") {
                    cssStyle = document.createElement('link');
                    cssStyle.rel = 'stylesheet';
                    cssStyle.type = 'text/css';
                    cssStyle.href = currentResource.path;
                    document.getElementsByTagName('head')[0].appendChild(cssStyle);
                }
                else {
                    scriptFile = document.createElement('script');
                    scriptFile.type = "text/javascript";
                    scriptFile.src = currentResource.path;
                    dom.byId("geoform").appendChild(scriptFile);
                }
            }));

        },

        //function to remove all the layers from the select box
        _clearLayerOptions: function () {
            var i;
            for (i = dom.byId("selectLayer").options.length - 1; i >= 0; i--) {
                if (dom.byId("selectLayer").options[i].value != "Select Layer") {
                    dom.byId("selectLayer").remove(i);
                }
            }
        },

        //function takes the previous tab's details as input parameter and saves the setting to config
        _updateAppConfiguration: function (prevNavigationTab) {
            switch (prevNavigationTab) {
                case "webmap":
                    break;
                case "details":
                    this.currentConfig.details.Title = dom.byId("detailTitleInput").value;
                    this.currentConfig.details.Logo = dom.byId("detailLogoInput").value;
                    this.currentConfig.details.Description = $('#detailDescriptionInput').code();
                    break;
                case "fields":
                    this.currentConfig.fields.length = 0;
                    var fieldName, fieldLabel, fieldDescription, layerName, visible, typeField;
                    layerName = dom.byId("selectLayer").value;
                    array.forEach($("#tableDND")[0].rows, lang.hitch(this, function (currentRow, currentFieldIndex) {
                        if (currentRow.getAttribute("rowIndex")) {
                            fieldName = query(".layerFieldsName", currentRow)[0].innerHTML;

                            fieldLabel = query(".fieldLabel", currentRow)[0].value;
                            fieldDescription = query(".fieldDescription", currentRow)[0].value;
                            visible = query(".fieldCheckbox", currentRow)[0].checked;
                            typeField = query(".fieldCheckbox", currentRow)[0].checked && query(".fieldCheckbox", currentRow)[0].disabled;
                            this.currentConfig.fields.push({
                                name: fieldName,
                                alias: fieldLabel,
                                fieldDescription: fieldDescription,
                                visible: visible,
                                typeField: typeField
                            });
                            if (query(".fieldPlaceholder", currentRow)[0] && query(".fieldPlaceholder", currentRow)[0].value) {
                                this.currentConfig.fields[currentFieldIndex - 1].tooltip = query(".fieldPlaceholder", currentRow)[0].value;
                            }
                            if (query(".displayType", currentRow)[0]) {
                                this.currentConfig.fields[currentFieldIndex - 1].displayType = query(".displayType", currentRow)[0].value;
                            }
                        }
			if (dom.byId("attachmentDescription")) {
                            this.currentConfig.attachmentHelpText = dom.byId("attachmentDescription").value;
                        }
                        if (dom.byId("attachmentLabelInfo")) {
                            this.currentConfig.attachmentLabel = dom.byId("attachmentLabelInfo").value;
                        }
                    }));
                    break;
                default:
            }
        },

        //function to update the item on arcGis online
        _updateItem: function () {
            this.appSettings = {
                "attachmentHelpText": this.currentConfig.attachmentHelpText,
                "attachmentLabel": this.currentConfig.attachmentLabel,
                "defaultMapExtent": this.currentConfig.defaultMapExtent,
                "details": this.currentConfig.details,
                "enableSharing": this.currentConfig.enableSharing,
                "fields": this.currentConfig.fields,
                "form_layer": this.currentConfig.form_layer,
                "locationSearchOptions": this.currentConfig.locationSearchOptions,
                "pushpinColor": this.currentConfig.pushpinColor,
                "theme": this.currentConfig.theme,
                "useSmallHeader": this.currentConfig.useSmallHeader,
                "webmap": this.currentConfig.webmap
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
                        this._createShareDlgContent();
                        this._ShareModal = new ShareModal({
                            bitlyLogin: this.currentConfig.bitlyLogin,
                            bitlyKey: this.currentConfig.bitlyKey,
                            image: this.currentConfig.sharinghost + '/sharing/rest/content/items/' + this.currentConfig.itemInfo.item.id + '/info/' + this.currentConfig.itemInfo.item.thumbnail,
                            title: this.currentConfig.details.Title || nls.builder.geoformTitleText || '',
                            summary: this.currentConfig.details.Description || '',
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
            var progressIndicatorContainer, progressIndicator;
            domConstruct.empty($("#myModal .modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.builder.shareBuilderInProgressTitleMessage);
            progressIndicatorContainer = domConstruct.create("div", {
                className: "progress progress-striped active progress-remove-margin"
            }, $("#myModal .modal-body")[0]);
            progressIndicator = domConstruct.create("div", {
                className: "progress-bar progress-percent",
                innerHTML: nls.builder.shareBuilderProgressBarMessage
            }, progressIndicatorContainer);
        },
        _createShareDlgContent: function () {
            var iconContainer, facebookIconHolder, twitterIconHolder, googlePlusIconHolder, mailIconHolder;
            domConstruct.empty($("#myModal .modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.builder.shareBuilderTitleMessage);
            iconContainer = domConstruct.create("div", {
                className: "iconContainer"
            }, $("#myModal .modal-body")[0]);
            domConstruct.create("div", {
                className: "share-dialog-subheader",
                innerHTML: nls.builder.shareBuilderTextMessage
            }, iconContainer);
            if ($("#shareOption")[0].checked) {
                facebookIconHolder = domConstruct.create("div", {
                    className: "pull-left"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-facebook-square iconClass",
                    id: "facebookIcon"
                }, facebookIconHolder);
                twitterIconHolder = domConstruct.create("div", {
                    className: "pull-left"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-twitter-square iconClass",
                    id: "twitterIcon"
                }, twitterIconHolder);
                googlePlusIconHolder = domConstruct.create("div", {
                    className: "pull-left"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-google-plus-square iconClass",
                    id: "google-plusIcon"
                }, googlePlusIconHolder);
            }
            mailIconHolder = domConstruct.create("div", {
                className: "pull-left"
            }, iconContainer);
            domConstruct.create("a", {
                className: "fa fa-envelope iconClass",
                id: "mailIcon"
            }, mailIconHolder);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("div", {
                className: "share-dialog-subheader",
                innerHTML: nls.builder.shareModalFormText
            }, iconContainer);
            domConstruct.create("input", {
                type: "text",
                className: "share-map-url",
                id: "_shareMapUrlText"
            }, iconContainer);
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

        _getFieldCheckboxState: function () {
            array.forEach(query(".navigationTabs"), lang.hitch(this, function (currentTab) {
                if ((domAttr.get(currentTab, "tab") === "preview" || domAttr.get(currentTab, "tab") === "publish") && (query(".fieldCheckbox:checked").length === 0)) {
                    this._disableTab(currentTab);
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

        _createAttachmentInput: function (layerUrl) {
            var fLayer, attachmentDetails, attachmentLabel;
            domConstruct.empty(dom.byId('attachmentDetails'));
            fLayer = new FeatureLayer(layerUrl);
            on(fLayer, 'load', lang.hitch(this, function () {
                if (fLayer.hasAttachments) {
                    attachmentLabel = domConstruct.create("div", { "id": "attachmentLabel", "class": "form-group" }, dom.byId('attachmentDetails'));
                    domConstruct.create("label", { "for": "attachmentLabel", "innerHTML": nls.builder.attachmentLabelText }, attachmentLabel);
                    domConstruct.create("input", { "type": "text", "class": "form-control", "id": "attachmentLabelInfo", "value": this.currentConfig.attachmentLabel }, attachmentLabel);
                    domConstruct.create("span", { "class": "attachmentHint", "innerHTML": nls.builder.attachmentLabelHint }, attachmentLabel);
                    attachmentDetails = domConstruct.create("div", { "id": "attachmentDetails", "class": "form-group" }, dom.byId('attachmentDetails'));
                    domConstruct.create("label", { "for": "attachmentDescription", "innerHTML": nls.builder.attachmentDescription }, attachmentDetails);
                    domConstruct.create("input", { "type": "text", "class": "form-control", "id": "attachmentDescription", "value": this.currentConfig.attachmentHelpText }, attachmentDetails);
                    domConstruct.create("span", { "class": "attachmentHint", "innerHTML": nls.builder.attachmentHint }, attachmentDetails);
                }
            }));
        }
    });
});