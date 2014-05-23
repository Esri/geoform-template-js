define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/layout/ContentPane",
    "dojo/on",
    "esri/arcgis/utils",
    "esri/arcgis/Portal",
    "dojo/Deferred",
    "dojo/cookie"
],
function (Evented, declare, lang, _WidgetBase, ContentPane, on, arcgisUtils, portal, Deferred, cookie) {
    var Widget = declare([_WidgetBase], {
        declaredClass: "application.signInHelper",
        _portal: null,
        cred: "esri_jsapi_id_manager_data",
        constructor: function () {
            var portalURL = this._getPortalURL();
            this._portal = new portal.Portal(this._getPortalURL());
        },

        createPortal: function () {
            // create portal
            var deferred = new Deferred();
            var _self = this;
            // portal loaded
            this.own(on(this._portal, "Load", lang.hitch(this, function () {
                this._portal.signIn().then(function (loggedInUser) {
                    deferred.resolve(loggedInUser);
                }, function (err) {
                    deferred.reject(new Error("Sign-in Failed"));
                });
            })));

            return deferred.promise;
        },

        _getPortalURL: function () {
            return arcgisUtils.arcgisUrl.split('/sharing/')[0];
        },

        getPortal: function () {
            return this._portal;
        },

        getPortalUser: function () {
            var esriCookie = cookie('esri_auth');
            if (!esriCookie)
                return;
            esriCookie = JSON.parse(esriCookie.replace('"ssl":undefined', '"ssl":""'));
            // Cookie has to be set on the same organization
            if (esriCookie.urlKey && esriCookie.customBaseUrl && (esriCookie.urlKey + '.' + esriCookie.customBaseUrl).toLowerCase() != document.location.hostname.toLowerCase())
                return;
            return esriCookie ? esriCookie : null;
        },

        userIsAppOwner: function (itemData, userInfo) {
            return (userInfo && itemData.item.owner == userInfo.username);
        },

        authenticateUser: function (isEditMode, data, userInfo) {
            if (isEditMode) {
                if (this.userIsAppOwner(data, userInfo)) {
                    return true;
                }
                else {
                    alert("Sorry, you dont have enough permissions to view this item");
                    return false;
                }
            }
            else {
                return true;
            }
        }
    });
    return Widget;
});