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
            this._setMapDiv(true);
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
            };
            if (this._map.loaded) {
                lang.hitch(this, setInfoWin).call();
            } else {
                this._handles.push(on(this._map, "load", lang.hitch(this, setInfoWin)));
            }
            // Debounce window resize
            var debounce = function (func, threshold, execAsap) {
                var timeout;
                return function debounced() {
                    var obj = this,
                        args = arguments;

                    function delayed() {
                        if (!execAsap) {
                            func.apply(obj, args);
                        }
                        timeout = null;
                    }
                    if (timeout) {
                        clearTimeout(timeout);
                    } else if (execAsap) {
                        func.apply(obj, args);
                    }
                    timeout = setTimeout(delayed, threshold || 100);
                };
            };
            // Responsive resize
            var resizeWin = debounce(this._setMapDiv, 100, false);
            this._handles.push(on(window, "resize", lang.hitch(this, resizeWin)));
            // Auto-center map
            var recenter = function () {
                this._map.__resizeCenter = this._map.extent.getCenter();
                var timer = function () {
                    if (this._map.infoWindow.isShowing) {
                        this._repositionInfoWin(this._map.infoWindow.features[0]);
                    }
                    this._map.centerAt(this._map.__resizeCenter);
                };
                setTimeout(lang.hitch(this, timer), this._delay);
            };
            this._handles.push(on(this._map, "resize", lang.hitch(this, recenter)));
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
        _getMapDivVisibility: function () {
            return this._mapDiv.clientHeight > 0 || this._mapDiv.clientWidth > 0;
        },
        _checkVisibility: function () {
            var visible = this._getMapDivVisibility();
            if (this._visible !== visible) {
                if (visible) {
                    this._setMapDiv(true);
                }
            }
        },
        _controlVisibilityTimer: function (runTimer) {
            if (runTimer) {
                // Start a visibility change timer
                this._visibilityTimer = setInterval(lang.hitch(this, function () {
                    this._checkVisibility();
                }), 200);
            } else {
                // Stop timer we have checking for visibility change
                if (this._visibilityTimer) {
                    clearInterval(this._visibilityTimer);
                    this._visibilityTimer = null;
                }
            }
        },
        _setMapDiv: function (forceResize) {
            if (!this._mapDivId) {
                return;
            }
            // Get map visibility
            var visible = this._getMapDivVisibility();
            if (this._visible !== visible) {
                this._visible = visible;
                this._controlVisibilityTimer(!visible);
            }
            // Fill page with the map or match row height
            if (this._visible) {
                var windowH = window.innerHeight;
                var bodyH = document.body.clientHeight;
                var room = windowH - bodyH;
                var mapH = this._calcMapHeight();
                var colH = this._calcColumnHeight(mapH);
                var mh1 = mapH + room;
                var mh2 = 0;
                var inCol = false;
                // Resize to neighboring column or fill page
                if (mapH < colH) {
                    mh2 = (room > 0) ? colH + room : colH;
                    inCol = true;
                } else {
                    mh2 = (mh1 < colH) ? colH : mh1;
                    inCol = false;
                }
                // Expand map height
                style.set(this._mapDivId, {
                    "height": mh2 + "px",
                    "width": "100%"
                });
                // Force resize and reposition
                if (this._map && forceResize && this._visible) {
                    this._map.resize();
                    this._map.reposition();
                }
                //console.log("Win:" + windowH + " Body:" + bodyH + " Room:" + room + " OldMap:" + mapH + " Map+Room:" + mh1 + " NewMap:" + mh2 + " ColH:" + colH + " inCol:" + inCol);
            }
        },
        _calcMapHeight: function () {
            var s = this._mapStyle;
            var p = parseInt(s.paddingTop) + parseInt(s.paddingBottom);
            var g = parseInt(s.marginTop) + parseInt(s.marginBottom);
            var bodyH = parseInt(s.borderTopWidth) + parseInt(s.borderBottomWidth);
            var h = p + g + bodyH + this._mapDiv.clientHeight;
            return h;
        },
        _calcColumnHeight: function () {
            var colH = 0;
            var cols = query(this._mapDiv).closest(".row").children("[class*='col']");
            if (cols.length) {
                for (var i = 0; i < cols.length; i++) {
                    var col = cols[i];
                    // Avoid the map in column calculations
                    var containsMap = query("#" + this._mapDivId, col).length > 0;
                    if ((col.clientHeight > colH) && !containsMap) {
                        colH = col.clientHeight;
                    }
                }
            }
            return colH;
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