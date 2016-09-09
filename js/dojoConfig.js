/* global dojoConfig:true */
var package_path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
dojoConfig = {
  async: true,
  packages: [{
    name: "application",
    location: package_path + "/js/application",
    main: "app"
  }, {
    name: "boilerplate",
    location: package_path + "/js/boilerplate",
    main: "Boilerplate"
  }, {
    name: "config",
    location: package_path + "/config"
  }]
};
if (location.search.match(/locale=([\w-]+)/)) {
  dojoConfig.locale = RegExp.$1;
}
