// testRSS.js
const { fetchRSS } = require("./rssService");

const feedUrl = "https://feeds.bbci.co.uk/news/rss.xml";

(async () => {
  try {
    console.log("Fetching RSS feed from:", feedUrl);
    const rss = await fetchRSS(feedUrl);
    console.log("RSS fetch result:", rss);
  } catch (err) {
    console.error("Error fetching RSS:", err);
  }
})();
