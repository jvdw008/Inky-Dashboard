const express = require("express");
const router = express.Router();
const { fetchRSS } = require("../services/rssService");

router.get("/", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Missing url" });

    const rss = await fetchRSS(url, false);
    res.json(rss);
  } catch (err) {
    res.status(500).json({
      title: "Preview failed",
      text: err.message,
    });
  }
});

module.exports = router;
