const fs = require("fs");
const path = require("path");

function getTodaysNoteFromBackup({ baseBackupDir }) {
  try {
    if (!fs.existsSync(baseBackupDir) || fs.readdirSync(baseBackupDir).length === 0) {
      console.warn("Joplin backup not mounted:", baseBackupDir);
      return [];
    }

    const folders = fs.readdirSync(baseBackupDir).filter(f => !f.startsWith("."));
    const latestFolder = folders.sort().pop();

    const notesDir = path.join(baseBackupDir, latestFolder, "notes", "Day of the Week");
    const files = fs.readdirSync(notesDir);

    const todayName = new Date().toLocaleDateString("en-GB", { weekday: "long" });
    const todayFile = files.find(f => f.startsWith(todayName) && f.endsWith(".md"));

    if (!todayFile) {
      console.log(`No note for ${todayName} found in ${notesDir}`);
      return [];
    }

    const content = fs.readFileSync(path.join(notesDir, todayFile), "utf-8");

    // Strip first 5 lines (metadata)
    const lines = content.split("\n").slice(5);

    // Map markdown checkboxes to symbols
    const todos = lines
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => {

	if (l.startsWith("- [x]")) {
	    return { text: l.slice(5).trim(), done: true };
	}
        if (l.startsWith("- [ ]")) {
	    return { text: l.slice(5).trim(), done: false };
	}
	return null;
      })
      .filter(Boolean);

    console.log("TODOS fetched from backup:", todos);

    return todos;  // <--- this is crucial
  } catch (err) {
    console.error("Error reading Joplin backup:", err);
    return [];
  }

}

module.exports = { getTodaysNoteFromBackup };
