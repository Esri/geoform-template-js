/*global $,define,document,Storage */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/arcgis/utils",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
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
    "dojo/text!application/dijit/templates/modal.html",
    "dojo/text!application/dijit/templates/user.html",
    "dojo/i18n!application/nls/user",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "application/ShareDialog",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/toolbars/edit",
    "application/themes",
    "dojo/NodeList-traverse",
    "dojo/domReady!"
], function (
    ready,
    declare,
    lang,
    arcgisUtils,
    dom,
    domClass, domStyle,
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
    modalTemplate,
    userTemplate,
    nls, webMercatorUtils, Point, ShareDialog, Graphic, PictureMarkerSymbol, editToolbar, theme) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: userTemplate,
        nls: nls,
        config: {},
        map: null,
        addressGeometry: null,
        editToolbar: null,
        themes: theme,
        localStorageSupport: null,
        constructor: function () {

        },
        startup: function (config, response, localStorageSupport, isPreview, node) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                this.localStorageSupport = localStorageSupport;
                // document ready
                ready(lang.hitch(this, function () {
                    // modal i18n
                    modalTemplate = lang.replace(modalTemplate, nls);
                    // place modal code
                    domConstruct.place(modalTemplate, document.body, 'last');
                    //supply either the webmap id or, if available, the item info
                    domStyle.set(this.userMode, 'display', 'none');
                    this._setAppConfigurations(this.config.details);
                    // window title
                    if(this.config.details && this.config.details.Title){
                        window.document.title = this.config.details.Title;
                    }
                    if (isPreview) {
                        var cssStyle;
                        if (this.localStorageSupport) {
                            localStorage.setItem("geoform_config", JSON.stringify(config));
                        }
                        array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
                            if (this.config.theme == currentTheme.id) {
                                cssStyle = domConstruct.create('link', {
                                    rel: 'stylesheet',
                                    type: 'text/css',
                                    href: currentTheme.url
                                });
                                node.src = window.location.href.split("&")[0];
                            }
                        }));
                        this._createWebMap(this.config.webmap);
                        node.onload = function () {
                            domConstruct.place(cssStyle, $("#iframeContainer").contents().find('head')[0], "last");
                        };
                    }
                    else {
                        this._switchStyle(this.config.theme);
                        dom.byId("parentContainter").appendChild(this.userMode);
                        var itemInfo = this.config.itemInfo || this.config.webmap;
                        this._createWebMap(itemInfo);
                    }
                }));
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }

            on(this.submitButton, "click", lang.hitch(this, function () {
                var btn = $(this.submitButton);
                btn.button('loading');
                var erroneousFields = [], errorMessage;
                array.forEach(query(".geoFormQuestionare"), lang.hitch(this, function (currentField) {
                    //TODO chk for mandatroy fields
                    //to check for errors in form before submitting.

                    //condition check to filter out radio fields
                    if ((query(".form-control", currentField)[0])) {
                        //if condition to check for conditions where mandatory fields are kept empty or the entered values are erroneous.
                        if ((query(".form-control", currentField)[0].value === "" && domClass.contains(currentField, "mandatory")) || domClass.contains(currentField, "has-error")) {
                            //need to check if this condition can be removed
                            //this._validateField(currentField, false);
                            erroneousFields.push(currentField);
                        }
                    }
                    //handle errors in radio fields here.
                    else {

                        if (domClass.contains(currentField, "mandatory") && query(".radioInput:checked", currentField).length === 0) {
                            erroneousFields.push(currentField);
                        }
                    }
                }));

                if (erroneousFields.length !== 0) {
                    errorMessage = "1. " + nls.user.formValidationMessageAlertText + "\n <ul>";

                    array.forEach(erroneousFields, function (erroneousField) {
                        if (query(".form-control", erroneousField).length !== 0 && query(".form-control", erroneousField)[0].placeholder !== "")
                            errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + erroneousField.childNodes[0].innerHTML.split("*")[0] + "</a>. " + nls.user.validationFormatTypeSubstring + query(".form-control", erroneousField)[0].placeholder + "</li>";
                        else
                            errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + erroneousField.childNodes[0].innerHTML.split("*")[0] + "</a></li>";
                    });
                    errorMessage += "</ul>";

                    //condition check to find whether the user has selected a point on map or not.
                    if (!this.addressGeometry) {
                        errorMessage += "\n2. " + nls.user.latlongValidationMessageAlert;
                    }
                    this._showErrorMessageDiv(errorMessage);
                    btn.button('reset');
                }
                else {
                    this._addFeatureToLayer(this.config);
                }
            }));
            window.onload = function () {
                if (localStorage.getItem("geoform_config")) {
                    localStorage.clear();
                }

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
            domStyle.set(this.userMode, 'display', 'block');
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
                this.map.infoWindow.setTitle(nls.user.locationTabText);
                this.map.infoWindow.setContent(nls.user.addressSearchText);
                this.map.infoWindow.show(evt.graphic.geometry);
            }));
            on(this.map, 'click', lang.hitch(this, function (evt) {
                this.addressGeometry = evt.mapPoint;
                if (!evt.graphic) {
                    this.map.graphics.clear();
                    this.map.infoWindow.setTitle(nls.user.locationTabText);
                    this.map.infoWindow.setContent(nls.user.addressSearchText);
                    if (this.map.infoWindow.isShowing) {
                        this.map.infoWindow.hide();
                    }
                    this.map.infoWindow.show(this.addressGeometry);
                    this._setSymbol(this.addressGeometry);
                }
            }));
            on(this.map, 'mouse-move', lang.hitch(this, function (evt) {
                var coords = this._calculateLatLong(evt);
                var coordinatesValue = nls.user.latitude + ': ' + coords[0].toFixed(5) + ', ';
                coordinatesValue += '&nbsp;' + nls.user.longitude + ': ' + coords[1].toFixed(5);
                domAttr.set(dom.byId("coordinatesValue"), "innerHTML", coordinatesValue);
            }));
            this.map.resize();
        },
        _setSymbol: function (point) {
            var symbolUrl, pictureMarkerSymbol, graphic;
            this.map.graphics.clear();
            symbolUrl = "./images/pins/purple.png";
            pictureMarkerSymbol = new PictureMarkerSymbol(symbolUrl, 36, 36);
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
            else
                domClass.add(this.appLogo, "hide");
            if (appConfigurations.Title !== "")
                this.appTitle.innerHTML = appConfigurations.Title;
            else
                domClass.add(this.appTitle, "hide");
            if (appConfigurations.Description !== "")
                this.appDescription.innerHTML = appConfigurations.Description;
            else
                domClass.add(this.appDescription, "hide");
            if (domClass.contains(this.appLogo, "hide") && domClass.contains(this.appTitle, "hide") && domClass.contains(this.appDescription, "hide")) {
                domClass.add(this.jumbotronNode, "hide");
            }
        },

        //function to set the theme for application
        _switchStyle: function (themeName) {
            array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
                if (themeName == currentTheme.id) {
                    dom.byId("themeLink").href = currentTheme.url;
                }
            }));
        },

        //function to validate and create the form
        _createForm: function (fields) {
            var formContent, labelContent, inputContent, selectOptions, helpBlock, fileUploadForm, fileInput, matchingField, newAddedFields = [], fieldname, fieldLabelText, requireField, sortedArray;
            if (!this.map.getLayer(this.config.form_layer.id)) {
                this._showErrorMessageDiv(nls.user.noLayerConfiguredMessage);
                array.some(query(".row"), lang.hitch(this, function (currentNode) {
                    if (currentNode.children) {
                        if (domClass.contains(currentNode.children[0], "errorMessageDiv")) {
                            array.forEach(query(currentNode).nextAll(), lang.hitch(this, function (currentNode) {
                                domStyle.set(currentNode, "display", "none");
                            }));
                            return true;
                        }
                    }
                }));
                return;
            }
            array.forEach(this.map.getLayer(this.config.form_layer.id).fields, lang.hitch(this, function (layerField) {
                matchingField = false;
                sortedArray = [];
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
            array.forEach(fields, lang.hitch(this, function (sortedElement) {
                array.some(newAddedFields, lang.hitch(this, function (newElement) {
                    var fName = newElement.isNewField ? newElement.name : newElement.fieldName;
                    if (sortedElement.fieldName == fName) {
                        sortedArray.push(newElement);
                        return true;
                    }
                }));
            }));
            array.forEach(sortedArray, lang.hitch(this, function (currentField, index) {
                //code to put asterisk mark for mandatory fields and also to give it a mandatory class.
                if (!currentField.nullable) {
                    formContent = domConstruct.create("div", {className: "form-group has-feedback geoFormQuestionare mandatory" }, this.userForm);
                    requireField = domConstruct.create("div", {className: 'text-danger requireFieldStyle', innerHTML: "*" }, formContent);
                }
                else {
                    formContent = domConstruct.create("div", {className: "form-group geoFormQuestionare has-feedback" }, this.userForm);
                }
                if (currentField.isNewField) {
                    fieldLabelText = currentField.alias;
                    fieldname = currentField.name;
                }
                else {
                    fieldLabelText = currentField.fieldLabel;
                    fieldname = currentField.fieldName;
                }
                labelContent = domConstruct.create("label", { "for": fieldname, className: "control-label", innerHTML: fieldLabelText, id: fieldLabelText + "" + index }, formContent);
                if (requireField) {
                    domConstruct.place(requireField, labelContent, "after");
                }
                //code to make select boxes in case of a coded value
                //code to make select boxes in case of a coded value
                if (currentField.domain) {
                    if (currentField.domain.codedValues.length !== 2) {
                        inputContent = domConstruct.create("select", { className: "form-control selectDomain", "id": fieldname }, formContent);
                        array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                            selectOptions = domConstruct.create("option", {}, inputContent);
                            selectOptions.text = currentOption.name;
                            selectOptions.value = currentOption.code;
                        }));
                    }

                    else {
                        radioContainer = domConstruct.create("div", { className: "radioContainer" }, formContent);
                        array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                            radioContent = domConstruct.create("div", { className: "radio" }, radioContainer);
                            inputLabel = domConstruct.create("label", { innerHTML: currentOption.name }, radioContent);
                            inputContent = domConstruct.create("input", { "id": fieldname, className: "radioInput", type: "radio", name: currentField.fieldName, value: currentOption.code }, inputLabel);
                        }));
                    }
                }
                else {
                    switch (currentField.type) {
                        case "esriFieldTypeString":
                            inputContent = domConstruct.create("input", { type: "text",className: "form-control", "inputType": "String", "maxLength": currentField.length, "id": fieldname }, formContent);
                            domConstruct.create("span", { className: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeSmallInteger":
                            inputContent = domConstruct.create("input", { type: "text", className: "form-control", placeholder: nls.user.integerFormat, "inputType": "smallInteger", "id": fieldname }, formContent);
                            domConstruct.create("span", { className: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeInteger":
                            inputContent = domConstruct.create("input", { type: "text", className: "form-control", placeholder: nls.user.integerFormat, "inputType": "Integer", "id": fieldname }, formContent);
                            domConstruct.create("span", { className: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeSingle":
                            inputContent = domConstruct.create("input", { type: "text", className: "form-control", placeholder: nls.user.floatFormat, "inputType": "Single", "id": fieldname }, formContent);
                            domConstruct.create("span", { className: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeDouble":
                            inputContent = domConstruct.create("input", { type: "text", className: "form-control", placeholder: nls.user.floatFormat, "inputType": "Double", "id": fieldname }, formContent);
                            domConstruct.create("span", { className: "glyphicon form-control-feedback" }, formContent);
                            break;
                        case "esriFieldTypeDate":
                            inputContent = domConstruct.create("input", { type: "text", className: "form-control", placeholder: nls.user.dateFormat, "inputType": "Date", "id": fieldname }, formContent);
                            domConstruct.create("span", { className: "glyphicon form-control-feedback" }, formContent);
                            $(inputContent).datepicker({
                                format: "mm/dd/yyyy",
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
                helpBlock = domConstruct.create("p", {className: "help-block" }, formContent);
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
                formContent = domConstruct.create("div", {className: "form-group" }, this.userForm);
                fileUploadForm = domConstruct.create("form", { className: "fileUploadField" }, formContent);
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
                    if (query("span", node)[0]) {
                        domClass.remove(query("span", node)[0], "glyphicon-ok");
                        domClass.remove(query("span", node)[0], "glyphicon-remove");
                    }
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
                usePopupManager: true,
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
                    this._showErrorMessageDiv(nls.user.emptylatitudeAlertMessage);
                    return;
                } else if (this.YCoordinate.value === "") {
                    this._showErrorMessageDiv(nls.user.emptylongitudeAlertMessage);
                    return;
                }
                this._locatePointOnMap(this.XCoordinate.value + "," + this.YCoordinate.value);
            }
        },
        _createLocateButton: function () {
            var currentLocation = new LocateButton({
                map: this.map,
                theme: "btn btn-default"
            }, domConstruct.create('div'));
            currentLocation.startup();
            on(currentLocation, "locate", lang.hitch(this, function (evt) {
                if (evt.graphic) {
                    var mapLocation = webMercatorUtils.lngLatToXY(evt.graphic.geometry.x, evt.graphic.geometry.y, true);
                    var pt = new Point(mapLocation[0], mapLocation[1], this.map.spatialReference);
                    this.addressGeometry = pt;
                    this._setSymbol(evt.graphic.geometry);
                    this.map.infoWindow.setTitle(nls.user.myLocationTitleText);
                    this.map.infoWindow.setContent(nls.user.addressSearchText);
                    this.map.infoWindow.show(this.addressGeometry);
                }
            }));
            on(dom.byId('geolocate_button'), 'click', lang.hitch(this, function(){
                currentLocation.locate();
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
                this.map.infoWindow.setTitle(nls.user.locationTabText);
                this.map.infoWindow.setContent(nls.user.addressSearchText);
                this.map.infoWindow.show(evt.result.feature.geometry);
            }));
        },

        _addFeatureToLayer: function (config) {
            //To populate data for apply edits
            var _self = this;
            var featureData = new Graphic();
            featureData.attributes = {};
            if (this.addressGeometry) {
                //condition to filter out radio inputs
                array.forEach(query(".geoFormQuestionare .form-control"), function (currentField) {
                    var key = domAttr.get(currentField, "id");
                    var value = currentField.value.trim();
                    featureData.attributes[key] = value;
                });
                array.forEach(query(".geoFormQuestionare .radioContainer"), function (currentField) {
                    if (query(".radioInput:checked", currentField).length !== 0) {
                        var key = query(".radioInput:checked", currentField)[0].id;
                        var value = query(".radioInput:checked", currentField)[0].value.trim();
                        featureData.attributes[key] = value;
                    }
                });
                featureData.geometry = {};
                featureData.geometry = new Point(Number(this.addressGeometry.x), Number(this.addressGeometry.y), this.map.spatialReference);
                //code for apply-edits
                this.map.getLayer(config.form_layer.id).applyEdits([featureData], null, null, function (addResults) {
                    _self.map.graphics.clear();
                    if (_self.map.infoWindow.isShowing) {
                        _self.map.infoWindow.hide();
                    }
                    domConstruct.destroy(query(".errorMessage")[0]);
                    _self._openShareDialog();
                    $("#myModal").modal('show');
                    _self.map.getLayer(config.form_layer.id).refresh();
                    _self._resetButton();
                    if (dom.byId("testForm") && dom.byId("testForm")[0].value !== "" && _self.map.getLayer(config.form_layer.id).hasAttachments) {
                        _self.map.getLayer(config.form_layer.id).addAttachment(addResults[0].objectId, dom.byId("testForm"), function () {
                        }, function () {
                            console.log(nls.user.addAttachmentFailedMessage);
                        });
                    }
                    _self._clearFormFields();
                }, function () {
                    console.log(nls.user.addFeatureFailedMessage);
                });
            } else {
                this._resetButton();
                this._showErrorMessageDiv(nls.user.latlongValidationMessageAlert);
            }
        },

        _locatePointOnMap: function (coordinates) {
            var latLong = coordinates.split(",");
            if (latLong[0] >= -180 && latLong[0] <= 180 && latLong[1] >= -90 && latLong[1] <= 90) {
                var mapLocation = webMercatorUtils.lngLatToXY(latLong[0], latLong[1], true);
                var pt = new Point(mapLocation[0], mapLocation[1], this.map.spatialReference);
                this.addressGeometry = pt;
                this._setSymbol(this.addressGeometry);
                this.map.infoWindow.setTitle(nls.user.locationTabText);
                this.map.infoWindow.setContent(nls.user.addressSearchText);
                if (this.map.infoWindow.isShowing) {
                    this.map.infoWindow.hide();
                }
                setTimeout(lang.hitch(this, function () {
                    this.map.infoWindow.show(this.addressGeometry);
                }), 500);
                domClass.remove(this.coordinatesContainer, "has-error");
                domClass.remove(this.coordinatesContainer2, "has-error");
            } else {
                domClass.add(this.coordinatesContainer, "has-error");
                domClass.add(this.coordinatesContainer2, "has-error");
            }
        },

        _openShareDialog: function () {
            this._createShareDlgContent();
            this._ShareDialog = new ShareDialog({
                bitlyLogin: this.config.bitlyLogin,
                bitlyKey: this.config.bitlyKey,
                image: this.config.sharinghost + '/sharing/rest/content/items/' + this.config.itemInfo.item.id + '/info/' + this.config.itemInfo.item.thumbnail,
                title: this.config.details.Title || nls.user.geoformTitleText,
                summary: this.config.details.Description,
                hashtags: 'esriDSM'
            });
            this._ShareDialog.startup();
            $("#myModal").modal('show');
        },

        _createShareDlgContent: function () {
            var iconContainer, facebookIconHolder, twitterIconHolder, googlePlusIconHolder, mailIconHolder;
            domConstruct.empty(query(".modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.user.shareUserTitleMessage);
            iconContainer = domConstruct.create("div", { className: "iconContainer" }, query(".modal-body")[0]);
            domConstruct.create("div", { className: "share-dialog-subheader", innerHTML: nls.user.shareUserTextMessage }, iconContainer);
            facebookIconHolder = domConstruct.create("div", { className: "iconContent" }, iconContainer);
            domConstruct.create("a", { className: "icon-facebook-sign iconClass", id: "facebookIcon" }, facebookIconHolder);
            twitterIconHolder = domConstruct.create("div", { className: "iconContent" }, iconContainer);
            domConstruct.create("a", { className: "icon-twitter-sign iconClass", id: "twitterIcon" }, twitterIconHolder);
            googlePlusIconHolder = domConstruct.create("div", { className: "iconContent" }, iconContainer);
            domConstruct.create("a", { className: "icon-google-plus-sign iconClass", id: "google-plusIcon" }, googlePlusIconHolder);
            mailIconHolder = domConstruct.create("div", { className: "iconContent" }, iconContainer);
            domConstruct.create("a", { className: "icon-envelope iconClass", id: "mailIcon" }, mailIconHolder);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("br", {}, iconContainer);
            domConstruct.create("div", { className: "share-dialog-subheader", innerHTML: nls.user.shareDialogFormText }, iconContainer);
            domConstruct.create("input", { type: "text", className: "share-map-url", id: "_shareMapUrlText" }, iconContainer);
        },

        _showErrorMessageDiv: function (errorMessage) {
            domConstruct.empty(this.erroMessageDiv);
            domConstruct.create("div", {className: "alert alert-danger errorMessage", innerHTML: errorMessage }, this.erroMessageDiv);
            $(window).scrollTop(0);
        },

        _resetButton: function () {
            var btn = $(this.submitButton);
            btn.button('reset');
        }
    });
});