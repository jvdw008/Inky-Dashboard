const express = require("express");
const router = express.Router();

const { schedulerStatus } = require("../services/scheduler");

router.get("/", (req, res) => {
  try {
    if (!schedulerStatus.currentRSS) {
      return res.json({
        title: "Waiting for data…",
        text: "The scheduler has not rendered RSS yet.",
      });
    }

    res.json(schedulerStatus.currentRSS);
  } catch (err) {
    console.error("RSS preview error:", err);
    res.status(500).json({
      title: "Preview failed",
      text: "Unable to read scheduler state",
    });
  }
});

module.exports = router;
