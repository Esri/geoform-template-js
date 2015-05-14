define([
    "require",
    // For emitting events
    "dojo/Evented",
    // needed to create a class
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    // widget class
    "dijit/_WidgetBase",
    // accessibility click
    "dijit/a11yclick",
    // templated widget
    "dijit/_TemplatedMixin",
    // handle events
    "dojo/on",
    // load template
    "dojo/text!./FeatureNav/templates/FeatureNav.html",
    // localization
    "dojo/i18n!./FeatureNav/nls/FeatureNav",
    "esri/tasks/query",
    "dojo/string",
    "dojo/query",
    "dojo/keys",
    "dojo/date/locale",
    // dom manipulation
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/dom-attr",
    "dojo/Deferred",
    "dojo/window",
    "dojo/promise/all",
    // wait for dom to be ready
    "dojo/domReady!"
],
  function (
    require,
    Evented,
    declare, lang, array,
    _WidgetBase, a11yclick, _TemplatedMixin,
    on,
    dijitTemplate,
    i18n,
    Query,
    string,
    query,
    keys,
    locale,
    domStyle, domClass, domAttr,
    Deferred,
    win,
    all
  ) {
    return declare([_WidgetBase, _TemplatedMixin, Evented], {
      // my html template string
      templateString: dijitTemplate,
      declaredClass: "dijit.FeatureNav",
      reHostedFS: /https?:\/\/services.*\.arcgis\.com/i,
      fieldsRegex: /(?:\$\{([^}]+)\})/g,

      // default options
      options: {
        theme: "FeatureNav",
        map: null,
        sources: [],
        num: 10,
        start: 0,
        count: 0,
        searchTerm: "",
        order: "ASC",
        sortField: null,
        activeSourceIndex: 0,
        pagination: true,
        visible: true
      },

      /* ---------------- */
      /* Lifecycle methods */
      /* ---------------- */
      constructor: function (options, srcRefNode) {
        // css classes
        this.css = {
          list: "list-group",
          listItem: "list-group-item",
          active: "active",
          alert: "alert",
          alertInfo: "alert-info",
          alertWarning: "alert-warning",
          panel: "panel",
          panelBody: "panel-body",
          panelDefault: "panel-default",
          pullRight: "pull-right",
          pullLeft: "pull-left",
          btn: "btn",
          btnDefault: "btn-default",
          glyphIcon: "glyphicon",
          refresh: "glyphicon-refresh",
          refreshAnimate: "glyphicon-refresh-animate",
          sortAsc: "glyphicon-triangle-top",
          sortDesc: "glyphicon-triangle-bottom",
          search: "glyphicon-search",
          inputGroup: "input-group",
          inputGroupBtn: "input-group-btn",
          form: "form",
          formInline: "form-inline",
          formGroup: "form-group",
          formControl: "form-control",
          hidden: "hidden"
        };
        // language
        this._i18n = i18n;
        this._dataObjectId = "data-objectid";
        this._deferreds = [];
        // mix in settings and defaults
        var defaults = lang.mixin({}, this.options, options);
        // create the DOM for this widget
        this.domNode = srcRefNode;
        // set properties
        this.set("theme", defaults.theme);
        this.set("map", defaults.map); // readonly todo
        this.set("sources", defaults.sources);
        this.set("num", defaults.num);
        this.set("searchTerm", defaults.searchTerm);
        this.set("start", defaults.start);
        this.set("order", defaults.order);
        this.set("sortField", defaults.sortField);
        this.set("activeSourceIndex", defaults.activeSourceIndex);
        this.set("visible", defaults.visible);
        this.set("count", defaults.count);
        this.set("pagination", defaults.pagination); // readonly todo
      },
      // _TemplatedMixin implements buildRendering() for you. Use this to override
      // buildRendering: function() {},
      // called after buildRendering() is finished
      postCreate: function () {
        if (this.pagination) {
          require(["./Pagination"], lang.hitch(this, function (Pagination) {
            this._pagination = new Pagination({
              num: this.num
            }, this._paginationNode);
            this._pagination.startup();
            this._paginationEvent = on.pausable(this._pagination, "page", lang.hitch(this, function (e) {
              this.set("start", e.selectedResultStart);
            }));
            this.own(this._paginationEvent);
          }));
        }
        this._displaySources();
        // set visibility
        this._updateVisible();
        var _self = this;
        this.own(on(this._layerNode, "change", lang.hitch(this, this._layerChange)));
        this.own(on(this._sortNode, "change", lang.hitch(this, this._sortChange)));
        this.own(on(this._orderNode, a11yclick, lang.hitch(this, this._orderClick)));
        this.own(on(this._resultsNode, "li:click", function () {
          _self._resultClick(this);
        }));
        this.own(on(this._searchBtnNode, a11yclick, lang.hitch(this, this._searchClick)));
        this.own(on(this._searchInputNode, "keypress", lang.hitch(this, function (evt) {
          var charOrCode = evt.charCode || evt.keyCode;
          if (charOrCode === keys.ENTER) {
            this._searchClick();
          }
        })));
        this.own(on(this.map.infoWindow, "selection-change", lang.hitch(this, function (e) {
          var graphic = this.map.infoWindow.getSelectedFeature();
          if (graphic) {
            var layer = graphic.getLayer();
            var source = this.sources[this.activeSourceIndex];
            if (layer && source && layer === source.featureLayer) {
              if (graphic) {
                var id = graphic.attributes[layer.objectIdField];
              }
              this._resultHighlight(id);
            }
          }
        })));
      },

      destroy: function () {

        if (this._pagination) {
          this._pagination.destroy();
        }

        this.inherited(arguments);
      },

      // start widget. called by user
      startup: function () {
        if (this.map) {
          // when map is loaded
          if (this.map.loaded) {
            this._init();
          } else {
            on.once(this.map, "load", lang.hitch(this, function () {
              this._init();
            }));
          }
        } else {
          this._init();
        }
      },
      /* ---------------- */
      /* Public Functions */
      /* ---------------- */
      show: function () {
        this.set("visible", true);
      },
      hide: function () {
        this.set("visible", false);
      },
      select: function (feature) {
        var sf = this._selectFeature(feature);
        var evt = {};
        sf.then(lang.hitch(this, function () {
          this.emit("select", evt);
        }), lang.hitch(this, function (error) {
          evt.error = error;
          this.emit("select", evt);
        }));
        return sf;
      },
      /* ---------------- */
      /* Private Functions */
      /* ---------------- */
      _displaySources: function () {
        var promises = [];
        var html = "";
        var sources = this.sources;
        if (sources && sources.length > 1) {
          for (var i = 0; i < sources.length; i++) {
            promises.push(this._featureLayerLoaded(sources[i].featureLayer));
          }
          all(promises).then(lang.hitch(this, function () {
            for (var i = 0; i < sources.length; i++) {
              var source = sources[i];
              var name = source.name || source.featureLayer.name;
              var value = i;
              html += "<option value=\"" + value + "\">" + name + "</option>";
            }
            domClass.remove(this._layerArea, this.css.hidden);

            this._layerNode.innerHTML = html;
          }));
        } else {
          domClass.add(this._layerArea, this.css.hidden);
        }
      },
      _sortChange: function () {
        this.set("sortField", this._sortNode.value);
      },
      _layerChange: function () {
        var value = this._layerNode.value;
        var intVal = parseInt(value, 10);
        this.set("activeSourceIndex", intVal);
      },
      _orderClick: function () {
        var order = this.order.toUpperCase();
        var newOrder = "ASC";
        if (order === "ASC") {
          newOrder = "DESC";
        }
        this.set("order", newOrder);
      },
      _searchClick: function () {
        this.set("searchTerm", this._searchInputNode.value);
      },
      _updateOrder: function () {
        var title, text;
        var order = this.order.toUpperCase();
        if (order === "DESC") {
          domClass.add(this._orderIconNode, this.css.sortDesc);
          domClass.remove(this._orderIconNode, this.css.sortAsc);
          title = i18n.descending;
          text = i18n.desc;
        } else {
          domClass.remove(this._orderIconNode, this.css.sortDesc);
          domClass.add(this._orderIconNode, this.css.sortAsc);
          title = i18n.ascending;
          text = i18n.asc;
        }
        this._orderTextNode.innerHTML = text;
        domAttr.set(this._orderNode, "title", title);
      },
      _updateFieldsMenu: function () {
        var source = this.sources[this.activeSourceIndex];
        var layer = source.featureLayer;
        this._featureLayerLoaded(layer).then(lang.hitch(this, function () {
          var fields = [];
          if (source.template) {
            source.template.replace(this.fieldsRegex, function (match, key, format) {
              fields.push(key);
            });
          }
          var html = "";

          if (fields && fields.length > 1) {
            array.forEach(layer.fields, function (item) {
              if (array.indexOf(fields, item.name) !== -1) {
                var alias = item.alias || item.name;
                html += "<option value=\"" + item.name + "\">" + alias + "</option>";
              }
            });
            domClass.remove(this._sortFieldArea, this.css.hidden);
          } else {
            domClass.add(this._sortFieldArea, this.css.hidden);
          }
          this._sortNode.innerHTML = html;
          if (fields[0]) {
            this.sortField = fields[0];
          } else {
            this.sortField = null;
          }
        }));
      },
      _removeResultsHighlight: function () {
        var q = query("li", this._resultsNode);
        for (var i = 0; i < q.length; i++) {
          domClass.remove(q[i], this.css.active);
        }
      },
      _resultHighlight: function (id, scrollIntoView) {
        this._removeResultsHighlight();
        var q = query("li[" + this._dataObjectId + "=" + id + "]", this._resultsNode);
        for (var i = 0; i < q.length; i++) {
          domClass.add(q[i], this.css.active);
          var active = domClass.contains(q[i], this.css.active);
          if (!active) {
            win.scrollIntoView(q[i]);
          }
        }
      },
      _resultClick: function (e) {
        var objectid = domAttr.get(e, this._dataObjectId);
        var active = domClass.contains(e, this.css.active);
        if (!active) {
          win.scrollIntoView(this.map.container);
          this._selectObject(e, objectid).then(lang.hitch(this, function (feature) {
            this.select(feature);
          }));
        }
      },
      _cancelDeferreds: function () {
        // if we have deferreds
        if (this._deferreds && this._deferreds.length) {
          for (var i = 0; i < this._deferreds.length; i++) {
            // cancel deferred
            this._deferreds[i].cancel(this.declaredClass + " cancelling request");
          }
        }
        // remove deferreds
        this._deferreds = [];
      },
      _selectObject: function (e, objectid) {
        var def = new Deferred();
        // show spinner
        var item = query("." + this.css.refresh, e);
        if (item && item.length) {
          domClass.remove(item[0], this.css.hidden);
        }
        this._cancelDeferreds();
        this._resultHighlight(objectid);
        var layer = this.sources[this.activeSourceIndex].featureLayer;
        var q = new Query();
        q.outSpatialReference = this.map.spatialReference;
        q.returnGeometry = true;
        q.where = layer.objectIdField + "=" + objectid;
        layer.queryFeatures(q, lang.hitch(this, function (featureSet) {
          // remove spinners
          var items = query("." + this.css.refresh);
          if (items && items.length) {
            for (var i = 0; i < items.length; i++) {
              domClass.add(items[i], this.css.hidden);
            }
          }
          var feature;
          if (featureSet && featureSet.features && featureSet.features.length) {
            feature = featureSet.features[0];
          }
          def.resolve(feature);
        }), lang.hitch(this, function (error) {
          def.reject(error);
        }));
        this._deferreds.push(def);
        return def.promise;
      },
      // note: feature service helper for searches
      _containsNonLatinCharacter: function (s) {
        for (var i = 0; i < s.length; i++) {
          if (s.charCodeAt(i) > 255) {
            return true;
          }
        }
        return false;
      },
      _selectFeature: function (feature) {
        var def = new Deferred();
        if (feature) {
          var geometry = feature.geometry;
          if (geometry && geometry.type) {
            var extent, point;
            switch (geometry.type) {
            case "extent":
              extent = geometry;
              point = extent.getCenter();
              break;
            case "multipoint":
              extent = geometry.getExtent();
              point = extent.getCenter();
              break;
            case "point":
              point = geometry;
              break;
            case "polygon":
              extent = geometry.getExtent();
              point = extent.getCenter();
              break;
            case "polyline":
              extent = geometry.getExtent();
              point = extent.getCenter();
              break;
            }
            var zoomTo;
            if (extent) {
              zoomTo = this.map.setExtent(extent, true);
            } else if (point) {
              zoomTo = this.map.centerAt(point);
            }
            if (zoomTo) {
              zoomTo.then(lang.hitch(this, function () {
                this.map.infoWindow.setFeatures([feature]);
                this.map.infoWindow.show(point);
                def.resolve();
              }));
            } else {
              def.reject(new Error(this.declaredClass + " No invalid feature geometry to zoom to"));
            }
          } else {
            def.reject(new Error(this.declaredClass + " Feature does not contain a geometry"));
          }
        } else {
          def.reject(new Error(this.declaredClass + " No feature to select"));
        }
        return def.promise;
      },
      _supportsPagination: function (source) {
        // check if featurelayer supports pagination
        var supported = false;
        if (source.featureLayer) {
          // supports pagination
          if (source.featureLayer.advancedQueryCapabilities && source.featureLayer.advancedQueryCapabilities.supportsPagination) {
            supported = true;
          }
        }
        return supported;
      },
      _whereClause: function (layer, searchFields) {
        var where = "1=1";
        if (this.searchTerm) {
          // Fix for non latin characters
          var nlc = "";
          // is hosted fs and has non latin char
          if (this.reHostedFS.test(layer.url) && this._containsNonLatinCharacter(this.searchTerm)) {
            nlc = "N";
          }
          if (searchFields && searchFields.length) {
            for (var i = 0; i < searchFields.length; i++) {
              if (i === 0) {
                where = "";
              } else {
                where += " or ";
              }
              var field = searchFields[i];
              var fieldInfo = layer.getField(field);
              if (fieldInfo.type === "esriFieldTypeString" || fieldInfo.type === "esriFieldTypeDate") {
                where += "UPPER(" + field + ") LIKE " + nlc + "'%" + this.searchTerm.toUpperCase() + "%'";
              } else {
                where += field + " = " + this.searchTerm;
              }
            }
          }
        }
        return where;
      },
      _getFeatureCount: function () {
        var def = new Deferred();
        var source = this.sources[this.activeSourceIndex];
        var layer = source.featureLayer;
        this._featureLayerLoaded(layer).then(lang.hitch(this, function () {
          // if pagination is supported
          source.supportsPagination = this._supportsPagination(source);
          var searchFields = [];
          if (source.template) {
            source.template.replace(this.fieldsRegex, function (match, key, format) {
              searchFields.push(key);
            });
          }
          var q = new Query();
          q.where = this._whereClause(layer, searchFields);
          // layer supports pagination
          if (source.supportsPagination) {
            q.returnGeometry = false;
            layer.queryCount(q, lang.hitch(this, function (response) {
              def.resolve(response);
            }), lang.hitch(this, function (error) {
              def.reject(error);
            }));
          } else {
            layer.queryIds(q, lang.hitch(this, function (response) {
              var l = 0;
              this._Ids = response;
              if (response && response.length) {
                l = response.length;
              }
              def.resolve(l);
            }), lang.hitch(this, function (error) {
              this._displayResults(layer, {
                features: []
              });
              def.reject(error);
            }));
          }
        }), lang.hitch(this, function (error) {
          def.reject(error);
        }));
        return def.promise;
      },
      _getFeatures: function () {
        var def = new Deferred();
        var source = this.sources[this.activeSourceIndex];
        var layer = source.featureLayer;
        if (this.map.infoWindow) {
          this.map.infoWindow.clearFeatures();
          this.map.infoWindow.hide();
        }
        this._featureLayerLoaded(layer).then(lang.hitch(this, function () {
          var performSearch = true;
          var fields = [],
            searchFields = [];
          if (source.template) {
            source.template.replace(this.fieldsRegex, function (match, key, format) {
              fields.push(key);
              searchFields.push(key);
            });
          }
          var hasObjectId = array.indexOf(fields, layer.objectIdField);
          if (hasObjectId === -1) {
            fields.push(layer.objectIdField);
          }
          var q = new Query();
          q.outSpatialReference = this.map.spatialReference;
          q.returnGeometry = false;
          if (layer.supportsAdvancedQueries && this.sortField) {
            q.orderByFields = [this.sortField + " " + this.order];
          }
          q.outFields = fields;
          if (source.supportsPagination) {
            q.where = this._whereClause(layer, searchFields);
            q.num = this.num;
            q.start = this.start;
          } else {
            var copy = lang.clone(this._Ids);
            var Ids = [];
            if (copy && copy.length) {
              Ids = copy.slice(this.start, this.start + this.num);
            }
            if (Ids && Ids.length) {
              q.objectIds = Ids;
            } else {
              performSearch = false;
            }
          }
          // loading spinner
          this._resultsNode.innerHTML = "<div class=\"" + this.css.alert + " " + this.css.alertInfo + "\" role=\"alert\"><span class=\"" + this.css.glyphIcon + " " + this.css.refresh + " " + this.css.refreshAnimate + "\"></span> " + this._i18n.loading + "</div>";
          if (performSearch) {
            layer.queryFeatures(q, lang.hitch(this, function (featureSet) {
              this._displayResults(layer, featureSet);
              def.resolve();
            }), lang.hitch(this, function (error) {
              this._displayResults(layer, {
                features: []
              });
              def.reject(error);
            }));
          } else {
            this._displayResults(layer, {
              features: []
            });
            def.resolve();
          }
        }), lang.hitch(this, function (error) {
          def.reject(error);
        }));
        return def.promise;
      },
      _init: function () {
        this._layerChanged().then(lang.hitch(this, function () {
          this.set("loaded", true);
          // emit event
          this.emit("load", {});
        }));
      },
      _sub: function (str, field) {
        if (!str) {
          return "";
        }
        var source = this.sources[this.activeSourceIndex];
        // format date fields
        if (source && source.featureLayer) {
          var fieldInfo = source.featureLayer.getField(field);
          if (fieldInfo && fieldInfo.type === "esriFieldTypeDate") {
            var d = new Date(str);
            var f = locale.format(d);
            return f;
          }
        }
        return str;
      },
      _displayResults: function (layer, featureSet) {
        var features = featureSet.features;
        var source = this.sources[this.activeSourceIndex];
        var t = source.template;
        var html = "";
        if (features && features.length) {
          html += "<ul class=\"" + this.css.list + "\">";
          for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var sub = string.substitute(t, feature.attributes, lang.hitch(this, this._sub));
            html += "<li class=\"" + this.css.listItem + "\" " + this._dataObjectId + "=\"" + feature.attributes[layer.objectIdField] + "\"><span class=\"" + this.css.glyphIcon + " " + this.css.refresh + " " + this.css.refreshAnimate + " " + this.css.hidden + " " + this.css.pullRight + "\"></span>" + sub + "</li>";
          }
          html += "</ul>";
        }
        if (!html) {
          html = "<div class=\"" + this.css.alert + " " + this.css.alertWarning + "\" role=\"alert\">" + this._i18n.noResults + "</div>";
        }
        this._resultsNode.innerHTML = html;
      },
      _featureLayerLoaded: function (layer) {
        var def = new Deferred();
        if(layer){
        if (layer.loaded) {
          // nothing to do
          def.resolve();
        } else if (layer.loadError) {
          def.reject(new Error(this._dijitName + " Layer failed to load."));
        } else {
          var loadedEvent, errorEvent;
          // once layer is loaded
          loadedEvent = on.once(layer, "load", lang.hitch(this, function () {
            errorEvent.remove();
            def.resolve();
          }));
          // error occurred loading layer
          errorEvent = on.once(layer, "error", lang.hitch(this, function () {
            loadedEvent.remove();
            def.reject(new Error(this._dijitName + " Layer could not be loaded."));
          }));
        }
        }
        else{
          def.reject();
        }
        return def.promise;
      },
      _updateVisible: function () {
        if (this.visible) {
          this.show();
        } else {
          this.hide();
        }
      },
      _layerChanged: function () {
        return this._getFeatureCount().then(lang.hitch(this, function (count) {
          this._updateFieldsMenu();
          this._updateOrder();
          this.set("count", count);
          this.set("start", 0);
        }));
      },
      /* ---------------- */
      /* Stateful Functions */
      /* ---------------- */
      _setActiveSourceIndexAttr: function (newVal) {
        this.activeSourceIndex = newVal;
        if (this._created) {
          this._layerChanged();
        }
      },
      _setNumAttr: function (newVal) {
        this.num = newVal;
        this.set("start", 0);
      },
      _setSourcesAttr: function (newVal) {
        this.sources = newVal;
        if (this._created) {
          this._displaySources();
        }
      },
      _setStartAttr: function (newVal) {
        this.start = newVal;
        if (this._created) {
          this._getFeatures();
        }
      },
      _setCountAttr: function (newVal) {
        this.count = newVal;
        if (this._created) {
          if (this._pagination) {
            this._paginationEvent.pause();
            this._pagination.set("total", newVal);
            this._pagination.set("page", 0);
            this._paginationEvent.resume();
          }
        }
      },
      _setOrderAttr: function (newVal) {
        this.order = newVal.toUpperCase();
        if (this._created) {
          this._updateOrder();
          if (this._pagination) {
            this._paginationEvent.pause();
            this._pagination.set("page", 0);
            this._paginationEvent.resume();
          }
          this.set("start", 0);
        }
      },
      _setSearchTermAttr: function (newVal) {
        this.searchTerm = newVal;
        if (this._created) {
          this._layerChanged();
        }
      },
      // note: changing the theme will require the developer to style the widget.
      _setThemeAttr: function (newVal) {
        if (this._created) {
          domClass.remove(this.domNode, this.theme);
          domClass.add(this.domNode, newVal);
        }
        this.theme = newVal;
      },
      _setSortFieldAttr: function (newVal) {
        this.sortField = newVal;
        if (this._created) {
          if (this._pagination) {
            this._paginationEvent.pause();
            this._pagination.set("page", 0);
            this._paginationEvent.resume();
          }
          this.set("start", 0);
        }
      },
      _setVisibleAttr: function (newVal) {
        this.visible = newVal;
        if (this._created) {
          this._updateVisible();
        }
      }
    });
  });