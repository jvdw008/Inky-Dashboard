const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const { refreshNow } = require("../services/scheduler");

const router = express.Router();

/* ----------------------------
   Project paths
----------------------------- */
const paths = require(path.resolve(__dirname, "../config/paths"));
const { PROJECT_ROOT, SLIDESHOW_DIR, DISPLAY_DIR } = paths;

// /home/sensei/inky/display/slideshow
const UPLOAD_DIR = path.join(PROJECT_ROOT, "display", "slideshow");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ----------------------------
   Multer config (memory)
----------------------------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB safety limit
  },
});

/* ----------------------------
   Upload route
----------------------------- */

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Basic MIME check
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    const filename = `img_${Date.now()}.png`;
    const outPath = path.join(UPLOAD_DIR, filename);

    // Store a CLEAN grayscale image
    // (dithering happens later in epd_render.py)
    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: "contain",
        background: "white",
      })
      .grayscale()
      .png()
      .toFile(outPath);

    console.log("[Upload] Saved slideshow image:", filename);

    // Force immediate display refresh
    refreshNow();

    res.json({
      status: "ok",
      file: filename,
    });
  } catch (err) {
    console.error("[Upload] Failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
