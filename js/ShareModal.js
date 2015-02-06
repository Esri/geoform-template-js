/*global,define */
/*jslint sloppy:true,nomen:true */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/string",
    "dijit/_WidgetBase",
    "dijit/a11yclick",
    "dojo/on",
    "dojo/io-query",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "esri/request",
    "dojo/i18n!application/nls/resources"
],
function (
    declare,
    lang,
    string,
    _WidgetBase, a11yclick,
    on,
    ioQuery,
    dom, domClass, domConstruct,
    esriRequest, nls
) {
    var Widget = declare([_WidgetBase], {
        declaredClass: "esri.dijit.ShareModal",
        nls: nls,
        options: {
            theme: "ShareModal",
            visible: true,
            dialog: null,
            url: window.location.href,
            image: '',
            title: window.document.title,
            summary: '',
            hashtags: '',
            mailURL: 'mailto:%20?subject=${title}&body=%20${info}%20${url}%20${summary}',
            facebookURL: "https://www.facebook.com/sharer/sharer.php?u=${url}",
            twitterURL: "https://twitter.com/intent/tweet?url=${url}&text=${title}&hashtags=${hashtags}",
            googlePlusURL: "https://plus.google.com/share?url=${url}",
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
            this.set("shareOption", defaults.shareOption);
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
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function () {
            this.inherited(arguments);
        },
        _init: function () {
            if (this.shareOption) {
                this.own(on(dom.byId("facebookIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("facebookURL"));
                })));
                // twitter click
                this.own(on(dom.byId("twitterIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("twitterURL"));
                })));
                // google plus click
                this.own(on(dom.byId("google-plusIcon"), a11yclick, lang.hitch(this, function () {
                    this._configureShareLink(this.get("googlePlusURL"));
                })));
            }
            // email click
            this.own(on(dom.byId("mailIcon"), a11yclick, lang.hitch(this, function () {
                this._configureShareLink(this.get("mailURL"), true);
            })));
        },
        _stripTags: function (str) {
            var text = domConstruct.create("div", {
                innerHTML: str
            }).textContent;
            return text || '';
        },
        _shareLink: function () {
            if (this.get("bitlyAPI") && this.get("bitlyLogin") && this.get("bitlyKey")) {
                //Handle getting url param in _updateUrl
                var currentUrl = this.get("url");
                //Remove edit=true from the query parameters
                if (location.href.indexOf("?") > -1) {
                    var queryUrl = location.href;
                    var urlParams = ioQuery.queryToObject(window.location.search.substring(1)),
                        newParams = lang.clone(urlParams);
                    delete newParams.edit; //Remove edit parameter
                    delete newParams.folderid; //Remove folderid parameter
                    currentUrl = queryUrl.substring(0, queryUrl.indexOf("?") + 1) + ioQuery.objectToQuery(newParams);
                }
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
            var fullLink;
            fullLink = string.substitute(Link, {
                url: encodeURIComponent(this.get("bitlyUrl") ? this.get("bitlyUrl") : this.get("url")),
                image: encodeURIComponent(this.get("image")),
                title: encodeURIComponent(this.get("title")),
                summary: encodeURIComponent(this._stripTags(this.get("summary"))),
                hashtags: encodeURIComponent(this.get("hashtags")),
                info: nls.configure.sharedlg.mailtoLinkDescription
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
            var url = this.get("url");
            // create base url
            url = window.location.protocol + '//' + window.location.host + window.location.pathname;
            //Remove edit=true from the query parameters
            if (location.href.indexOf("?") > -1) {
                var queryUrl = location.href;
                var urlParams = ioQuery.queryToObject(window.location.search.substring(1)),
                    newParams = lang.clone(urlParams);
                delete newParams.edit; //Remove edit parameter
                delete newParams.folderid; //Remove folderid parameter
                url = queryUrl.substring(0, queryUrl.indexOf("?") + 1) + ioQuery.objectToQuery(newParams);
            }
            // update url
            this.set("url", url);
            // set url value
            dom.byId("shareMapUrlText").value = url;
        },
        _updateBitlyUrl: function () {
            var bitly = this.get("bitlyUrl");
            if (bitly) {
                dom.byId("shareMapUrlText").value = bitly;
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