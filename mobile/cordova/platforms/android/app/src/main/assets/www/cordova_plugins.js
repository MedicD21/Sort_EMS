cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "cordova-plugin-datawedge-intent.DataWedge",
      "file": "plugins/cordova-plugin-datawedge-intent/www/datawedge.js",
      "pluginId": "cordova-plugin-datawedge-intent",
      "clobbers": [
        "window.DataWedge"
      ]
    }
  ];
  module.exports.metadata = {
    "cordova-plugin-datawedge-intent": "0.0.1"
  };
});