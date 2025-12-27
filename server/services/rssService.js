const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser({ timeout: 15000 });
const STATE_FILE = path.join(__dirname, "rssState.json");
const RSS_CACHE_PATH = path.resolve(__dirname, "../state/rssCache.json");

/* ---------- helpers ---------- */

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max = 280) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function resetRssState() {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ lastIndex: -1 }, null, 2),
    "utf8"
  );
}

/* ---------- main service ---------- */
async function fetchRSSWithCache(url) {
  try {
    console.log("[RSS] Fetching feed:", url);

    const rss = await fetchRSS(url); // your existing fetch logic

    fs.writeFileSync(RSS_CACHE_PATH, JSON.stringify(rss, null, 2));

    return {
      rss,
      status: "live",
    };

  } catch (err) {
    console.warn("[RSS] Fetch failed:", err.code || err.message);

    if (fs.existsSync(RSS_CACHE_PATH)) {
      console.warn("[RSS] Using cached feed");

      return {
        rss: JSON.parse(fs.readFileSync(RSS_CACHE_PATH, "utf8")),
        status: "cached",
      };
    }

    return {
      rss: {
        title: "RSS unavailable",
        text: "Unable to load feed at this time.",
      },
      status: "unavailable",
    };
  }
}

async function fetchRSS(feedUrl, rotate = true) {
  if (!feedUrl) {
    console.error("[RSS] No feed URL provided");
    return { title: "RSS unavailable", text: "No URL" };
  }

  try {
    console.log("[RSS] Fetching feed:", feedUrl);

    const feed = await parser.parseURL(feedUrl);

    if (!feed.items || feed.items.length === 0) {
      throw new Error("RSS feed has no items");
    }

    console.log("[RSS] Fetched items:", feed.items.length);

    // Take latest 24 items
    const items = feed.items.slice(0, 24);

    // Load rotation state
    let lastIndex = -1;
    if (rotate) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
        if (typeof state.lastIndex === "number") lastIndex = state.lastIndex;
      } catch {}
    }

    // Pick next item in rotation
    const nextIndex = rotate ? (lastIndex + 1) % items.length : 0;
    const item = items[nextIndex];

    // Save state
    if (rotate) {
      fs.writeFileSync(STATE_FILE, JSON.stringify({ lastIndex: nextIndex }));
    }

    // Prepare title & body
    const rawTitle = stripHtml(item.title || "");
    const title = truncate(rawTitle, 100);
    const body = item.content ?? item["content:encoded"] ?? item.summary ?? item.description ?? "";
    const text = truncate(stripHtml(body), rawTitle.length > 80 ? 90 : 125);

    return { title, text };

  } catch (err) {
    console.error("[RSS] Failed to fetch RSS:", err);
    return {
      title: "RSS unavailable",
      text: "Unable to load feed at this time.",
    };
  }
}

module.exports = {
  fetchRSS,
  resetRssState,
  fetchRSSWithCache,
};
