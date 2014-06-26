/*global Offline */
Offline.options = {
  checks: {
    image: {
      url: function () {
        return 'http://esri.github.io/geoform-template-js/images/online-check.png?_=' + (Math.floor(Math.random() * 1000000000));
      }
    },
    active: 'image'
  }
};