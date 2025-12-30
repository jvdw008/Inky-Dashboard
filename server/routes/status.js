const express = require("express");
const router = express.Router();

const {
  schedulerStatus,
  readSchedulerInterval,
} = require("../services/scheduler");

function formatDate(ts) {
  if (!ts) return null;

  const d = new Date(ts);

  return d
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
}

router.get("/", (req, res) => {
  res.json({
    ...schedulerStatus,
    intervalMinutes: readSchedulerInterval(),
    lastRun: formatDate(schedulerStatus.lastRun),
    lastSuccess: formatDate(schedulerStatus.lastSuccess),
  });
});

module.exports = router;
