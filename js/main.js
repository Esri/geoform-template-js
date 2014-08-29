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
    "dojo/text!views/modal.html",
    "dojo/text!views/user.html",
    "dojo/i18n!application/nls/resources",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "esri/layers/GraphicsLayer",
    "application/ShareModal",
    "application/FullScreenMap",
    "application/localStorageHelper",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/toolbars/edit",
    "esri/InfoTemplate",
    "esri/dijit/Popup",
    "application/themes",
    "application/pushpins",
    "application/coordinator/coordinator",
    "dojo/date/locale",
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
    modalTemplate,
    userTemplate,
    nls, webMercatorUtils, Point, GraphicsLayer, ShareModal, FullScreenMap, localStorageHelper, Graphic, PictureMarkerSymbol, editToolbar, InfoTemplate, Popup, theme, pushpins, coordinator, locale) {
    return declare([], {
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
                        if (!this.config.theme) {
                            // lets use bootstrap theme!
                            this.config.theme = "bootstrap";
                        }
                        // set theme
                        this._switchStyle(this.config.theme);
                        var userHTML = string.substitute(userTemplate, nls);
                        dom.byId("parentContainter").innerHTML = userHTML;
                        // get item info from template
                        var itemInfo = this.config.itemInfo || this.config.webmap;
                        // create map
                        this._createWebMap(itemInfo);
                        // if small header is set
                        if (this.config.useSmallHeader) {
                            // remove class
                            domClass.remove(dom.byId('jumbotronNode'), "jumbotron");
                        }
                    }

                    var submitButtonNode = dom.byId('submitButton');
                    if (submitButtonNode) {
                        on(submitButtonNode, "click", lang.hitch(this, function (evt) {
                            var btn = $(submitButtonNode);
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
                                //handle errors in radio and checkbox fields here.
                                else {
                                    if (domClass.contains(currentField, "mandatory") && query(".radioInput:checked", currentField).length === 0 && query(".checkboxContainer", currentField).length === 0) {
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
                                    if (query(".form-control", erroneousField).length !== 0 && query(".form-control", erroneousField)[0].placeholder) {
                                        errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + erroneousField.childNodes[0].textContent.split(nls.user.requiredField)[0] + "</a>. " + query(".form-control", erroneousField)[0].placeholder + "</li>";
                                    } else {
                                        errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + erroneousField.childNodes[0].textContent.split(nls.user.requiredField)[0] + "</a></li>";
                                    }
                                });
                                errorMessage += "</ul></li>";

                                //condition check to find whether the user has selected a point on map or not.
                                if (!this.addressGeometry) {
                                    errorMessage += "<li>" + string.substitute(nls.user.selectLocation, {
                                        openLink: '<a href="#select_location">',
                                        closeLink: '</a>'
                                    }) + "</li>";
                                }
                                errorMessage += "</ol>";
                                this._showErrorMessageDiv(errorMessage);
                                btn.button('reset');
                            } else {
                                this._addFeatureToLayer(this.config);
                            }
                        }));
                    }

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
            // make graphics layer
            this._gl = new GraphicsLayer();
            this.map.addLayer(this._gl);
            // add border radius to map
            domClass.add(this.map.root, 'panel');
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
            // show info window on graphic click
            on(this.editToolbar, "graphic-click", lang.hitch(this, function (evt) {
                var graphic = evt.graphic;
                this.map.infoWindow.setFeatures([graphic]);
                this.map.infoWindow.show(graphic.geometry);
            }));
            on(this.map, 'click', lang.hitch(this, function (evt) {
                if (!evt.graphic) {
                    this._clearSubmissionGraphic();
                    this.addressGeometry = evt.mapPoint;
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
                this._resizeMap(true);
                this._resizeInfoWin();
                this._centerPopup();
            }));

            this._resizeMap();
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
            var symbolUrl, pictureMarkerSymbol, graphic, it;
            array.some(this.pins, lang.hitch(this, function (currentPin) {
                if (this.config.pushpinColor == currentPin.id) {
                    symbolUrl = currentPin.url;
                    // create symbol and offset 10 to the left and 17 to the bottom so it points correctly
                    pictureMarkerSymbol = new PictureMarkerSymbol(symbolUrl, currentPin.width, currentPin.height).setOffset(currentPin.offset.x, currentPin.offset.y);
                    it = new InfoTemplate(nls.user.locationPopupTitle, "${text}");
                    graphic = new Graphic(point, pictureMarkerSymbol, {
                        text: nls.user.addressSearchText
                    }, it);
                    this._gl.add(graphic);
                    this.map.infoWindow.setFeatures([graphic]);
                    this.map.infoWindow.show(graphic.geometry);
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
            var appLogoNode = dom.byId('appLogo');
            var appTitleNode = dom.byId('appTitle');
            var appDescNode = dom.byId('appDescription');
            if (appConfigurations.Logo)
                appLogoNode.src = appConfigurations.Logo;
            else
                domClass.add(appLogoNode, "hide");
            if (appConfigurations.Title)
                appTitleNode.innerHTML = appConfigurations.Title;
            else
                domClass.add(appTitleNode, "hide");
            if (appConfigurations.Description)
                appDescNode.innerHTML = appConfigurations.Description;
            else
                domClass.add(appDescNode, "hide");
            if (domClass.contains(appLogoNode, "hide") && domClass.contains(appTitleNode, "hide") && domClass.contains(appDescNode, "hide")) {
                domClass.add(dom.byId('jumbotronNode'), "hide");
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
                fieldname, fieldLabelText, sortedArray, radioButtonCounter = 0,
                checkboxContainer, checkboxContent, checkBoxCounter = 0;
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
                    if (layerField.name == currentField.name && currentField.visible) {
                        if (currentField.typeField) {
                            layerField.subTypes = this.map.getLayer(this.config.form_layer.id).types;
                        }
                        newAddedFields.push(lang.mixin(layerField, currentField));
                        matchingField = true;
                    } else if (layerField.name == currentField.name && currentField.hasOwnProperty("visible") && !currentField.visible) {
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
                    var fName = newElement.name;
                    if (this.config.appid) {
                        if (sortedElement.name == fName) {
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
            var userFormNode = dom.byId('userForm');
            array.forEach(sortedArray, lang.hitch(this, function (currentField, index) {
                var radioContainer, radioContent, inputLabel, radioInput, formContent, requireField, rangeHelpText;
                //code to put asterisk mark for mandatory fields and also to give it a mandatory class.
                formContent = domConstruct.create("div", {}, userFormNode);
                if ((!currentField.nullable || currentField.typeField) && currentField.displayType !== "checkbox") {
                    domClass.add(formContent, "form-group has-feedback geoFormQuestionare mandatory");
                    requireField = domConstruct.create("small", {
                        className: 'requireFieldStyle',
                        innerHTML: nls.user.requiredField
                    }, formContent);
                } else {
                    domClass.add(formContent, "form-group geoFormQuestionare has-feedback");
                }
                if (currentField.alias) {
                    fieldLabelText = currentField.alias;
                } else {
                    fieldLabelText = currentField.name;
                }
                fieldname = currentField.name;
                if (currentField.displayType !== "checkbox") {
                    labelContent = domConstruct.create("label", {
                        "for": fieldname,
                        className: "control-label",
                        innerHTML: fieldLabelText,
                        id: fieldLabelText + "" + index
                    }, formContent);
                }
                if (requireField && labelContent) {
                    domConstruct.place(requireField, labelContent, "last");
                }
                if (this.map.getLayer(this.config.form_layer.id).templates[0]) {
                    for (var fieldAttribute in this.map.getLayer(this.config.form_layer.id).templates[0].prototype.attributes) {
                        if (fieldAttribute.toLowerCase() == fieldname.toLowerCase()) {
                            currentField.defaultValue = this.map.getLayer(this.config.form_layer.id).templates[0].prototype.attributes[fieldAttribute];
                        }
                    }
                }
                //code to make select boxes in case of a coded value
                if (currentField.domain || currentField.typeField) {
                    if ((currentField.domain && currentField.domain.type === 'codedValue') || currentField.typeField) {
                        radioInput = false;
                        if (currentField.displayType && currentField.displayType === "radio") {
                            radioInput = true;
                        }
                        //check for fieldType: if not present create dropdown
                        //If present check for fieldType value and accordingly populate the control
                        if (!radioInput) {
                            inputContent = domConstruct.create("select", {
                                className: "form-control selectDomain",
                                "id": fieldname
                            }, formContent);
                            selectOptions = domConstruct.create("option", {
                                innerHTML: nls.user.domainDefaultText,
                                value: ""
                            }, inputContent);
                            if (currentField.domain && !currentField.typeField) {
                                array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                                    selectOptions = domConstruct.create("option", {
                                        innerHTML: currentOption.name,
                                        value: currentOption.code
                                    }, inputContent);
                                    //if field contain default value, make that option selected
                                    if (currentField.defaultValue === currentOption.code) {
                                        domAttr.set(selectOptions, "selected", true);
                                        domClass.add(inputContent.parentNode, "has-success");
                                    }
                                }));
                            } else {
                                array.forEach(currentField.subTypes, lang.hitch(this, function (currentOption) {
                                    selectOptions = domConstruct.create("option", {}, inputContent);
                                    selectOptions.text = currentOption.name;
                                    selectOptions.value = currentOption.id;
                                    //default values for subtypes(if any) has to be handled here
                                }));
                            }
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
                            if (currentField.domain && !currentField.typeField) {
                                array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                                    //Code to validate for applying has-success class
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
                                    //if field has default value,set radio button checked by default
                                    if (currentOption.code === currentField.defaultValue) {
                                        domAttr.set(inputContent, "checked", "checked");
                                        domClass.add(radioContainer.parentNode, "has-success");
                                    }
                                    // add text after input
                                    inputLabel.innerHTML += currentOption.name;
                                    //code to assign has-success class on click of a radio button
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
                            } else {
                                array.forEach(currentField.subTypes, lang.hitch(this, function (currentOption) {
                                    //Code to validate for applying has-success class
                                    if (index === 1) {
                                        domAttr.set(radioContainer, "id", fieldname + "radioContainer");
                                    }
                                    radioContent = domConstruct.create("div", {
                                        className: "radio"
                                    }, radioContainer);
                                    inputLabel = domConstruct.create("label", {
                                        "for": currentOption.id + fieldname
                                    }, radioContent);
                                    inputContent = domConstruct.create("input", {
                                        "id": currentOption.id + fieldname,
                                        className: "radioInput",
                                        type: "radio",
                                        name: fieldname,
                                        value: currentOption.id
                                    }, inputLabel);
                                    domAttr.set(inputContent, "radioContainerIndex", radioButtonCounter);
                                    //if field has default value,set radio button checked by default
                                    if (currentOption.code === currentField.defaultValue) {
                                        domAttr.set(inputContent, "checked", "checked");
                                        domClass.add(radioContainer.parentNode, "has-success");
                                    }
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
                            }
                            radioButtonCounter++;
                        }
                    } else {
                        //if field type is date
                        if (currentField.type == "esriFieldTypeDate") {
                            inputContent = domConstruct.create("input", {
                                type: "text",
                                id: fieldname,
                                className: "form-control hasDatetimepicker"
                            }, formContent);
                            $(inputContent).datetimepicker({
                                useSeconds: false,
                                maxDate: locale.format(new Date(currentField.domain.maxValue), {
                                    fullYear: true
                                }),
                                minDate: locale.format(new Date(currentField.domain.minValue), {
                                    fullYear: true
                                })
                            }).on("dp.hide", function (evt) {
                                if (evt.currentTarget.value === "") {
                                    domClass.remove(evt.target.parentElement, "has-success");
                                    domClass.remove(evt.target.parentElement, "has-error");
                                }
                            }).on("dp.change", function (evt) {
                                domClass.add(evt.target.parentElement, "has-success");
                                domClass.remove(evt.target.parentElement, "has-error");
                            });
                            if (currentField.defaultValue) {
                                var m = new Date(currentField.defaultValue);
                                var rangeDefaultDate = locale.format(m, {
                                    fullYear: true
                                });
                                $(inputContent).data("DateTimePicker").setDate(rangeDefaultDate);
                                domClass.add(inputContent.parentNode, "has-success");
                            }
                            rangeHelpText = string.substitute(nls.user.dateRangeHintMessage, {
                                minValue: locale.format(new Date(currentField.domain.minValue)),
                                maxValue: locale.format(new Date(currentField.domain.maxValue)),
                                openStrong: "<strong>",
                                closeStrong: "</strong>"
                            });

                        } else {
                            //if field type is integer
                            rangeHelpText = this._setRangeForm(currentField, formContent, fieldname);
                        }
                    }
                } else {
                    //Condition to check if a checkbox is required for integer fields in user form
                    if (currentField.displayType && currentField.displayType === "checkbox") {
                        currentField.type = "binaryInteger";
                    }
                    switch (currentField.type) {
                    case "esriFieldTypeString":
                        if (currentField.displayType && currentField.displayType === "textarea") {
                            inputContent = domConstruct.create("textarea", {
                                className: "form-control",
                                "data-input-type": "String",
                                "rows": 5,
                                "maxLength": currentField.length,
                                "id": fieldname
                            }, formContent);
                        } else {
                            inputContent = domConstruct.create("input", {
                                type: "text",
                                className: "form-control",
                                "data-input-type": "String",
                                "maxLength": currentField.length,
                                "id": fieldname
                            }, formContent);
                        }
                        break;
                    case "binaryInteger":
                        checkboxContainer = domConstruct.create("div", {
                            className: "checkboxContainer"
                        }, formContent);

                        checkboxContent = domConstruct.create("div", {
                            className: "checkbox"
                        }, checkboxContainer);
                        inputLabel = domConstruct.create("label", {
                            "for": fieldname
                        }, checkboxContent);
                        inputContent = domConstruct.create("input", {
                            className: "checkboxInput",
                            type: "checkbox",
                            "data-input-type": "binaryInteger",
                            "id": fieldname
                        }, inputLabel);
                        domAttr.set(inputContent, "checkboxContainerIndex", checkBoxCounter);
                        inputLabel.innerHTML += fieldLabelText;
                        checkBoxCounter++;
                        break;

                    case "esriFieldTypeSmallInteger":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "SmallInteger",
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
                        }).on('dp.change, dp.show', function (evt) {
                            domClass.remove(evt.target.parentElement, "has-error");
                            domClass.add(evt.target.parentElement, "has-success");
                        }).on('dp.error', function (evt) {
                            evt.target.value = '';
                            $(this).data("DateTimePicker").hide();
                            domClass.remove(evt.target.parentElement, "has-success");
                            domClass.add(evt.target.parentElement, "has-error");
                        }).on("dp.hide", function (evt) {
                            if (evt.currentTarget.value === "") {
                                domClass.remove(evt.target.parentElement, "has-success");
                                domClass.remove(evt.target.parentElement, "has-error");
                            }
                        });
                        break;
                    }
                    //Add Placeholder if present
                    if (currentField.tooltip) {
                        domAttr.set(inputContent, "placeholder", currentField.tooltip);
                    }
                    //If present fetch default values
                    if (currentField.defaultValue) {
                        domAttr.set(inputContent, "value", currentField.defaultValue);
                        domClass.add(formContent, "has-success");
                    }
                    //Add specific display type if present
                    if (currentField.displayType && currentField.displayType !== "") {
                        domAttr.set(inputContent, "displayType", currentField.displayType);
                    }
                    on(inputContent, "keyup", lang.hitch(this, function (evt) {
                        this._validateField(evt, true);
                    }));
                }
                if (!currentField.nullable) {
                    inputContent.setAttribute("aria-required", true);
                    inputContent.setAttribute("required", "");
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
                if (helpHTML || rangeHelpText) {
                    if (!rangeHelpText) {
                        rangeHelpText = "";
                    }
                    helpBlock = domConstruct.create("p", {
                        className: "help-block",
                        innerHTML: lang.trim(helpHTML + rangeHelpText)
                    }, formContent);
                }

            }));
            if (this.map.getLayer(this.config.form_layer.id).hasAttachments) {
                formContent = domConstruct.create("div", {
                    className: "form-group"
                }, userFormNode);

                labelContent = domConstruct.create("label", {
                    innerHTML: this.config.attachmentLabel || nls.user.attachment,
                    "for": "geoFormAttachment"
                }, formContent);

                fileInput = domConstruct.create("input", {
                    "type": "file",
                    "id": "geoFormAttachment",
                    "accept": "image/*",
                    "capture": "camera",
                    "name": "attachment"
                }, formContent);
                if (this.config.attachmentHelpText) {
                    helpBlock = domConstruct.create("p", {
                        className: "help-block",
                        innerHTML: this.config.attachmentHelpText
                    }, formContent);
                }
            }
        },

        _setRangeForm: function (currentField, formContent, fieldname) {
            var inputContent = domConstruct.create("input", {
                id: fieldname,
                type: "text",
                className: "form-control",
                min: currentField.domain.minValue.toString(),
                max: currentField.domain.maxValue.toString()
            }, formContent);
            domAttr.set(inputContent, "data-input-type", currentField.type.replace("esriFieldType", ""));
            if (currentField.defaultValue) {
                domAttr.set(inputContent, "value", currentField.defaultValue);
                domClass.add(inputContent.parentNode, "has-success");
            }
            on(inputContent, "keyup", lang.hitch(this, function (evt) {
                if (Number(evt.currentTarget.value) >= Number(evt.currentTarget.min) && Number(evt.currentTarget.value) <= Number(evt.currentTarget.max)) {
                    domClass.remove(evt.currentTarget.parentNode, "has-error");
                    domClass.add(evt.currentTarget.parentNode, "has-success");
                } else {
                    domClass.remove(evt.currentTarget.parentNode, "has-success");
                    domClass.add(evt.currentTarget.parentNode, "has-error");
                }
                if (evt.currentTarget.value === "") {
                    domClass.remove(evt.currentTarget.parentNode, "has-error");
                    domClass.remove(evt.currentTarget.parentNode, "has-success");
                }
            }));
            if (!currentField.nullable) {
                inputContent.setAttribute("aria-required", true);
                inputContent.setAttribute("required", "");
            }
            var rangeHelpText = string.substitute(nls.user.textRangeHintMessage, {
                minValue: currentField.domain.minValue.toString(),
                maxValue: currentField.domain.maxValue.toString(),
                openStrong: "<strong>",
                closeStrong: "</strong>"
            });
            return rangeHelpText;
        },

        _validateField: function (currentNode, iskeyPress) {
            var inputType, inputValue, displayType = null,
                node, typeCastedInputValue, decimal = /^[-+]?[0-9]+$/,
                float = /^[-+]?[0-9]+\.[0-9]+$/,
                email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                url = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\.]{0,1}/;
            if (iskeyPress) {
                inputValue = currentNode.currentTarget.value;
                inputType = domAttr.get(currentNode.currentTarget, "data-input-type");
                if (domAttr.get(currentNode.currentTarget, "displayType") !== null) {
                    displayType = domAttr.get(currentNode.currentTarget, "displayType");
                }
                if ($(currentNode.target)) {
                    node = $(currentNode.target.parentNode)[0];
                } else {
                    node = $(currentNode.srcElement.parentNode)[0];
                }
            } else {
                inputValue = query(".form-control", currentNode)[0].value;
                inputType = domAttr.get(query(".form-control", currentNode)[0], "data-input-type");
                if (domAttr.get(query(".form-control", currentNode)[0], "displayType") !== null) {
                    displayType = domAttr.get(query(".form-control", currentNode)[0], "displayType");
                }
                node = query(".form-control", currentNode)[0].parentElement;
            }
            switch (inputType) {
            case "String":
                if (inputValue.length !== 0 && ((displayType === "email" && inputValue.match(email)) || (displayType === "url" && inputValue.match(url)) || displayType === null) || displayType === "text" || displayType === "textarea") {
                    this._validateUserInput(true, node, inputValue, iskeyPress);
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
                }
                break;
            case "SmallInteger":
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
            array.forEach(query(".checkboxInput:checked"), function (currentField) {
                domAttr.set(currentField, "checked", false);
                domClass.remove(query(".checkboxContainer")[domAttr.get(currentField, "checkboxContainerIndex")].parentNode, "has-success");
            });
            var attachNode = dom.byId("geoFormAttachment");
            if (attachNode && attachNode.value) {
                attachNode.value = "";
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
            mapDiv.innerHTML = '<div id="fullscreen"></div>';
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
                this._resizeMap();
                // fullscreen button
                var fs = new FullScreenMap({
                    map: this.map
                }, dom.byId("fullscreen"));
                fs.startup();
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
                on(dom.byId('lat_coord'), "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                }));
                on(dom.byId('lng_coord'), "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                }));
                on(dom.byId('cordsSubmit'), "click", lang.hitch(this, function (evt) {
                    this._evaluateCoordinates(evt);
                }));
                // USNG
                on(dom.byId('usng_submit'), "click", lang.hitch(this, function () {
                    this._convertUSNG();
                }));
                on(dom.byId('usng_coord'), "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUSNG();
                    }
                }));
                // MGRS
                on(dom.byId('mgrs_submit'), "click", lang.hitch(this, function () {
                    this._convertMGRS();
                }));
                on(dom.byId('mgrs_coord'), "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertMGRS();
                    }
                }));
                // UTM
                on(dom.byId('utm_submit'), "click", lang.hitch(this, function () {
                    this._convertUTM();
                }));
                on(dom.byId('utm_northing'), "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUTM();
                    }
                }));
                on(dom.byId('utm_easting'), "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUTM();
                    }
                }));
                on(dom.byId('utm_zone_number'), "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUTM();
                    }
                }));
                // set location options
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
        _convertUTM: function () {
            this._clearSubmissionGraphic();
            var northing = parseFloat(dom.byId('utm_northing').value);
            var easting = parseFloat(dom.byId('utm_easting').value);
            var zone = parseInt(dom.byId('utm_zone_number').value, 10);
            var converted;
            var fn = coordinator('utm', 'latlong');
            try {
                converted = fn(northing, easting, zone);
            } catch (e) {
                this._coordinatesError('utm');
            }
            if (converted) {
                this._locatePointOnMap(converted.latitude, converted.longitude, 'utm');
            }
        },
        _convertUSNG: function () {
            this._clearSubmissionGraphic();
            var value = dom.byId('usng_coord').value;
            var fn = coordinator('usng', 'latlong');
            var converted;
            try {
                converted = fn(value);
            } catch (e) {
                this._coordinatesError('usng');
            }
            if (converted) {
                this._locatePointOnMap(converted.latitude, converted.longitude, 'usng');
            }
        },
        _convertMGRS: function () {
            this._clearSubmissionGraphic();
            var value = dom.byId('mgrs_coord').value;
            var fn = coordinator('mgrs', 'latlong');
            var converted;
            try {
                converted = fn(value);
            } catch (e) {
                this._coordinatesError('mgrs');
            }
            if (converted) {
                this._locatePointOnMap(converted.latitude, converted.longitude, 'mgrs');
            }
        },
        _evaluateCoordinates: function () {
            var latNode = dom.byId('lat_coord');
            var lngNode = dom.byId('lng_coord');
            this._clearSubmissionGraphic();
            if (latNode.value === "") {
                this._showErrorMessageDiv(string.substitute(nls.user.emptylatitudeAlertMessage, {
                    openLink: '<a href="#lat_coord\">',
                    closeLink: '</a>'
                }));
                return;
            } else if (lngNode.value === "") {
                this._showErrorMessageDiv(string.substitute(nls.user.emptylongitudeAlertMessage, {
                    openLink: '<a href="#lng_coord\">',
                    closeLink: '</a>'
                }));
                return;
            }
            this._locatePointOnMap(latNode.value, lngNode.value, 'latlon');
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
                var errorMessageNode = dom.byId('errorMessageDiv');
                domConstruct.empty(errorMessageNode);
                if (evt.error) {
                    alert(nls.user.locationNotFound);
                } else {
                    var pt = webMercatorUtils.geographicToWebMercator(evt.graphic.geometry);
                    evt.graphic.setGeometry(pt);
                    this.addressGeometry = pt;
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
            var errorMessageNode = dom.byId('errorMessageDiv');
            domConstruct.empty(errorMessageNode);
            this._clearSubmissionGraphic();
            var value = dom.byId('searchInput').value;
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
        _geocoderMenuItems: function () {
            var html = '';
            for (var i = 0; i < this.geocodeAddress._geocoders.length; i++) {
                var gc = this.geocodeAddress._geocoders[i];
                var active = '';
                if (i === this.geocodeAddress.activeGeocoderIndex) {
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
            if (this.geocodeAddress._geocoders && this.geocodeAddress._geocoders.length > 1) {
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

            var searchInputNode = dom.byId('searchInput');

            domAttr.set(searchInputNode, 'placeholder', this.geocodeAddress.activeGeocoder.placeholder);

            on(searchInputNode, 'keyup', lang.hitch(this, function (evt) {
                var keyCode = evt.charCode || evt.keyCode;
                if (keyCode === 13) {
                    this._searchGeocoder();
                }
            }));

            on(dom.byId('searchSubmit'), 'click', lang.hitch(this, function () {
                this._searchGeocoder();
            }));

            on(this.geocodeAddress, "select", lang.hitch(this, function (evt) {
                this.addressGeometry = evt.result.feature.geometry;
                this._setSymbol(evt.result.feature.geometry);
                this.map.centerAt(evt.result.feature.geometry).then(lang.hitch(this, function () {
                    this._resizeMap();
                }));
            }));

            on(this.geocodeAddress, "geocoder-select", lang.hitch(this, function () {
                domAttr.set(searchInputNode, 'placeholder', this.geocodeAddress.activeGeocoder.placeholder);
                this._geocoderMenuItems();
            }));
            var gcMenu = dom.byId('geocoder_menu');
            if (gcMenu) {
                on(gcMenu, 'a:click', lang.hitch(this, function (evt) {
                    var idx = parseInt(domAttr.get(evt.target, 'data-index'), 10);
                    this.geocodeAddress.set('activeGeocoderIndex', idx);
                    evt.preventDefault();
                }));
            }
        },

        _addFeatureToLayer: function (config) {
            var userFormNode = dom.byId('userForm');
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
                array.forEach(query(".geoFormQuestionare .checkboxContainer"), function (currentField) {
                    key = query(".checkboxInput", currentField)[0].id;
                    value = query(".checkboxInput:checked", currentField).length;
                    featureData.attributes[key] = value;
                });
                featureData.geometry = {};
                featureData.geometry = new Point(Number(this.addressGeometry.x), Number(this.addressGeometry.y), this.map.spatialReference);
                //code for apply-edits
                this.map.getLayer(config.form_layer.id).applyEdits([featureData], null, null, lang.hitch(this, function (addResults) {
                    this._clearSubmissionGraphic();
                    this._clearFormFields();
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
                    this.map.getLayer(config.form_layer.id).refresh();
                    this._resetButton();
                    if (userFormNode[userFormNode.length - 1].value !== "" && this.map.getLayer(config.form_layer.id).hasAttachments) {
                        this.map.getLayer(config.form_layer.id).addAttachment(addResults[0].objectId, userFormNode, function () {}, function () {
                            console.log(nls.user.addAttachmentFailedMessage);
                        });
                    }
                    window.location.href = '#top';
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
                    closeLink: '</a>'
                }) + '</p>';
                this._showErrorMessageDiv(errorMessage);
            }
        },
        _clearSubmissionGraphic: function () {
            this.addressGeometry = null;
            this._gl.clear();
            if (this.map.infoWindow.isShowing) {
                this.map.infoWindow.hide();
            }
        },

        _coordinatesError: function (type) {
            switch (type) {
            case "utm":
                this._showErrorMessageDiv(string.substitute(nls.user.invalidUTM, {
                    openLink: '<a href="#utm_northing">',
                    closeLink: '</a>'
                }));
                break;
            case "usng":
                this._showErrorMessageDiv(string.substitute(nls.user.invalidUSNG, {
                    openLink: '<a href="#usng_coord">',
                    closeLink: '</a>'
                }));
                break;
            case "mgrs":
                this._showErrorMessageDiv(string.substitute(nls.user.invalidMGRS, {
                    openLink: '<a href="#mgrs_coord">',
                    closeLink: '</a>'
                }));
                break;
            default:
                this._showErrorMessageDiv(string.substitute(nls.user.invalidLatLong, {
                    latLink: '<a href="#lat_coord">',
                    lngLink: '<a href="#lng_coord">',
                    closeLink: '</a>'
                }));
            }
        },

        _locatePointOnMap: function (x, y, type) {
            if (x >= -90 && x <= 90 && y >= -180 && y <= 180) {
                var mapLocation = new Point(y, x);
                var pt = webMercatorUtils.geographicToWebMercator(mapLocation);
                this.addressGeometry = pt;
                this._setSymbol(this.addressGeometry);
                this.map.centerAt(this.addressGeometry).then(lang.hitch(this, function () {
                    this._resizeMap();
                }));
                var errorMessageNode = dom.byId('errorMessageDiv');
                domConstruct.empty(errorMessageNode);
            } else {
                this._coordinatesError(type);
            }
        },

        _openShareModal: function () {
            if (this._ShareModal) {
                this._ShareModal.destroy();
            }
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
            errorMsgContainer = domConstruct.create("div", {}, query(".modal-body")[0]);
            domConstruct.create("div", {
                className: "alert alert-danger errorMessage",
                innerHTML: nls.user.applyEditsFailedMessage
            }, errorMsgContainer);
            $("#myModal").modal('show');
            this._resetButton();
            this._clearFormFields();
        },

        _createShareDlgContent: function () {
            var iconContainer;
            domConstruct.empty(query(".modal-body")[0]);
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.user.shareUserTitleMessage);
            iconContainer = domConstruct.create("div", {
                className: "iconContainer"
            }, query(".modal-body")[0]);
            domConstruct.create("div", {
                className: "alert alert-success",
                role: "alert",
                innerHTML: nls.user.entrySubmitted
            }, iconContainer);
            if (this.config.enableSharing) {
                domConstruct.create("h3", {
                    innerHTML: nls.user.shareThisForm
                }, iconContainer);
                domConstruct.create("p", {
                    innerHTML: nls.user.shareUserTextMessage
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-facebook-square iconClass text-primary",
                    id: "facebookIcon"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-twitter-square iconClass text-primary",
                    id: "twitterIcon"
                }, iconContainer);
                domConstruct.create("a", {
                    className: "fa fa-google-plus-square iconClass text-primary",
                    id: "google-plusIcon"
                }, iconContainer);
            }
            domConstruct.create("a", {
                className: "fa fa-envelope iconClass text-primary",
                id: "mailIcon"
            }, iconContainer);
            domConstruct.create("div", {
                className: "clearfix"
            }, iconContainer);
            domConstruct.create("h3", {
                innerHTML: nls.user.shareModalFormText
            }, iconContainer);
            domConstruct.create("input", {
                type: "text",
                className: "form-control",
                id: "shareMapUrlText"
            }, iconContainer);
        },

        _showErrorMessageDiv: function (errorMessage) {
            var errorMessageNode = dom.byId('errorMessageDiv');
            domConstruct.empty(errorMessageNode);
            window.location.hash = "";
            domConstruct.create("div", {
                className: "alert alert-danger errorMessage",
                id: "errorMessage",
                innerHTML: errorMessage
            }, errorMessageNode);
            window.location.hash = "#errorMessage";
            this._resizeMap();
        },

        _resetButton: function () {
            var btn = $(dom.byId('submitButton'));
            btn.button('reset');
        },

        _setWebmapDefaults: function () {
            if (this.config.details.Title !== false) {
                this.config.details.Title = this.config.itemInfo.item.title;
            }
            if (this.config.details.Description !== false) {
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
                    if (!this.config.fields || (this.config.fields && this.config.fields.length === 0)) {
                        this.config.fields = this.map.getLayer(this.config.form_layer.id).fields;
                    }
                    return true;
                }
            }));
        },

        _resizeMap: function (force) {
            if (this.map) {
                this.map.reposition();
                this.map.resize(force);
            }
        },

        _populateLocationsOptions: function () {
            var count = 0;
            var locationTabs = query(".nav-tabs li");
            var tabContents = query(".tab-pane");
            for (var key in this.config.locationSearchOptions) {
                if (this.config.locationSearchOptions.hasOwnProperty(key)) {
                    if (!this.config.locationSearchOptions[key]) {
                        domStyle.set(locationTabs[count], 'display', 'none');
                    } else {
                        //resize the map to set the correct info-window anchor
                        on(locationTabs[count], 'click', lang.hitch(this, this._resizeMap));
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