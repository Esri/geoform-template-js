define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dojo/dom",
    "dojo/on",
    "esri/arcgis/utils",
    "esri/arcgis/Portal",
    "dojo/Deferred",
    "dojo/cookie",
    "dojo/i18n!application/nls/resources"
],
  function (declare, lang, domClass, _WidgetBase, dom, on, arcgisUtils, portal, Deferred, cookie, nls) {
    var Widget = declare([_WidgetBase], {
      declaredClass: "application.signInHelper",
      _portal: null,
      cred: "esri_jsapi_id_manager_data",
      constructor: function () {
        this._portal = new portal.Portal(this._getPortalURL());
      },

      createPortal: function () {
        // create portal
        var deferred = new Deferred();
        // portal loaded
        this.own(on(this._portal, "Load", lang.hitch(this, function () {
          this._portal.signIn().then(function (loggedInUser) {
            deferred.resolve(loggedInUser);
          }, function (err) {
            deferred.reject(err);
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

      userIsAppOwner: function (itemData, userInfo) {
        return (userInfo && (itemData.item.owner == userInfo.username || userInfo.role === "org_admin"));
      },

      reportError: function (error) {
        // remove loading class from body
        domClass.remove(document.body, "app-loading");
        domClass.add(document.body, "app-error");
        // an error occurred - notify the user. In this example we pull the string from the
        // resource.js file located in the nls folder because we've set the application up
        // for localization. If you don't need to support multiple languages you can hardcode the
        // strings here and comment out the call in index.html to get the localization strings.
        // set message
        var node = dom.byId("loading_message");
        if (node) {
          if (this.config && this.config.i18n) {
            node.innerHTML = this.config.i18n.map.error + ": " + error.message;
          } else {
            node.innerHTML = "Unable to create map: " + error.message;
          }
        }
      },

      authenticateUser: function (isEditMode, data, userInfo) {
        if (isEditMode) {
          if (this.userIsAppOwner(data, userInfo)) {
            return true;
          } else {
            this.reportError(new Error(nls.builder.invalidUser));

            return false;
          }
        } else {
          return true;
        }
      }
    });
    return Widget;
  });