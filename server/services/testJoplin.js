const path = require("path");
const { getTodaysNoteFromBackup } = require("./joplinService");

(async () => {
  try {
    const baseBackupDir = "/mnt/joplin"; // adjust if needed
    const todos = await getTodaysNoteFromBackup({ baseBackupDir });

    console.log("TODOS fetched from backup:");
    console.log(todos);

    if (todos.length === 0) {
      console.warn("⚠️ No todos were returned. Check that the backup folder path is correct and contains today's notes.");
    }
  } catch (err) {
    console.error("Error reading Joplin backup:", err);
  }
})();
