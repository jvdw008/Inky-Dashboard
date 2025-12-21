const express = require("express");
const router = express.Router();

const { refreshNow } = require("../services/scheduler");

router.post("/", (req, res) => {
  console.log("[Refresh] Manual refresh requested");
  refreshNow();
  res.json({ status: "ok" });
});

module.exports = router;
