/*global $,define,document */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/string",
    "esri/arcgis/utils",
    "esri/config",
    "esri/lang",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dojo/Deferred",
    "dojo/query",
    "dojo/io-query",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "esri/dijit/LocateButton",
    "esri/dijit/Geocoder",
    "dojo/text!views/modal.html",
    "dojo/text!views/user.html",
    "dojo/i18n!application/nls/resources",
    "esri/tasks/ProjectParameters",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "esri/layers/GraphicsLayer",
    "application/ShareModal",
    "application/localStorageHelper",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/toolbars/edit",
    "esri/InfoTemplate",
    "esri/dijit/Popup",
    "application/themes",
    "application/pushpins",
    "vendor/usng",
    "dojo/date/locale",
    "dojo/NodeList-traverse",
    "dojo/domReady!"
], function (
    declare,
    lang,
    string,
    arcgisUtils,
    esriConfig,
    esriLang,
    dom,
    domClass, domStyle,
    on,
    Deferred,
    query,
    ioQuery,
    array,
    domConstruct,
    domAttr,
    LocateButton,
    Geocoder,
    modalTemplate,
    userTemplate,
    nls, ProjectParameters, webMercatorUtils, Point, GraphicsLayer, ShareModal, localStorageHelper, Graphic, PictureMarkerSymbol, editToolbar, InfoTemplate, Popup, theme, pushpins, usng, locale) {
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
        sortedFields: [],
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
        startup: function () {
            var config = arguments[0];
            var isPreview = arguments[2];
            var node = arguments[3];
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
                // modal i18n
                modalTemplate = string.substitute(modalTemplate, nls);
                // place modal code
                domConstruct.place(modalTemplate, document.body, 'last');
                //supply either the webmap id or, if available, the item info
                if (isPreview) {
                    this._initPreview(node);
                } else {
                    this._init();
                }
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }
        },
        _init: function () {
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
        },
        _initPreview: function (node) {
            var cssStyle;
            // if local storage supported
            if (this.localStorageSupport.supportsStorage()) {
                localStorage.setItem("geoform_config", JSON.stringify(this.config));
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
                delete newParams.folderid; //Remove folderid parameter
                url = queryUrl.substring(0, queryUrl.indexOf("?") + 1) + ioQuery.objectToQuery(newParams);
            }
            node.src = url;
            // on iframe load
            node.onload = function () {
                var frame = document.getElementById("iframeContainer").contentWindow.document;
                domConstruct.place(cssStyle, frame.getElementsByTagName('head')[0], "last");
            };
        },
        _submitForm: function () {
            var btn = $('#submitButton');
            btn.button('loading');
            var erroneousFields = [],
                errorMessage;
            array.forEach(query(".geoFormQuestionare"), lang.hitch(this, function (currentField) {
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
            // if fields
            if (erroneousFields.length !== 0) {
                errorMessage = "";
                errorMessage += '<p class="lead"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + nls.user.requiredFields + '</p>';
                errorMessage += "<ol>";
                errorMessage += "<li>" + nls.user.formValidationMessageAlertText + "\n <ul>";
                array.forEach(erroneousFields, function (erroneousField) {
                    var fq = query(".form-control", erroneousField);
                    var html = erroneousField.childNodes[0].innerHTML;
                    if (fq.length !== 0 && fq[0] && fq[0].placeholder) {
                        errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + html + "</a>. " + fq[0].placeholder + "</li>";
                    } else {
                        errorMessage += "<li><a href='#" + erroneousField.childNodes[0].id + "'>" + html + "</a></li>";
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
                this._addFeatureToLayer();
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
        // set symbol for submitting location
        _setSymbol: function (point) {
            if (this.map.infoWindow) {
                var symbolUrl, pictureMarkerSymbol, graphic, it;
                // use appropriate symbol pin image
                array.some(this.pins, lang.hitch(this, function (currentPin) {
                    if (this.config.pushpinColor == currentPin.id) {
                        symbolUrl = currentPin.url;
                        // create symbol and offset 10 to the left and 17 to the bottom so it points correctly
                        pictureMarkerSymbol = new PictureMarkerSymbol(symbolUrl, currentPin.width, currentPin.height).setOffset(currentPin.offset.x, currentPin.offset.y);
                        // text info template
                        it = new InfoTemplate(nls.user.locationPopupTitle, "${text}");
                        // graphic for point
                        graphic = new Graphic(point, pictureMarkerSymbol, {
                            text: nls.user.addressSearchText
                        }, it);
                        // private geoform graphic identifier
                        graphic._geoformGraphic = true;
                        // add to graphics layer
                        this._gl.add(graphic);
                        // get current features
                        var features = this.map.infoWindow.features || [];
                        // remove existing geoform graphic(s)
                        var filtered = array.filter(features, function (item) {
                            return !item._geoformGraphic;
                        });
                        // add feature
                        filtered.splice(0, 0, graphic);
                        // set popup features
                        this.map.infoWindow.setFeatures(filtered);
                        // show popup
                        this.map.infoWindow.show(graphic.geometry);
                        // edit movable
                        this.editToolbar.activate(editToolbar.MOVE, graphic, null);
                        return true;
                    }
                }));
            }
        },
        // create lat lon point
        _calculateLatLong: function (evt) {
            // return string
            var str = '';
            // if spatial ref is web mercator
            if (evt && evt.mapPoint) {
                // get lat/lng
                var lat = evt.mapPoint.getLatitude();
                var lng = evt.mapPoint.getLongitude();
                if (lat && lng) {
                    // create string
                    str = nls.user.latitude + ': ' + lat.toFixed(5) + ', ' + '&nbsp;' + nls.user.longitude + ': ' + lng.toFixed(5);
                }
            }
            return str;
        },
        //function to set the logo-path, application title and details
        _setAppConfigurations: function (appConfigurations) {
            // get all nodes
            var appLogoNode = dom.byId('appLogo');
            var appTitleNode = dom.byId('appTitle');
            var appDescNode = dom.byId('appDescription');
            // set logo
            if (appConfigurations.Logo) {
                appLogoNode.src = appConfigurations.Logo;
            } else {
                domClass.add(appLogoNode, "hide");
            }
            // set title
            if (appConfigurations.Title) {
                appTitleNode.innerHTML = appConfigurations.Title;
            } else {
                domClass.add(appTitleNode, "hide");
            }
            // set description
            if (appConfigurations.Description) {
                $("#appDescription").html(appConfigurations.Description);
            } else {
                domClass.add(appDescNode, "hide");
            }
            // remove jumbotron style option
            if (domClass.contains(appLogoNode, "hide") && domClass.contains(appTitleNode, "hide") && domClass.contains(appDescNode, "hide")) {
                domClass.add(dom.byId('jumbotronNode'), "hide");
            }
        },
        //function to set the theme for application
        _switchStyle: function (themeName) {
            array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
                if (themeName == currentTheme.id) {
                    var themeNode = domConstruct.create("link", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: currentTheme.url
                    });
                    domConstruct.place(themeNode, query("head")[0]);
                    // add identifying theme class to the body
                    domClass.add(document.body, "geoform-" + currentTheme.id);
                }
            }));
        },
        //function to validate and create the form
        _createForm: function (fields) {
            var formContent, labelContent, helpBlock, fileInput, matchingField, newAddedFields = [],
                userFormNode;
            if (!this._formLayer) {
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
            array.forEach(this._formLayer.fields, lang.hitch(this, function (layerField) {
                matchingField = false;
                array.forEach(fields, lang.hitch(this, function (currentField) {
                    if (layerField.name == currentField.name && currentField.visible) {
                        if (layerField.name === this._formLayer.typeIdField) {
                            layerField.subTypes = this._formLayer.types;
                            layerField.typeField = true;
                        } else {
                            layerField.typeField = false;
                        }
                        newAddedFields.push(lang.mixin(layerField, currentField));
                        matchingField = true;
                    } else if (layerField.name == currentField.name && currentField.hasOwnProperty("visible") && !currentField.visible) {
                        matchingField = true;
                    }
                }));
                if (!matchingField) {
                    if ((layerField.editable && !(layerField.type === "esriFieldTypeOID" || layerField.type === "esriFieldTypeGeometry" || layerField.type === "esriFieldTypeBlob" || layerField.type === "esriFieldTypeRaster" || layerField.type === "esriFieldTypeGUID" || layerField.type === "esriFieldTypeGlobalID" || layerField.type === "esriFieldTypeXML"))) {
                        if (layerField.name === this._formLayer.typeIdField) {
                            layerField.subTypes = this._formLayer.types;
                            layerField.typeField = true;
                        } else {
                            layerField.typeField = false;
                        }
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
                            this.sortedFields.push(newElement);
                            return true;
                        }
                    } else {
                        if (sortedElement.name == fName) {
                            this.sortedFields.push(newElement);
                            return true;
                        }
                    }
                }));
            }));
            array.forEach(this.sortedFields, lang.hitch(this, function (currentField, index) {
                //code to set true/false value to property 'isTypeDependent' of the field.
                currentField.isTypeDependent = false;
                array.forEach(this._formLayer.types, function (currentType) {
                    var hasDomainValue = null,
                        hasDefaultValue = null;
                    hasDomainValue = currentType.domains[currentField.name];
                    hasDefaultValue = currentType.templates[0].prototype.attributes[currentField.name];
                    //if hasDefaultValue is 0 then we need to set isTypeDependent property to true
                    if (hasDefaultValue === 0) {
                        hasDefaultValue = true;
                    }
                    if ((hasDomainValue && hasDomainValue.type !== "inherited") || (hasDefaultValue && !currentField.typeField)) {
                        currentField.isTypeDependent = true;
                    }
                });
                if (currentField.isTypeDependent) {
                    return true;
                }
                //function to create form elements(referenceNode is passed null)
                this._createFormElements(currentField, index, null);
            }));
            // if form has attachments
            if (this._formLayer.hasAttachments) {
                userFormNode = dom.byId('userForm');
                formContent = domConstruct.create("div", {
                    className: "form-group"
                }, userFormNode);
                // attachment label html
                var labelHTML = "";
                labelHTML += "<span class=\"glyphicon glyphicon-paperclip\"></span> ";
                labelHTML += (this.config.attachmentLabel || nls.user.attachment);
                // attachment label
                labelContent = domConstruct.create("label", {
                    innerHTML: labelHTML,
                    "for": "geoFormAttachment"
                }, formContent);
                fileInput = domConstruct.create("input", {
                    "type": "file",
                    "id": "geoFormAttachment",
                    "accept": "image/*",
                    //"capture": "camera",
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
        //function to create elements of form.
        _createFormElements: function (currentField, index, referenceNode) {
            var radioContainer, fieldname, radioContent, inputContent, labelContent, fieldLabelText, selectOptions, inputLabel, radioInput, formContent, requireField, userFormNode,
                checkboxContainer, checkboxContent, checkBoxCounter = 0,
                helpBlock, rangeHelpText, inputGroupContainer;
            userFormNode = dom.byId('userForm');
            //code to put asterisk mark for mandatory fields and also to give it a mandatory class.
            formContent = domConstruct.create("div", {}, userFormNode);
            if (referenceNode) {
                domConstruct.place(formContent, referenceNode, "after");
                domClass.add(formContent, "fade");
                setTimeout(function () {
                    domClass.add(formContent, "in");
                }, 100);
            }
            if ((!currentField.nullable || currentField.typeField) && currentField.displayType !== "checkbox") {
                domClass.add(formContent, "form-group geoFormQuestionare mandatory");
                requireField = domConstruct.create("small", {
                    className: 'requireFieldStyle',
                    innerHTML: nls.user.requiredField
                }, formContent);
            } else {
                domClass.add(formContent, "form-group geoFormQuestionare");
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
                    id: fieldname + "" + index
                }, formContent);
            }
            if (requireField && labelContent) {
                domConstruct.place(requireField, labelContent, "last");
            }
            if (this._formLayer.templates[0] && !currentField.defaultValue) {
                for (var fieldAttribute in this._formLayer.templates[0].prototype.attributes) {
                    if (fieldAttribute.toLowerCase() == fieldname.toLowerCase()) {
                        currentField.defaultValue = this._formLayer.templates[0].prototype.attributes[fieldAttribute];
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
                            //function call to take appropriate actions on selection of a subtypes
                            if (currentField.typeField) {
                                this._validateTypeFields(evt.currentTarget, currentField);
                            }
                            //To apply has-success class on selection of a valid option
                            if (evt.target.value !== "") {
                                domClass.add($(evt.target.parentNode)[0], "has-success");
                            } else {
                                domClass.remove($(evt.target.parentNode)[0], "has-success");
                            }
                        }));
                    } else {
                        radioContainer = domConstruct.create("div", {
                            className: "radioContainer",
                            id: fieldname
                        }, formContent);
                        if (currentField.domain && !currentField.typeField) {
                            array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                                radioContent = domConstruct.create("div", {
                                    className: "radio"
                                }, radioContainer);
                                inputLabel = domConstruct.create("label", {
                                    "for": fieldname + currentOption.code
                                }, radioContent);
                                inputContent = domConstruct.create("input", {
                                    "id": fieldname + currentOption.code,
                                    className: "radioInput",
                                    type: "radio",
                                    name: fieldname,
                                    value: currentOption.code
                                }, inputLabel);
                                //if field has default value,set radio button checked by default
                                if (currentOption.code === currentField.defaultValue) {
                                    domAttr.set(inputContent, "checked", "checked");
                                    domClass.add(radioContainer.parentNode, "has-success");
                                }
                                // add text after input
                                inputLabel.innerHTML += currentOption.name;
                                //code to assign has-success class on click of a radio button
                                on(dom.byId(fieldname + currentOption.code), "click", function (evt) {
                                    if (evt.target.checked) {
                                        domClass.add(formContent, "has-success");
                                    } else {
                                        domClass.remove(formContent, "has-success");
                                    }
                                });
                            }));
                        } else {
                            array.forEach(currentField.subTypes, lang.hitch(this, function (currentOption) {
                                //Code to validate for applying has-success class
                                radioContent = domConstruct.create("div", {
                                    className: "radio"
                                }, radioContainer);
                                inputLabel = domConstruct.create("label", {
                                    "for": fieldname + currentOption.id
                                }, radioContent);
                                inputContent = domConstruct.create("input", {
                                    "id": fieldname + currentOption.id,
                                    className: "radioInput",
                                    type: "radio",
                                    name: fieldname,
                                    value: currentOption.id
                                }, inputLabel);
                                //if field has default value,set radio button checked by default
                                if (currentOption.id === currentField.defaultValue) {
                                    domAttr.set(inputContent, "checked", "checked");
                                    domClass.add(radioContainer.parentNode, "has-success");
                                }
                                // add text after input
                                inputLabel.innerHTML += currentOption.name;
                                on(dom.byId(fieldname + currentOption.id), "click", lang.hitch(this, function (evt) {
                                    //function call to take appropriate actions on selection of a subtypes
                                    if (currentField.typeField) {
                                        this._validateTypeFields(evt.currentTarget, currentField);
                                    }
                                    if (evt.target.checked) {
                                        domClass.add(formContent, "has-success");
                                    } else {
                                        domClass.remove(formContent, "has-success");
                                    }
                                }));
                            }));
                        }
                    }
                } else {
                    //if field type is date
                    if (currentField.type == "esriFieldTypeDate") {
                        var inputRangeDateGroupContainer = this._addNotationIcon(formContent, "glyphicon-calendar");
                        inputContent = this._createDateField(inputRangeDateGroupContainer, true, fieldname, currentField);
                        if (currentField.defaultValue) {
                            var m = new Date(currentField.defaultValue);
                            var rangeDefaultDate = locale.format(m, {
                                fullYear: true
                            });
                            $(inputRangeDateGroupContainer).data("DateTimePicker").setDate(rangeDefaultDate);
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
                            "rows": 4,
                            "maxLength": currentField.length,
                            "id": fieldname
                        }, formContent);
                    } else {
                        if (currentField.displayType && currentField.displayType === "email") {
                            inputGroupContainer = this._addNotationIcon(formContent, "glyphicon-envelope");
                        } else if (currentField.displayType && currentField.displayType === "url") {
                            inputGroupContainer = this._addNotationIcon(formContent, "glyphicon-link");
                        }
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "data-input-type": "String",
                            "maxLength": currentField.length,
                            "id": fieldname
                        }, inputGroupContainer ? inputGroupContainer : formContent);
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
                    domAttr.set(inputContent, "data-checkbox-index", checkBoxCounter);
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
                    var inputDateGroupContainer = this._addNotationIcon(formContent, "glyphicon-calendar");
                    inputContent = this._createDateField(inputDateGroupContainer, false, fieldname);
                    break;
                }
                //Add Placeholder if present
                if (currentField.tooltip) {
                    domAttr.set(inputContent, "placeholder", currentField.tooltip);
                }
                //If present fetch default values
                if (currentField.defaultValue) {
                    if (currentField.type == "esriFieldTypeDate") {
                        var defaultDate = locale.format(new Date(currentField.defaultValue), {
                            fullYear: true
                        });
                        $(inputDateGroupContainer).data("DateTimePicker").setDate(defaultDate);
                    } else {
                        domAttr.set(inputContent, "value", currentField.defaultValue);
                        domClass.add(formContent, "has-success");
                    }
                }
                //Add specific display type if present
                if (currentField.displayType && currentField.displayType !== "") {
                    domAttr.set(inputContent, "data-display-type", currentField.displayType);
                }
                if (currentField.type !== "esriFieldTypeDate") {
                    on(inputContent, "keyup", lang.hitch(this, function (evt) {
                        this._validateField(evt, true);
                    }));
                }
            }
            // if field is required and field exists
            if (!currentField.nullable && inputContent) {
                inputContent.setAttribute("aria-required", true);
                inputContent.setAttribute("required", "");
            }
            var helpHTML;
            if (currentField.isNewField) {
                // make sure popup info and fields are defined
                if (this._formLayer && this._formLayer.popupInfo && this._formLayer.popupInfo.fieldInfos) {
                    array.forEach(this._formLayer.popupInfo.fieldInfos, function (currentFieldPopupInfo) {
                        if (currentFieldPopupInfo.fieldName == currentField.name) {
                            if (currentFieldPopupInfo.tooltip) {
                                helpHTML = currentFieldPopupInfo.tooltip;
                            }
                        }
                    });
                }
            } else {
                helpHTML = currentField.fieldDescription;
            }
            if (helpHTML || rangeHelpText) {
                if (!rangeHelpText) {
                    rangeHelpText = "";
                }
                helpBlock = domConstruct.create("p", {
                    className: "help-block",
                    innerHTML: lang.trim(helpHTML + " " + rangeHelpText)
                }, formContent);
            }
        },
        // date range field
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
        //function to validate the fields defined within subtypes
        _validateTypeFields: function (currentTarget, currentField) {
            var selectedType, defaultValue, switchDomainType, referenceNode;
            if (currentTarget.value === "") {
                //no type is selected, so the code to remove the type dependent fields will come here
                array.forEach(this.sortedFields, lang.hitch(this, function (currentInput) {
                    if (!currentInput.isTypeDependent) {
                        return true;
                    }
                    this._resetSubTypeFields(currentInput);
                    this._resizeMap();
                }));
                return true;
            } else {
                //code to get all the domains and default values of the selected subtype
                array.some(currentField.subTypes, function (currentSelection) {
                    if (currentTarget.value === currentSelection.id.toString()) {
                        selectedType = currentSelection;
                        return true;
                    }
                });
            }
            //initial point of reference to put elements
            referenceNode = dom.byId(this._formLayer.typeIdField).parentNode;
            //code to populate type dependent fields
            array.forEach(this.sortedFields, lang.hitch(this, function (currentInput, index) {
                var field = null,
                    domain, minValue, maxValue;
                //condition to filter out fields independent of subtypes
                if (!currentInput.isTypeDependent) {
                    return true;
                }
                array.some(this._formLayer.fields, function (layerField) {
                    if (layerField.name === currentInput.name) {
                        field = lang.clone(lang.mixin(layerField, currentInput));
                        return true;
                    }
                });
                //code to fetch the default value of a field for selected subtype.
                if (selectedType.templates[0]) {
                    for (var fieldAttribute in selectedType.templates[0].prototype.attributes) {
                        if (fieldAttribute.toLowerCase() === field.name.toLowerCase()) {
                            defaultValue = selectedType.templates[0].prototype.attributes[fieldAttribute];
                            field.defaultValue = defaultValue;
                            break;
                        }
                    }
                }
                for (var i in selectedType.domains) {
                    //condition to find the domain properties for current field
                    if (i === field.name) {
                        switchDomainType = selectedType.domains[i].type;
                        switch (switchDomainType) {
                        case "inherited":
                            //for inherited domains we need to populate the domains from the layer.
                            if (field.domain.type === "range") {
                                minValue = field.domain.minValue;
                                maxValue = field.domain.maxValue;
                            } else {
                                domain = field.domain.codedValues;
                            }
                            break;
                        case "codedValue":
                            if (!field.domain) {
                                field.domain = {};
                            }
                            field.domain.codedValues = selectedType.domains[i].codedValues;
                            domain = selectedType.domains[i].codedValues;
                            break;
                        case "range":
                            //Condition to change the range domain values of field already having domain.
                            if (!field.domain) {
                                field.domain = {};
                            }
                            field.domain.minValue = selectedType.domains[i].minValue;
                            field.domain.maxValue = selectedType.domains[i].maxValue;
                            minValue = selectedType.domains[i].minValue;
                            maxValue = selectedType.domains[i].maxValue;
                            break;
                        }
                    }
                }
                //code to be executed when the input is already present
                if (dom.byId(field.name)) {
                    this._resetSubTypeFields(field);
                }
                this._createFormElements(field, index, referenceNode);
                if (field.type == "esriFieldTypeDate" || field.displayType == "url" || field.displayType == "email") {
                    referenceNode = dom.byId(field.name).parentNode.parentNode;
                } else {
                    referenceNode = dom.byId(field.name).parentNode;
                }
            }));
            this._resizeMap();
        },
        // validate form field
        _validateField: function (currentNode, iskeyPress) {
            var inputType, inputValue, displayType = null,
                node, typeCastedInputValue, decimal = /^[-+]?[0-9]+$/,
                float = /^[-+]?[0-9]+\.[0-9]+$/,
                email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                url = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,5}[\.]{0,1}/;
            if (iskeyPress) {
                inputValue = currentNode.currentTarget.value;
                inputType = domAttr.get(currentNode.currentTarget, "data-input-type");
                if (domAttr.get(currentNode.currentTarget, "data-display-type") !== null) {
                    displayType = domAttr.get(currentNode.currentTarget, "data-display-type");
                }
                //Since we are adding a new div inside formContent in case of email and url
                //We need to traverse one step more
                if (displayType === "email" || displayType === "url") {
                    node = $(currentNode.target.parentNode.parentNode)[0];
                } else {
                    if ($(currentNode.target)) {
                        node = $(currentNode.target.parentNode)[0];
                    } else {
                        node = $(currentNode.srcElement.parentNode)[0];
                    }
                }
            } else {
                inputValue = query(".form-control", currentNode)[0].value;
                inputType = domAttr.get(query(".form-control", currentNode)[0], "data-input-type");
                if (domAttr.get(query(".form-control", currentNode)[0], "data-display-type") !== null) {
                    displayType = domAttr.get(query(".form-control", currentNode)[0], "data-display-type");
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
                if ((inputValue.match(decimal) && typeCastedInputValue >= -32768 && typeCastedInputValue <= 32767) && inputValue.length !== 0) {
                    this._validateUserInput(true, node, inputValue);
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
                }
                break;
            case "Integer":
                typeCastedInputValue = parseInt(inputValue);
                if ((inputValue.match(decimal) && typeCastedInputValue >= -2147483648 && typeCastedInputValue <= 2147483647) && inputValue.length !== 0) {
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
                if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue >= -3.4 * Math.pow(10, 38) && typeCastedInputValue <= 1.2 * Math.pow(10, 38)) && inputValue.length !== 0) {
                    this._validateUserInput(true, node, inputValue, iskeyPress);
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
                }
                break;
            case "Double":
                typeCastedInputValue = parseFloat(inputValue);
                if (((inputValue.match(decimal) || inputValue.match(float)) && typeCastedInputValue >= -2.2 * Math.pow(10, 308) && typeCastedInputValue <= 1.8 * Math.pow(10, 38)) && inputValue.length !== 0) {
                    this._validateUserInput(true, node, inputValue, iskeyPress);
                } else {
                    this._validateUserInput(false, node, inputValue, iskeyPress);
                }
                break;
            }
        },
        // reset form fields
        _clearFormFields: function () {
            // each form field
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
            array.forEach(query(".geoFormQuestionare .input-group"), function (currentInput) {
                domClass.remove(currentInput.parentElement, "has-error");
                domClass.remove(currentInput.parentElement, "has-success");
            });
            // each radio
            array.forEach(query(".geoFormQuestionare .radioContainer"), function (currentField) {
                domClass.remove(currentField.parentNode, "has-success");
                array.forEach(query("input", currentField), function () {
                    var index = arguments[1];
                    domAttr.set(query("input", currentField)[index], "checked", false);
                });
            });
            // each checkbox
            array.forEach(query(".checkboxInput:checked"), function (currentField) {
                domAttr.set(currentField, "checked", false);
                domClass.remove(query(".checkboxContainer")[domAttr.get(currentField, "data-checkbox-index")].parentNode, "has-success");
            });
            // clear attachment
            var attachNode = dom.byId("geoFormAttachment");
            if (attachNode && attachNode.value) {
                $(attachNode).replaceWith($(attachNode).clone(true));
            }
        },
        // validate form input
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
            var popup = new Popup({
                highlight: false
            }, domConstruct.create("div"));
            domClass.add(popup.domNode, 'light');
            var mapDiv = dom.byId('mapDiv');
            // fullscreen button HTML
            var fsHTML = '';
            fsHTML += '<div class="fullscreen-button" id="fullscreen_button">';
            fsHTML += '<div class="btn btn-default">';
            fsHTML += '<span id="fullscreen_icon" class="glyphicon glyphicon-fullscreen"></span>';
            fsHTML += '</div>';
            fsHTML += '</div>';
            mapDiv.innerHTML = fsHTML;
            arcgisUtils.createMap(itemInfo, mapDiv, {
                mapOptions: {
                    editable: true,
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
                // webmap defaults
                this._setWebmapDefaults();
                // default layer
                this._setLayerDefaults();
                // set configuration
                this._setAppConfigurations(this.config.details);
                // window title
                if (this.config.details && this.config.details.Title) {
                    window.document.title = this.config.details.Title;
                }
                // create form fields
                this._createForm(this.config.fields);
                // create locate button
                this._createLocateButton();
                // create geocoder button
                this._createGeocoderButton();
                // make graphics layer
                this._gl = new GraphicsLayer();
                this.map.addLayer(this._gl);
                // add border radius to map
                domClass.add(this.map.root, 'panel');
                // remove loading class from body
                domClass.remove(document.body, "app-loading");
                // editable layer
                if (this._formLayer) {
                    // if indexedDB is supported
                    if (window.indexedDB) {
                        // get offline support
                        require(["application/OfflineSupport"], lang.hitch(this, function (OfflineSupport) {
                            // support basic offline editing
                            this._offlineSupport = new OfflineSupport({
                                map: this.map,
                                image: this.config.sharinghost + '/apps/GeoForm/images/online-check.png',
                                layer: this._formLayer
                            });
                        }));
                    }
                }
                // drag point edit toolbar
                this.editToolbar = new editToolbar(this.map);
                // start moving
                on(this.editToolbar, "graphic-move-start", lang.hitch(this, function () {
                    if (this.map.infoWindow) {
                        this.map.infoWindow.hide();
                    }
                }));
                // stop moving
                on(this.editToolbar, "graphic-move-stop", lang.hitch(this, function (evt) {
                    this.addressGeometry = evt.graphic.geometry;
                }));
                // show info window on graphic click
                on(this.editToolbar, "graphic-click", lang.hitch(this, function (evt) {
                    var graphic = evt.graphic;
                    if (graphic && this.map.infoWindow) {
                        this.map.infoWindow.setFeatures([graphic]);
                        this.map.infoWindow.show(graphic.geometry);
                    }
                }));
                // map click
                on(this.map, 'click', lang.hitch(this, function (evt) {
                    this._clearSubmissionGraphic();
                    this.addressGeometry = evt.mapPoint;
                    this._setSymbol(this.addressGeometry);
                }));
                // mouse move and click, show lat lon
                on(this.map, 'mouse-move, click', lang.hitch(this, function (evt) {
                    // get coords string
                    var coords = this._calculateLatLong(evt);
                    domAttr.set(dom.byId("coordinatesValue"), "innerHTML", coords);
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
                    // resize popup
                    on(this.map.infoWindow, "selection-change, set-features, show", lang.hitch(this, function () {
                        this._resizeInfoWin();
                    }));
                }
                // When window resizes
                on(window, 'resize', lang.hitch(this, function () {
                    this._resizeMap(true);
                    this._resizeInfoWin();
                    this._centerPopup();
                }));
                // Lat/Lng coordinate events
                var latNode = dom.byId('lat_coord');
                var lngNode = dom.byId('lng_coord');
                on(latNode, "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                    this._checkLatLng();
                }));
                on(lngNode, "keypress", lang.hitch(this, function (evt) {
                    this._findLocation(evt);
                    this._checkLatLng();
                }));
                // lat/lng changed
                on(latNode, "change", lang.hitch(this, function () {
                    this._checkLatLng();
                }));
                on(lngNode, "change", lang.hitch(this, function () {
                    this._checkLatLng();
                }));
                on(dom.byId('cordsSubmit'), "click", lang.hitch(this, function (evt) {
                    this._evaluateCoordinates(evt);
                }));
                // USNG
                on(dom.byId('usng_submit'), "click", lang.hitch(this, function () {
                    this._convertUSNG();
                }));
                var usngInput = dom.byId('usng_coord');
                on(usngInput, "change", lang.hitch(this, function () {
                    this._checkUSNG();
                }));
                on(usngInput, "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUSNG();
                    }
                    this._checkUSNG();
                }));
                // MGRS
                on(dom.byId('mgrs_submit'), "click", lang.hitch(this, function () {
                    this._convertMGRS();
                }));
                var mgrsInput = dom.byId('mgrs_coord');
                on(mgrsInput, "change", lang.hitch(this, function () {
                    this._checkMGRS();
                }));
                on(mgrsInput, "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertMGRS();
                    }
                    this._checkMGRS();
                }));
                // UTM
                var northNode = dom.byId('utm_northing');
                var eastNode = dom.byId('utm_easting');
                var zoneNode = dom.byId('utm_zone_number');
                on(dom.byId('utm_submit'), "click", lang.hitch(this, function () {
                    this._convertUTM();
                }));
                on(northNode, "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUTM();
                    }
                    this._checkUTM();
                }));
                on(northNode, "change", lang.hitch(this, function () {
                    this._checkUTM();
                }));
                on(eastNode, "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUTM();
                    }
                    this._checkUTM();
                }));
                on(eastNode, "change", lang.hitch(this, function () {
                    this._checkUTM();
                }));
                on(zoneNode, "keypress", lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 13) {
                        this._convertUTM();
                    }
                    this._checkUTM();
                }));
                on(zoneNode, "change", lang.hitch(this, function () {
                    this._checkUTM();
                }));
                // fullscreen
                var fsButton = dom.byId('fullscreen_button');
                if (fsButton) {
                    on(dom.byId('fullscreen_button'), "click", lang.hitch(this, function () {
                        this._toggleFullscreen();
                    }));
                }
                // fullscreen esc key
                on(document.body, 'keyup', lang.hitch(this, function (evt) {
                    var keyCode = evt.charCode || evt.keyCode;
                    if (keyCode === 27) {
                        this._toggleFullscreen(false);
                    }
                }));
                // finished button
                var submitButtonNode = dom.byId('submitButton');
                if (submitButtonNode) {
                    on(submitButtonNode, "click", lang.hitch(this, function () {
                        this._submitForm();
                    }));
                }
                // set location options
                this._populateLocationsOptions();
                // resize map
                this._resizeMap();
                // load map
                if (this.map.loaded) {
                    this._mapLoaded();
                } else {
                    // map loaded
                    on(this.map, 'load', lang.hitch(this, function () {
                        this._mapLoaded();
                    }));
                }
            }), this.reportError);
        },
        _mapLoaded: function () {
            // resize map after a half second
            setTimeout(lang.hitch(this, function () {
                // make sure map is correct
                this._resizeMap();
            }), 500);
        },
        _fullscreenState: function () {
            // get all nodes
            var mapNode = dom.byId('mapDiv');
            var fsContainerNode = dom.byId('fullscreen_container');
            var mapContainerNode = dom.byId('map_container');
            var btnNode = dom.byId('fullscreen_icon');
            // if fullscreen
            if (domClass.contains(document.body, 'fullscreen')) {
                // icon classes
                domClass.add(btnNode, 'glyphicon-remove');
                domClass.remove(btnNode, 'glyphicon-fullscreen');
                domClass.remove(this.map.root, 'panel');
                // move map node and clear hash
                domConstruct.place(mapNode, fsContainerNode);
                window.location.hash = "";
            } else {
                // icon classes
                domClass.remove(btnNode, 'glyphicon-remove');
                domClass.add(btnNode, 'glyphicon-fullscreen');
                domClass.add(this.map.root, 'panel');
                // move map node and set hash
                domConstruct.place(mapNode, mapContainerNode);
                window.location.hash = "#mapDiv";
            }
            this._resizeMap();
            // if current selected location
            if (this.addressGeometry) {
                setTimeout(lang.hitch(this, function () {
                    this.map.centerAt(this.addressGeometry);
                }), 500);
            }
        },
        _toggleFullscreen: function (condition) {
            // swap classes
            domClass.toggle(document.body, 'fullscreen', condition);
            // update state
            this._fullscreenState();
        },
        // utm to lat lon
        _convertUTM: function () {
            this._clearSubmissionGraphic();
            var northing = parseFloat(dom.byId('utm_northing').value);
            var easting = parseFloat(dom.byId('utm_easting').value);
            var zone = parseInt(dom.byId('utm_zone_number').value, 10);
            var converted = {};
            try {
                usng.UTMtoLL(northing, easting, zone, converted);
            } catch (e) {
                this._coordinatesError('utm');
            }
            if (converted) {
                this._locatePointOnMap(converted.lat, converted.lon, 'utm');
            }
        },
        // usng to lat lon
        _convertUSNG: function () {
            this._clearSubmissionGraphic();
            var value = dom.byId('usng_coord').value;
            var converted = [];
            try {
                usng.USNGtoLL(value, converted);
            } catch (e) {
                this._coordinatesError('usng');
            }
            if (converted.length === 2) {
                this._locatePointOnMap(converted[0], converted[1], 'usng');
            }
        },
        // convert mgrs to lat lon
        _convertMGRS: function () {
            this._clearSubmissionGraphic();
            var value = dom.byId('mgrs_coord').value;
            var converted = [];
            try {
                usng.USNGtoLL(value, converted);
            } catch (e) {
                this._coordinatesError('mgrs');
            }
            if (converted.length === 2) {
                this._locatePointOnMap(converted[0], converted[1], 'mgrs');
            }
        },
        // make sure valid coordinates
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
            // place on map
            this._locatePointOnMap(latNode.value, lngNode.value, 'latlon');
        },
        _checkLatLng: function () {
            // make sure lat and lon are both filled out to show button
            var lat = dom.byId('lat_coord').value;
            var lng = dom.byId('lng_coord').value;
            var coord = dom.byId('cordsSubmit');
            if (lat && lng) {
                domAttr.remove(coord, 'disabled');
            } else {
                domAttr.set(coord, 'disabled', 'disabled');
            }
        },
        _checkUTM: function () {
            // make sure lat and lon are both filled out to show button
            var e = dom.byId('utm_northing').value;
            var n = dom.byId('utm_easting').value;
            var z = dom.byId('utm_zone_number').value;
            var s = dom.byId('utm_submit');
            if (e && n && z) {
                domAttr.remove(s, 'disabled');
            } else {
                domAttr.set(s, 'disabled', 'disabled');
            }
        },
        _checkUSNG: function () {
            // make value(s) are set
            var inputVal = dom.byId('usng_coord').value;
            var btn = dom.byId('usng_submit');
            if (inputVal) {
                domAttr.remove(btn, 'disabled');
            } else {
                domAttr.set(btn, 'disabled', 'disabled');
            }
        },
        _checkMGRS: function () {
            // make value(s) are set
            var inputVal = dom.byId('mgrs_coord').value;
            var btn = dom.byId('mgrs_submit');
            if (inputVal) {
                domAttr.remove(btn, 'disabled');
            } else {
                domAttr.set(btn, 'disabled', 'disabled');
            }
        },
        // find location for coordinates
        _findLocation: function (evt) {
            var keyCode = evt.charCode || evt.keyCode;
            if (keyCode === 13) {
                // check coordinates
                this._evaluateCoordinates();
            }
        },
        // my location button
        _createLocateButton: function () {
            // create widget
            var currentLocation = new LocateButton({
                map: this.map,
                highlightLocation: false,
                theme: "btn btn-default"
            }, domConstruct.create('div'));
            currentLocation.startup();
            // on current location submit
            on(currentLocation, "locate", lang.hitch(this, function (evt) {
                // remove error
                var errorMessageNode = dom.byId('errorMessageDiv');
                domConstruct.empty(errorMessageNode);
                // if error
                if (evt.error) {
                    alert(nls.user.locationNotFound);
                } else {
                    this.addressGeometry = evt.graphic.geometry;
                    this._setSymbol(evt.graphic.geometry);
                    this._resizeMap();
                }
                // reset button
                $('#geolocate_button').button('reset');
            }));
            // event for clicking node
            on(dom.byId('geolocate_button'), 'click', lang.hitch(this, function () {
                // remove graphic
                this._clearSubmissionGraphic();
                // set loading button
                $('#geolocate_button').button('loading');
                // widget locate
                currentLocation.locate();
            }));
        },
        // geocoder search submitted
        _searchGeocoder: function () {
            // remove error
            var errorMessageNode = dom.byId('errorMessageDiv');
            domConstruct.empty(errorMessageNode);
            // remove graphic
            this._clearSubmissionGraphic();
            // get nodes and value
            var value = dom.byId('searchInput').value;
            var node = dom.byId('geocoder_spinner');
            if (value) {
                // remove searching class
                domClass.remove(node, 'glyphicon glyphicon-search');
                // add spinner
                domClass.add(node, 'fa fa-spinner fa-spin');
                // find location
                this.geocodeAddress.find(value).then(lang.hitch(this, function (evt) {
                    // switch classes
                    domClass.remove(node, 'fa fa-spinner fa-spin');
                    domClass.add(node, 'glyphicon glyphicon-search');
                    // if results, select
                    if (evt.results && evt.results.length) {
                        this.geocodeAddress.select(evt.results[0]);
                    } else {
                        alert(nls.user.locationNotFound);
                    }
                }));
            }
        },
        // create menu items for multiple geocoders
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
        // geocoder with bootstrap
        _createGeocoderButton: function () {
            // create options
            var options = this._createGeocoderOptions();
            // create geocoder
            this.geocodeAddress = new Geocoder(options, domConstruct.create('div'));
            this.geocodeAddress.startup();
            // if we need a locator switch menu
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
            // search input
            var searchInputNode = dom.byId('searchInput');
            // search placeholder
            domAttr.set(searchInputNode, 'placeholder', this.geocodeAddress.activeGeocoder.placeholder);
            // input keyup
            on(searchInputNode, 'keyup', lang.hitch(this, function (evt) {
                var keyCode = evt.charCode || evt.keyCode;
                if (keyCode === 13) {
                    this._searchGeocoder();
                }
            }));
            // submit button
            on(dom.byId('searchSubmit'), 'click', lang.hitch(this, function () {
                this._searchGeocoder();
            }));
            // on find
            on(this.geocodeAddress, "select", lang.hitch(this, function (evt) {
                this.addressGeometry = evt.result.feature.geometry;
                this._setSymbol(evt.result.feature.geometry);
                this.map.centerAt(evt.result.feature.geometry).then(lang.hitch(this, function () {
                    this._resizeMap();
                }));
            }));
            // geocoder menu select event
            on(this.geocodeAddress, "geocoder-select", lang.hitch(this, function () {
                domAttr.set(searchInputNode, 'placeholder', this.geocodeAddress.activeGeocoder.placeholder);
                this._geocoderMenuItems();
            }));
            // geocoder menu
            var gcMenu = dom.byId('geocoder_menu');
            if (gcMenu) {
                // menu item clicked
                on(gcMenu, 'a:click', lang.hitch(this, function (evt) {
                    var idx = parseInt(domAttr.get(evt.target, 'data-index'), 10);
                    this.geocodeAddress.set('activeGeocoderIndex', idx);
                    evt.preventDefault();
                }));
            }
        },
        // submit form with applyedits
        _addFeatureToLayer: function () {
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
                            var picker = $(currentField.parentNode).data('DateTimePicker');
                            var d = picker.getDate();
                            // need to get time of date in ms for service
                            value = d.valueOf();
                        } else {
                            value = lang.trim(currentField.value);
                        }
                        featureData.attributes[key] = value;
                    }
                });
                // each radio button
                array.forEach(query(".geoFormQuestionare .radioContainer"), function (currentField) {
                    if (query(".radioInput:checked", currentField).length !== 0) {
                        key = query(".radioInput:checked", currentField)[0].name;
                        value = lang.trim(query(".radioInput:checked", currentField)[0].value);
                        featureData.attributes[key] = value;
                    }
                });
                // each checkbox
                array.forEach(query(".geoFormQuestionare .checkboxContainer"), function (currentField) {
                    key = query(".checkboxInput", currentField)[0].id;
                    value = query(".checkboxInput:checked", currentField).length;
                    featureData.attributes[key] = value;
                });
                featureData.geometry = {};
                featureData.geometry = new Point(Number(this.addressGeometry.x), Number(this.addressGeometry.y), this.map.spatialReference);
                //code for apply-edits
                this._formLayer.applyEdits([featureData], null, null, lang.hitch(this, function (addResults) {
                    // Add attachment on success
                    if (addResults[0].success) {
                        if (userFormNode[userFormNode.length - 1].value !== "" && this._formLayer.hasAttachments) {
                            this._formLayer.addAttachment(addResults[0].objectId, userFormNode, function () {}, function () {
                                console.log(nls.user.addAttachmentFailedMessage);
                            });
                        }
                    }
                    // remove graphic
                    this._clearSubmissionGraphic();
                    // reset form
                    this._clearFormFields();
                    domConstruct.destroy(query(".errorMessage")[0]);
                    // open error modal if unsuccessful
                    if (!addResults[0].success) {
                        this._openErrorModal();
                        return;
                    }
                    this._openShareModal();
                    // reset to default extent
                    if (this.config.defaultMapExtent) {
                        this.map.setExtent(this.defaultExtent);
                    }
                    // reset submit button
                    this._resetButton();
                    window.location.href = '#top';
                    // After moving geoform to top, map was not getting resized properly.
                    // And pushpin was not getting placed correctly.
                    this._resizeMap();
                }), lang.hitch(this, function () {
                    // remove graphic
                    this._clearSubmissionGraphic();
                    // no longer editable
                    this._formLayer.setEditable(false);
                    // remove error
                    domConstruct.destroy(query(".errorMessage")[0]);
                    // open error
                    this._openErrorModal();
                    // log for development
                    console.log(nls.user.addFeatureFailedMessage);
                }));
            } else {
                // reset submit button
                this._resetButton();
                // error message
                var errorMessage = '';
                errorMessage += '<p class="lead"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + nls.user.requiredFields + '</p>';
                errorMessage += '<p>' + string.substitute(nls.user.selectLocation, {
                    openLink: '<a href="#select_location">',
                    closeLink: '</a>'
                }) + '</p>';
                // display message
                this._showErrorMessageDiv(errorMessage);
            }
        },
        // remove point graphic
        _clearSubmissionGraphic: function () {
            this.addressGeometry = null;
            this._gl.clear();
            if (this.map.infoWindow && this.map.infoWindow.isShowing) {
                this.map.infoWindow.hide();
            }
        },
        // display coordinates error
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
        _projectPoint: function (geometry) {
            // this function takes a lat/lon (4326) point and converts it to map's spatial reference.
            var def = new Deferred();
            // maps spatial ref
            var sr = this.map.spatialReference;
            // map and point are both lat/lon
            if (sr.wkid === 4326) {
                def.resolve(geometry);
            }
            // map is mercator
            else if (sr.isWebMercator()) {
                // convert lat lon to mercator. No network request.
                var pt = webMercatorUtils.geographicToWebMercator(geometry);
                def.resolve(pt);
            }
            // map is something else & has geometry service
            else if (esriConfig.defaults.geometryService) {
                // project params
                var params = new ProjectParameters();
                params.geometries = [geometry];
                params.outSR = this.map.spatialReference;
                // use geometry service to convert lat lon to map format (network request)
                esriConfig.defaults.geometryService.project(params).then(function (projectedPoints) {
                    if (projectedPoints && projectedPoints.length) {
                        def.resolve(projectedPoints[0]);
                    } else {
                        def.reject(new Error("GeoForm::Point was not projected."));
                    }
                }, function (error) {
                    def.reject(error);
                });
            }
            // cant do anything, leave lat/lon
            else {
                def.resolve(geometry);
            }
            return def;
        },
        // put x,y point on map in mercator
        _locatePointOnMap: function (x, y, type) {
            if (x >= -90 && x <= 90 && y >= -180 && y <= 180) {
                var mapLocation = new Point(y, x);
                // convert point
                this._projectPoint(mapLocation).then(lang.hitch(this, function (pt) {
                    if (pt) {
                        this.addressGeometry = pt;
                        // set point symbol
                        this._setSymbol(pt);
                        // center map at point and resize
                        this.map.centerAt(pt).then(lang.hitch(this, function () {
                            this._resizeMap();
                        }));
                        var errorMessageNode = dom.byId('errorMessageDiv');
                        domConstruct.empty(errorMessageNode);
                    }
                }), lang.hitch(this, function (error) {
                    console.log(error);
                    this._coordinatesError(type);
                }));
            } else {
                // display coordinates error
                this._coordinatesError(type);
            }
        },
        // open modal
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
        // error modal content
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
        // share modal content
        _createShareDlgContent: function () {
            var iconContainer, group;
            // empty modal node
            domConstruct.empty(query(".modal-body")[0]);
            // set modal title
            domAttr.set(dom.byId('myModalLabel'), "innerHTML", nls.user.shareUserTitleMessage);
            // create nodes for modal
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
        // display error message
        _showErrorMessageDiv: function (errorMessage) {
            var errorMessageNode = dom.byId('errorMessageDiv');
            // clear node
            domConstruct.empty(errorMessageNode);
            // remove anchor
            window.location.hash = "";
            // create node
            domConstruct.create("div", {
                className: "alert alert-danger errorMessage",
                id: "errorMessage",
                innerHTML: errorMessage
            }, errorMessageNode);
            // set anchor
            window.location.hash = "#errorMessage";
            // resize map
            this._resizeMap();
        },
        // reset submit button
        _resetButton: function () {
            var btn = $(dom.byId('submitButton'));
            btn.button('reset');
        },
        // set defaults for layer
        _setLayerDefaults: function () {
            // if no layer id is set, try to use first feature layer
            if (!this.config.form_layer || !this.config.form_layer.id) {
                array.some(this.config.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
                    if (currentLayer.layerType && currentLayer.layerType === "ArcGISFeatureLayer") {
                        // if no object present
                        if (!this.config.form_layer) {
                            this.config.form_layer = {};
                        }
                        // set id
                        this.config.form_layer.id = currentLayer.id;
                        return true;
                    }
                }));
            }
            // get editable layer
            this._formLayer = this.map.getLayer(this.config.form_layer.id);
            // if we have a layer
            if (this._formLayer) {
                // if fields not set or empty
                if (!this.config.fields || (this.config.fields && this.config.fields.length === 0)) {
                    this.config.fields = this._formLayer.fields;
                }
            }
        },
        // set defaults for app settings
        _setWebmapDefaults: function () {
            // if details not defined
            if (!this.config.details) {
                this.config.details = {};
            }
            // if no app title
            if (!this.config.details.Title) {
                // if item
                if (this.config.itemInfo && this.config.itemInfo.item) {
                    // use webmap title
                    this.config.details.Title = this.config.itemInfo.item.title;
                }
            }
            // if no app description
            if (!this.config.details.Description) {
                // if item
                if (this.config.itemInfo && this.config.itemInfo.item) {
                    // use webmap snippet
                    this.config.details.Description = this.config.itemInfo.item.snippet;
                }
            }
            // if no app logo
            if (!this.config.details.Logo) {
                // if item and thumb
                if (this.config.itemInfo && this.config.itemInfo.item && this.config.itemInfo.item.thumbnail) {
                    // use webmap logo
                    this.config.details.Logo = this.config.sharinghost + "/sharing/rest/content/items/" + this.config.webmap + '/info/' + this.config.itemInfo.item.thumbnail;
                }
            }
        },
        // resize map
        _resizeMap: function (force) {
            if (this.map) {
                this.map.reposition();
                this.map.resize(force);
            }
        },
        // set visible location options
        _populateLocationsOptions: function () {
            var count = 0;
            var total = 0;
            var locationTabs = query("#location_pills li");
            var tabContents = query("#location_tabs .tab-pane");
            if (!this.config.locationSearchOptions) {
                this.config.locationSearchOptions = {
                    "enableMyLocation": true,
                    "enableSearch": true,
                    "enableLatLng": true,
                    "enableUSNG": false,
                    "enableMGRS": false,
                    "enableUTM": false
                };
            }
            for (var key in this.config.locationSearchOptions) {
                if (this.config.locationSearchOptions.hasOwnProperty(key)) {
                    if (!this.config.locationSearchOptions[key]) {
                        domStyle.set(locationTabs[count], 'display', 'none');
                    } else {
                        //resize the map to set the correct info-window anchor
                        on(locationTabs[count], 'click', lang.hitch(this, this._resizeMap));
                        total++;
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
            // hide tab nav if zero or one tabs
            if (total < 2) {
                var node = dom.byId('location_nav');
                if (node) {
                    domStyle.set(node, 'display', 'none');
                }
                var panelNode = dom.byId('location_panel');
                if (panelNode) {
                    domClass.remove(panelNode, 'panel panel-default');
                }
                var panelBodyNode = dom.byId('location_panel_body');
                if (panelBodyNode) {
                    domClass.remove(panelBodyNode, 'panel-body');
                }
            }
            // resize map
            this._resizeMap();
        },
        _addNotationIcon: function (formContent, imageIconClass) {
            var inputIconGroupContainer, inputIconGroupAddOn;
            inputIconGroupContainer = domConstruct.create("div", {
                className: "input-group"
            }, formContent);
            inputIconGroupAddOn = domConstruct.create("span", {
                className: "input-group-addon"
            }, inputIconGroupContainer);
            domConstruct.create("span", {
                className: "glyphicon " + imageIconClass
            }, inputIconGroupAddOn);
            return inputIconGroupContainer;
        },
        _resetSubTypeFields: function (currentInput) {
            if (currentInput.type == "esriFieldTypeDate" || currentInput.displayType == "url" || currentInput.displayType == "email") {
                domConstruct.destroy(dom.byId(currentInput.name).parentNode.parentNode);
            } else {
                domConstruct.destroy(dom.byId(currentInput.name).parentNode);
            }
        },

        _createDateField: function (parentNode, isRangeField, fieldname, currentField) {
            domClass.add(parentNode, "date");
            var dateInputField = domConstruct.create("input", {
                type: "text",
                value: "",
                className: "form-control hasDatetimepicker",
                "data-input-type": "Date",
                "id": fieldname
            }, parentNode);
            on(dateInputField, "focus", function () {
                $(this.parentElement).data("DateTimePicker").show();
            });
            on(dateInputField, "blur", function () {
                $(this.parentElement).data("DateTimePicker").hide();
            });
            $(parentNode).datetimepicker({
                useSeconds: false,
                useStrict: false
            }).on('dp.show', function (evt) {
                var picker = $(this).data('DateTimePicker');
                var selectedDate = picker.getDate();
                if (selectedDate === null) {
                    query("input", this)[0].value = "";
                }
                domClass.remove(query(evt.target).parents(".geoFormQuestionare")[0], "has-error");
                domClass.add(query(evt.target).parents(".geoFormQuestionare")[0], "has-success");
                if (query("input", this)[0].value === "") {
                    domClass.remove(query(evt.target).parents(".geoFormQuestionare")[0], "has-success");
                }
            }).on('dp.error', function (evt) {
                evt.target.value = '';
                domClass.remove(query(evt.target).parents(".geoFormQuestionare")[0], "has-success");
                domClass.add(query(evt.target).parents(".geoFormQuestionare")[0], "has-error");
                $(this).data("DateTimePicker").hide();
            }).on("dp.hide", function (evt) {
                if (query("input", this)[0].value === "") {
                    domClass.remove(query(evt.target).parents(".geoFormQuestionare")[0], "has-success");
                    domClass.remove(query(evt.target).parents(".geoFormQuestionare")[0], "has-error");
                }
            }).on('dp.change', function (evt) {
                domClass.add(query(evt.target).parents(".geoFormQuestionare")[0], "has-success");
                domClass.remove(query(evt.target).parents(".geoFormQuestionare")[0], "has-error");
            });
            if (isRangeField) {
                $(parentNode).data("DateTimePicker").setMaxDate(locale.format(new Date(currentField.domain.maxValue), {
                    fullYear: true
                }));
                $(parentNode).data("DateTimePicker").setMinDate(locale.format(new Date(currentField.domain.minValue), {
                    fullYear: true
                }));
            }
            return dateInputField;
        }
    });
});