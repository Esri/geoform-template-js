define([
   "dojo/_base/declare",
    "dojo/on",
    "dojo/dom",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/_base/lang",
    "esri/dijit/LocateButton",
    "esri/dijit/Geocoder",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!application/dijit/templates/user.html",
    "dojo/i18n!application/nls/builder",
    "esri/arcgis/utils",
    "dojo/domReady!"
], function (declare, on, dom, array, domConstruct, domAttr, domClass, lang, LocateButton, Geocoder, _WidgetBase, _TemplatedMixin, userTemplate, i18n, arcgisUtils) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: userTemplate,
        nls: i18n,
        config: null,
        constructor: function () {
        },

        startup: function (config, response) {
            this.config = config;
            this._createWebMap(this.config.webmap);
            this._switchStyle(this.config.theme.themeSrc);
            this._createForm(this.config.fields);
            this._setAppConfigurations(this.config.details);

            dom.byId("parentContainter").appendChild(this.userMode);
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
                }
                formContent = domConstruct.create("div", { "class": "form-group" }, this.userForm);

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
                    inputContent = domConstruct.create("select", { "class": "form-control" }, formContent);
                    array.forEach(currentField.domain.codedValues, lang.hitch(this, function (currentOption) {
                        selectOptions = domConstruct.create("option", {}, inputContent);
                        selectOptions.text = currentOption.name;
                        selectOptions.value = currentOption.code;
                    }));
                }
                else {
                    if (true) {
                        switch (currentField.fieldType) {
                            case "String":
                                inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "String", "maxLength": currentField.length }, formContent);
                                break;
                            case "smallInteger":
                                inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "smallInteger" }, formContent);
                                break;
                            case "Integer":
                                inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Integer" }, formContent);
                                break;
                            case "Single":
                                inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Single" }, formContent);
                                break;
                            case "Double":
                                inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Double" }, formContent);
                                break;
                            case "Date":
                                inputContent = domConstruct.create("input", { type: "text", "class": "form-control", "inputType": "Date" }, formContent);
                                $(inputContent).datepicker();
                                break;
                        }
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

        _createWebMap: function (webmap) {
            arcgisUtils.createMap(webmap, this.mapDiv, {
                mapOptions: {
                    smartNavigation: false,
                    autoResize: false
                    // Optionally define additional map config here for example you can
                    // turn the slider off, display info windows, disable wraparound 180, slider position and more.
                },
                bingMapsKey: this.config.bingKey
            }).then(lang.hitch(this, function (response) {
                this.map = response.map;
                //Find current location using locateButton dijit
                var currentLocation = new LocateButton({
                    map: this.map,
                    theme: "btn btn-default"
                }, this.myLocation);
                currentLocation.startup();
                //Search address using geocoder dijit
                var geocodeAddress = new Geocoder({
                    map: this.map,
                    autoComplete: true,
                    showResults: true
                }, this.geocodeAddress);
                geocodeAddress.startup();

                domClass.remove(document.body, "app-loading");
            }), function (err) {
                console.log(err);
            });
        }
    });
});