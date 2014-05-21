/*global Offline */
Offline.options = {
    checks: {
        image: {
            url: function () {
                return 'http://esri.github.io/offline-editor-js/tiny-image.png?_=' + (Math.floor(Math.random() * 1000000000));
            }
        },
        active: 'image'
    }
};