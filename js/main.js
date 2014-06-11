/*global $,define,document */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/arcgis/utils",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/on",
    "dojo/query",
    "application/bootstrapmap",
    "application/OfflineSupport",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "esri/dijit/LocateButton",
    "esri/dijit/Geocoder",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!application/dijit/templates/user.html",
    "dojo/i18n!application/nls/builder",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "application/ShareDialog",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/toolbars/edit",
    "dojo/domReady!"
], function (
    ready,
    declare,
    lang,
    arcgisUtils,
    dom,
    domClass,
    on,
    query,
    bootstrapmap,
    OfflineSupport,
    array,
    domConstruct,
    domAttr,
    LocateButton,
    Geocoder,
    _WidgetBase,
    _TemplatedMixin,
    userTemplate,
    nls, webMercatorUtils, Point, ShareDialog, Graphic, PictureMarkerSymbol, editToolbar) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: userTemplate,
        nls: nls,
        config: {},
        map: null,
        addressGeometry: null,
        editToolbar: null,
        constructor: function () {
        },
        startup: function (config, response, isPreview, node) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                // document ready
                ready(lang.hitch(this, function () {
                    //supply either the webmap id or, if available, the item info
                    var itemInfo = this.config.webmap;
                    this._setAppConfigurations(this.config.details);
                    this._createWebMap(itemInfo);
                    if (isPreview) {
                        if (typeof (Storage) !== "undefined") {
                            localStorage.setItem("config", JSON.stringify(config));
                        }
                        var cssStyle = document.createElement('link');
                        cssStyle.rel = 'stylesheet';
                        cssStyle.type = 'text/css';
                        cssStyle.href = window.location.href.split("index.html")[0] + this.config.theme.themeSrc;
                        node.src = window.location.href.split("&")[0];
                        node.onload = function () {
                            domConstruct.place(cssStyle, $("#iframeContainer").contents().find('head')[0], "last");
                        };
                    }
                    else {
                        this._switchStyle(this.config.theme.themeSrc);
                        dom.byId("parentContainter").appendChild(this.userMode);
                    }
                }));
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }

            on(this.submitButton, "click", lang.hitch(this, function () {
                var flag = false;
                array.some(query(".geoFormQuestionare"), lang.hitch(this, function (currentField) {
                    //TODO chk for mandatroy fields
                    //to check for errors in form before submitting.
                    if (query(".form-control", currentField)[0].value === "" || (query(".form-control", currentField)[0].value === "" && domClass.contains(currentField, "mandatory")) || domClass.contains(currentField, "has-error")) {
                        this._validateField(currentField, false);
                        flag = true;
                    }
                }));
                if (flag === true) {
                    this._showErrorMessageDiv(nls.builder.formValidationMessageAlertText);
                } else {
                    this._addFeatureToLayer(this.config);
                }
            }));
            on(this.resetButton, "click", lang.hitch(this, function () {
                this._clearFormFields();
            }));
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
            // get editable layer
            var layer = this.map.getLayer(this.config.form_layer.id);
            if (layer) {
                // support basic offline editing
                var handleOffline = new OfflineSupport({
                    map: this.map,
                    layer: layer
                });
            }
            this.editToolbar = new editToolbar(this.map);
            on(this.editToolbar, "graphic-move-start", lang.hitch(this, function () {
                this.map.infoWindow.hide();
            }));
            on(this.editToolbar, "graphic-move-stop", lang.hitch(this, function (evt) {
                this.map.infoWindow.setTitle(nls.builder.locationTabText);
                this.map.infoWindow.setContent(nls.builder.addressSearchText);
                this.map.infoWindow.show(evt.graphic.geometry);
            }));
            var fields = layer.fields;
            on(this.map, 'click', lang.hitch(this, function (evt) {
                this.addressGeometry = evt.mapPoint;
                if (!evt.graphic) {
                    this.map.graphics.clear();
                    this.map.infoWindow.setTitle(nls.builder.locationTabText);
                    this.map.infoWindow.setContent(nls.builder.addressSearchText);
                    if (this.map.infoWindow.isShowing) {
                        this.map.infoWindow.hide();
                    }
                    this.map.infoWindow.show(this.addressGeometry);
                    this._setSymbol(this.addressGeometry);
                }
            }));
            on(this.map, 'mouse-move', lang.hitch(this, function (evt) {
                var coords = this._calculateLatLong(evt);
                domAttr.set(dojo.byId("latAddress"), "innerHTML", ("Y : " + coords[0].toFixed(5)));
                domAttr.set(dojo.byId("longAddress"), "innerHTML", ("X : " + coords[1].toFixed(5)));
            }));
        },
        _setSymbol: function (point) {
            var symbolUrl, pictureMarkerSymbol, graphic;
            this.map.graphics.clear();
            symbolUrl = package_path + "/images/pushpin.png";
            pictureMarkerSymbol = new PictureMarkerSymbol(symbolUrl, 32, 32);
            graphic = new Graphic(point, pictureMarkerSymbol, null, null);
            this.map.graphics.add(graphic);
            this.map.centerAt(point);
            this.editToolbar.activate(editToolbar.MOVE, graphic, null);
        },

        _calculateLatLong: function (evt) {
            var normalizedVal = webMercatorUtils.xyToLngLat(evt.mapPoint.x, evt.mapPoint.y);
            return normalizedVal;
        },
        //function to set the logo-path, application title and details
        _setAppConfigurations: function (appConfigurations) {
            if (appConfigurations.Logo !== "")
                this.appLogo.src = appConfigurations.Logo;
            if (appConfigurations.Title !== "")
                this.appTitle.innerHTML = appConfigurations.Title;
            if (appConfigurations.Description !== "")
                this.appDescription.innerHTML = appConfigurations.Description;
        },

        //function to set the theme for application
        _switchStyle: function (cssSrc) {
            dom.byId("themeLink").href = cssSrc;
        },

        //function to validate and create the form
        _createForm: function (fields) {
            var formContent, labelContent, inputContent, selectOptions, helpBlock, fileUploadForm, fileInput,
             matchingField, newAddedFields = [];
            array.forEach(this.map.getLayer(this.config.form_layer.id).fields, lang.hitch(this, function (layerField) {
                matchingField = false;
                array.forEach(fields, lang.hitch(this, function (currentField) {
                    if (layerField.name == currentField.fieldName && currentField.visible) {
                        //code to put aestrik mark for mandatory fields
                        newAddedFields.push(lang.mixin(layerField, currentField));
                        matchingField = true;
                    }
                    else if (layerField.name == currentField.fieldName && !currentField.visible) {
                        matchingField = true;
                    }
                }));
                if (!matchingField) {
                    if ((layerField.editable && !(layerField.type === "esriFieldTypeOID" || layerField.type === "esriFieldTypeGeometry" || layerField.type === "esriFieldTypeBlob" || layerField.type === "esriFieldTypeRaster" || layerField.type === "esriFieldTypeGUID" || layerField.type === "esriFieldTypeGlobalID" || layerField.type === "esriFieldTypeXML"))) {
                        layerField.isNewField = true;
                        newAddedFields.push(layerField);
                    }
                }
            }));
            array.forEach(newAddedFields, lang.hitch(this, function (currentField) {
                if (!currentField.nullable) {
                    currentField.fieldDescription += " *";
                    formContent = domConstruct.create("div", { "class": "form-group has-feedback geoFormQuestionare mandatory" }, this.userForm);
                }
                else {
                    formContent = domConstruct.create("div", { "class": "form-group geoFormQuestionare has-feedback" }, this.userForm);
                }
                labelContent = domConstruct.create("label", { class: "control-label" }, formContent);
                if (currentField.isNewField) {
                    labelContent.innerHTML = currentField.alias;
                }
                else {
                    labelContent.innerHTML = currentField.fieldLabel;
                }
                //code to make select boxes in case of a coded value
                if (currentField.domain) {
                    inputContent = domConstruct.create("select", { "class": "form-control selectDomain", "fieldName": currentField.fieldName }, formContent);
                    array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                        selectOptions = domConstruct.create("option", {}, inputContent);
                        selectOptions.text = currentOption.name;
                        selectOptions.value = currentOption.code;
                    }));
                }
                else {
                    switch (currentField.type) {
                        case "esriFieldTypeString":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "String", "maxLength": currentField.length, "fieldName": currentField.fieldName }, formContent);
                            domConstruct.create("span", { class: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeSmallInteger":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "smallInteger", "fieldName": currentField.fieldName }, formContent);
                            domConstruct.create("span", { class: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeInteger":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Integer", "fieldName": currentField.fieldName }, formContent);
                            domConstruct.create("span", { class: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeSingle":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Single", "fieldName": currentField.fieldName }, formContent);
                            domConstruct.create("span", { class: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeDouble":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Double", "fieldName": currentField.fieldName }, formContent);
                            domConstruct.create("span", { class: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeDate":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Date", "fieldName": currentField.fieldName }, formContent);
                            domConstruct.create("span", { class: "glyphicon form-control-feedback" }, formContent);
                            $(inputContent).datepicker({
                                onSelect: lang.hitch(this, function (evt, currentElement) {
                                    domClass.remove(currentElement.input[0].parentElement, "has-error");
                                    domClass.remove(query("span", currentElement.input[0].parentElement)[0], "glyphicon-remove");
                                    domClass.add(currentElement.input[0].parentElement, "has-success");
                                    domClass.add(query("span", currentElement.input[0].parentElement)[0], "glyphicon-ok");
                                })
                            });
                            break;
                    }
                    //conditional check to attach keyup event to all the inputs except date and string field
                    //as validation is not required for date field and string fields max-length is already set
                    if (domAttr.get(inputContent, "inputType") !== "Date" || domAttr.get(inputContent, "inputType") !== "String") {
                        on(inputContent, "keyup", lang.hitch(this, function (evt) {
                            this._validateField(evt, true);
                        }));
                    }
                }
                helpBlock = domConstruct.create("p", { "class": "help-block" }, formContent);
                if (currentField.isNewField) {
                    array.forEach(this.config.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
                        if (currentLayer.id == this.config.form_layer.id) {
                            array.forEach(currentLayer.popupInfo.fieldInfos, function (currentFieldPopupInfo) {
                                if (currentFieldPopupInfo.fieldName == currentField.name) {
                                    if (currentFieldPopupInfo.tooltip) {
                                        helpBlock.innerHTML = currentFieldPopupInfo.tooltip;
                                    }
                                }
                            });
                        }
                    }));
                }
                else {
                    helpBlock.innerHTML = currentField.fieldDescription;
                }
            }));
            if (this.map.getLayer(this.config.form_layer.id).hasAttachments) {
                formContent = domConstruct.create("div", { "class": "form-group" }, this.userForm);
                fileUploadForm = domConstruct.create("form", { class: "fileUploadField" }, formContent);
                domAttr.set(fileUploadForm, "id", "testForm");
                fileInput = domConstruct.create("input", { "type": "file", "accept": "image/*", "capture": "camera", "name": "attachment" }, fileUploadForm);
                domAttr.set(fileInput, "id", "testFormFileInput");
            }
        },

        _validateField: function (currentNode, iskeyPress) {
            var inputType, inputValue, node, typeCastedInputValue, decimal = /^[-+]?[0-9]+$/, float = /^[-+]?[0-9]+\.[0-9]+$/;
            if (iskeyPress) {
                inputValue = currentNode.currentTarget.value;
                inputType = domAttr.get(currentNode.currentTarget, "inputType");
                if ($(currentNode.target)) {
                    node = $(currentNode.target.parentNode)[0];
                }
                else {
                    node = $(currentNode.srcElement.parentNode)[0];
                }
            } else {
                inputValue = query(".form-control", currentNode)[0].value;
                inputType = domAttr.get(query(".form-control", currentNode)[0], "inputType");
                node = query(".form-control", currentNode)[0].parentElement;
            }
            switch (inputType) {
                case "String":
                    if (inputValue.length === 0) {
                        this._validateUserInput(false, node, inputValue, iskeyPress);
                    } else {
                        this._validateUserInput(true, node, inputValue, iskeyPress);
                    }
                    break;
                case "smallInteger":
                    typeCastedInputValue = parseInt(inputValue);
                    if ((inputValue.match(decimal) && typeCastedInputValue > -32768 && typeCastedInputValue < 32767) && inputValue.length !== 0) {
                        this._validateUserInput(true, node, inputValue);
                    }
                    else {
                        this._validateUserInput(false, node, inputValue, iskeyPress);
                    }
                    break;
                case "Integer":
                    typeCastedInputValue = parseInt(inputValue);
                    if ((inputValue.match(decimal) && typeCastedInputValue > -2147483648 && typeCastedInputValue <= 2147483647) && inputValue.length !== 0) {
                        this._validateUserInput(true, node, inputValue, iskeyPress);
                    }
                    else {
                        this._validateUserInput(false, node, inputValue, iskeyPress);
                    }
                    break;
                case "Single":
                    //zero of more occurence of (+-) at the start of expression
                    //atleast one occurence of digits between o-9
                    //occurence of .
                    //atleast one occurence of digits between o-9 in the end
                    typeCastedInputValue = parseFloat(inputValue);
                    if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue > -3.4 * Math.pow(10, 38) && typeCastedInputValue < 1.2 * Math.pow(10, 38)) && inputValue.length !== 0) {
                        this._validateUserInput(true, node, inputValue, iskeyPress);
                    }
                    else {
                        this._validateUserInput(false, node, inputValue, iskeyPress);
                    }
                    break;
                case "Double":
                    typeCastedInputValue = parseFloat(inputValue);
                    if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue > -2.2 * Math.pow(10, 308) && typeCastedInputValue < 1.8 * Math.pow(10, 38)) && inputValue.length !== 0) {
                        this._validateUserInput(true, node, inputValue, iskeyPress);
                    }
                    else {
                        this._validateUserInput(false, node, inputValue, iskeyPress);
                    }
                    break;
                case "Date":
                    if (inputValue.length === 0) {
                        this._validateUserInput(false, node, inputValue, iskeyPress);
                    } else {
                        this._validateUserInput(true, node, inputValue, iskeyPress);
                    }
                    break;
            }
        },
        _clearFormFields: function () {
            array.forEach(query(".form-control"), function (currentInput) {
                var node = currentInput.parentElement;
                if (!domClass.contains(currentInput, "selectDomain")) {
                    domAttr.set(currentInput, "value", "");
                    domClass.remove(node, "has-error");
                    domClass.remove(node, "has-success");
                    domClass.remove(query("span", node)[0], "glyphicon-ok");
                    domClass.remove(query("span", node)[0], "glyphicon-remove");
                } else {
                    currentInput.options[0].selected = true;
                }
            });
        },
        _validateUserInput: function (isValidInput, node, inputValue, iskeyPress) {
            if (isValidInput) {
                domClass.remove(node, "has-error");
                domClass.add(node, "has-success");
                domClass.add(query("span", node)[0], "glyphicon-ok");
                domClass.remove(query("span", node)[0], "glyphicon-remove");
            }
            else {
                domClass.add(node, "has-error");
                domClass.remove(node, "has-success");
                domClass.remove(query("span", node)[0], "glyphicon-ok");
                domClass.add(query("span", node)[0], "glyphicon-remove");
            }
            if (iskeyPress && inputValue.length === 0) {
                domClass.remove(node, "has-error");
                domClass.remove(node, "has-success");
                domClass.remove(query("span", node)[0], "glyphicon-ok");
                domClass.remove(query("span", node)[0], "glyphicon-remove");
            }
        },

        // create a map based on the input web map id
        _createWebMap: function (itemInfo) {
            domConstruct.empty($("#mapDiv"));
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
                this.map.resize();
                this.map.reposition();
                this.map.on("pan-end", lang.hitch(this, function () {
                    this.map.resize();
                    this.map.reposition();
                }));
                var bsm = new bootstrapmap(this.map);
                this._createForm(this.config.fields);
                this._createLocateButton();
                this._createGeocoderButton();
                on(this.XCoordinate, "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                }));
                on(this.YCoordinate, "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                }));
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
        },

        _findLocation: function (evt) {
            if (evt.charCode === 13) {
                if (this.XCoordinate.value === "") {
                    alert(nls.builder.emptylatitudeAlertMessage);
                    return;
                } else if (this.YCoordinate.value === "") {
                    alert(nls.builder.emptylongitudeAlertMessage);
                    return;
                }
                this._locatePointOnMap(this.XCoordinate.value + "," + this.YCoordinate.value);
            }
        },
        _createLocateButton: function () {
            var currentLocation = new LocateButton({
                map: this.map,
                theme: "btn btn-default"
            }, this.myLocation);
            currentLocation.startup();
            on(currentLocation, "locate", lang.hitch(this, function (evt) {
                if (evt.graphic) {
                    var mapLocation = webMercatorUtils.lngLatToXY(evt.graphic.geometry.x, evt.graphic.geometry.y, true);
                    var pt = new Point(mapLocation[0], mapLocation[1], this.map.spatialReference);
                    this.addressGeometry = pt;
                    this._setSymbol(evt.graphic.geometry);
                    this.map.infoWindow.setTitle('Location');
                    this.map.infoWindow.setContent("address");
                    this.map.infoWindow.show(this.addressGeometry);
                }
            }));
        },

        _createGeocoderButton: function () {
            var geocodeAddress = new Geocoder({
                map: this.map,
                autoComplete: true,
                showResults: true
            }, this.geocodeAddress);
            geocodeAddress.startup();

            on(geocodeAddress, "select", lang.hitch(this, function (evt) {
                this.map.graphics.clear();
                this.addressGeometry = evt.result.feature.geometry;
                this._setSymbol(evt.result.feature.geometry);
                this.map.centerAt(evt.result.feature.geometry);
                if (this.map.infoWindow.isShowing) {
                    this.map.infoWindow.hide();
                }
                this.map.infoWindow.setTitle(nls.builder.locationTabText);
                this.map.infoWindow.setContent(nls.builder.addressSearchText);
                this.map.infoWindow.show(evt.result.feature.geometry);
            }));
        },

        _addFeatureToLayer: function (config) {
            //To populate data for apply edits
            var _self = this;
            var featureData = new esri.Graphic();
            featureData.attributes = {};
            if (this.addressGeometry) {
                array.forEach(query(".geoFormQuestionare .form-control"), function (currentField) {
                    var key = domAttr.get(currentField, "fieldName");
                    var value = currentField.value.trim();
                    featureData.attributes[key] = value;
                });
                featureData.geometry = {};
                featureData.geometry = new esri.geometry.Point(Number(this.addressGeometry.x), Number(this.addressGeometry.y), this.map.spatialReference);

                this._addProgressBar();
                $("#myModal").modal('show');
                //code for apply-edits
                this.map.getLayer(config.form_layer.id).applyEdits([featureData], null, null, function (addResults) {
                    _self.map.graphics.clear();
                    if (_self.map.infoWindow.isShowing) {
                        _self.map.infoWindow.hide();
                    }
                    domConstruct.destroy(query(".errorMessage")[0]);
                    _self._openShareDialog();
                    if (dom.byId("testForm") && dom.byId("testForm")[0].value !== "" && _self.map.getLayer(config.form_layer.id).hasAttachments) {
                        _self.map.getLayer(config.form_layer.id).addAttachment(addResults[0].objectId, dom.byId("testForm"), function () {
                        }, function (error) {
                            _self.reportError(error);
                        });
                    }
                    _self._clearFormFields();
                }, function (error) {
                    _self.reportError(error);
                });
            } else {
                this._showErrorMessageDiv(nls.builder.latlongValidationMessageAlert);
            }
        },

        _locatePointOnMap: function (coordinates) {
            var latLong = coordinates.split(",");
            if (latLong[0] >= -180 && latLong[0] <= 180 && latLong[1] >= -90 && latLong[1] <= 90) {
                var mapLocation = webMercatorUtils.lngLatToXY(latLong[0], latLong[1], true);
                var pt = new Point(mapLocation[0], mapLocation[1], this.map.spatialReference);
                this.addressGeometry = pt;
                this._setSymbol(this.addressGeometry);
                this.map.infoWindow.setTitle(nls.builder.locationTabText);
                this.map.infoWindow.setContent(nls.builder.addressSearchText);
                if (this.map.infoWindow.isShowing) {
                    this.map.infoWindow.hide();
                }
                setTimeout(lang.hitch(this, function () {
                    this.map.infoWindow.show(this.addressGeometry);
                }), 500);
                domClass.remove(this.coordinatesContainer, "has-error");
            } else {
                domClass.add(this.coordinatesContainer, "has-error");
            }
        },

        _openShareDialog: function () {
            this._createShareDlgContent();
            this._ShareDialog = new ShareDialog({
                bitlyLogin: this.config.bitlyLogin,
                bitlyKey: this.config.bitlyKey,
                image: this.config.sharinghost + '/sharing/rest/content/items/' + this.config.itemInfo.item.id + '/info/' + this.config.itemInfo.item.thumbnail,
                title: this.config.details.Title || nls.builder.geoformTitleText,
                summary: this.config.details.Description,
                hashtags: 'esriDSM'
            });
            this._ShareDialog.startup();
            $("#myModal").modal('show');
        },
        //function to show a progress bar before the content of share dialog is loaded
        _addProgressBar: function () {
            var progressIndicatorContainer, progressIndicator;
            domConstruct.empty(query(".modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.builder.shareBuilderInProgressTitleMessage);
            progressIndicatorContainer = domConstruct.create("div", { class: "progress progress-striped active progress-remove-margin" }, query(".modal-body")[0]);
            progressIndicator = domConstruct.create("div", { class: "progress-bar progress-percent", innerHTML: nls.builder.shareBuilderProgressBarMessage }, progressIndicatorContainer);
        },
        _createShareDlgContent: function () {
            var iconContainer, facebookIconHolder, twitterIconHolder, googlePlusIconHolder, mailIconHolder;
            domConstruct.empty(query(".modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.builder.shareUserTitleMessage);
            iconContainer = domConstruct.create("div", { class: "iconContainer" }, query(".modal-body")[0]);
            domConstruct.create("div", { class: "share-dialog-subheader", innerHTML: nls.builder.shareUserTextMessage }, iconContainer);
            facebookIconHolder = domConstruct.create("div", { class: "iconContent" }, iconContainer);
            domConstruct.create("a", { class: "icon-facebook-sign iconClass", id: "facebookIcon" }, facebookIconHolder);
            twitterIconHolder = domConstruct.create("div", { class: "iconContent" }, iconContainer);
            domConstruct.create("a", { class: "icon-twitter-sign iconClass", id: "twitterIcon" }, twitterIconHolder);
            googlePlusIconHolder = domConstruct.create("div", { class: "iconContent" }, iconContainer);
            domConstruct.create("a", { class: "icon-google-plus-sign iconClass", id: "google-plusIcon" }, googlePlusIconHolder);
            mailIconHolder = domConstruct.create("div", { class: "iconContent" }, iconContainer);
            domConstruct.create("a", { class: "icon-envelope iconClass", id: "mailIcon" }, mailIconHolder);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("div", { class: "share-dialog-subheader", innerHTML: nls.builder.shareDialogFormText }, iconContainer);
            domConstruct.create("input", { type: "text", class: "share-map-url", id: "_shareMapUrlText" }, iconContainer);
        },

        _showErrorMessageDiv: function (errorMessage) {
            domConstruct.empty(this.erroMessageDiv);
            domConstruct.create("div", { "class": "alert alert-danger errorMessage", innerHTML: errorMessage }, this.erroMessageDiv);
            $(window).scrollTop(0);
        }
    });
});