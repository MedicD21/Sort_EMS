var exec = require("cordova/exec");

module.exports = {
  register: function (success, error) {
    try {
      exec(success, error, "DataWedgeIntentPlugin", "register", []);
    } catch (e) {
      console.warn("DataWedge register failed", e);
    }
  },
  dispatchTest: function (tag) {
    window.dispatchEvent(new CustomEvent("datawedge", { detail: { tag: tag } }));
  },
};
