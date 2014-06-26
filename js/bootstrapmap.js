define([
    "dojo/_base/declare",
    "dojo/on",
    "dojo/touch",
    "dojo/dom",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/query",
    "esri/geometry/Point",
    "dojo/NodeList-traverse",
    "dojo/domReady!"
],
  function (
    declare,
    on,
    touch,
    dom,
    lang,
    style,
    query,
    Point
  ) {
    return declare(null, {
      _mapDivId: null,
      _mapDiv: null,
      _mapStyle: null,
      _map: null,
      _delay: 50,
      _visible: true,
      _visibilityTimer: null,
      _mapDeferred: null,
      constructor: function (map) {
        this._map = map;
        this._mapDivId = map.id;
        this._mapDiv = dom.byId(this._mapDivId);
        this._mapStyle = style.get(this._mapDiv);
        this._handles = [];
        //this._setMapDiv(true);
        this._bindEvents();
      },
      destroy: function () {
        if (this._handles) {
          var i = this._handles.length;
          while (i--) {
            this._handles[i].remove();
            this._handles.splice(i, 1);
          }
        }
      },
      _bindEvents: function () {
        if (!this._map) {
          console.log("BootstrapMap: Invalid map object. Please check map reference.");
          return;
        }
        // Touch behavior
        var setTouch = function () {
          this._setTouchBehavior();
        };
        if (this._map.loaded) {
          lang.hitch(this, setTouch).call();
        } else {
          this._handles.push(on(this._map, "load", lang.hitch(this, setTouch)));
        }
        // InfoWindow restyle and reposition
        var setInfoWin = function () {
          this._map.infoWindow.anchor = "top";
          var updatePopup = function (obj) {
            var f = obj._map.infoWindow.getSelectedFeature();
            if (f) {
              var pt;
              if (f.geometry.type == "point") {
                pt = f.geometry;
              } else {
                pt = f.geometry.getExtent().getCenter();
              }
              window.setTimeout(function () {
                obj._repositionInfoWin(pt);
              }, 250);
            }
          };
          // GraphicLayers
          on(this._map.graphics, "click", lang.hitch(this, function () {
            updatePopup(this);
          }));
          // FeatureLayers
          on(this._map.infoWindow, "selection-change", lang.hitch(this, function () {
            updatePopup(this);
          }));
          on.once(this._map.infoWindow, 'show', lang.hitch(this, function () {
            this._resizeInfoWin();
          }));
        };
        if (this._map.loaded) {
          lang.hitch(this, setInfoWin).call();
        } else {
          this._handles.push(on(this._map, "load", lang.hitch(this, setInfoWin)));
        }
        // Auto-center map
        var recenter = function () {
          this._map.__resizeCenter = this._map.extent.getCenter();
          var timer = function () {
            if (this._map.infoWindow.isShowing) {
              this._repositionInfoWin(this._map.infoWindow.location);
            }
            this._map.centerAt(this._map.__resizeCenter);
          };
          setTimeout(lang.hitch(this, timer), this._delay);
        };
        this._handles.push(on(this._map, "resize", lang.hitch(this, recenter)));
        var winResize = on(window, 'resize', lang.hitch(this, function () {
          this._map.resize();
          this._resizeInfoWin();
        }));
        this._handles.push(winResize);
      },
      _setTouchBehavior: function () {
        // Add desireable touch behaviors here
        if (this._map.hasOwnProperty("isScrollWheelZoom")) {
          if (this._map.isScrollWheelZoom) {
            this._map.enableScrollWheelZoom();
          } else {
            this._map.disableScrollWheelZoom();
          }
        } else {
          // Default
          this._map.disableScrollWheelZoom();
        }
        // Remove 300ms delay to close infoWindow on touch devices
        on(query(".esriPopup .titleButton.close"), touch.press, lang.hitch(this,
          function () {
            this._map.infoWindow.hide();
          }));
      },
      _resizeInfoWin: function () {
        if (this._map.infoWindow) {
          var iw, ih;
          var h = this._map.height;
          var w = this._map.width;
          // width
          if (w < 300) {
            iw = w * 0.75;
          } else if (w < 600) {
            iw = 200;
          } else {
            iw = 300;
          }
          // height
          if (h < 300) {
            ih = h * 0.5;
          } else if (h < 600) {
            ih = 200;
          } else {
            ih = 300;
          }
          this._map.infoWindow.resize(iw, ih);
        }
      },
      _repositionInfoWin: function (graphicCenterPt) {
        // Determine the upper right, and center, coordinates of the map
        var maxPoint = new Point(this._map.extent.xmax, this._map.extent.ymax, this._map.spatialReference);
        var centerPoint = new Point(this._map.extent.getCenter());
        // Convert to screen coordinates
        var maxPointScreen = this._map.toScreen(maxPoint);
        var centerPointScreen = this._map.toScreen(centerPoint);
        var graphicPointScreen = this._map.toScreen(graphicCenterPt); // Points only
        // Buffer
        var marginLR = 10;
        var marginTop = 3;
        var infoWin = this._map.infoWindow.domNode.childNodes[0];
        var infoWidth = infoWin.clientWidth;
        var infoHeight = infoWin.clientHeight + this._map.infoWindow.marginTop;
        // X
        var lOff = graphicPointScreen.x - infoWidth / 2;
        var rOff = graphicPointScreen.x + infoWidth / 2;
        var l = lOff - marginLR < 0;
        var r = rOff > maxPointScreen.x - marginLR;
        if (l) {
          centerPointScreen.x -= (Math.abs(lOff) + marginLR) < marginLR ? marginLR : Math.abs(lOff) + marginLR;
        } else if (r) {
          centerPointScreen.x += (rOff - maxPointScreen.x) + marginLR;
        }
        // Y
        var yOff = this._map.infoWindow.offsetY;
        var tOff = graphicPointScreen.y - infoHeight - yOff;
        var t = tOff - marginTop < 0;
        if (t) {
          centerPointScreen.y += tOff - marginTop;
        }
        //Pan the ap to the new centerpoint  
        if (r || l || t) {
          centerPoint = this._map.toMap(centerPointScreen);
          this._map.centerAt(centerPoint);
        }
      }
    });
  }); // define