/*global $,define,document */
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
    "dojo/io-query",
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
    "application/localStorageHelper",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol",
    "esri/toolbars/edit",
    "esri/dijit/Popup",
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
    ioQuery,
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
    nls, webMercatorUtils, Point, ShareDialog, localStorageHelper, Graphic, PictureMarkerSymbol, editToolbar, Popup, theme) {
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
        startup: function (config, response, isPreview, node) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                this.localStorageSupport = new localStorageHelper();
                // document ready
                ready(lang.hitch(this, function () {
                    // modal i18n
                    modalTemplate = lang.replace(modalTemplate, nls);
                    // place modal code
                    domConstruct.place(modalTemplate, document.body, 'last');
                    //supply either the webmap id or, if available, the item info
                    domStyle.set(this.userMode, 'display', 'none');
                    if (isPreview) {
                        var cssStyle;
                        if (this.localStorageSupport.supportsStorage()) {
                            localStorage.setItem("geoform_config", JSON.stringify(config));
                        }
                        array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
                            if (this.config.theme == currentTheme.id) {
                                cssStyle = domConstruct.create('link', {
                                    rel: 'stylesheet',
                                    type: 'text/css',
                                    href: currentTheme.url
                                });
                            }
                        }));
                        //Handle case where edit is first url parameter we'll use the same logic we used in sharedialog.js
                        var url = window.location.protocol + '//' + window.location.host + window.location.pathname;
                        if (window.location.href.indexOf("?") > -1) {
                            var queryUrl = window.location.href;
                            var urlParams = ioQuery.queryToObject(window.location.search.substring(1)),
                                newParams = lang.clone(urlParams);
                            delete newParams.edit; //Remove edit parameter 
                            url = queryUrl.substring(0, queryUrl.indexOf("?") + 1) + ioQuery.objectToQuery(newParams);
                        }
                        node.src = url;


                        node.onload = function () {
                            domConstruct.place(cssStyle, $("#iframeContainer").contents().find('head')[0], "last");
                        };
                    } else {
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
                        errorMessage += "\n2. " + nls.user.selectLocation;
                    }
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
            domStyle.set(this.userMode, 'display', 'block');
            // your code here!
            // get editable layer
            var layer = this.map.getLayer(this.config.form_layer.id);
            if (layer) {
                // support basic offline editing
                OfflineSupport({
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
            this.map.resize();
        },
        _setSymbol: function (point) {
            var symbolUrl, pictureMarkerSymbol, graphic;
            symbolUrl = "./images/pins/purple.png";
            pictureMarkerSymbol = new PictureMarkerSymbol(symbolUrl, 36, 36).setOffset(10, 0);
            graphic = new Graphic(point, pictureMarkerSymbol, null, null);
            this.map.graphics.add(graphic);
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
            var formContent, labelContent, inputContent, selectOptions, helpBlock, fileUploadForm, fileInput, matchingField, newAddedFields = [],
                fieldname, fieldLabelText, requireField, sortedArray;
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
                    requireField = domConstruct.create("div", {
                        className: 'text-danger requireFieldStyle',
                        innerHTML: "*"
                    }, formContent);
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
                    domConstruct.place(requireField, labelContent, "after");
                }
                //code to make select boxes in case of a coded value
                //code to make select boxes in case of a coded value
                if (currentField.domain) {
                    if (currentField.domain.codedValues.length > 2) {
                        inputContent = domConstruct.create("select", {
                            className: "form-control selectDomain",
                            "id": fieldname
                        }, formContent);
                        array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                            selectOptions = domConstruct.create("option", {}, inputContent);
                            selectOptions.text = currentOption.name;
                            selectOptions.value = currentOption.code;
                        }));
                    } else {
                        radioContainer = domConstruct.create("div", {
                            className: "radioContainer"
                        }, formContent);
                        array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                            radioContent = domConstruct.create("div", {
                                className: "radio"
                            }, radioContainer);
                            inputLabel = domConstruct.create("label", {
                                innerHTML: currentOption.name,
                                "for": currentOption.code + fieldname
                            }, radioContent);
                            inputContent = domConstruct.create("input", {
                                "id": currentOption.code + fieldname,
                                className: "radioInput",
                                type: "radio",
                                name: fieldname,
                                value: currentOption.code
                            }, inputLabel);
                        }));
                    }
                } else {
                    switch (currentField.type) {
                    case "esriFieldTypeString":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            "inputType": "String",
                            "maxLength": currentField.length,
                            "id": fieldname
                        }, formContent);
                        domConstruct.create("span", {
                            className: "glyphicon form-control-feedback"
                        }, formContent);
                        break;
                    case "esriFieldTypeSmallInteger":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            placeholder: nls.user.integerFormat,
                            "inputType": "smallInteger",
                            "id": fieldname,
                            "pattern": "[0-9]*"
                        }, formContent);
                        domConstruct.create("span", {
                            className: "glyphicon form-control-feedback"
                        }, formContent);
                        break;
                    case "esriFieldTypeInteger":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            placeholder: nls.user.integerFormat,
                            "inputType": "Integer",
                            "id": fieldname,
                            "pattern": "[0-9]*"
                        }, formContent);
                        domConstruct.create("span", {
                            className: "glyphicon form-control-feedback"
                        }, formContent);
                        break;
                    case "esriFieldTypeSingle":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            placeholder: nls.user.floatFormat,
                            "inputType": "Single",
                            "id": fieldname,
                            "pattern": "[0-9]*"
                        }, formContent);
                        domConstruct.create("span", {
                            className: "glyphicon form-control-feedback"
                        }, formContent);
                        break;
                    case "esriFieldTypeDouble":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            placeholder: nls.user.floatFormat,
                            "inputType": "Double",
                            "id": fieldname,
                            step: ".1"
                        }, formContent);
                        domConstruct.create("span", {
                            className: "glyphicon form-control-feedback"
                        }, formContent);
                        break;
                    case "esriFieldTypeDate":
                        inputContent = domConstruct.create("input", {
                            type: "text",
                            className: "form-control",
                            placeholder: nls.user.dateFormat,
                            "inputType": "Date",
                            "id": fieldname
                        }, formContent);
                        domConstruct.create("span", {
                            className: "glyphicon form-control-feedback"
                        }, formContent);
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
                    //If present fetch default values
                    if (currentField.defaultValue) {
                        domAttr.set(inputContent, "value", currentField.defaultValue);
                    }
                    //conditional check to attach keyup event to all the inputs except date and string field
                    //as validation is not required for date field and string fields max-length is already set
                    if (domAttr.get(inputContent, "inputType") !== "Date" || domAttr.get(inputContent, "inputType") !== "String") {
                        on(inputContent, "keyup", lang.hitch(this, function (evt) {
                            this._validateField(evt, true);
                        }));
                    }
                }
                helpBlock = domConstruct.create("p", {
                    className: "help-block"
                }, formContent);
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
                } else {
                    helpBlock.innerHTML = currentField.fieldDescription;
                }
            }));
            if (this.map.getLayer(this.config.form_layer.id).hasAttachments) {
                formContent = domConstruct.create("div", {
                    className: "form-group"
                }, this.userForm);
                fileUploadForm = domConstruct.create("form", {
                    className: "fileUploadField"
                }, formContent);
                domAttr.set(fileUploadForm, "id", "testForm");
                fileInput = domConstruct.create("input", {
                    "type": "file",
                    "accept": "image/*",
                    "capture": "camera",
                    "name": "attachment"
                }, fileUploadForm);
                domAttr.set(fileInput, "id", "testFormFileInput");
            }
        },

        _validateField: function (currentNode, iskeyPress) {
            var inputType, inputValue, node, typeCastedInputValue, decimal = /^[-+]?[0-9]+$/,
                float = /^[-+]?[0-9]+\.[0-9]+$/;
            if (iskeyPress) {
                inputValue = currentNode.currentTarget.value;
                inputType = domAttr.get(currentNode.currentTarget, "inputType");
                if ($(currentNode.target)) {
                    node = $(currentNode.target.parentNode)[0];
                } else {
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
            array.forEach(query(".radioInput:checked"), function (currentField) {
                domAttr.set(currentField, "checked", false);
            });
        },
        _validateUserInput: function (isValidInput, node, inputValue, iskeyPress) {
            if (isValidInput) {
                domClass.remove(node, "has-error");
                domClass.add(node, "has-success");
                domClass.add(query("span", node)[0], "glyphicon-ok");
                domClass.remove(query("span", node)[0], "glyphicon-remove");
            } else {
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
            var popup = new Popup(null, domConstruct.create("div"));
            domClass.add(popup.domNode, 'light');
            domConstruct.empty($("#mapDiv"));
            arcgisUtils.createMap(itemInfo, "mapDiv", {
                mapOptions: {
                    smartNavigation: false,
                    autoResize: false,
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
                this.map.resize();
                this.map.reposition();
                //Check for the appid if it is not present load entire application with webmap defaults
                if (!this.config.appid && this.config.webmap) {
                    this._setWebmapDefaults();
                }
                this._setAppConfigurations(this.config.details);
                // window title
                if (this.config.details && this.config.details.Title) {
                    window.document.title = this.config.details.Title;
                }
                this.map.on("pan-end", lang.hitch(this, function () {
                    this.map.resize();
                    this.map.reposition();
                }));
                // bootstrap map functions
                bootstrapmap(this.map);
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
                this._showErrorMessageDiv(nls.user.emptylatitudeAlertMessage);
                return;
            } else if (this.YCoordinate.value === "") {
                this._showErrorMessageDiv(nls.user.emptylongitudeAlertMessage);
                return;
            }
            this._locatePointOnMap(this.XCoordinate.value + "," + this.YCoordinate.value);
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
                theme: "btn btn-default"
            }, domConstruct.create('div'));
            currentLocation.startup();
            on(currentLocation, "locate", lang.hitch(this, function (evt) {
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
        _createGeocoderButton: function () {
            this.geocodeAddress = new Geocoder({
                map: this.map
            }, domConstruct.create('div'));
            this.geocodeAddress.startup();

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
                this.map.centerAt(evt.result.feature.geometry);
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
                var key, value;
                //condition to filter out radio inputs
                array.forEach(query(".geoFormQuestionare .form-control"), function (currentField) {
                    var key = domAttr.get(currentField, "id");
                    if (domClass.contains(currentField, "hasDatepicker")) {
                        value = $(currentField).datepicker("getDate");
                    } else {
                        value = lang.trim(currentField.value);
                    }
                    featureData.attributes[key] = value;
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
                this.map.getLayer(config.form_layer.id).applyEdits([featureData], null, null, function (addResults) {
                    _self._clearSubmissionGraphic();
                    _self.map.getLayer(config.form_layer.id).setEditable(false);
                    domConstruct.destroy(query(".errorMessage")[0]);
                    _self._openShareDialog();
                    $("#myModal").modal('show');
                    _self.map.getLayer(config.form_layer.id).refresh();
                    _self._resetButton();
                    if (dom.byId("testForm") && dom.byId("testForm")[0].value !== "" && _self.map.getLayer(config.form_layer.id).hasAttachments) {
                        _self.map.getLayer(config.form_layer.id).addAttachment(addResults[0].objectId, dom.byId("testForm"), function () {}, function () {
                            console.log(nls.user.addAttachmentFailedMessage);
                        });
                    }
                    _self._clearFormFields();
                }, function () {
                    console.log(nls.user.addFeatureFailedMessage);
                });
            } else {
                this._resetButton();
                this._showErrorMessageDiv(nls.user.selectLocation);
            }
        },
        _clearSubmissionGraphic: function () {
            this.addressGeometry = null;
            this.map.graphics.clear();
            if (this.map.infoWindow.isShowing) {
                this.map.infoWindow.hide();
            }
        },

        _locatePointOnMap: function (coordinates) {
            var latLong = coordinates.split(",");
            if (latLong[0] >= -90 && latLong[0] <= 90 && latLong[1] >= -180 && latLong[1] <= 180) {
                var mapLocation = new Point(latLong[1], latLong[0]);
                var pt = webMercatorUtils.geographicToWebMercator(mapLocation);
                this.addressGeometry = pt;
                this._setSymbol(this.addressGeometry);
                this.map.infoWindow.setTitle(nls.user.locationTabText);
                this.map.infoWindow.setContent(nls.user.addressSearchText);
                this.map.infoWindow.show(this.addressGeometry);
                this.map.centerAt(this.addressGeometry);
                domConstruct.empty(this.erroMessageDiv);
            } else {
                this._showErrorMessageDiv(nls.user.invalidLatLong);
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
            iconContainer = domConstruct.create("div", {
                className: "iconContainer"
            }, query(".modal-body")[0]);
            domConstruct.create("div", {
                className: "share-dialog-subheader",
                innerHTML: nls.user.shareUserTextMessage
            }, iconContainer);
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
                innerHTML: nls.user.shareDialogFormText
            }, iconContainer);
            domConstruct.create("input", {
                type: "text",
                className: "share-map-url",
                id: "_shareMapUrlText"
            }, iconContainer);
        },

        _showErrorMessageDiv: function (errorMessage) {
            domConstruct.empty(this.erroMessageDiv);
            domConstruct.create("div", {
                className: "alert alert-danger errorMessage",
                id: "errorMessage",
                innerHTML: errorMessage
            }, this.erroMessageDiv);
            window.location.hash = "#errorMessage";
            this.map.resize();
        },

        _resetButton: function () {
            var btn = $(this.submitButton);
            btn.button('reset');
        },

        _setWebmapDefaults: function () {
            this.config.details.Title = this.config.itemInfo.item.title;
            this.config.details.Description = this.config.itemInfo.item.snippet;
            if (this.config.itemInfo.item.thumbnail) {
                this.config.details.Logo = this.config.sharinghost + "/sharing/rest/content/items/" + this.config.webmap + '/info/' + this.config.itemInfo.item.thumbnail;
            } else {
                this.config.details.Logo = "./images/default.png";
            }
            array.some(this.config.itemInfo.itemData.operationalLayers, lang.hitch(this, function (currentLayer) {
                if (currentLayer.url.split("/")[currentLayer.url.split("/").length - 2] == "FeatureServer") {
                    this.config.form_layer.id = currentLayer.id;
                    this.config.fields = this.map.getLayer(this.config.form_layer.id).fields;
                    return true;
                }
            }));
        }
    });
});