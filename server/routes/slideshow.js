const express = require("express");
const fs = require("fs");
const path = require("path");
const { refreshNow, setLiveImage } = require("../services/scheduler");

const router = express.Router();

/* ----------------------------
   Project paths
----------------------------- */

const paths = require(path.resolve(__dirname, "../config/paths"));
const { PROJECT_ROOT, SLIDESHOW_DIR, DISPLAY_DIR } = paths;

/* ----------------------------
   List slideshow images
----------------------------- */

router.get("/", (req, res) => {
  try {
    if (!fs.existsSync(SLIDESHOW_DIR)) {
      return res.json([]);
    }

    const files = fs
      .readdirSync(SLIDESHOW_DIR)
      .filter(f => f.toLowerCase().endsWith(".png"))
      .sort()
      .map(f => ({
        name: f,
        url: `/slideshow-files/${f}`,
      }));

    res.json(files);
  } catch (err) {
    console.error("[Slideshow] List error:", err);
    res.status(500).json({ error: "Failed to read slideshow images" });
  }
});

/* -------------------------
   Set LIVE image
-------------------------- */

router.post("/:filename/live", async (req, res) => {
  const filename = req.params.filename;

  // Security: block path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  try {
    setLiveImage(filename);
    res.json({ status: "ok", file: filename });
  } catch (err) {
    console.error("[Slideshow] Set LIVE error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------------
   Delete slideshow image
----------------------------- */

router.delete("/:filename", (req, res) => {
  const filename = req.params.filename;

  // Security: block path traversal
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(SLIDESHOW_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    fs.unlinkSync(filePath);
    console.log("[Slideshow] Deleted:", filename);

    // Force immediate display refresh
    refreshNow();

    res.json({ status: "ok" });
  } catch (err) {
    console.error("[Slideshow] Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
