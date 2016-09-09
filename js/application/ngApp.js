/* globals angular, $ */

var ngApp = angular.module("GeoForm", ["esri.map", "schemaForm"]);

/* ArcGIS Custom Field Template */
ngApp.run(function ($templateCache) {
  var tpl = "";
  tpl += "<div class=\"form-group\">";
  tpl += "<label class=\"control-label\">{{form.title}}</label>";
  tpl += "<div class=\"ng-arcgis-container\">";
  tpl += "<div arcgis-view class=\"ng-arcgis\"></div>";
  tpl += "</div>";
  tpl += "<div class=\"help-block\" sf-message=\"form.description\"></div>";
  tpl += "</div>";
  $templateCache.put("arcgis.html", tpl);
});

/* ArcGIS Custom Field */
ngApp.config(function (schemaFormDecoratorsProvider, sfBuilderProvider) {
  schemaFormDecoratorsProvider.defineAddOn(
    "bootstrapDecorator", // Name of the decorator you want to add to.
    "arcgis", // Form type that should render this add-on
    "arcgis.html", // Template name in $templateCache
    sfBuilderProvider.stdBuilders // List of builder functions to apply.
  );
});

/* ArcGIS Custom Field */
ngApp.directive("arcgisView", function (esriLoader, Boilerplate) {
  return {
    link: function (scope, element, attrs, controller, transcludeFn) {
      Boilerplate.promise.then(function (response) {
        response.app.createView(element[0]);
      });
    }
  };
});

/* Boilerplate Factory */
ngApp.factory("Boilerplate", function (esriLoader, $q) {

  var fact = {};

  var bpPromise = $q(function (resolve, reject) {
    esriLoader.require([
      "boilerplate",
      "dojo/text!config/config.json",
      "dojo/text!boilerplate/settings.json",
      "dojo/i18n!application/nls/resources",
      "application/Geo4m"
    ], function (
      Boilerplate,
      configSettings,
      boilerplateSettings,
      i18n,
      Geo4m
    ) {
      // The Boilerplate uses the config and boilterplate JSON settings, and the URL parameters to fetch and create items from
      // ArcGIS.com or your portal. The boilerplateResponse returned contains item, webmap, webscene and/or group info.
      // NOTE: You shouldn't need to edit the Boilerplate code, but you will need to edit the JSON settings files.
      new Boilerplate(JSON.parse(configSettings), JSON.parse(boilerplateSettings)).always(function (boilerplateResponse) {

        // This is an example template app. It uses the boilerplateResponse returned to create a webmap, webscene or show group info.
        // You can edit the logic directly in the app.js file or you can just follow the pattern to create your own myApp.js class.
        // NOTE: We recommend creating your own myApp.js class as it will be easier to merge future Boilerplate updates.
        var app = new Geo4m(boilerplateResponse);

        app.init().then(function (formJSON) {
          fact.config = boilerplateResponse.config;
          fact.i18n = i18n;
          fact.schema = formJSON.schema;
          fact.form = formJSON.form;
          app.ready();
          resolve({
            app: app,
            boilerplate: boilerplateResponse
          });
        }, function (error) {
          app.reportError(error);
          reject(error);
        });
      });
    });
  });

  fact.promise = bpPromise;

  return fact;

});

ngApp.controller("DetailsController", function ($scope, Boilerplate) {
  Boilerplate.promise.then(function () {
    $scope.config = Boilerplate.config;
    $scope.i18n = Boilerplate.i18n;
  });
});

ngApp.controller("FooterController", function ($scope, Boilerplate) {
  Boilerplate.promise.then(function () {
    $scope.config = Boilerplate.config;
    $scope.i18n = Boilerplate.i18n;
  });
});

ngApp.controller("FormController", function ($scope, Boilerplate) {

  $scope.resetForm = function () {
    var formNode = $("#geoform_form");
    if (formNode[0]) {
      formNode[0].reset();
    }
  };

  Boilerplate.promise.then(function () {
    $scope.schema = Boilerplate.schema;
    $scope.form = Boilerplate.form;
    $scope.model = {};
  });

});
