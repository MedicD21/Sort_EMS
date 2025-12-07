cordova.define("cordova-plugin-datawedge-intent.DataWedge", function(require, exports, module) {
var exec = require("cordova/exec");

module.exports = {
  // No-op register function - plugin registers receiver automatically on native side
  register: function (success, error) {
    try {
      // call native side if needed
      exec(success, error, "DataWedgeIntentPlugin", "register", []);
    } catch (e) {
      console.warn("DataWedge register failed", e);
    }
  },
  // expose a convenience method to dispatch manual events from JS for testing
  dispatchTest: function (tag) {
    window.dispatchEvent(
      new CustomEvent("datawedge", { detail: { tag: tag } })
    );
  },
};

});
