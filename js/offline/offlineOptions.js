/*global Offline */
Offline.options = {
  checks: {
    image: {
      url: function () {
        return location.protocol + '//www.arcgis.com/apps/GeoForm/images/online-check.png?_=' + (Math.floor(Math.random() * 1000000000));
      }
    },
    active: 'image'
  }
};