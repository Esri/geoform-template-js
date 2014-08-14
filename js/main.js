/*global $,define,document */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/ready",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/string",
    "esri/arcgis/utils",
    "esri/lang",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dojo/query",
    "dojo/io-query",
    "offline/OfflineSupport",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "esri/dijit/LocateButton",
    "esri/dijit/Geocoder",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!application/dijit/templates/modal.html",
    "dojo/text!application/dijit/templates/user.html",
    "dojo/i18n!application/nls/resources",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "application/ShareModal",
    "application/localStorageHelper",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/toolbars/edit",
    "esri/dijit/Popup",
    "application/themes",
    "application/pushpins",
    "application/coordinator/coordinator",
    "dojo/NodeList-traverse",
    "dojo/domReady!"
], function (
    ready,
    declare,
    lang,
    string,
    arcgisUtils,
    esriLang,
    dom,
    domClass, domStyle,
    on,
    query,
    ioQuery,
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
    nls, webMercatorUtils, Point, ShareModal, localStorageHelper, Graphic, PictureMarkerSymbol, editToolbar, Popup, theme, pushpins, coordinator) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: userTemplate,
        nls: nls,
        config: {},
        map: null,
        addressGeometry: null,
        editToolbar: null,
        themes: theme,
        pins: pushpins,
        localStorageSupport: null,
        defaultValueAttributes: null,
        
        _createGeocoderOptions: function () {
            //Check for multiple geocoder support and setup options for geocoder widget.
            var hasEsri = false,
                geocoders = lang.clone(this.config.helperServices.geocode);
            // each geocoder
            array.forEach(geocoders, lang.hitch(this, function (geocoder) {
                // if its the esri world geocoder
                if (geocoder.url.indexOf(".arcgis.com/arcgis/rest/services/World/GeocodeServer") > -1) {
                    hasEsri = true;
                    geocoder.name = "Esri World Geocoder";
                    geocoder.outFields = "Match_addr, stAddr, City";
                    geocoder.singleLineFieldName = "SingleLine";
                    geocoder.esri = geocoder.placefinding = true;
                    geocoder.placeholder = nls.user.find;
                }
            }));
            //only use geocoders with a singleLineFieldName that allow placefinding
            geocoders = array.filter(geocoders, function (geocoder) {
                return (esriLang.isDefined(geocoder.singleLineFieldName) && esriLang.isDefined(geocoder.placefinding) && geocoder.placefinding);
            });
            var esriIdx;
            // if we have the esri Geocoder
            if (hasEsri) {
                for (var i = 0; i < geocoders.length; i++) {
                    if (esriLang.isDefined(geocoders[i].esri) && geocoders[i].esri === true) {
                        esriIdx = i;
                        break;
                    }
                }
            }
            // options object
            var options = {
                map: this.map,
                autoComplete: hasEsri
            };
            //If there is a valid search id and field defined add the feature layer to the geocoder array
            var searchLayers = [];
            if (this.config.itemInfo.itemData && this.config.itemInfo.itemData.applicationProperties && this.config.itemInfo.itemData.applicationProperties.viewing && this.config.itemInfo.itemData.applicationProperties.viewing.search) {
                var searchOptions = this.config.itemInfo.itemData.applicationProperties.viewing.search;
                // add layers from webmap to geocoder widget
                array.forEach(searchOptions.layers, lang.hitch(this, function (searchLayer) {
                    var operationalLayers = this.config.itemInfo.itemData.operationalLayers;
                    var layer = null;
                    array.some(operationalLayers, function (opLayer) {
                        if (opLayer.id === searchLayer.id) {
                            layer = opLayer;
                            return true;
                        }
                    });
                    var url = layer.url;
                    var field = searchLayer.field.name;
                    var name = layer.title;
                    // if its a sublayer
                    if (esriLang.isDefined(searchLayer.subLayer)) {
                        url = url + "/" + searchLayer.subLayer;
                        array.some(layer.layerObject.layerInfos, function (info) {
                            if (info.id == searchLayer.subLayer) {
                                name += " - " + layer.layerObject.layerInfos[searchLayer.subLayer].name;
                                return true;
                            }

                        });
                    }
                    // create layer object 
                    searchLayers.push({
                        "name": name,
                        "url": url,
                        "field": field,
                        "exactMatch": (searchLayer.field.exactMatch || false),
                        "placeholder": searchOptions.hintText,
                        "outFields": "*",
                        "type": "query",
                        "layerId": searchLayer.id,
                        "subLayerId": parseInt(searchLayer.subLayer) || null
                    });
                }));
            }
            // if we have esri geocoder and its first
            if (hasEsri && esriIdx === 0) { // Esri geocoder is primary
                options.arcgisGeocoder = false;
                if (geocoders.length > 0) {
                    options.geocoders = searchLayers.length ? searchLayers.concat(geocoders) : geocoders;
                } else if (searchLayers.length > 0) {
                    options.geocoders = searchLayers;
                }
            } else { // Esri geocoder is not primary
                options.arcgisGeocoder = false;
                options.geocoders = searchLayers.length ? searchLayers.concat(geocoders) : geocoders;
            }
            return options;
        },
        startup: function (config, response, isPreview, node) {
            var localStorageSupport = new localStorageHelper();
            if (localStorageSupport.supportsStorage() && localStorage.getItem("geoform_config")) {
                config = JSON.parse(localStorage.getItem("geoform_config"));
                localStorage.clear();
            }

            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                // create localstorage helper
                this.localStorageSupport = new localStorageHelper();
                // document ready
                ready(lang.hitch(this, function () {
                    // modal i18n
                    modalTemplate = string.substitute(modalTemplate, nls);
                    // place modal code
                    domConstruct.place(modalTemplate, document.body, 'last');
                    //supply either the webmap id or, if available, the item info
                    if (isPreview) {
                        var cssStyle;
                        // if local storage supported
                        if (this.localStorageSupport.supportsStorage()) {
                            localStorage.setItem("geoform_config", JSON.stringify(config));
                        }
                        // set theme to selected
                        array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
                            if (this.config.theme == currentTheme.id) {
                                cssStyle = domConstruct.create('link', {
                                    rel: 'stylesheet',
                                    type: 'text/css',
                                    href: currentTheme.url
                                });
                            }
                        }));
                        //Handle case where edit is first url parameter we'll use the same logic we used in ShareModal.js
                        var url = window.location.protocol + '//' + window.location.host + window.location.pathname;
                        if (window.location.href.indexOf("?") > -1) {
                            var queryUrl = window.location.href;
                            var urlParams = ioQuery.queryToObject(window.location.search.substring(1)),
                                newParams = lang.clone(urlParams);
                            delete newParams.edit; //Remove edit parameter
                            url = queryUrl.substring(0, queryUrl.indexOf("?") + 1) + ioQuery.objectToQuery(newParams);
                        }
                        node.src = url;
                        // on iframe load
                        node.onload = function () {
                            var frame = document.getElementById("iframeContainer").contentWindow.document;
                            domConstruct.place(cssStyle, frame.getElementsByTagName('head')[0], "last");
                        };
                    } else {
                        // no theme set
                        if(!this.config.theme){
                            // lets use bootstrap theme!
                            this.config.theme = "bootstrap";
                        }
                        // set theme
                        this._switchStyle(this.config.theme);
                        // append user html to node
                        dom.byId("parentContainter").appendChild(this.userMode);
                        // get item info from template
                        var itemInfo = this.config.itemInfo || this.config.webmap;
                        // create map
                        this._createWebMap(itemInfo);
                        // if small header is set
                        if (this.config.useSmallHeader) {
                            // remove class
                            domClass.remove(this.jumbotronNode, "jumbotron");
                        }
                    }
                }));
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }

            on(this.submitButton, "click", lang.hitch(this, function () {
                var btn = $(this.submitButton);
                btn.button('loading');
                var erroneousFields = [],
                    errorMessage;
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
                    errorMessage = "";
                    errorMessage += '<p class="lead"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + nls.user.requiredFields + '</p>';
                    errorMessage += "<ol>";
                    errorMessage += "<li>" + nls.user.formValidationMessageAlertText + "\n <ul>";
                    array.forEach(erroneousFields, function (erroneousField) {
                        if (query(".form-control", erroneousField).length !== 0 && query(".form-control", erroneousField)[0].placeholder !== ""){
                            errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + erroneousField.childNodes[0].textContent.split("*")[0] + "</a>. " + query(".form-control", erroneousField)[0].placeholder + "</li>";
                        } else{
                            errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + erroneousField.childNodes[0].textContent.split("*")[0] + "</a></li>";
                        }
                    });
                    errorMessage += "</ul></li>";

                    //condition check to find whether the user has selected a point on map or not.
                    if (!this.addressGeometry) {
                        errorMessage += "<li>" + string.substitute(nls.user.selectLocation, {
                            openLink: '<a href="#select_location">',
                            closeLink: "</a>"
                        }) + "</li>";
                    }
                    errorMessage += "</ol>";
                    this._showErrorMessageDiv(errorMessage);
                    btn.button('reset');
                } else {
                    this._addFeatureToLayer(this.config);
                }
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
                var offlineSupport = new OfflineSupport({
                    map: this.map,
                    layer: layer
                });
            }
            this.editToolbar = new editToolbar(this.map);
            on(this.editToolbar, "graphic-move-start", lang.hitch(this, function () {
                this.map.infoWindow.hide();
            }));
            on(this.editToolbar, "graphic-move-stop", lang.hitch(this, function (evt) {
                this.addressGeometry = evt.graphic.geometry;
            }));
            on(this.map, 'click', lang.hitch(this, function (evt) {
                if (!evt.graphic) {
                    this._clearSubmissionGraphic();
                    this.addressGeometry = evt.mapPoint;
                    this.map.infoWindow.setTitle(nls.user.locationTabText);
                    this.map.infoWindow.setContent(nls.user.addressSearchText);
                    this.map.infoWindow.show(this.addressGeometry);
                    this._setSymbol(this.addressGeometry);
                }
            }));
            on(this.map, 'mouse-move, click', lang.hitch(this, function (evt) {
                var coords = this._calculateLatLong(evt);
                var coordinatesValue = nls.user.latitude + ': ' + coords[1].toFixed(5) + ', ';
                coordinatesValue += '&nbsp;' + nls.user.longitude + ': ' + coords[0].toFixed(5);
                domAttr.set(dom.byId("coordinatesValue"), "innerHTML", coordinatesValue);
            }));
            
            
            // Add desireable touch behaviors here
            if (this.map.hasOwnProperty("isScrollWheelZoom")) {
                if (this.map.isScrollWheelZoom) {
                    this.map.enableScrollWheelZoom();
                } else {
                    this.map.disableScrollWheelZoom();
                }
            } else {
                // Default
                this.map.disableScrollWheelZoom();
            }
            // FeatureLayers
            if (this.map.infoWindow) {
                on(this.map.infoWindow, "selection-change, set-features, show", lang.hitch(this, function () {
                    this._resizeInfoWin();
                }));
            }
            
            on(window, 'resize', lang.hitch(this, function () {
                this.map.reposition();
                this.map.resize(true);
                this._resizeInfoWin();
                this._centerPopup();
            }));

            this.map.reposition();
            this.map.resize();
        },
        _centerPopup: function () {
            if (this.map.infoWindow && this.map.infoWindow.isShowing) {
                var location = this.map.infoWindow.location;
                if (location) {
                    this.map.centerAt(location);
                }
            }
        },
        _resizeInfoWin: function () {
            if (this.map.infoWindow) {
                var iw, ih;
                var h = this.map.height;
                var w = this.map.width;
                // width
                if (w < 300) {
                    iw = 125;
                } else if (w < 600) {
                    iw = 200;
                } else {
                    iw = 300;
                }
                // height
                if (h < 300) {
                    ih = 75;
                } else if (h < 600) {
                    ih = 100;
                } else {
                    ih = 200;
                }
                this.map.infoWindow.resize(iw, ih);
            }
        },
        _setSymbol: function (point) {
            var symbolUrl, pictureMarkerSymbol, graphic;
            array.some(this.pins, lang.hitch(this, function (currentPin) {
                if (this.config.pushpinColor == currentPin.id) {
                    symbolUrl = currentPin.url;
                    // create symbol and offset 10 to the left and 17 to the bottom so it points correctly
                    pictureMarkerSymbol = new PictureMarkerSymbol(symbolUrl, currentPin.width, currentPin.height).setOffset(currentPin.offset.x, currentPin.offset.y);
                    graphic = new Graphic(point, pictureMarkerSymbol, null, null);
                    this.map.graphics.add(graphic);
                    this.editToolbar.activate(editToolbar.MOVE, graphic, null);
                    return true;
                }
            }));

        },

        _calculateLatLong: function (evt) {
            var normalizedVal = webMercatorUtils.xyToLngLat(evt.mapPoint.x, evt.mapPoint.y);
            return normalizedVal;
        },
        //function to set the logo-path, application title and details
        _setAppConfigurations: function (appConfigurations) {
            if (appConfigurations.Logo)
                this.appLogo.src = appConfigurations.Logo;
            else
                domClass.add(this.appLogo, "hide");
            if (appConfigurations.Title)
                this.appTitle.innerHTML = appConfigurations.Title;
            else
                domClass.add(this.appTitle, "hide");
            if (appConfigurations.Description)
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
            var formContent, labelContent, inputContent, selectOptions, helpBlock, fileInput, matchingField, newAddedFields = [],
                fieldname, fieldLabelText, requireField, sortedArray, radioButtonCounter = 0;
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
                    } else if (layerField.name == currentField.fieldName && !currentField.visible) {
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
                    var fName = newElement.name ? newElement.name : newElement.fieldName;
                    if (this.config.appid) {
                        if (sortedElement.fieldName == fName) {
                            sortedArray.push(newElement);
                            return true;
                        }
                    } else {
                        if (sortedElement.name == fName) {
                            sortedArray.push(newElement);
                            return true;
                        }
                    }
                }));
            }));
            array.forEach(sortedArray, lang.hitch(this, function (currentField, index) {
                var radioContainer, radioContent, inputLabel;
                //code to put asterisk mark for mandatory fields and also to give it a mandatory class.
                if (!currentField.nullable) {
                    formContent = domConstruct.create("div", {
                        className: "form-group has-feedback geoFormQuestionare mandatory"
                    }, this.userForm);
                    requireField = domConstruct.create("strong", {
                        className: 'text-danger requireFieldStyle',
                        innerHTML: "*"
                    });
                } else {
                    formContent = domConstruct.create("div", {
                        className: "form-group geoFormQuestionare has-feedback"
                    }, this.userForm);
                }
                if (currentField.isNewField) {
                    fieldLabelText = currentField.alias;
                    fieldname = currentField.name;
                } else {
                    fieldLabelText = currentField.fieldLabel;
                    fieldname = currentField.fieldName;
                }
                labelContent = domConstruct.create("label", {
                    "for": fieldname,
                    className: "control-label",
                    innerHTML: fieldLabelText,
                    id: fieldLabelText + "" + index
                }, formContent);
                if (requireField) {
                    domConstruct.place(requireField, labelContent, "last");
                }
                if (this.map.getLayer(this.config.form_layer.id).templates[0]) {
                    for (var fieldAttribute in this.map.getLayer(this.config.form_layer.id).templates[0].prototype.attributes) {
                        if (fieldAttribute == fieldname) {
                            currentField.defaultValue = this.map.getLayer(this.config.form_layer.id).templates[0].prototype.attributes[fieldname];
                        }
                    }
                }
                //code to make select boxes in case of a coded value
                if (currentField.domain) {
                    if (currentField.domain.codedValues.length > 2) {
                        inputContent = domConstruct.create("select", {
                            className: "form-control selectDomain",
                            "id": fieldname
                        }, formContent);
                        selectOptions = domConstruct.create("option", {
                            innerHTML: nls.user.domainDefaultText,
                            value: ""
                        }, inputContent);
                        array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                            selectOptions = domConstruct.create("option", {
                                innerHTML:currentOption.name,
                                value: currentOption.code
                            }, inputContent);
                        }));
                        on(inputContent, "change", lang.hitch(this, function (evt) {
                            if (evt.target.value !== "") {
                                domClass.add($(evt.target.parentNode)[0], "has-success");
                            } else {
                                domClass.remove($(evt.target.parentNode)[0], "has-success");
                            }
                        }));
                    } else {
                        radioContainer = domConstruct.create("div", {
                            className: "radioContainer"
                        }, formContent);
                        domAttr.set(radioContainer, "containerIndex", radioButtonCounter);
                        array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption, btnIndex) {
                            if (index === 1) {
                                domAttr.set(radioContainer, "id", fieldname + "radioContainer");
                            }
                            radioContent = domConstruct.create("div", {
                                className: "radio"
                            }, radioContainer);
                            inputLabel = domConstruct.create("label", {
                                "for": currentOption.code + fieldname
                            }, radioContent);
                            inputContent = domConstruct.create("input", {
                                "id": currentOption.code + fieldname,
                                className: "radioInput",
                                type: "radio",
                                name: fieldname,
                                value: currentOption.code
                            }, inputLabel);
                            domAttr.set(inputContent, "radioContainerIndex", radioButtonCounter);
                            // add text after input
                            inputLabel.innerHTML += currentOption.name;
                            on(dom.byId(currentOption.code + fieldname), "click", function (evt) {
                                var i = domAttr.get(evt.target, "radioContainerIndex");
                                var radiotButtonContainer = query(".radioContainer")[i];
                                if (evt.target.checked) {
                                    domClass.add(radiotButtonContainer.parentNode, "has-success");
                                } else {
                                    domClass.remove(radiotButtonContainer.parentNode, "has-success");
                                }
                            });
                        }));
                        radioButtonCounter++;
                    }
                } else {
                    switch (currentField.type) {
                    case "esriFieldTypeString":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "String",
                            "maxLength": currentField.length,
                            "id": fieldname
                        }, formContent);
                        break;
                    case "esriFieldTypeSmallInteger":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "smallInteger",
                            "id": fieldname,
                            "pattern": "[0-9]*"
                        }, formContent);
                        break;
                    case "esriFieldTypeInteger":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "Integer",
                            "id": fieldname,
                            "pattern": "[0-9]*"
                        }, formContent);
                        break;
                    case "esriFieldTypeSingle":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "Single",
                            "id": fieldname,
                            "pattern": "[0-9]*"
                        }, formContent);
                        break;
                    case "esriFieldTypeDouble":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "Double",
                            "id": fieldname,
                            step: ".1"
                        }, formContent);
                        break;
                    case "esriFieldTypeDate":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            value: "",
                            className: "form-control hasDatetimepicker",
                            "data-input-type": "Date",
                            "id": fieldname
                        }, formContent);
                        $(inputContent).datetimepicker({
                            useSeconds: false
                        }).on('dp.change, dp.show', function(evt){
                            domClass.remove(evt.target.parentElement, "has-error");
                            domClass.add(evt.target.parentElement, "has-success");
                        }).on('dp.error', function(evt){
                            evt.target.value = '';
                            $(this).data("DateTimePicker").hide();
                            domClass.remove(evt.target.parentElement, "has-success");
                            domClass.add(evt.target.parentElement, "has-error");
                        });
                        break;
                    }
                    //Add Placeholder if present
                    if (currentField.placeHolder) {
                        domAttr.set(inputContent, "placeholder", currentField.placeHolder);
                    }
                    //If present fetch default values
                    if (currentField.defaultValue) {
                        domAttr.set(inputContent, "value", currentField.defaultValue);
                        domClass.add(formContent, "has-success");
                    }
                    on(inputContent, "keyup", lang.hitch(this, function (evt) {
                        this._validateField(evt, true);
                    }));
                }

                var helpHTML;
                if (currentField.isNewField) {
                    array.forEach(this.config.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
                        if (currentLayer.id == this.config.form_layer.id) {
                            array.forEach(currentLayer.popupInfo.fieldInfos, function (currentFieldPopupInfo) {
                                if (currentFieldPopupInfo.fieldName == currentField.name) {
                                    if (currentFieldPopupInfo.tooltip) {
                                        helpHTML = currentFieldPopupInfo.tooltip;
                                    }
                                }
                            });
                        }
                    }));
                } else {
                    helpHTML = currentField.fieldDescription;
                }
                
                if(helpHTML){
                    helpBlock = domConstruct.create("p", {
                        className: "help-block",
                        innerHTML: helpHTML
                    }, formContent);
                }
                
            }));
            if (this.map.getLayer(this.config.form_layer.id).hasAttachments) {
                formContent = domConstruct.create("div", {
                    className: "form-group"
                }, this.userForm);

                labelContent = domConstruct.create("label", {
                    innerHTML: nls.user.attachment,
                    "for": "geoFormAttachment"
                }, formContent);

                fileInput = domConstruct.create("input", {
                    "type": "file",
                    "accept": "image/*",
                    "capture": "camera",
                    "name": "attachment"
                }, formContent);
                domAttr.set(fileInput, "id", "geoFormAttachment");
                if(this.config.attachmentHelpText){
                    helpBlock = domConstruct.create("p", {
                        className: "help-block",
                        innerHTML: this.config.attachmentHelpText
                    }, formContent);
                }
            }
        },

        _validateField: function (currentNode, iskeyPress) {
            var inputType, inputValue, node, typeCastedInputValue, decimal = /^[-+]?[0-9]+$/,
                float = /^[-+]?[0-9]+\.[0-9]+$/;
            if (iskeyPress) {
                inputValue = currentNode.currentTarget.value;
                inputType = domAttr.get(currentNode.currentTarget, "data-input-type");
                if ($(currentNode.target)) {
                    node = $(currentNode.target.parentNode)[0];
                } else {
                    node = $(currentNode.srcElement.parentNode)[0];
                }
            } else {
                inputValue = query(".form-control", currentNode)[0].value;
                inputType = domAttr.get(query(".form-control", currentNode)[0], "data-input-type");
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
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
                }
                break;
            case "Integer":
                typeCastedInputValue = parseInt(inputValue);
                if ((inputValue.match(decimal) && typeCastedInputValue > -2147483648 && typeCastedInputValue <= 2147483647) && inputValue.length !== 0) {
                    this._validateUserInput(true, node, inputValue, iskeyPress);
                } else {
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
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
                }
                break;
            case "Double":
                typeCastedInputValue = parseFloat(inputValue);
                if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue > -2.2 * Math.pow(10, 308) && typeCastedInputValue < 1.8 * Math.pow(10, 38)) && inputValue.length !== 0) {
                    this._validateUserInput(true, node, inputValue, iskeyPress);
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
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
                } else {
                    currentInput.options[0].selected = true;
                    domClass.remove(node, "has-success");
                }
            });
            array.forEach(query(".radioInput:checked"), function (currentField) {
                domAttr.set(currentField, "checked", false);
                domClass.remove(query(".radioContainer")[domAttr.get(currentField, "radioContainerIndex")].parentNode, "has-success");
            });
            if (dom.byId("geoFormAttachment").value) {
                dom.byId("geoFormAttachment").value = "";
            }
        },
        _validateUserInput: function (isValidInput, node, inputValue, iskeyPress) {
            if (isValidInput) {
                domClass.remove(node, "has-error");
                domClass.add(node, "has-success");
            } else {
                domClass.add(node, "has-error");
                domClass.remove(node, "has-success");
            }
            if (iskeyPress && inputValue.length === 0) {
                domClass.remove(node, "has-error");
                domClass.remove(node, "has-success");
            }
        },

        // create a map based on the input web map id
        _createWebMap: function (itemInfo) {
            var popup = new Popup(null, domConstruct.create("div"));
            domClass.add(popup.domNode, 'light');
            var mapDiv = dom.byId('mapDiv');
            mapDiv.innerHTML = '';
            arcgisUtils.createMap(itemInfo, mapDiv, {
                mapOptions: {
                    infoWindow: popup
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
                this.defaultExtent = this.map.extent;
                this.map.reposition();
                this.map.resize();
                //Check for the appid if it is not present load entire application with webmap defaults
                if (!this.config.appid && this.config.webmap) {
                    this._setWebmapDefaults();
                }
                this._setAppConfigurations(this.config.details);
                // window title
                if (this.config.details && this.config.details.Title) {
                    window.document.title = this.config.details.Title;
                }

                this._createForm(this.config.fields);
                this._createLocateButton();
                this._createGeocoderButton();
                on(this.XCoordinate, "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                }));
                on(this.YCoordinate, "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                }));
                on(this.cordsSubmit, "click", lang.hitch(this, function (evt) {
                    this._evaluateCoordinates(evt);
                }));

                on(this.usng_mgrs_submit, "click", lang.hitch(this, function () {
                    this._clearSubmissionGraphic();
                    var value = dom.byId('usng_mgrs_coord').value;
                    var fn = coordinator('mgrs', 'latlong');
                    var converted;
                    try{
                        converted = fn(value);
                    }
                    catch(e){
                       this._coordinatesError('usng'); 
                    }
                    if(converted){
                        this._locatePointOnMap(converted.latitude, converted.longitude, 'usng');
                    }
                }));
                on(this.utm_submit, "click", lang.hitch(this, function () {
                    this._clearSubmissionGraphic();
                    var northing = parseFloat(dom.byId('utm_northing').value);
                    var easting = parseFloat(dom.byId('utm_easting').value);
                    var zone = parseInt(dom.byId('utm_zone_number').value, 10);
                    var converted;
                    var fn = coordinator('utm', 'latlong');
                    try{
                        converted = fn(northing, easting, zone);
                    }
                    catch(e){
                        this._coordinatesError('utm');
                    }
                    if(converted){
                        this._locatePointOnMap(converted.latitude, converted.longitude, 'utm');
                    }
                }));
                this._populateLocationsOptions();
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
        _evaluateCoordinates: function () {
            this._clearSubmissionGraphic();
            if (this.XCoordinate.value === "") {
                this._showErrorMessageDiv(string.substitute(nls.user.emptylatitudeAlertMessage, {
                            openLink: '<a href="#lat_coord\">',
                            closeLink: "</a>"
                        }));
                return;
            } else if (this.YCoordinate.value === "") {
                this._showErrorMessageDiv(string.substitute(nls.user.emptylongitudeAlertMessage, {
                            openLink: '<a href="#lng_coord\">',
                            closeLink: "</a>"
                        }));
                return;
            }
            this._locatePointOnMap(this.XCoordinate.value, this.YCoordinate.value, 'latlon');
        },
        _findLocation: function (evt) {
            var keyCode = evt.charCode || evt.keyCode;
            if (keyCode === 13) {
                this._evaluateCoordinates();
            }
        },
        _createLocateButton: function () {
            var currentLocation = new LocateButton({
                map: this.map,
                highlightLocation: false,
                theme: "btn btn-default"
            }, domConstruct.create('div'));
            currentLocation.startup();
            on(currentLocation, "locate", lang.hitch(this, function (evt) {
                domConstruct.empty(this.erroMessageDiv);
                if (evt.error) {
                    alert(nls.user.locationNotFound);
                } else {
                    var pt = webMercatorUtils.geographicToWebMercator(evt.graphic.geometry);
                    evt.graphic.setGeometry(pt);
                    this.addressGeometry = pt;
                    this.map.infoWindow.setTitle(nls.user.myLocationTitleText);
                    this.map.infoWindow.setContent(nls.user.addressSearchText);
                    this.map.infoWindow.show(this.addressGeometry);
                    this._setSymbol(evt.graphic.geometry);
                }
                $('#geolocate_button').button('reset');
            }));
            on(dom.byId('geolocate_button'), 'click', lang.hitch(this, function () {
                this._clearSubmissionGraphic();
                $('#geolocate_button').button('loading');
                currentLocation.locate();
            }));
        },
        _searchGeocoder: function () {
            domConstruct.empty(this.erroMessageDiv);
            this._clearSubmissionGraphic();
            var value = this.searchInput.value;
            var node = dom.byId('geocoder_spinner');
            if (value) {
                domClass.remove(node, 'glyphicon glyphicon-search');
                domClass.add(node, 'fa fa-spinner fa-spin');
                this.geocodeAddress.find(value).then(lang.hitch(this, function (evt) {
                    domClass.remove(node, 'fa fa-spinner fa-spin');
                    domClass.add(node, 'glyphicon glyphicon-search');
                    if (evt.results && evt.results.length) {
                        this.geocodeAddress.select(evt.results[0]);
                    } else {
                        alert(nls.user.locationNotFound);
                    }
                }));
            }
        },
        _geocoderMenuItems: function(){
            var html = '';
            for(var i = 0; i < this.geocodeAddress._geocoders.length; i++){
                var gc = this.geocodeAddress._geocoders[i];
                var active = '';
                if(i === this.geocodeAddress.activeGeocoderIndex){
                    active = 'active';
                }
                html += '<li class="' + active + '"><a data-index="' + i + '" href="#">' + gc.name + '</a></li>';
            }
            var node = dom.byId('geocoder_menu');
            node.innerHTML = html;
        },
        _createGeocoderButton: function () {
            var options = this._createGeocoderOptions();
            this.geocodeAddress = new Geocoder(options, domConstruct.create('div'));
            this.geocodeAddress.startup();
            if(this.geocodeAddress._geocoders && this.geocodeAddress._geocoders.length > 1){
                var html = '';
                html += '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">';
                html += '<span class="caret"></span>';
                html += '<span class="sr-only">' + nls.user.toggleDropdown + '</span>';
                html += '</button>';
                html += '<ul class="dropdown-menu" role="menu" id="geocoder_menu">';
                html += '</ul>';
                var node = dom.byId('geocoder_buttons');
                domConstruct.place(html, node, 'last');
                this._geocoderMenuItems();
            }

            domAttr.set(this.searchInput, 'placeholder', this.geocodeAddress.activeGeocoder.placeholder);

            on(this.searchInput, 'keyup', lang.hitch(this, function (evt) {
                var keyCode = evt.charCode || evt.keyCode;
                if (keyCode === 13) {
                    this._searchGeocoder();
                }
            }));

            on(this.searchSubmit, 'click', lang.hitch(this, function () {
                this._searchGeocoder();
            }));

            on(this.geocodeAddress, "select", lang.hitch(this, function (evt) {
                this.addressGeometry = evt.result.feature.geometry;
                this._setSymbol(evt.result.feature.geometry);
                this.map.centerAt(evt.result.feature.geometry).then(lang.hitch(this, function(){
                    this.map.resize();
                }));
                this.map.infoWindow.setTitle(nls.user.locationTabText);
                this.map.infoWindow.setContent(nls.user.addressSearchText);
                this.map.infoWindow.show(evt.result.feature.geometry);
            }));

            on(this.geocodeAddress, "geocoder-select", lang.hitch(this, function () {
                domAttr.set(this.searchInput, 'placeholder', this.geocodeAddress.activeGeocoder.placeholder);
                this._geocoderMenuItems();
            }));
            var gcMenu = dom.byId('geocoder_menu');
            if(gcMenu){
                on(gcMenu, 'a:click', lang.hitch(this, function(evt){
                    var idx = parseInt(domAttr.get(evt.target, 'data-index'), 10);
                    this.geocodeAddress.set('activeGeocoderIndex', idx);
                    evt.preventDefault();
                }));
            }
        },

        _addFeatureToLayer: function (config) {
            //To populate data for apply edits
            var featureData = new Graphic();
            featureData.attributes = {};
            if (this.addressGeometry) {
                var key, value;
                //condition to filter out radio inputs
                array.forEach(query(".geoFormQuestionare .form-control"), function (currentField) {
                    if (currentField.value !== "") {
                        key = domAttr.get(currentField, "id");
                        if (domClass.contains(currentField, "hasDatetimepicker")) {
                            var picker = $(currentField).data('DateTimePicker');
                            var d = picker.getDate();
                            // need to get time of date in ms for service
                            value = d.valueOf();
                        } else {
                            value = lang.trim(currentField.value);
                        }
                        featureData.attributes[key] = value;
                    }
                });
                array.forEach(query(".geoFormQuestionare .radioContainer"), function (currentField) {
                    if (query(".radioInput:checked", currentField).length !== 0) {
                        key = query(".radioInput:checked", currentField)[0].name;
                        value = lang.trim(query(".radioInput:checked", currentField)[0].value);
                        featureData.attributes[key] = value;
                    }
                });
                featureData.geometry = {};
                featureData.geometry = new Point(Number(this.addressGeometry.x), Number(this.addressGeometry.y), this.map.spatialReference);
                //code for apply-edits
                this.map.getLayer(config.form_layer.id).applyEdits([featureData], null, null, lang.hitch(this, function (addResults) {
                    this._clearSubmissionGraphic();
                    this.map.getLayer(config.form_layer.id).setEditable(false);
                    domConstruct.destroy(query(".errorMessage")[0]);
                    if (!addResults[0].success) {
                        this._openErrorModal();
                        return;
                    }
                    this._openShareModal();
                    if (this.config.defaultMapExtent) {
                        this.map.setExtent(this.defaultExtent);
                    }
                    $("#myModal").modal('show');
                    this.map.getLayer(config.form_layer.id).refresh();
                    this._resetButton();
                    if (this.userForm[this.userForm.length - 1].value !== "" && this.map.getLayer(config.form_layer.id).hasAttachments) {
                        this.map.getLayer(config.form_layer.id).addAttachment(addResults[0].objectId, this.userForm, function () {}, function () {
                            console.log(nls.user.addAttachmentFailedMessage);
                        });
                    }
                    this._clearFormFields();
                }), lang.hitch(this, function () {
                    this._clearSubmissionGraphic();
                    this.map.getLayer(this.config.form_layer.id).setEditable(false);
                    domConstruct.destroy(query(".errorMessage")[0]);
                    this._openErrorModal();
                    console.log(nls.user.addFeatureFailedMessage);
                }));
            } else {
                this._resetButton();
                var errorMessage = '';
                errorMessage += '<p class="lead"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + nls.user.requiredFields + '</p>';
                errorMessage += '<p>' + string.substitute(nls.user.selectLocation, {
                    openLink: '<a href="#select_location">',
                    closeLink: "</a>"
                }) + '</p>';
                this._showErrorMessageDiv(errorMessage);
            }
        },
        _clearSubmissionGraphic: function () {
            this.addressGeometry = null;
            this.map.graphics.clear();
            if (this.map.infoWindow.isShowing) {
                this.map.infoWindow.hide();
            }
        },
        
        _coordinatesError: function(type){
            switch(type){
                    case "utm":
                        this._showErrorMessageDiv(string.substitute(nls.user.invalidUTM, {
                            openLink: '<a href="#utm_northing">',
                            closeLink: "</a>"
                        }));
                        break;
                    case "usng":
                        this._showErrorMessageDiv(string.substitute(nls.user.invalidUSNGMGRS, {
                            openLink: '<a href="#usng_mgrs_coord">',
                            closeLink: "</a>"
                        }));
                        break;
                    default:
                        this._showErrorMessageDiv(string.substitute(nls.user.invalidLatLong, {
                            latLink: '<a href="#lat_coord">',
                            lngLink: '<a href="#lng_coord">',
                            closeLink: "</a>"
                        }));       
                }   
        },

        _locatePointOnMap: function (x, y, type) {
            if (x >= -90 && x <= 90 && y >= -180 && y <= 180) {
                var mapLocation = new Point(y, x);
                var pt = webMercatorUtils.geographicToWebMercator(mapLocation);
                this.addressGeometry = pt;
                this._setSymbol(this.addressGeometry);
                this.map.infoWindow.setTitle(nls.user.locationTabText);
                this.map.infoWindow.setContent(nls.user.addressSearchText);
                this.map.infoWindow.show(this.addressGeometry);
                this.map.centerAt(this.addressGeometry).then(lang.hitch(this, function(){
                    this.map.resize();
                }));
                domConstruct.empty(this.erroMessageDiv);
            } else {
                this._coordinatesError(type);
            }
        },

        _openShareModal: function () {
            this._createShareDlgContent();
            this._ShareModal = new ShareModal({
                bitlyLogin: this.config.bitlyLogin,
                bitlyKey: this.config.bitlyKey,
                image: this.config.sharinghost + '/sharing/rest/content/items/' + this.config.itemInfo.item.id + '/info/' + this.config.itemInfo.item.thumbnail,
                title: this.config.details.Title || nls.user.geoformTitleText || '',
                summary: this.config.details.Description || '',
                hashtags: 'esriGeoForm',
                shareOption: this.config.enableSharing
            });
            this._ShareModal.startup();
            $("#myModal").modal('show');
        },

        _openErrorModal: function () {
            var errorMsgContainer;
            domConstruct.empty(query(".modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.user.error);
            errorMsgContainer = domConstruct.create("div", {
            }, query(".modal-body")[0]);
            domConstruct.create("div", {
                className: "alert alert-danger errorMessage",
                innerHTML: nls.user.applyEditsFailedMessage
            }, errorMsgContainer);
            $("#myModal").modal('show');
            this._resetButton();
            this._clearFormFields();
        },

        _createShareDlgContent: function () {
            var iconContainer, facebookIconHolder, twitterIconHolder, googlePlusIconHolder, mailIconHolder;
            domConstruct.empty(query(".modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.user.shareUserTitleMessage);
            iconContainer = domConstruct.create("div", {
                className: "iconContainer"
            }, query(".modal-body")[0]);
            domConstruct.create("div", {
                className: "share-dialog-subheader",
                innerHTML: nls.user.shareUserTextMessage
            }, iconContainer);
            if (this.config.enableSharing) {
                facebookIconHolder = domConstruct.create("div", {
                    className: "iconContent"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-facebook-square iconClass",
                    id: "facebookIcon"
                }, facebookIconHolder);
                twitterIconHolder = domConstruct.create("div", {
                    className: "iconContent"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-twitter-square iconClass",
                    id: "twitterIcon"
                }, twitterIconHolder);
                googlePlusIconHolder = domConstruct.create("div", {
                    className: "iconContent"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-google-plus-square iconClass",
                    id: "google-plusIcon"
                }, googlePlusIconHolder);
            }
            mailIconHolder = domConstruct.create("div", {
                className: "iconContent"
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
                innerHTML: nls.user.shareModalFormText
            }, iconContainer);
            domConstruct.create("input", {
                type: "text",
                className: "share-map-url",
                id: "_shareMapUrlText"
            }, iconContainer);
        },

        _showErrorMessageDiv: function (errorMessage) {
            domConstruct.empty(this.erroMessageDiv);
            window.location.hash = "";
            domConstruct.create("div", {
                className: "alert alert-danger errorMessage",
                id: "errorMessage",
                innerHTML: errorMessage
            }, this.erroMessageDiv);
            window.location.hash = "#errorMessage";
            this.map.reposition();
            this.map.resize();
        },

        _resetButton: function () {
            var btn = $(this.submitButton);
            btn.button('reset');
        },

        _setWebmapDefaults: function () {
            if(this.config.details.Title !== false){
                this.config.details.Title = this.config.itemInfo.item.title;
            }
            if(this.config.details.Description !== false){
                this.config.details.Description = this.config.itemInfo.item.snippet;
            }
            if (this.config.itemInfo.item.thumbnail && this.config.details.Logo !== false) {
                this.config.details.Logo = this.config.sharinghost + "/sharing/rest/content/items/" + this.config.webmap + '/info/' + this.config.itemInfo.item.thumbnail;
            } else {
                this.config.details.Logo = false;
            }
            array.some(this.config.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
                if (currentLayer.url.split("/")[currentLayer.url.split("/").length - 2] == "FeatureServer") {
                    this.config.form_layer.id = currentLayer.id;
                    // if fields not set or empty
                    if(!this.config.fields || (this.config.fields && this.config.fields.length === 0)){
                        this.config.fields = this.map.getLayer(this.config.form_layer.id).fields;
                    }
                    return true;
                }
            }));
        },

        _populateLocationsOptions: function () {
            var count = 0;
            var locationTabs = query(".nav-tabs li");
            var tabContents = query(".tab-pane");
            for (var key in this.config.locationSearchOptions) {
                if(this.config.locationSearchOptions.hasOwnProperty(key)){
                    if (!this.config.locationSearchOptions[key]) {
                        domStyle.set(locationTabs[count], 'display', 'none');
                    } else {
                        //resize the map to set the correct info-window anchor
                        on(locationTabs[count], 'click', lang.hitch(this, this.map.resize));
                    }
                    count++;
                }
            }
            //add 'active' class to first tab and its content
            array.some(locationTabs, lang.hitch(this, function (tab, idx) {
                if (domStyle.get(tab, 'display') == 'block') {
                    domClass.add(tab, 'active');
                    domClass.add(tabContents[idx], 'active');
                    return true;
                }
            }));
        }
    });
});