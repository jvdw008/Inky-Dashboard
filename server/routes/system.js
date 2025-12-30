const express = require("express");
const router = express.Router();
const { exec } = require("child_process");

router.post("/reboot", (req, res) => {
  console.log("[System] Reboot requested via portal");

  res.json({ ok: true, message: "Rebooting Inky…" });

  // Delay slightly so response is sent before reboot
  setTimeout(() => {
    exec("sudo /sbin/reboot", err => {
      if (err) {
        console.error("[System] Reboot failed:", err);
      }
    });
  }, 500);
});

module.exports = router;
