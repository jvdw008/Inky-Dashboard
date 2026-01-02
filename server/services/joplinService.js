const fs = require("fs");
const path = require("path");

const JOPLIN_PATH = "/mnt/joplin";
const CACHE_PATH = path.resolve(__dirname, "../state/todos-cache.json");

/* ----------------------------------
   Helpers
----------------------------------- */

function readCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    }
  } catch (err) {
    console.warn("[Joplin] Failed to read cache:", err.message);
  }
  return [];
}

/**
 * Run a synchronous function but fail if it stalls too long.
 * This prevents CIFS from blocking the event loop indefinitely.
 */
function withTimeout(fn, timeoutMs = 2000) {
  const start = Date.now();
  const result = fn();
  const elapsed = Date.now() - start;

  if (elapsed > timeoutMs) {
    throw new Error(`Joplin access exceeded ${timeoutMs}ms`);
  }

  return result;
}

/* ----------------------------------
   Public API
----------------------------------- */

function getTodaysNoteFromBackupSafe(opts) {
  try {
    const todos = withTimeout(
      () => getTodaysNoteFromBackup(opts),
      2000
    );

    // Cache successful read
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(todos, null, 2));
    } catch (err) {
      console.warn("[Joplin] Failed to write cache:", err.message);
    }

    return {
      todos,
      status: "connected",
    };

  } catch (err) {
    console.warn("[Joplin] Using cached todos:", err.message);

    return {
      todos: readCache(),
      status: "cached",
    };
  }
}

/* ----------------------------------
   Core reader (unchanged logic)
----------------------------------- */

function getTodaysNoteFromBackup({ baseBackupDir }) {
  if (
    !fs.existsSync(baseBackupDir) ||
    fs.readdirSync(baseBackupDir).length === 0
  ) {
    console.warn("[Joplin] Backup directory unavailable:", baseBackupDir);
    return [];
  }

  const folders = fs
    .readdirSync(baseBackupDir)
    .filter(f => !f.startsWith("."))
    .sort();

  const latestFolder = folders.pop();
  if (!latestFolder) return [];

  const notesDir = path.join(
    baseBackupDir,
    latestFolder,
    "notes",
    "Day of the Week"
  );

  if (!fs.existsSync(notesDir)) {
    console.warn("[Joplin] Notes directory missing:", notesDir);
    return [];
  }

  const files = fs.readdirSync(notesDir);

  const todayName = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
  });

  const todayFile = files.find(
    f => f.startsWith(todayName) && f.endsWith(".md")
  );

  if (!todayFile) {
    console.log(`[Joplin] No note for ${todayName}`);
    return [];
  }

  const content = fs.readFileSync(
    path.join(notesDir, todayFile),
    "utf8"
  );

  // Strip first 5 lines (metadata)
  const lines = content.split("\n").slice(5);

  const todos = lines
    .map(l => l.trim())
    .filter(Boolean)
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

  console.log("[Joplin] TODOS fetched:", todos);

  return todos;
}

module.exports = {
  getTodaysNoteFromBackupSafe,
};
