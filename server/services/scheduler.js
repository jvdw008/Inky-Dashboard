const fs = require("fs");
const path = require("path");

const { fetchRSS, fetchRSSWithCache } = require("./rssService");
const { getTodaysNoteFromBackupSafe } = require("./joplinService");

// IMPORTANT: absolute, resolved path to display module
const { renderHomepage } = require(
  path.resolve(__dirname, "..", "..", "display", "display")
);

const dns = require("dns").promises;

let renderRequested = false;
let isRendering = false;
let forceNextSlide = false;
let forcedImage = null;

/* -----------------------------
   Scheduler state
------------------------------ */

let schedulerStatus = {
  lastRun: null,
  lastSuccess: null,
  lastError: null,
  currentTitle: null,
  currentRSS: null,
  currentImage: null,

  joplin: {
    status: "unknown", // connected | cached | unavailable
    lastUpdate: null,
  },

  network: {
    status: "unknown", // online | offline
    lastCheck: null,
  },

  rss: {
    status: "unknown", // live | cached | unavailable
    lastUpdate: null,
  },
};

/* -----------------------------
   Project paths
------------------------------ */
const paths = require(path.resolve(__dirname, "../config/paths"));
const { PROJECT_ROOT, SLIDESHOW_DIR, DISPLAY_DIR } = paths;

const MODE_PATH = path.resolve(__dirname, "../state/displayMode.json");

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

async function checkNetwork() {
  try {
    await dns.lookup("google.com");
    return "online";
  } catch {
    return "offline";
  }
}

function refreshNow(options = {}) {
  if (options.image) {
    forcedImage = options.image;
  }

  forceNextSlide = true;

  if (tickRef) {
    console.log("[Scheduler] Immediate refresh requested");
    tickRef();
  } else {
    console.warn("[Scheduler] refreshNow called before scheduler started");
  }
}

function setLiveImage(filename) {
  const files = fs
    .readdirSync(SLIDESHOW_DIR)
    .filter(f => f.toLowerCase().endsWith(".png"));

  const idx = files.indexOf(filename);
  if (idx === -1) throw new Error("File not found in slideshow");

  // Set the forced image to be rendered immediately
  forcedImage = filename;

  // Sync slideIndex so next tick continues from this image
  slideIndex = idx; // next tick uses this index

  // Update scheduler status for portal
  schedulerStatus.currentImage = filename;

  console.log("[Scheduler] LIVE image set:", filename);

  // Trigger immediate refresh without incrementing slideIndex twice
  forceNextSlide = false; // prevent double increment
  refreshNow();
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

      const joplinResult = getTodaysNoteFromBackupSafe({
        baseBackupDir: "/mnt/joplin",
      });

      const networkStatus = await checkNetwork();
      schedulerStatus.network = {
        status: networkStatus,
        lastCheck: new Date(),
      };

      const todos = joplinResult.todos;
      schedulerStatus.joplin = {
        status: joplinResult.status,
        lastUpdate: new Date(),
      };

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
	  if (forceNextSlide) {
	      slideIndex++;
	      forceNextSlide = false;
	  }
	  let file;

	  if (forcedImage && files.includes(forcedImage)) {
	    file = forcedImage;
	    forcedImage = null; // consume override
	  } else {
	    file = files[slideIndex % files.length];
	    slideIndex++;
	  }

	  payload.image = path.join(SLIDESHOW_DIR, file);
	  schedulerStatus.currentImage = file;

          payload.rss = null; // IMPORTANT: suppress RSS rendering
        }

        schedulerStatus.currentTitle = "Slideshow";

      /* -----------------------------
         RSS MODE (default)
      ------------------------------ */
      } else {
        const rssUrl = process.env.RSS_FEED_URL;
        const rssResult = await fetchRSSWithCache(rssUrl);

        payload.rss = rssResult.rss;

        schedulerStatus.rss = {
          status: rssResult.status,
          lastUpdate: new Date(),
        };

        schedulerStatus.currentTitle = rssResult.rss.title || null;
        schedulerStatus.currentRSS = rssResult.rss;

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
  setLiveImage,
};
