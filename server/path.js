const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");

module.exports = {
  PROJECT_ROOT,
  SLIDESHOW_DIR: path.join(PROJECT_ROOT, "display", "slideshow"),
  STATE_DIR: path.join(PROJECT_ROOT, "server", "state"),
};
