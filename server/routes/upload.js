const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { refreshNow } = require("../services/scheduler");

const router = express.Router();
const MAX_UPLOAD_MB = 10;
/* ----------------------------
   Project paths
----------------------------- */
const paths = require(path.resolve(__dirname, "../config/paths"));
const { PROJECT_ROOT, SLIDESHOW_DIR, DISPLAY_DIR } = paths;

// /home/USERNAME/inky/display/slideshow
const UPLOAD_DIR = path.join(PROJECT_ROOT, "display", "slideshow");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ----------------------------
   Multer config (memory)
----------------------------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024, // safety limit
  },
});

/* ----------------------------
   Upload route
----------------------------- */

/* ----------------------------
   Upload route (SAFE)
----------------------------- */

router.post("/", (req, res) => {
  upload.single("image")(req, res, async err => {
    // 🔒 Multer-specific errors (file too large, etc.)
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: `Image too large. Max size is ${MAX_UPLOAD_MB}MB.`,
        });
      }

      return res.status(400).json({ error: err.message });
    }

    // ❌ Other errors
    if (err) {
      console.error("[Upload] Multer error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }

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
      await sharp(req.file.buffer)
        .rotate()
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
      console.error("[Upload] Processing failed:", err);
      res.status(500).json({ error: "Image processing failed" });
    }
  });
});

module.exports = router;
