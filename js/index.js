define([
   "dojo/_base/declare",
    "dojo/dom",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!application/dijit/templates/user.html",
    "dojo/i18n!application/nls/builder",
    "esri/arcgis/utils",
    "dojo/domReady!"
], function (declare, dom, array, domConstruct, domClass, lang, _WidgetBase, _TemplatedMixin, userTemplate, i18n, arcgisUtils) {
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
            var formContent, labelContent, inputContent;
            array.forEach(fields, lang.hitch(this, function (currentField) {
                formContent = domConstruct.create("div", { "class": "form-group" }, this.userForm);
                labelContent = domConstruct.create("label", { innerHTML: currentField.fieldDescription }, formContent);

                switch (currentField.fieldType) {
                    case "String":
                        inputContent = domConstruct.create("input", { type: "text", "class": "form-control" }, formContent);
                        break;
                    case "SmallInteger":
                        inputContent = domConstruct.create("input", { type: "text", "class": "form-control" }, formContent);
                        break;
                    case "Integer":
                        inputContent = domConstruct.create("input", { type: "text", "class": "form-control" }, formContent);
                        break;
                    case "Single":
                        inputContent = domConstruct.create("input", { type: "text", "class": "form-control" }, formContent);
                        break;
                    case "Double":
                        inputContent = domConstruct.create("input", { type: "text", "class": "form-control" }, formContent);
                        break;
                }
            }));
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
            }).then(lang.hitch(this, function () {
                domClass.remove(document.body, "app-loading");
            }), function (err) {
                console.log(err);
            });
        }
    });
});