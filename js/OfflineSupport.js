/*global Offline, O */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/string",
    "dojo/on",
    "dojo/dom",
    "esri/graphic",
    "dojo/i18n!application/nls/resources",
    "vendor/offline/offline-edit-min"
], function (
    declare,
    lang,
    string,
    on,
    dom,
    Graphic,
    i18n
) {
    return declare(null, {
        // create class
        constructor: function (options) {
            // save defaults
            this.defaults = options;
            // create offline manager
            this.offlineFeaturesManager = O.esri.Edit.OfflineFeaturesManager();
            this.offlineFeaturesManager.proxyPath = this.defaults.proxy;
            // enable offline attachments
            this.offlineFeaturesManager.initAttachments();
            // once layer is loaded
            if (this.defaults.layer.loaded) {
                this.initEditor();
            } else {
                on.once(this.defaults.layer, 'load', lang.hitch(this, this.initEditor));
            }
            Offline.check();
            Offline.on('up', lang.hitch(this, function () {
                this.goOnline();
            }));
            Offline.on('down', lang.hitch(this, function () {
                this.goOffline();
            }));
        },

        // update online status
        updateConnectivityIndicator: function () {
            var html = '';
            var status = this.offlineFeaturesManager.getOnlineStatus();
            switch (status) {
            case this.offlineFeaturesManager.OFFLINE:
                html = '<div class="alert alert-danger" role="alert"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + i18n.onlineStatus.offline + '</div>';
                break;
            case this.offlineFeaturesManager.RECONNECTING:
                html = '<div class="alert alert-info"><span class="glyphicon glyphicon-exclamation-sign"></span> ' + i18n.onlineStatus.reconnecting + '</div>';
                break;
            case this.offlineFeaturesManager.ONLINE:
                html = '';
                break;
            }
            var node = dom.byId('connection_status');
            if (node) {
                node.innerHTML = html;
            }
        },

        updateStatus: function () {
            var node = dom.byId('pending_edits');
            // clear html
            node.innerHTML = '';
            // edit store
            var es = new O.esri.Edit.EditStore(Graphic);
            // if we have edits
            if (this.defaults.layer.pendingEditsCount()) {
                var edits = this.defaults.layer.getAllEditsArray();
                var total = edits.length;
                if (total) {
                    var html = '';
                    html += '<div class="alert alert-warning" role="alert">';
                    html += '<span class="glyphicon glyphicon-signal"></span> ';
                    html += string.substitute(i18n.onlineStatus.pending, {
                        total: total
                    });
                    html += '</div>';
                    node.innerHTML = html;
                }
            }
        },

        // now online
        goOnline: function () {
            // go online and then update status
            this.offlineFeaturesManager.goOnline(lang.hitch(this, function () {
                this.updateConnectivityIndicator();
            }));
            this.updateConnectivityIndicator();
        },

        // now offline
        goOffline: function () {
            // go offline
            this.offlineFeaturesManager.goOffline();
            this.updateConnectivityIndicator();
        },

        // setup editing
        initEditor: function () {          
            // status for pending edits
            this.offlineFeaturesManager.on(this.offlineFeaturesManager.events.EDITS_ENQUEUED, lang.hitch(this, function () {
                this.updateStatus();
            }));
            this.offlineFeaturesManager.on(this.offlineFeaturesManager.events.EDITS_SENT, lang.hitch(this, function () {
                this.updateStatus();
            }));
            this.offlineFeaturesManager.on(this.offlineFeaturesManager.events.ALL_EDITS_SENT, lang.hitch(this, function () {
                this.updateStatus();
            }));


            /* handle errors that happen while storing offline edits */
            this.offlineFeaturesManager.on(this.offlineFeaturesManager.events.EDITS_ENQUEUED, function (results) {
                var errors = Array.prototype.concat(
                    results.addResults.filter(function (r) {
                        return !r.success;
                    }),
                    results.updateResults.filter(function (r) {
                        return !r.success;
                    }),
                    results.deleteResults.filter(function (r) {
                        return !r.success;
                    })
                );
                // log errors  
                if (errors.length) {
                    console.log(errors);
                }
            });

            /* extend layer with offline detection functionality */
            this.offlineFeaturesManager.extend(this.defaults.layer, function(){});

            // update indicator and check status
            this.updateConnectivityIndicator();
        }
    });
});