define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/a11yclick",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-attr",
    "esri/request",
    "esri/urlUtils"
],
    function (
        declare,
        lang,
        _WidgetBase, a11yclick,
        on,
        domClass, domAttr,
        esriRequest,
        urlUtils
    ) {
        var Widget = declare([_WidgetBase], {
            declaredClass: "esri.dijit.ShareDialog",
            options: {
                theme: "ShareDialog",
                visible: true,
                dialog: null,
                url: window.location.href,
                image: '',
                title: window.document.title,
                summary: '',
                hashtags: '',
                mailURL: 'mailto:%20?subject={title}&body={summary}%20{url}',
                facebookURL: "https://www.facebook.com/sharer/sharer.php?s=100&p[url]={url}&p[images][0]={image}&p[title]={title}&p[summary]={summary}",
                twitterURL: "https://twitter.com/intent/tweet?url={url}&text={title}&hashtags={hashtags}",
                googlePlusURL: "https://plus.google.com/share?url={url}",
                bitlyAPI: location.protocol === "https:" ? "https://api-ssl.bitly.com/v3/shorten" : "http://api.bit.ly/v3/shorten",
                bitlyLogin: "",
                bitlyKey: ""
            },
            // lifecycle: 1
            constructor: function (options) {
                // mix in settings and defaults
                var defaults = lang.mixin({}, this.options, options);
                // properties
                this.set("theme", defaults.theme);
                this.set("url", defaults.url);
                this.set("mailURL", defaults.mailURL);
                this.set("facebookURL", defaults.facebookURL);
                this.set("twitterURL", defaults.twitterURL);
                this.set("googlePlusURL", defaults.googlePlusURL);
                this.set("bitlyAPI", defaults.bitlyAPI);
                this.set("bitlyLogin", defaults.bitlyLogin);
                this.set("bitlyKey", defaults.bitlyKey);
                this.set("image", defaults.image);
                this.set("title", defaults.title);
                this.set("summary", defaults.summary);
                this.set("hashtags", defaults.hashtags);
                // listeners
                this.watch("theme", this._updateThemeWatch);
                this.watch("url", this._updateUrl);
                this.watch("bitlyUrl", this._updateBitlyUrl);
            },
            // bind listener for button to action
            postCreate: function () {
                this.inherited(arguments);
            },
            // start widget. called by user
            startup: function () {
                this._shareLink();
                this._updateUrl();
                this._init();
                $('#myModal').modal('show');
            },
            // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
            destroy: function () {
                this._removeEvents();
                this.inherited(arguments);
            },
            _init: function () {
                this.own(on(dojo.byId("facebookIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("facebookURL"));
                })));
                // twitter click
                this.own(on(dojo.byId("twitterIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("twitterURL"));
                })));
                // google plus click
                this.own(on(dojo.byId("google-plusIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("googlePlusURL"));
                })));
                // email click
                this.own(on(dojo.byId("mailIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("mailURL"), true);
                })));
            },
            _shareLink: function () {
                if (this.get("bitlyAPI") && this.get("bitlyLogin") && this.get("bitlyKey")) {
                    var currentUrl = this.get("url");
                    // not already shortened
                    if (currentUrl !== this._shortened) {
                        // set shortened
                        this._shortened = currentUrl;
                        // make request
                        esriRequest({
                            url: this.get("bitlyAPI"),
                            callbackParamName: "callback",
                            content: {
                                uri: currentUrl,
                                login: this.get("bitlyLogin"),
                                apiKey: this.get("bitlyKey"),
                                f: "json"
                            },
                            load: lang.hitch(this, function (response) {
                                if (response && response.data && response.data.url) {
                                    this.set("bitlyUrl", response.data.url);
                                }
                            }),
                            error: function (error) {
                                console.log(error);
                            }
                        });
                    }
                }
            },
            _configureShareLink: function (Link, isMail) {
                // replace strings
                var fullLink = lang.replace(Link, {
                    url: encodeURIComponent(this.get("bitlyUrl") ? this.get("bitlyUrl") : this.get("url")),
                    image: encodeURIComponent(this.get("image")),
                    title: encodeURIComponent(this.get("title")),
                    summary: encodeURIComponent(this.get("summary")),
                    hashtags: encodeURIComponent(this.get("hashtags"))
                });
                // email link
                if (isMail) {
                    window.location.href = fullLink;
                } else {
                    window.open(fullLink, 'share', true);
                }
            },
            _updateUrl: function () {
                // nothing currently shortened
                this._shortened = null;
                // no bitly shortened
                this.set("bitlyUrl", null);
                  var url = this.get("url"),
                    useSeparator;
                // get url params
                var urlObject = urlUtils.urlToObject(window.location.href);
                urlObject.query = urlObject.query || {};
                // create base url
                url = window.location.protocol + '//' + window.location.host + window.location.pathname;
                // each param
                for (var i in urlObject.query) {
                    if (urlObject.query[i]) {
                        // use separator
                        if (useSeparator) {
                            url += '&';
                        } else {
                            url += '?';
                            useSeparator = true;
                        }
                        url += i + '=' + urlObject.query[i];
                    }
                }
                // update url
                this.set("url", url);
                // set url value
                domAttr.set(dojo.byId("_shareMapUrlText"), "value", url);
            },
            _updateBitlyUrl: function () {
                var bitly = this.get("bitlyUrl");
                if (bitly) {
                    domAttr.set(dojo.byId("_shareMapUrlText"), "value", bitly);
                }
            },
            _updateThemeWatch: function () {
                var oldVal = arguments[1];
                var newVal = arguments[2];
                if (this.get("loaded")) {
                    domClass.remove(this.domNode, oldVal);
                    domClass.add(this.domNode, newVal);
                }
            }
        });
        return Widget;
    });