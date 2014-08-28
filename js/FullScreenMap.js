// http://dojotoolkit.org/reference-guide/1.9/quickstart/writingWidgets.html
define([
    // For emitting events
    "dojo/Evented",

    // needed to create a class
    "dojo/_base/declare",
    "dojo/_base/lang",

    // widget class
    "dijit/_WidgetBase",

    // accessibility click
    "dijit/a11yclick",

    // templated widget
    "dijit/_TemplatedMixin",

    // handle events
    "dojo/on",

    // load template
    "dojo/text!views/FullScreenMap.html",


    // dom manipulation
    "dojo/dom-style",
    "dojo/dom-class",

    // wait for dom to be ready
    "dojo/domReady!"
],
function (
    // make sure these are arranged in the same order as above
    Evented,
    declare, lang,
    _WidgetBase, a11yclick, _TemplatedMixin,
    on,
    dijitTemplate,
    domStyle, domClass
) {
    return declare([_WidgetBase, _TemplatedMixin, Evented], {
        // my html template string
        templateString: dijitTemplate,

        // default options
        options: {
            map: null,
            visible: true
        },

        /* ---------------- */
        /* Lifecycle methods */
        /* ---------------- */
        constructor: function (options, srcRefNode) {
            // css classes
            this.css = {
                fs: "btn btn-default",
                toggle: "glyphicon",
                exit: "glyphicon-remove",
                enter: "glyphicon-fullscreen"
            };
            // mix in settings and defaults
            var defaults = lang.mixin({}, this.options, options);
            // create the DOM for this widget
            this.domNode = srcRefNode;
            // set properties
            this.set("map", defaults.map);
            this.set("visible", defaults.visible);
            this.set("container", defaults.container);
            this.set("fullscreen", false);
            // watch for changes
            this.watch("visible", this._visible);
        },
        // _TemplatedMixin implements buildRendering() for you. Use this to override
        // buildRendering: function() {},
        // called after buildRendering() is finished
        postCreate: function () {
            // own this accessible click event button
            // Custom press, release, and click synthetic events which trigger on a left mouse click, touch, or space/enter keyup.
            this.own(on(this.buttonNode, a11yclick, lang.hitch(this, this._toggle)));
        },
        // start widget. called by user
        startup: function () {
            // set visibility
            this._visible();
            // map not defined
            if (!this.get("map")) {
                console.log("map required");
                this.destroy();
                return;
            }
            if (!this.get("container")) {
                this.set("container", this.map.container);
            }
            // when map is loaded
            if (this.map.loaded) {
                this._init();
            } else {
                on.once(this.map, "load", lang.hitch(this, function () {
                    this._init();
                }));
            }
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            // call the superclass method of the same name.
            this.inherited(arguments);
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
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _init: function () {
            // fullscreeen change event
            var evtName;
            // node to put into fullscreen
            var node = this.get("container");
            // enter/exit fullscreen event
            // Vendor specific prefixes/events
            if (node.requestFullscreen) {
                evtName = "fullscreenchange";
            } else if (node.mozRequestFullScreen) {
                evtName = "mozfullscreenchange";
            } else if (node.webkitRequestFullScreen) {
                evtName = "webkitfullscreenchange";
            } else if (node.msRequestFullscreen) {
                evtName = "MSFullscreenChange";
            } else {
                console.log("Fullscreen disabled or not supported.");
                this.destroy();
                return;
            }
            if (evtName) {
                this.own(on(document, evtName, lang.hitch(this, this._changed)));
            }
            this.set("loaded", true);
            // emit event
            this.emit("load", {});
        },
        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, "display", "block");
            } else {
                domStyle.set(this.domNode, "display", "none");
            }
        },
        _changed: function () {
            var w, h;
            // determine fullscreen state
            var state = false;
            // container node
            var container = this.get("container");
            // if an element is currently fullscreen
            if (
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            ) {
                state = true;
            }
            // set fullscreen status
            this.set("fullscreen", state);
            // emit event
            this.emit("fullscreen-change", {
                fullscreen: state
            });
            // if fullscreen
            if (state) {
                w = "100%";
                h = "100%";
                domClass.add(this.iconNode, this.css.exit);
                domClass.remove(this.iconNode, this.css.enter);
            } else {
                w = "";
                h = "";
                domClass.add(this.iconNode, this.css.enter);
                domClass.remove(this.iconNode, this.css.exit);
            }
            // set map width and height
            domStyle.set(container, {
                width: w,
                height: h
            });
            // resize map
            this.map.resize();
        },
        _toggle: function () {
            if (this.get("fullscreen")) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            } else {
                var node = this.get("container");
                if (node.requestFullscreen) {
                    node.requestFullscreen();
                } else if (node.mozRequestFullScreen) {
                    node.mozRequestFullScreen();
                } else if (node.webkitRequestFullscreen) {
                    node.webkitRequestFullscreen();
                } else if (node.msRequestFullscreen) {
                    node.msRequestFullscreen();
                }
            }
        }
    });
});