require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();

/* ----------------------------
   Project paths
----------------------------- */

// /home/sensei/inky
const PROJECT_ROOT = path.resolve(__dirname, "..");

// /home/sensei/inky/display
const DISPLAY_DIR = path.join(PROJECT_ROOT, "display");

// /home/sensei/inky/display/slideshow
const SLIDESHOW_DIR = path.join(DISPLAY_DIR, "slideshow");

/* ----------------------------
   Services
----------------------------- */

const { renderBootMessage } = require(
  path.join(DISPLAY_DIR, "display")
);

const { startScheduler, refreshNow } = require(
  path.join(__dirname, "services", "scheduler")
);

/* ----------------------------
   Middleware
----------------------------- */

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ----------------------------
   Static files
----------------------------- */

// Slideshow images (for thumbnails + preview)
app.use("/slideshow", express.static(SLIDESHOW_DIR));

// Public UI
app.use(express.static(path.join(__dirname, "public")));

/* ----------------------------
   Routes
----------------------------- */

app.use("/status", require("./routes/status"));
app.use("/rss-preview", require("./routes/rssPreview"));
app.use("/settings", require("./routes/settings"));
app.use("/upload", require("./routes/upload"));
app.use("/slideshow-list", require("./routes/slideshow"));

/* ----------------------------
   Manual refresh trigger
----------------------------- */

app.post("/refresh", async (req, res) => {
  await refreshNow();
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
