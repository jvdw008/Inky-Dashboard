require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());

/* ----------------------------
   Project paths
----------------------------- */

const paths = require(path.resolve(__dirname, "config", "paths"));
const { PROJECT_ROOT, SLIDESHOW_DIR, DISPLAY_DIR } = paths;

/* ----------------------------
   Services
----------------------------- */

const { renderBootMessage } = require(
  path.join(DISPLAY_DIR, "display")
);

const { startScheduler, refreshNow, schedulerStatus } = require(
  path.join(__dirname, "services", "scheduler")
);

/* ----------------------------
   Middleware
----------------------------- */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/system", require("./routes/system"));

/* ----------------------------
   Static files
----------------------------- */

// ✅ Slideshow images (THUMBNAILS + PREVIEW ONLY)
// ❗️IMPORTANT: do NOT use /slideshow here
app.use(
  "/slideshow-files",
  express.static(SLIDESHOW_DIR)
);

// Public UI
app.use(express.static(path.join(__dirname, "public")));

/* ----------------------------
   Routes (API)
----------------------------- */

app.use("/status", require("./routes/status"));
app.use("/rss-preview", require("./routes/rssPreview"));
app.use("/settings", require("./routes/settings"));
app.use("/upload", require("./routes/upload"));

// ✅ Slideshow API (list + delete)
app.use("/slideshow", require("./routes/slideshow"));

/* ----------------------------
   Manual refresh trigger
----------------------------- */

app.post("/refresh", (req, res) => {
  refreshNow({ image: schedulerStatus.currentImage || null});
  res.json({ ok: true });
});

/* ----------------------------
   Boot sequence
----------------------------- */

const PORT = 3000;

async function boot() {
  try {
    await renderBootMessage("Inky booting…");
    console.log("Boot message displayed");

    // Delay scheduler to avoid EPD contention
    setTimeout(startScheduler, 5000);

  } catch (err) {
    console.error("Boot message failed:", err);
    startScheduler();
  }
}

/* ----------------------------
   Start server
----------------------------- */

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  boot();
});
