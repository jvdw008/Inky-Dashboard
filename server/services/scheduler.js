const fs = require("fs");
const path = require("path");

const { fetchRSS } = require("./rssService");
const { getTodaysNoteFromBackup } = require("./joplinService");

// IMPORTANT: absolute, resolved path to display module
const { renderHomepage } = require(
  path.resolve(__dirname, "..", "..", "display", "display")
);

let renderRequested = false;
let isRendering = false;

/* -----------------------------
   Scheduler state
------------------------------ */

let schedulerStatus = {
  lastRun: null,
  lastSuccess: null,
  lastError: null,
  currentTitle: null,
};

/* -----------------------------
   Project paths
------------------------------ */

// /home/sensei/inky
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

// /home/sensei/inky/state/displayMode.json
const MODE_PATH = path.resolve(__dirname, "../state/displayMode.json");

// /home/sensei/inky/display/slideshow
const SLIDESHOW_DIR = path.join(PROJECT_ROOT, "display", "slideshow");

let slideIndex = 0;

/* -----------------------------
   Mode helpers
------------------------------ */

function resetSlideIndex() {
  slideIndex = 0;
}

function readMode() {
  try {
    return JSON.parse(fs.readFileSync(MODE_PATH, "utf8")).mode;
  } catch {
    return "rss";
  }
}

/* -----------------------------
   Tick reference (IMPORTANT)
------------------------------ */

// Holds reference to the live tick() function
let tickRef = null;

/* -----------------------------
   Public helpers
------------------------------ */

function refreshNow() {
  if (tickRef) {
    console.log("[Scheduler] Immediate refresh requested");
    tickRef();
  } else {
    console.warn("[Scheduler] refreshNow called before scheduler started");
  }
}

/* -----------------------------
   Scheduler
------------------------------ */

function startScheduler() {
  console.log("Scheduler started. Updating every 5 minutes...");

  async function tick() {
    // Prevent concurrent GPIO access
    if (isRendering) {
      renderRequested = true;
      return;
    }

    isRendering = true;
    renderRequested = false;
    schedulerStatus.lastRun = new Date();

    try {
      require("dotenv").config({ override: true });

      const mode = readMode();
      console.log("[Scheduler] Initial mode:", mode);

      const todos =
        getTodaysNoteFromBackup({ baseBackupDir: "/mnt/joplin" }) || [];

      const payload = {
        hostname: process.env.HOSTNAME || "inky.local",
        time: new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        todos,
      };

      /* -----------------------------
         SLIDESHOW MODE
      ------------------------------ */
      if (mode === "slideshow") {
        console.log("[Scheduler] Slideshow mode active");

        const files = fs
          .readdirSync(SLIDESHOW_DIR, { withFileTypes: true })
          .filter(f => f.isFile() && f.name.endsWith(".png"))
          .map(f => f.name)
          .sort();

        if (files.length === 0) {
          console.warn("[Scheduler] Slideshow mode but no images found");
          payload.rss = { title: "No images", text: "" };
        } else {
          const file = files[slideIndex % files.length];
          slideIndex++;

          payload.image = path.join(SLIDESHOW_DIR, file);
          payload.rss = null; // IMPORTANT: suppress RSS rendering
        }

        schedulerStatus.currentTitle = "Slideshow";

      /* -----------------------------
         RSS MODE (default)
      ------------------------------ */
      } else {
        const rssUrl = process.env.RSS_FEED_URL;
        const rss = (await fetchRSS(rssUrl)) || {
          title: "",
          text: "",
        };

        payload.rss = rss;
        schedulerStatus.currentTitle = rss.title || null;
      }

      console.log("[Scheduler] Payload → EPD:", payload);

      await renderHomepage(payload);

      schedulerStatus.lastSuccess = new Date();
      schedulerStatus.lastError = null;

      console.log(
        "[Scheduler] Homepage updated at",
        new Date().toLocaleTimeString()
      );

    } catch (err) {
      console.error("[Scheduler] Tick error:", err);
      schedulerStatus.lastError = err.message;

    } finally {
      isRendering = false;

      // Run exactly once more if requested mid-render
      if (renderRequested) {
        setTimeout(tick, 250);
      }
    }
  }

  // Store tick reference for refreshNow()
  tickRef = tick;

  // Run immediately on boot
  tick();

  // Schedule every 5 minutes
  setInterval(tick, 5 * 60 * 1000);
}

/* -----------------------------
   Exports
------------------------------ */

module.exports = {
  startScheduler,
  refreshNow,
  schedulerStatus,
};
