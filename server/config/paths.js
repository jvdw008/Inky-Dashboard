const path = require("path");

/*
  This file lives in:
  inky/server/config/paths.js

  __dirname = inky/server/config
*/

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

module.exports = {
  PROJECT_ROOT,

  SERVER_DIR: path.join(PROJECT_ROOT, "server"),
  DISPLAY_DIR: path.join(PROJECT_ROOT, "display"),

  STATE_DIR: path.join(PROJECT_ROOT, "server", "state"),

  SLIDESHOW_DIR: path.join(PROJECT_ROOT, "display", "slideshow"),
};
