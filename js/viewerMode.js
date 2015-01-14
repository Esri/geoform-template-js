define([
        "dojo/_base/declare",
        "dojo/dom",
        "dojo/string",
        "dojo/_base/lang",
        "dojo/query",
        "dojo/_base/array",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/on",
        "application/themes",
        "dojo/dom-construct",
        "dojo/dom-attr",
        "esri/arcgis/utils",
        "dojo/Deferred",
        "esri/geometry/Point",
        "esri/layers/GraphicsLayer",
        "esri/graphic",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "application/ShareModal",
        "dojo/text!views/modal.html",
        "dojo/text!views/Viewer.html",
        "dojo/i18n!application/nls/resources",
        "esri/dijit/Legend",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        "esri/dijit/BasemapToggle",
        "esri/lang",
        "esri/dijit/Geocoder",
         "vendor/bootstrapmap",
         "dijit/registry",
         "dojo/parser",
         "application/wrapper/main-jquery-deps",
        "dojo/domReady!"
], function (
        declare,
        dom,
        string,
        lang,
        query,
        array,
        domClass,
        domStyle,
        on,
        theme,
        domConstruct,
        domAttr,
        arcgisUtils,
        Deferred,
        Point,
        GraphicsLayer,
        Graphic, BorderContainer, ContentPane, ShareModal, modalTemplate, ViewerTemplate, nls, Legend, Query, QueryTask, BasemapToggle, esriLang, Geocoder, bootstrapmap, registry, parser) {
    return declare([], {
        nls: nls,
        config: {},
        map: null,
        themes: theme,
        localStorageSupport: null,
        currentFeatureIndex: null,
        carouselPaulData: {},
        attributesArray: [],
        iconPathSVG: null,
        isDescendingButton: true,
        featureCount: 0,
        pageIndex: 0,
        layerPagination: [],
        numberOfRecords:20,
        constructor: function () {
            this.css = {
                desktopGeocoderTheme: "geocoder-desktop",
                mobileGeocoderTheme: "geocoder-mobile",
                mobileSearchDisplay: "mobile-locate-box-display"
            };
        },

        startup: function () {
            var config = arguments[0];
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                this.config = config;
                this._init();
            }
            else {
                alert("Unable to load config");
            }
            // modal i18n
            modalTemplate = string.substitute(modalTemplate, nls);
            // place modal code
            domConstruct.place(modalTemplate, document.body, 'last');
            on(dom.byId("shareDialog"), "click", lang.hitch(this, function () {
                this._openShareModal();
            }));
            on(dom.byId("btnSortByOrder"), "click", lang.hitch(this, function () {
                this._sortByOrder();
            }));
            on(dom.byId("search"), "click", lang.hitch(this, function (evt) {
                this._showLeftPanel(evt.currentTarget);
            }));
            on(dom.byId("aboutUs"), "click", lang.hitch(this, function (evt) {
                this._showLeftPanel(evt.currentTarget);
            }));
            on(dom.byId("Map"), "click", lang.hitch(this, function (evt) {
                this._showLeftPanel(evt.currentTarget);
            }));
            on(dom.byId("legend"), "click", lang.hitch(this, function (evt) {
                this._showLeftPanel(evt.currentTarget);
            }));
            this.iconPathSVG = "M 1784,238 1805,238 1805,259 1784,259 1784,238 M 1777,248 1784,248 M 1794,231 1794,238 M 1812,248 1805,248 M 1794,266 1794,259";
            this.selectedGraphics = new GraphicsLayer({ id: "highlightedGraphic" });
            //Set Dynamic height of list i the left panel
            domStyle.set(dom.byId("formlist"), "height", ($(window).height() - 250) + "px");

            on(window, "resize", lang.hitch(this, function () {
                var HeaderNode = query('.nav-tabs', dom.byId("panelHeader"));
                domStyle.set(dom.byId("formlist"), "height", ($(window).height() - 250) + "px");
                if ($(window).width() > 767) {
                    domStyle.set(dom.byId("legendPanelBody"), "height", ($(window).height() - 93) + "px");
                    domConstruct.place(dom.byId("mapDiv"), dom.byId("mapLayoutContainer"), "first");
                    domConstruct.place(dom.byId("featureDetailsContainer"), dom.byId("mapLayoutContainer"), "last");
                    this._resizeMap();
                    array.some(HeaderNode[0].children, lang.hitch(this, function (currentElement, index) {
                        if (index === 1) {
                            domClass.add(HeaderNode[0].children[index], "active");
                        } else {
                            domClass.remove(HeaderNode[0].children[index], "active");
                        }
                    }));
                    domStyle.set(dom.byId("aboutusPanelBody"), 'display', 'none');
                    domStyle.set(dom.byId("legendPanelBody"), 'display', 'none');
                    domStyle.set(dom.byId("mapPanelBody"), 'display', 'none');
                    domStyle.set(dom.byId("searchPanelBody"), 'display', 'block');
                }
                else {
                    this._moveMapContainer();
                }
            }));
            if ($(window).width() <= 767) {
                this._moveMapContainer();
            }
        },

        //Change map div's parent as per screen resolution
        _moveMapContainer:function() {
            domConstruct.place(dom.byId("mapDiv"), dom.byId("mapPanelBody"), "first");
            this._resizeMap();
            domConstruct.place(dom.byId("featureDetailsContainer"), dom.byId("mapPanelBody"), "last");
            this._showTabsMobileView();
            domStyle.set(dom.byId("legendPanelBody"), "height", ($(window).height() - 110) + "px");
            domStyle.set(dom.byId("mapPanelBody"), "height", ($(window).height() - 110) + "px");
            domStyle.set(dom.byId("aboutusPanelBody"), "height", ($(window).height() - 110) + "px");
        },

        //Function to resize map
        _resizeMap: function () {
            try {
                var mapCenter;
                registry.byId("mainContainer").resize();
                if (this.map && domStyle.get(dom.byId("mapLayoutContainer"), "display") === "block") {
                    mapCenter = this.map.extent.getCenter();
                    domStyle.set(dom.byId("mapDiv"), "height", "100%");
                    domStyle.set(dom.byId("mapDiv"), "width", "100%");
                    setTimeout(lang.hitch(this, function () {
                        this.map.resize();
                        this.map.reposition();
                        this.map.centerAt(mapCenter);
                    }), 500);
                } else {
                    mapCenter = this.map.extent.getCenter();
                    domStyle.set(dom.byId("mapDiv"), "height", "100%");
                    domStyle.set(dom.byId("mapDiv"), "width", "100%");
                    setTimeout(lang.hitch(this, function () {
                        this.map.resize();
                        this.map.reposition();
                        this.map.centerAt(mapCenter);
                    }), 0);
                }
            } catch (err) {
            }
        },

        //Arrange the navigation pane on small screen devices
        _showTabsMobileView: function () {
            var HeaderNode = query('.nav-tabs', dom.byId("panelHeader"));
            array.some(HeaderNode[0].children, lang.hitch(this, function (currentNode) {
                if (domClass.contains(currentNode, "active") && domAttr.get(currentNode, "id") !== "Map") {
                    domClass.remove(currentNode, "active");
                }
            }));
            domClass.add(dom.byId("Map"), "active");
            domStyle.set(dom.byId("aboutusPanelBody"), 'display', 'none');
            domStyle.set(dom.byId("legendPanelBody"), 'display', 'none');
            domStyle.set(dom.byId("searchPanelBody"), 'display', 'none');
            this._resizeMap();
            domStyle.set(dom.byId("mapPanelBody"), 'display', 'block');
        },

        _init: function () {
            var viewerHTML, testTemplate, itemInfo;
            if (domClass.contains(document.body, "claro")) {
                domClass.remove(document.body, "claro");
            }
            viewerHTML = string.substitute(ViewerTemplate, nls);
            testTemplate = domConstruct.toDom(viewerHTML);
            parser.parse(testTemplate);

            if (!this.config.theme) {
                // lets use bootstrap theme!
                this.config.theme = "bootstrap";
            }
            // set theme
            this._switchStyle(this.config.theme);
            domConstruct.place(registry.byId("mainContainer").domNode, document.body);
            registry.byId("mainContainer").startup();
            registry.byId("mainContainer").resize();
            itemInfo = this.config.itemInfo || this.config.webmap;
            this._createWebMap(itemInfo);
        },

        //Function to set the theme for application
        _switchStyle: function (themeName) {
            array.forEach(this.themes, lang.hitch(this, function (currentTheme) {
                if (themeName == currentTheme.id) {
                    var themeNode = domConstruct.create("link", {
                        rel: "stylesheet",
                        type: "text/css",
                        href: currentTheme.url
                    });
                    domConstruct.place(themeNode, query("head")[0]);
                    // Add identifying theme class to the body
                    domClass.add(document.body, "geoform-" + currentTheme.id);
                }
            }));
        },

        // Open modal
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

        // Share modal content
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

        //Function to show left panel options
        _showLeftPanel: function (currentNode) {
            domStyle.set(dom.byId("searchPanelBody"), 'display', 'none');
            domStyle.set(dom.byId("aboutusPanelBody"), 'display', 'none');
            domStyle.set(dom.byId("legendPanelBody"), 'display', 'none');
            domStyle.set(dom.byId("mapPanelBody"), 'display', 'none');
            if (domAttr.get(currentNode, "id") === "legend") {
                domStyle.set(dom.byId("legendPanelBody"), 'display', 'block');
            }
            if (domAttr.get(currentNode, "id") === "search") {
                domStyle.set(dom.byId("searchPanelBody"), 'display', 'block');
            }
            if (domAttr.get(currentNode, "id") === "aboutUs") {
                domStyle.set(dom.byId("aboutusPanelBody"), 'display', 'block');
            }
            if (domAttr.get(currentNode, "id") === "Map") {
                domStyle.set(dom.byId("mapPanelBody"), 'display', 'block');
                domConstruct.place(dom.byId("mapDiv"), dom.byId("mapPanelBody"), "first");
                this._resizeMap();
                domConstruct.place(dom.byId("featureDetailsContainer"), dom.byId("mapPanelBody"), "last");
            }
        },

        // create a map based on the input web map id
        _createWebMap: function (itemInfo) {
            var toggle, layers, submitFormButtonNode;
            bootstrapmap.createWebMap(itemInfo, dom.byId("mapDiv"), {
                editable: true,
                bingMapsKey: this.config.bingKey,
                scrollWheelZoom: true
            }).then(lang.hitch(this, function (response) {
                this.layerInfos = arcgisUtils.getLegendLayers(response);
                this.map = response.map;
                this._initLegend();
                this.defaultExtent = this.map.extent;
                // make graphics layer
                this._gl = new GraphicsLayer();
                this.map.addLayer(this._gl);
                this._setLayerDefaults();
                domClass.remove(document.body, "app-loading");
                this._createGeocoders();
                toggle = new BasemapToggle({
                    map: this.map,
                    basemap: "topo",
                    defaultBasemap: "hybrid"
                }, dom.byId("toggleContainer"));
                toggle.startup();
                layers = this.map.getLayersVisibleAtScale(this.map.getScale());
                this._queryLayer(this._formLayer);
                this._updatePaginationMessage(false);
                on.once(this.map, 'basemap-change', lang.hitch(this, function () {
                    for (var i = 0; i < layers.length; i++) {
                        var layer;
                        if (layers[i]._basemapGalleryLayerType) {
                            layer = this.map.getLayer(layers[i].id);
                            this.map.removeLayer(layer);
                        }
                    }
                }));
                on(this.map, "click", lang.hitch(this, function () {
                    if (this.map.infoWindow.isShowing) {
                        this.map.infoWindow.hide();
                    }

                }));
                on(this._formLayer, "click", lang.hitch(this, function (evt) {
                    this.map.infoWindow.hide();
                    if (evt.graphic && evt.mapPoint) {
                        array.forEach(this._formLayer.renderer.infos, lang.hitch(this, function (currentInfo) {
                            if (currentInfo.value === evt.graphic.attributes[this._formLayer.renderer.attributeField]) {
                                var graphicSVG = new Graphic(new Point([evt.graphic.geometry.x, evt.graphic.geometry.y], this.map.spatialReference), this._createSVGSymbol(currentInfo.symbol.size));
                                this.selectedGraphics.clear();
                                this.selectedGraphics.add(graphicSVG);
                                if (!this.map.getLayer("highlightedGraphic")) {
                                    this.map.addLayer(this.selectedGraphics);
                                }
                            }
                        }));
                        this._executeQueryTask(evt.mapPoint).then(lang.hitch(this, function (result) {
                            var objectIdField = this._formLayer.objectIdField;
                            array.forEach(query('.formlist .list-group-item'), lang.hitch(this, function (node) {
                                if (domClass.contains(node, "active")) {
                                    domClass.remove(node, "active");
                                }
                                if (domAttr.get(node, "fieldValue") === result.features[0].attributes[objectIdField].toString()) {
                                    domClass.add(node, "active");
                                }
                            }));
                        }));
                    }
                }));
                on(dom.byId("nextFeature"), "click", lang.hitch(this, function () {
                    this._resetPaginationArrows(dom.byId("nextFeature"), true);
                }));

                on(dom.byId("prevFeature"), "click", lang.hitch(this, function () {
                    this._resetPaginationArrows(dom.byId("prevFeature"), false);
                }));

                submitFormButtonNode = dom.byId("submitForm");
                on(submitFormButtonNode, "click", lang.hitch(this, function () {
                    var urlString;
                    if (this.config.appid) {
                        urlString = "index.html" + "?appid=" + this.config.appid;
                    } else {
                        urlString = "index.html";
                    }
                    window.location.assign(urlString);
                }));
            }));
        },

        _resetPaginationArrows: function (node, isNextRecord) {
            if (!domClass.contains(node, "disabled")) {
                domClass.remove(node, "disabled");
                if (isNextRecord) {
                    this.currentFeatureIndex++;
                    if (this.currentFeatureIndex >= this.carouselPaulData.totalFeatures.length) {
                        domClass.add(dom.byId("nextFeature"), "disabled");
                        domClass.remove(dom.byId("prevFeature"), "disabled");
                    } else {
                        domClass.remove(dom.byId("prevFeature"), "disabled");
                    }
                } else {
                    this.currentFeatureIndex--;
                    if (this.currentFeatureIndex <= 0) {
                        domClass.add(dom.byId("prevFeature"), "disabled");
                        domClass.remove(dom.byId("nextFeature"), "disabled");
                    } else {
                        domClass.remove(dom.byId("nextFeature"), "disabled");
                    }
                }
                this._mapClicked(this.carouselPaulData.tableAttributes[this.currentFeatureIndex]);
                this._highlightMapGraphics(this.carouselPaulData.tableAttributes[this.currentFeatureIndex]);
                if ((this.currentFeatureIndex + 1) === this.carouselPaulData.totalFeatures) {
                    domClass.add(node, "disabled");
                }
                this._updatePaginationMessage(true);
            }
        },
        //function will  check whether the layer is hosted or not
        //If layer is hosted or layer supports pagination then data will be fetched in small chunks with geometry
        //Otherwise only objectIds and display fields will be fetched
        _queryLayer: function (layer) {
            var i = 1;
            var queryTask, queryLayer, currentClass;
            queryTask = new QueryTask(this._formLayer.url);
            queryLayer = new Query();
            queryLayer.where = "1=1";
            queryLayer.outSpatialReference = this.map.spatialReference;
            if (domClass.contains(dom.byId("btnSortByOrder"), "ascending")) {
                currentClass = "ASC";
            } else {
                currentClass = "DESC";
            }
            queryLayer.orderByFields = [dom.byId("sortbyInput").value + " " + currentClass];
            if (array.indexOf(this._formLayer.url.split('/'), "rest") == 5) {
                //Hosted layer, data can be fetched in small chunks
                queryLayer.num = this.numberOfRecords;//This value will be configurable
                queryLayer.start = this.featureCount;
                this.featureCount += this.numberOfRecords;
                this.isHosted = true;
                queryLayer.returnGeometry = true;
                queryLayer.outFields = ["*"];
            } else {
                //Fetch all features
                queryLayer.outFields = [layer.objectIdField + "," + this.displayFields];
            }
            queryTask.execute(queryLayer, lang.hitch(this, function (results) {
                var records = [];
                if (this.isHosted) {
                    this.layerPagination.push(results.features);
                } else {
                    array.forEach(results.features, lang.hitch(this, function (currentFeatureSet, index) {
                        //divide the features in small groups
                        if (index % this.numberOfRecords === 0 && index !== 0) {
                            this.layerPagination.push(records);
                            i++;
                            records = [];
                        }
                        records.push(currentFeatureSet);
                    }));
                }
                //populate the features in left panel
                this._populateFeatures(this._formLayer, this.pageIndex);
            }));
        },

        //function to create legend of webmap
        _initLegend: function () {
            this._mapLegend = new Legend({
                map: this.map,
                layerInfos: this.layerInfos
            }, dom.byId("legendPanelBody"));
            this._mapLegend.startup();
        },

        //set defaults for layer
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
                if (!this.config.selectedTitleField) {
                    this.config.selectedTitleField = this._formLayer.displayField;
                }
            }
            this._populateSortOptions(this._formLayer);
        },

        //function to create sort options in dropdown
        _populateSortOptions: function (_formLayer) {
            var currentConfig = this.config, SortOption;
            domConstruct.create("option", {
                "label": currentConfig.selectedTitleField,
                "value": currentConfig.selectedTitleField
            }, dom.byId("sortbyInput"));
            this.displayFields = currentConfig.selectedTitleField + ",";
            array.forEach(_formLayer.fields, lang.hitch(this, function (currentfield) {
                //Populate all date type fields in sort drop down
                if (currentfield.type === "esriFieldTypeDate" && currentConfig.selectedTitleField !== currentfield.name) {
                    SortOption = domConstruct.create("option", {
                        "value": currentfield.name,
                        "innerHTML": currentfield.alias
                    }, dom.byId("sortbyInput"));
                    this.displayFields += currentfield.name + ",";
                }
            }));
            on(dom.byId("sortbyInput"), "change", lang.hitch(this, function () {
                this._sortByOrder();
            }));
        },


        // function to populate the list of features of layer in a listview
        _populateFeatures: function (_formLayer, layerPageIndex) {
            var currentConfig = this.config, graphicAttribute, listContainer, listElement, listItem, titleField;
            graphicAttribute = this._mergeLayerPages(layerPageIndex);
            domConstruct.empty(dom.byId("formlist"));
            if (_formLayer) {
                listContainer = dom.byId("formlist");
                listElement = domConstruct.create("ul", { "id": "featureList", "class": "list-group formListContent" }, listContainer);
                array.forEach(graphicAttribute, lang.hitch(this, function (currentKey, index) {
                    listItem = domConstruct.create("li", { "class": "list-group-item", "id": index }, listElement);
                    domConstruct.create("a", { href: "#" }, listItem);
                    titleField = currentConfig.selectedTitleField;
                    var listTitle = currentKey.attributes[titleField];
                    domAttr.set(listItem, "fieldValue", currentKey.attributes[_formLayer.objectIdField]);
                    this._fetchListTitle(_formLayer, listTitle, titleField, false, listItem, listItem);
                    on(listItem, 'click', lang.hitch(this, function (evt) {
                        var activeListElement = query(".active", listElement), HeaderNode = query('.nav-tabs', dom.byId("panelHeader"));
                        if (activeListElement.length > 0) {
                            domClass.remove(query(".active", listElement)[0], "active");
                        }
                        domClass.add(evt.currentTarget, "active");
                        if ($(window).width() <= 767) {
                            array.some(HeaderNode[0].children, lang.hitch(this, function (currentNode) {
                                if (domClass.contains(currentNode, "active")) {
                                    domClass.remove(currentNode, "active");
                                }
                            }));
                            this._showTabsMobileView();
                        }
                        this._updatePaginationMessage(false);
                        if (this.map.infoWindow.isShowing) {
                            this.map.infoWindow.hide();
                        }
                        this._showFeatureDetails(evt.currentTarget, graphicAttribute);
                    }));
                    if (index === 0) {
                        this._showFeatureDetails(listItem, graphicAttribute);
                        domClass.add(listItem, "active");
                    }
                }));
                listItem = domConstruct.create("li", { "class": "list-group-item" }, listElement);
                var loadMoreButton = domConstruct.create("button", { "class": "btn btn-primary", "innerHTML": "Load More" }, listItem);
                on(loadMoreButton, "click", lang.hitch(this, function () {
                    this.pageIndex++;
                    this._queryLayer(this._formLayer);
                    this._formLayer.redraw();
                }));
            }
        },

        //Merge features as user clicks on load more button
        _mergeLayerPages: function (index) {
            var newGraphicsArray = [];
            array.some(this.layerPagination, lang.hitch(this, function (currentGraphicsArray, pageIndex) {
                if (pageIndex <= index) {
                    array.forEach(currentGraphicsArray, function (currentGraphic) {
                        newGraphicsArray.push(currentGraphic);
                    });
                }
            }));
            return newGraphicsArray;
        },

        //Update the result panel table as user clicks on list or map
        _fetchListTitle: function (_formLayer, listTitle, titleField, isPanelTitle, listItem) {
            array.forEach(_formLayer.fields, lang.hitch(this, function (currentField) {
                if (currentField.name === titleField) {
                    if (currentField.type == "esriFieldTypeDate") {
                        listTitle = new Date(listTitle).toLocaleString();
                        if (listItem) {
                            domAttr.set(listItem, "innerHTML", listTitle ? listTitle : "na");
                        }
                    }
                    else {
                        if (listTitle && lang.trim(listTitle)) {
                            listTitle = lang.trim(listTitle);
                        } else {
                            listTitle = "na";
                        }
                        if (listItem) {
                            domAttr.set(listItem, "innerHTML", listTitle);
                        }
                    }
                }
                if (isPanelTitle) {
                    domAttr.set(dom.byId("panelTitle"), "innerHTML", listTitle);
                }
            }));
        },

        _executeQueryTask: function (mapPoint) {
            var queryTask, queryLayer, currentDate = new Date().getTime().toString(), deferred;
            queryTask = new QueryTask(this._formLayer.url);
            queryLayer = new Query();
            queryLayer.where = currentDate + "=" + currentDate;
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = true;
            queryLayer.geometry = this._extentFromPoint(mapPoint);
            queryLayer.outFields = ["*"];
            deferred = new Deferred();
            queryTask.execute(queryLayer, lang.hitch(this, function (results) {
                this.carouselPaulData["totalFeatures"] = results.features.length;
                this.carouselPaulData["tableAttributes"] = results.features;
                this.currentFeatureIndex = 0;
                domClass.add(dom.byId("prevFeature"), "disabled");
                domClass.remove(dom.byId("nextFeature"), "disabled");
                this._mapClicked(results.features[this.currentFeatureIndex]);
                if (results.features.length > 1) {
                    this._updatePaginationMessage(true);
                } else {
                    this._updatePaginationMessage(false);
                }
                deferred.resolve(results);

            }), function (err) {
                alert(err.message);
                deferred.reject();
            });
            return deferred.promise;
        },

        _extentFromPoint: function (point) {
            var tolerance, screenPoint, pnt1, pnt2, mapPoint1, mapPoint2;
            tolerance = 10;
            screenPoint = this.map.toScreen(point);
            pnt1 = new esri.geometry.Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
            pnt2 = new esri.geometry.Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
            mapPoint1 = this.map.toMap(pnt1);
            mapPoint2 = this.map.toMap(pnt2);
            return new esri.geometry.Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, this.map.spatialReference);
        },
        //create svg symbol based on features selected on map
        _createSVGSymbol: function (size) {
            var sls = new esri.symbol.SimpleLineSymbol(
                esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                new esri.Color([0, 255, 255]),
                2), markerSymbol;
            markerSymbol = new esri.symbol.SimpleMarkerSymbol();
            markerSymbol.setPath(this.iconPathSVG);
            markerSymbol.setOutline(sls);
            markerSymbol.setSize(size + 15);
            markerSymbol.setColor(null);
            return markerSymbol;
        },

        // function to show the Details of the feature of layer in a table
        _showFeatureDetails: function (listItem, graphicAttribute) {
            var featureInfoContainer;
            featureInfoContainer = dom.byId("featureDetailsBody");
            domConstruct.empty(featureInfoContainer);
            var queryTask, queryLayer, objectIdField = this._formLayer.objectIdField;
            if (!this.isHosted) {
                queryTask = new QueryTask(this._formLayer.url);
                queryLayer = new Query();
                queryLayer.where = objectIdField + "='" + domAttr.get(listItem, "fieldValue") + "'";
                queryLayer.outSpatialReference = this.map.spatialReference;
                queryLayer.returnGeometry = true;
                queryLayer.outFields = ["*"];
                deferred = new Deferred();
                queryTask.execute(queryLayer, lang.hitch(this, function (result) {
                    var key;
                    this._highlightMapGraphics(result.features[0]);
                    var layerGraphicsAttributes = result.features[0].attributes;
                    var layerGraphics = result.features[0];
                    for (key in layerGraphicsAttributes) {
                        var attributeValue = layerGraphicsAttributes[key];
                        if (this.config.selectedTitleField === key) {
                            this._fetchListTitle(this._formLayer, attributeValue, this.config.selectedTitleField, true, listItem);
                        }
                        this._createFeatureDetailsContainer(key, attributeValue, layerGraphics);
                    }
                    this.map.centerAt(result.features[0].geometry);
                    return true;
                }));

            } else {
                var selectedFeature, selectedFeatureObjId = domAttr.get(listItem, "fieldValue");
                array.some(graphicAttribute, function (featureItem) {
                    if (featureItem.attributes[objectIdField].toString() === selectedFeatureObjId) {
                        selectedFeature = featureItem;
                        return true;
                    }
                });
                this._highlightMapGraphics(selectedFeature);
                var key, layerGraphicsAttributes;
                layerGraphicsAttributes = selectedFeature.attributes;
                for (key in layerGraphicsAttributes) {
                    var attributeValue = layerGraphicsAttributes[key];
                    if (this.config.selectedTitleField === key) {
                        this._fetchListTitle(this._formLayer, attributeValue, this.config.selectedTitleField, true, listItem);
                    }
                    this._createFeatureDetailsContainer(key, attributeValue, selectedFeature);
                }
                this.map.centerAt(selectedFeature.geometry);
            }
            domStyle.set(dom.byId("featureDetailsContainer"), "display", "block");
        },
        //Function internally calls other function to create SVG symbol and then highlights it on map
        _highlightMapGraphics: function (result) {
            array.some(this._formLayer.renderer.infos, lang.hitch(this, function (currentInfo) {
                if (currentInfo.value === result.attributes[this._formLayer.renderer.attributeField]) {
                    var graphicSVG = new Graphic(new Point([result.geometry.x, result.geometry.y], this.map.spatialReference), this._createSVGSymbol(currentInfo.symbol.size));
                    this.selectedGraphics.clear();
                    this.selectedGraphics.add(graphicSVG);
                    this.map.centerAt(result.geometry);
                    if (!this.map.getLayer("highlightedGraphic")) {
                        this.map.addLayer(this.selectedGraphics);
                    }
                    return true;
                }
            }));
        },

        //Function to show details of feature clicked on map
        _mapClicked: function (graphics) {
            var  featureInfoContainer;
            featureInfoContainer = dom.byId("featureDetailsBody");
            domConstruct.empty(featureInfoContainer);
            for (var key in graphics.attributes) {
                var attributeValue = graphics.attributes[key];
                if (this.config.selectedTitleField === key) {
                    this._fetchListTitle(this._formLayer, attributeValue, this.config.selectedTitleField, false);
                }
                this._createFeatureDetailsContainer(key, attributeValue, graphics);
            }
        },

        //function to create table and show details of features
        _createFeatureDetailsContainer: function (key, attributeValue, graphics) {
            var fields = this._formLayer.infoTemplate.info.fieldInfos, fieldRow, fieldKeyTD, fieldAttrTD;
            array.forEach(fields, lang.hitch(this, function (currentfield) {
                array.some(this._formLayer.fields, lang.hitch(this, function (layerField) {
                    if (layerField.name == key && layerField.type == "esriFieldTypeDate") {
                        attributeValue = new Date(graphics.attributes[key]).toLocaleString();
                        return true;
                    }
                }));
                if (key === currentfield.fieldName && currentfield.visible) {
                    fieldRow = domConstruct.create("tr", {
                }, dom.byId("featureDetailsBody"));
                fieldKeyTD = domConstruct.create("td", {
                    className: "drag-cursor",
                    innerHTML: key
                }, fieldRow);
                fieldAttrTD = domConstruct.create("td", {
                    className: "drag-cursor",
                    innerHTML: attributeValue
                }, fieldRow);
                domStyle.set(dom.byId("featureDetailsContainer"), "display", "block");
            }
        }));
    },

    //function to update pagination to show all feature details
    _updatePaginationMessage: function (isPaginationRequired) {
        if (isPaginationRequired) {
            domAttr.set(dom.byId("paginationMessage"), "innerHTML", +(this.currentFeatureIndex + 1) + " of " + (this.carouselPaulData.totalFeatures));
            domStyle.set(dom.byId("featurePagination"), "display", "block");
        } else {
            domStyle.set(dom.byId("featurePagination"), "display", "none");
            domConstruct.empty(dom.byId("paginationMessage"));
        }
    },

    //function of sort feature
    _sortByOrder: function () {
        this.layerPagination = [];
        this.pageIndex = 0;
        this.featureCount = 0;
        if (domClass.contains(dom.byId("btnSortByOrder"), "ascending")) {
            domClass.replace(dom.byId("btnSortByOrder"), "descending", "ascending");
        } else {
            domClass.replace(dom.byId("btnSortByOrder"), "ascending", "descending");
        }

        this._queryLayer(this._formLayer);
    },
    _createGeocoderOptions: function () {
        var hasEsri = false, esriIdx, geocoders = lang.clone(this.config.helperServices.geocode), options;
        // default options
        options = {
            map: this.map,
            autoNavigate: true,
            autoComplete: true,
            arcgisGeocoder: {
                placeholder: nls.viewer.geocoderPlaceholderText
            },
            geocoders: null
        };
        //only use geocoders with a url defined
        geocoders = array.filter(geocoders, function (geocoder) {
            if (geocoder.url) {
                return true;
            }
            else {
                return false;
            }
        });
        // at least 1 geocoder defined
        if (geocoders.length) {
            // each geocoder
            array.forEach(geocoders, lang.hitch(this, function (geocoder) {
                // if esri geocoder
                if (geocoder.url && geocoder.url.indexOf(".arcgis.com/arcgis/rest/services/World/GeocodeServer") > -1) {
                    hasEsri = true;
                    geocoder.name = "Esri World Geocoder";
                    geocoder.outFields = "Match_addr, stAddr, City";
                    geocoder.singleLineFieldName = "SingleLine";
                    geocoder.esri = true;
                    geocoder.placefinding = true;
                    geocoder.placeholder = nls.viewer.geocoderPlaceholderText;
                }
            }));
            //only use geocoders with a singleLineFieldName that allow placefinding unless its custom
            geocoders = array.filter(geocoders, function (geocoder) {
                if (geocoder.name && geocoder.name === "Custom") {
                    return (esriLang.isDefined(geocoder.singleLineFieldName));
                } else {
                    return (esriLang.isDefined(geocoder.singleLineFieldName) && esriLang.isDefined(geocoder.placefinding) && geocoder.placefinding);
                }
            });
            // if we have an esri geocoder
            if (hasEsri) {
                for (var i = 0; i < geocoders.length; i++) {
                    if (esriLang.isDefined(geocoders[i].esri) && geocoders[i].esri === true) {
                        esriIdx = i;
                        break;
                    }
                }
            }
            // set autoComplete
            options.autoComplete = hasEsri;
            // set esri options
            if (hasEsri) {
                options.minCharacters = 0;
                options.maxLocations = 5;
                options.searchDelay = 100;
            }
            //If the World geocoder is primary enable auto complete
            if (hasEsri && esriIdx === 0) {
                options.arcgisGeocoder = geocoders.splice(0, 1)[0]; //geocoders[0];
                if (geocoders.length > 0) {
                    options.geocoders = geocoders;
                }
            } else {
                options.arcgisGeocoder = false;
                options.geocoders = geocoders;
            }
        }
        return options;
    },

        // create geocoder widgets
        _createGeocoders: function () {
            // get options
            var createdOptions = this._createGeocoderOptions();
            // desktop geocoder options
            var desktopOptions = lang.mixin({}, createdOptions, {
                theme: this.css.desktopGeocoderTheme
            });
            // mobile geocoder options
            var mobileOptions = lang.mixin({}, createdOptions, {
                theme: this.css.mobileGeocoderTheme
            });
            // desktop size geocoder
            this._geocoder = new Geocoder(desktopOptions, dom.byId("geocoderSearch"));
            this._geocoder.startup();
            // geocoder results
            on(this._geocoder, 'find-results', lang.hitch(this, function (response) {
                if (!response.results || !response.results.results || !response.results.results.length) {
                    alert(nls.viewer.noSearchResult);
                }
                else {
                    if ($(window).width() <= 767) {
                        this._showTabsMobileView();
                        this._resizeMap();
                    }
                }
            }));
            // mobile sized geocoder
            this._mobileGeocoder = new Geocoder(mobileOptions, dom.byId("geocoderMobile"));
            this._mobileGeocoder.startup();
            // geocoder results
            on(this._mobileGeocoder, 'find-results', lang.hitch(this, function (response) {
                if (!response.results || !response.results.results || !response.results.results.length) {
                    alert(nls.viewer.noSearchResult);
                }
                else {
                    this._showTabsMobileView();
                }
                this._hideMobileGeocoder();
            }));
            // keep geocoder values in sync
            this._geocoder.watch("value", lang.hitch(this, function () {
                var value = arguments[2];
                this._mobileGeocoder.set("value", value);
            }));
            // keep geocoder values in sync
            this._mobileGeocoder.watch("value", lang.hitch(this, function () {
                var value = arguments[2];
                this._geocoder.set("value", value);
            }));
            // geocoder nodes
            this._mobileGeocoderIconNode = dom.byId("mobileGeocoderIcon");
            this._mobileSearchNode = dom.byId("mobileSearch");
            this._mobileGeocoderIconContainerNode = dom.byId("mobileGeocoderIconContainer");
            // mobile geocoder toggle
            if (this._mobileGeocoderIconNode) {
                on(this._mobileGeocoderIconNode, "click", lang.hitch(this, function () {
                    if (domStyle.get(this._mobileSearchNode, "display") === "none") {
                        this._showMobileGeocoder();
                    } else {
                        this._hideMobileGeocoder();
                    }
                }));
            }
            var closeMobileGeocoderNode = dom.byId("btnCloseGeocoder");
            if (closeMobileGeocoderNode) {
                // cancel mobile geocoder
                on(closeMobileGeocoderNode, "click", lang.hitch(this, function () {
                    this._hideMobileGeocoder();
                }));
            }
        },
        _showMobileGeocoder: function () {
            if (this._mobileSearchNode && this._mobileGeocoderIconContainerNode) {
                domClass.add(this._mobileSearchNode, this.css.mobileSearchDisplay);
            }
        },
        _hideMobileGeocoder: function () {
            if (this._mobileSearchNode && this._mobileGeocoderIconContainerNode) {
                domClass.remove(this._mobileSearchNode, this.css.mobileSearchDisplay);
                domStyle.set(this._mobileSearchNode, "display", "none");
            }
        }
    });
});