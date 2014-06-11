define([
  "dojo/Evented",
  "dojo/_base/declare",
  "dojo/_base/connect",
  "dojo/_base/lang",
  "dojo/_base/event",
  "dojo/dom",
  "dojo/keys",
  "dijit/registry",
  "dojo/on",
  "dojo/query",
  "dojo/dom-style",
  "dojo/dom-class",
  "application/grid",
  "esri/arcgis/Portal",
  "dojo/i18n!./nls/resources",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dijit/_WidgetsInTemplateMixin",
  "dojo/text!application/dijit/templates/BrowseIdDlg.html",
  "esri/request",
  "dijit/Dialog",
  "dijit/form/Select",
  "dijit/form/Button",
  "dijit/form/TextBox"
], function (Evented, declare, connect, lang, dojoEvent, dom, keys, registry, on, query, domStyle, domClass, Grid, esriPortal, i18n, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, esriRequest) {
    return declare([Evented, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        constructor: function (args, userInfo) {
            lang.mixin(this, args);
            this.userInfo = userInfo;
        },
        postMixInProperties: function () {
            this.inherited(arguments);
            this.i18n = {};
            if (this.galleryType === "webmap") {
                this.i18n = i18n.configure.mapdlg;
            } else {
                this.i18n = i18n.configure.groupdlg;
            }
            this.selected = null;
            this.selectedWebmap = {};
        },

        postCreate: function () {
            //Populate the query dropdown box. This dropdown is used to determine the scope of the search.
            var items = [];
            items.push({
                label: this.i18n.items.contentLabel,
                value: "content"
            }, {
                label: this.i18n.items.organizationLabel,
                value: "org"
            }, {
                label: this.i18n.items.onlineLabel,
                value: "online"
            });
            //add my favorites to the dropdown for web maps
            if (this.galleryType === "webmap") {
                items.push({
                    label: this.i18n.items.favoritesLabel,
                    value: "favorites"
                });
            }
            this._filterSelect.set("options", items);
            this._filterSelectHandler = on(this._filterSelect, "change", lang.hitch(this, "doSearch"));

            var query = {};
            if (this.userInfo.username) {
                query.q = "owner: " + this.userInfo.username;
            }
            if (this.galleryType === "webmap") {
                query.q += ' type:"Web Map" -type:"Web Mapping Application"';
            }
            this._grid = new Grid({
                "portal": this.userInfo.portal,
                "query": query,
                "pagingLinks": true,
                "galleryType": this.galleryType,
                "view": "gallery" //gallery or details
            }, "gallery");
            this._grid.refresh();
            //Set the web map as the selected item
            on(this._grid, "onItemClick", lang.hitch(this, function (e) {
                var row = e.row;
                if (e.row.data && e.row.data.title && e.row.data.id) {
                    this.selected = row.data.title;
                    this.selectedWebmap.id = row.data.id;
                    this.selectedWebmap.thumbnailUrl = row.data.thumbnailUrl;
                }
            }));
            on(this.searchButton, "click", lang.hitch(this, function (evt) {
                this._onSearchClick(evt);
            }));
        },
        destroy: function () {
            this._filterSelectHandler.remove();
            this.inherited(arguments);

        },

        doSearch: function () {
            var filter = this._filterSelect.get("value"), portalUser = {};
            esriRequest({
                url: this.userInfo.portal.url + "/sharing/rest/community/users/" + this.userInfo.username,
                content: {
                    "f": "json"
                },
                callbackParamName: "callback"
            }).then(lang.hitch(this, function (response) {
                portalUser = response;
                var parameters = [];
                if (this.searchText.getValue()) {
                    parameters.title = this.searchText.getValue();
                }

                if (filter === "org") {
                    parameters.orgid = portalUser.orgId;
                }
                if (filter === "content") {
                    parameters.owner = portalUser.username;
                }
                if (filter === "favorites") {
                    parameters.group = portalUser.favGroupId;
                }
                if (filter === "online" && this.galleryType === "group") {
                    var search = this.searchText.getValue();
                    if (search === "") {
                        //Return all online groups. We need to provide a query param we can't just return all groups
                        //so let's set the access to public in this case so we only see public groups.
                        parameters.access = "public";
                    }
                }
                if (this.galleryType === "webmap") {
                    parameters.type = '"Web Map" -type:"Web Mapping Application"';
                }
                var qs = "";
                for (var key in parameters) {
                    var val = parameters[key];
                    qs += key + ":" + val + " ";
                }
                var query = {};
                query.q = lang.trim(qs);
                this._grid.set("query", query);
                this._grid.refresh();
            }), function (error) {
                console.log(error);
            });
        },

        _onSearchClick: function (e) {
            dojoEvent.stop(e);
            if (e !== null && e.prefentDefault) {
                e.preventDefault();
            }
            this.doSearch();
        },
        _onSearchBoxFocus: function (e) {
        },

        _onSearchBoxBlur: function (e) {
            if (this.searchText.getValue() === "") {

            }
        },

        _onSearchKeyPress: function (e) {
            if (e.keyCode == keys.ENTER) {
                dojoEvent.stop(e);
                this._onSearchClick(e);
            }
            this.onSearchFieldKeyPress(e);
        },

        // event
        onSearchFieldKeyPress: function (event) {
            // do nothing
        },

        onClose: function () {
            registry.byId('browse-id-dialog').hide();
        },
        onCancel: function () {
            //clear the dgrid selection and close the dialog
            this.set("selected", null);
            registry.byId('browse-id-dialog').hide();
        },
        show: function (params) {
            registry.byId('browse-id-dialog').show();
            this._grid.refresh();
            domStyle.set(query("#browse-id-dialog .dijitDialogPaneContent")[0], "height", "444px");
            domClass.add(query('.dijitSelect .dijitArrowButton')[0], 'select-dropdown');
        }
    });
});