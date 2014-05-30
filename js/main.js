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
    "esri/layers/FeatureLayer",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "esri/dijit/LocateButton",
    "esri/dijit/Geocoder",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!application/dijit/templates/user.html",
    "dojo/i18n!application/nls/builder",
    "esri/request",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
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
    FeatureLayer,
    array,
    domConstruct,
    domAttr,
    LocateButton,
    Geocoder,
    _WidgetBase,
    _TemplatedMixin,
    userTemplate,
    i18n, esriRequest, webMercatorUtils, Point) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: userTemplate,
        nls: i18n,
        config: {},
        addressGeometry: null,
        constructor: function () {
        },
        startup: function (config, response) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                // document ready
                ready(lang.hitch(this, function () {
                    //supply either the webmap id or, if available, the item info
                    var itemInfo = this.config.itemInfo || this.config.webmap;
                    this._setAppConfigurations(this.config.details);
                    this._createForm(this.config.fields);
                    this._createWebMap(itemInfo);
                    this._switchStyle(this.config.theme.themeSrc);
                    dom.byId("parentContainter").appendChild(this.userMode);
                }));
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }

            on(this.submitButton, "click", lang.hitch(this, function () {
                var flag = false;
                array.some(query(".geoFormQuestionare"), function (currentField) {
                    //TODO chk for mandatroy fields
                    //to check for errors in form before submitting.
                    if (query(".form-control", currentField)[0].value == "" || domClass.contains(currentField, "has-error") || domClass.contains(currentField, "mandatory")) {
                        alert("Please verify the form for errors and resubmit the form");
                        flag = true
                        return true;
                    }
                });
                if (flag == true) {
                    return false;
                }
                this._addFeatureToLayer(this.config);
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

            var fields = layer.fields;


            // jquery ready
            $(document).ready(function () {
                $('.datepicker').datepicker();
            });
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
            var formContent, labelContent, questionString, inputContent, selectOptions, helpBlock, helpBlockString = "";
            array.forEach(fields, lang.hitch(this, function (currentField) {
                //code to put aestrik mark for mandatory fields
                if (!currentField.nullable) {
                    currentField.fieldDescription += " *";
                    formContent = domConstruct.create("div", { "class": "form-group geoFormQuestionare mandatory" }, this.userForm);
                }
                else {
                    formContent = domConstruct.create("div", { "class": "form-group geoFormQuestionare" }, this.userForm);
                }
                //condition to form the question with field's description or label or name as per availability
                if (currentField.fieldDescription !== "") {
                    questionString = currentField.fieldDescription;
                }
                else {
                    if (currentField.fieldLabel !== "") {
                        questionString = currentField.fieldLabel;
                    }
                    else {
                        questionString = currentField.fieldName
                    }
                }

                labelContent = domConstruct.create("label", { innerHTML: questionString }, formContent);
                //code to make select boxes in case of a coded value
                if (currentField.domain) {
                    inputContent = domConstruct.create("select", { "class": "form-control", "fieldName": currentField.fieldName }, formContent);
                    array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                        selectOptions = domConstruct.create("option", {}, inputContent);
                        selectOptions.text = currentOption.name;
                        selectOptions.value = currentOption.code;
                    }));
                }
                else {
                    switch (currentField.fieldType) {
                        case "String":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "String", "maxLength": currentField.length, "fieldName": currentField.fieldName }, formContent);
                            break;
                        case "smallInteger":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "smallInteger", "fieldName": currentField.fieldName }, formContent);
                            break;
                        case "Integer":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Integer", "fieldName": currentField.fieldName }, formContent);
                            break;
                        case "Single":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Single", "fieldName": currentField.fieldName }, formContent);
                            break;
                        case "Double":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Double", "fieldName": currentField.fieldName }, formContent);
                            break;
                        case "Date":
                            inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Date", "fieldName": currentField.fieldName }, formContent);
                            $(inputContent).datepicker();
                            break;
                    }
                    helpBlock = domConstruct.create("p", { "class": "help-block", "innerHTML": helpBlockString }, formContent);
                    //conditional check to attach keyup event to all the inputs except date and string field
                    //as validation is not required for date field and string fields max-length is already set
                    if (domAttr.get(inputContent, "inputType") !== "Date" || domAttr.get(inputContent, "inputType") !== "String") {
                        on(inputContent, "keyup", lang.hitch(this, function (evt) {
                            this._validateField(evt);
                        }));
                    }
                }
            }));
        },

        _validateField: function (currentNode) {
            var inputType, inputValue, maxLength = null, typeCastedInputValue, decimal = /^[-+]?[0-9]+$/, float = /^[-+]?[0-9]+\.[0-9]+$/; ;
            inputValue = currentNode.currentTarget.value;
            inputType = domAttr.get(currentNode.currentTarget, "inputType");
            switch (inputType) {
                case "String":
                    domClass.remove($(currentNode.srcElement.parentNode)[0], "has-error");
                    break;
                case "smallInteger":
                    typeCastedInputValue = parseInt(inputValue);
                    if ((inputValue.match(decimal) && typeCastedInputValue > -32768 && typeCastedInputValue < 32767) || inputValue.length === 0) {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "";
                        domClass.remove($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    else {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "Please enter a valid number";
                        domClass.add($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    break;
                case "Integer":
                    typeCastedInputValue = parseInt(inputValue);
                    if ((inputValue.match(decimal) && typeCastedInputValue > -2147483648 && typeCastedInputValue < 2147483647) || inputValue.length === 0) {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "";
                        domClass.remove($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    else {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "Please enter a valid number";
                        domClass.add($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    break;
                case "Single":
                    //zero of more occurence of (+-) at the start of expression
                    //atleast one occurence of digits between o-9
                    //occurence of .
                    //atleast one occurence of digits between o-9 in the end
                    typeCastedInputValue = parseFloat(inputValue);
                    if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue > -3.4 * Math.pow(10, 38) && typeCastedInputValue < 1.2 * Math.pow(10, 38)) || inputValue.length === 0) {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "";
                        domClass.remove($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    else {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "Please enter a valid number";
                        domClass.add($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    break;
                case "Double":
                    typeCastedInputValue = parseFloat(inputValue);
                    if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue > -2.2 * Math.pow(10, 308) && typeCastedInputValue < 1.8 * Math.pow(10, 38)) || inputValue.length === 0) {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "";
                        domClass.remove($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    else {
                        $(currentNode.srcElement.parentNode)[0].lastChild.innerHTML = "Please enter a valid number";
                        domClass.add($(currentNode.srcElement.parentNode)[0], "has-error");
                    }
                    break;
            }
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
                this._createLocateButton();
                this._createGeocoderButton();
                on(this.coordinateAddress, "keypress", lang.hitch(this, function (evt) {
                    if (evt.charCode == 13) {
                        this._locatePointOnMap(this.coordinateAddress.value);
                    }
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
            on(geocodeAddress, "find-results", lang.hitch(this, function (evt) {
                this.addressGeometry = evt.results.results[0].feature.geometry;
            }));
        },


        _addFeatureToLayer: function (config) {
            //To populate data for apply edits
            var featureData = new esri.Graphic();
            featureData.attributes = {};
            if (this.addressGeometry) {
                array.forEach(query(".geoFormQuestionare .form-control"), function (currentField) {
                    var key = domAttr.get(currentField, "fieldName");
                    var value = currentField.value;
                    featureData.attributes[key] = value;
                });
                featureData.geometry = {};
                featureData.geometry = new esri.geometry.Point(Number(this.addressGeometry.x), Number(this.addressGeometry.y), this.map.spatialReference);
                //code for apply-edits
                this.map.getLayer(config.form_layer.id).applyEdits([featureData], null, null, function (addResults) {
                    alert("Feature Added");
                }, function (err) {
                    this.reportError(err);
                });
            } else {
                alert("Please select x and y coordinates");
            }
        },

        _locatePointOnMap: function (coordinates) {
            var latLong = coordinates.split(",");
            if (latLong[0] >= -180 && latLong[0] <= 180 && latLong[1] >= -90 && latLong[1] <= 90) {
                var mapLocation = webMercatorUtils.lngLatToXY(latLong[0], latLong[1], true);
                var pt = new Point(mapLocation[0], mapLocation[1], this.map.spatialReference);
                this.addressGeometry = pt;
                this.map.centerAt(pt);
                domClass.remove(this.coordinatesContainer, "has-error");
            } else {
                domClass.add(this.coordinatesContainer, "has-error");
                alert("Not valid points");
            }
        }
    });
});