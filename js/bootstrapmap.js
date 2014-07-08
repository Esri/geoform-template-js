define([
    "dojo/_base/declare",
    "dojo/on",
    "dojo/touch",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/domReady!"
],
    function (
        declare,
        on,
        touch,
        lang,
        query
    ) {
        return declare(null, {
            constructor: function (map) {
                this.map = map;
                this._handles = [];
                if (!this.map) {
                    console.log("BootstrapMap: Invalid map object. Please check map reference.");
                } else {
                    if (this.map.loaded) {
                        this._bindEvents();
                    } else {
                        this._handles.push(on(this.map, "load", lang.hitch(this, this._bindEvents)));
                    }
                }
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
            _centerPopup: function () {
                if (this.map.infoWindow && this.map.infoWindow.isShowing) {
                    var location = this.map.infoWindow.location;
                    if (location) {
                        this.map.centerAt(location);
                    }
                }
            },
            _bindEvents: function () {
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
                // Remove 300ms delay to close infoWindow on touch devices
                this._handles.push(on(query(".titlePane .close", this.map.infoWindow.domNode), touch.press, lang.hitch(this, function () {
                    this.map.infoWindow.hide();
                })));
                // FeatureLayers
                if (this.map.infoWindow) {
                    this._handles.push(on(this.map.infoWindow, "selection-change, set-features, show", lang.hitch(this, function () {
                        this._resizeInfoWin();
                    })));
                }
                // resize
                this._handles.push(on(this.map, "resize", lang.hitch(this, function () {
                    if (this._resizeTimer) {
                        clearTimeout(this._resizeTimer);
                    }
                    this._resizeTimer = setTimeout(lang.hitch(this, function () {
                        this._handlePopup();
                    }), 500);
                })));
                this._handles.push(on(window, 'resize', lang.hitch(this, function () {
                    this.map.resize();
                })));
            },
            _handlePopup: function () {
                this._resizeInfoWin();
                this._centerPopup();
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
            }
        });
    }); // define