const express = require("express");
const router = express.Router();
const { schedulerStatus } = require("../services/scheduler");

router.get("/", (req, res) => {
  res.json(schedulerStatus);
});

module.exports = router;
