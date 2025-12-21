const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const { refreshNow } = require("../services/scheduler");

/* ----------------------------
   Project paths
----------------------------- */

// /home/sensei/inky
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

// /home/sensei/inky/server/.env
const ENV_PATH = path.join(PROJECT_ROOT, "server", ".env");

// /home/sensei/inky/server/state/displayMode.json
const MODE_PATH = path.join(
  PROJECT_ROOT,
  "server",
  "state",
  "displayMode.json"
);

/* -------------------------
   Display mode helpers
-------------------------- */

function readMode() {
  try {
    if (!fs.existsSync(MODE_PATH)) return "rss";
    return JSON.parse(fs.readFileSync(MODE_PATH, "utf8")).mode || "rss";
  } catch {
    return "rss";
  }
}

function writeMode(mode) {
  fs.writeFileSync(
    MODE_PATH,
    JSON.stringify({ mode }, null, 2),
    "utf8"
  );
}

/* -------------------------
   Env helpers
-------------------------- */

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};

  const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  const obj = {};

  lines.forEach(line => {
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    obj[key] = rest.join("=");
  });

  return obj;
}

function writeEnv(obj) {
  const content = Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  fs.writeFileSync(ENV_PATH, content, "utf8");
}

/* -------------------------
   GET settings
-------------------------- */

router.get("/", (req, res) => {
  const env = readEnv();

  res.json({
    rssUrl: env.RSS_FEED_URL || "",
    mode: readMode(),
  });
});

/* -------------------------
   POST settings
-------------------------- */

router.post("/", async (req, res) => {
  const { rssUrl, mode } = req.body;

  /* --------------------
     Save display mode FIRST
  --------------------- */
  if (mode === "rss" || mode === "slideshow") {
    writeMode(mode);
    console.log("[Settings] Display mode set to:", mode);

    // Reset slideshow index when changing mode
    if (mode === "slideshow") {
      const { resetSlideIndex } = require("../services/scheduler");
      resetSlideIndex();
    }
  }
  /* --------------------
     Save RSS (only if provided)
  --------------------- */
  if (typeof rssUrl === "string" && rssUrl.length) {
    if (!rssUrl.startsWith("http")) {
      return res.status(400).json({ error: "Invalid RSS URL" });
    }

    const env = readEnv();
    const rssChanged = env.RSS_FEED_URL !== rssUrl;

    env.RSS_FEED_URL = rssUrl;
    writeEnv(env);

    // Reload env immediately
    require("dotenv").config({ override: true });

    if (rssChanged) {
      const { resetRssState } = require("../services/rssService");
      resetRssState();
    }
  }

  /* --------------------
     Trigger immediate refresh
  --------------------- */
  refreshNow();

  res.json({
    status: "ok",
    rssUrl: rssUrl || readEnv().RSS_FEED_URL || "",
    mode: mode || readMode(),
  });
});

module.exports = router;
