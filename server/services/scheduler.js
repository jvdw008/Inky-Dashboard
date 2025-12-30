const fs = require("fs");
const os = require("os");
const path = require("path");
const dns = require("dns").promises;
const { execSync } = require("child_process");

const { fetchRSSWithCache } = require("./rssService");
const { getTodaysNoteFromBackupSafe } = require("./joplinService");

// IMPORTANT: absolute, resolved path to display module
const { renderHomepage } = require(
  path.resolve(__dirname, "..", "..", "display", "display")
);

/* -----------------------------
   Scheduler state
------------------------------ */

let renderRequested = false;
let isRendering = false;
let forceNextSlide = false;
let forcedImage = null;
let schedulerTimer = null;
let networkFailCount = 0;

let schedulerStatus = {
  lastRun: null,
  lastSuccess: null,
  lastError: null,
  currentTitle: null,
  currentRSS: null,
  currentImage: null,

  joplin: {
    status: "unknown",
    lastUpdate: null,
  },

  network: {
    status: "unknown",
    lastCheck: null,
  },

  rss: {
    status: "unknown",
    lastUpdate: null,
  },
};

/* -----------------------------
   Paths & config
------------------------------ */

const paths = require(path.resolve(__dirname, "../config/paths"));
const { SLIDESHOW_DIR } = paths;

const MODE_PATH = path.resolve(__dirname, "../state/displayMode.json");
const SCHEDULER_PATH = path.resolve(__dirname, "../state/scheduler.json");

const MIN_INTERVAL = 5;
const MAX_INTERVAL = 180;

let slideIndex = 0;
let tickRef = null;

/* -----------------------------
   Helpers
------------------------------ */

function getLocalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "offline";
}

function readMode() {
  try {
    return JSON.parse(fs.readFileSync(MODE_PATH, "utf8")).mode;
  } catch {
    return "rss";
  }
}

/* -----------------------------
   Scheduler interval
------------------------------ */

function readSchedulerInterval() {
  try {
    const { intervalMinutes } = JSON.parse(
      fs.readFileSync(SCHEDULER_PATH, "utf8")
    );
    return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, intervalMinutes));
  } catch {
    return 5;
  }
}

function writeSchedulerInterval(intervalMinutes) {
  const clamped = Math.min(
    MAX_INTERVAL,
    Math.max(MIN_INTERVAL, intervalMinutes)
  );

  fs.writeFileSync(
    SCHEDULER_PATH,
    JSON.stringify({ intervalMinutes: clamped }, null, 2)
  );

  return clamped;
}

function updateSchedulerInterval(minutes) {
  writeSchedulerInterval(minutes);

  if (tickRef) {
    startInterval(tickRef);
  }
}

function startInterval(tick) {
  const minutes = readSchedulerInterval();

  console.log(`[Scheduler] Interval set to ${minutes} minutes`);

  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  schedulerTimer = setInterval(() => {
    tick();
  }, minutes * 60 * 1000);
}

/* -----------------------------
   Network check (ROBUST)
------------------------------ */

async function hasNetwork() {
  try {
    // DNS is enough; ping is optional and unreliable on some networks
    await dns.lookup("google.com");
    return true;
  } catch {
    return false;
  }
}

/* -----------------------------
   Public helpers
------------------------------ */

function refreshNow(options = {}) {
  if (options.image) forcedImage = options.image;
  forceNextSlide = true;

  if (tickRef) {
    console.log("[Scheduler] Immediate refresh requested");
    tickRef();
  }
}

function setLiveImage(filename) {
  const files = fs
    .readdirSync(SLIDESHOW_DIR)
    .filter(f => f.toLowerCase().endsWith(".png"));

  const idx = files.indexOf(filename);
  if (idx === -1) throw new Error("File not found");

  forcedImage = filename;
  slideIndex = idx;
  schedulerStatus.currentImage = filename;

  console.log("[Scheduler] LIVE image set:", filename);
  refreshNow();
}

/* -----------------------------
   Scheduler
------------------------------ */

function startScheduler() {
  console.log("Scheduler started");

async function tick() {
  if (isRendering) {
    renderRequested = true;
    console.warn("[Scheduler] Tick skipped (already rendering)");
    return;
  }

  isRendering = true;
  schedulerStatus.lastRun = new Date();

  try {
    const online = await hasNetwork();

    schedulerStatus.network = {
      status: online ? "online" : "offline",
      lastCheck: new Date(),
    };

    if (!online) {
      networkFailCount++;
      console.warn("[Scheduler] Network offline – using cached data");

      if (networkFailCount >= 10) {
        console.error("[Scheduler] Network dead too long, rebooting");
        execSync("sudo /sbin/reboot");
      }
    } else {
      networkFailCount = 0;
    }

    require("dotenv").config({ override: true });

    const mode = readMode();

    const joplinResult = getTodaysNoteFromBackupSafe({
      baseBackupDir: "/mnt/joplin",
    });

    schedulerStatus.joplin = {
      status: joplinResult.status,
      lastUpdate: new Date(),
    };

    const payload = {
      hostname: getLocalIPv4(),
      time: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      todos: joplinResult.todos,
    };

    if (mode === "slideshow") {
      const files = fs
        .readdirSync(SLIDESHOW_DIR)
        .filter(f => f.endsWith(".png"))
        .sort();

      if (files.length) {
        const file =
          forcedImage && files.includes(forcedImage)
            ? forcedImage
            : files[slideIndex++ % files.length];

        forcedImage = null;
        payload.image = path.join(SLIDESHOW_DIR, file);
        schedulerStatus.currentImage = file;
      }

      schedulerStatus.currentTitle = "Slideshow";

    } else {
      const rssResult = await fetchRSSWithCache(process.env.RSS_FEED_URL);

      payload.rss = rssResult.rss;
      schedulerStatus.rss = {
        status: rssResult.status,
        lastUpdate: new Date(),
      };

      schedulerStatus.currentTitle = rssResult.rss?.title || null;
    }

    await renderHomepage(payload);

    schedulerStatus.lastSuccess = new Date();
    schedulerStatus.lastError = null;

    console.log("[Scheduler] Homepage updated");

  } catch (err) {
    schedulerStatus.lastError = err.message;
    console.error("[Scheduler] Tick error:", err);

  } finally {
    isRendering = false;
    //if (renderRequested) setTimeout(tick, 250);
  }
}

  tickRef = tick;
  tick();
  startInterval(tickRef);
}

/* -----------------------------
   Exports
------------------------------ */

module.exports = {
  startScheduler,
  refreshNow,
  schedulerStatus,
  setLiveImage,
  updateSchedulerInterval,
  readSchedulerInterval,
};
