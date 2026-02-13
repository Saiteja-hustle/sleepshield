// SleepShield — Background Service Worker
// Intercepts navigation and redirects blocked sites during the sleep window.

// Default blocklist with categories
const DEFAULT_BLOCKLIST = {
  "Social Media": [
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "reddit.com", "tiktok.com", "linkedin.com", "snapchat.com", "threads.net"
  ],
  "Entertainment": [
    "youtube.com", "netflix.com", "twitch.tv", "primevideo.com",
    "hotstar.com", "disneyplus.com", "hulu.com", "spotify.com"
  ],
  "Work & Productivity": [
    "docs.google.com", "sheets.google.com", "slides.google.com",
    "notion.so", "slack.com", "trello.com", "asana.com",
    "monday.com", "figma.com", "canva.com", "github.com", "gitlab.com"
  ],
  "AI & Research Tools": [
    "chatgpt.com", "chat.openai.com", "claude.ai",
    "gemini.google.com", "perplexity.ai", "copilot.microsoft.com", "bard.google.com"
  ],
  "News & Rabbit Holes": [
    "news.google.com", "cnn.com", "bbc.com", "nytimes.com",
    "medium.com", "substack.com", "quora.com", "wikipedia.org"
  ],
  "Shopping": [
    "amazon.com", "flipkart.com", "ebay.com", "myntra.com"
  ],
  "Email": [
    "mail.google.com", "outlook.live.com", "mail.yahoo.com"
  ]
};

// Categories considered "work/AI" for question prioritization
const WORK_AI_CATEGORIES = ["Work & Productivity", "AI & Research Tools"];

/**
 * Parse a time string "HH:MM" into total minutes from midnight.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Check if the current time (in minutes from midnight) falls within the block window.
 * Handles midnight crossover: e.g., block 22:00 → 06:00.
 */
function isInBlockWindow(nowMinutes, blockStartMinutes, wakeMinutes) {
  if (blockStartMinutes <= wakeMinutes) {
    // No midnight crossover (e.g., 01:00 → 06:00)
    return nowMinutes >= blockStartMinutes && nowMinutes < wakeMinutes;
  }
  // Midnight crossover (e.g., 22:00 → 06:00)
  return nowMinutes >= blockStartMinutes || nowMinutes < wakeMinutes;
}

/**
 * Extract the hostname from a URL string.
 * Returns the full hostname (e.g., "docs.google.com").
 */
function extractDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Check if a domain matches any entry in the blocklist.
 * Supports subdomain matching: "foo.reddit.com" matches "reddit.com".
 * Returns { blocked: true, domain, category } or { blocked: false }.
 */
function checkBlocklist(domain, blocklist) {
  for (const [category, domains] of Object.entries(blocklist)) {
    for (const blockedDomain of domains) {
      if (domain === blockedDomain || domain.endsWith("." + blockedDomain)) {
        return { blocked: true, domain: blockedDomain, category };
      }
    }
  }
  return { blocked: false };
}

/**
 * Check if there's a valid (non-expired) override for this domain.
 */
async function hasActiveOverride(domain) {
  const { overrides = [] } = await chrome.storage.local.get("overrides");
  const now = Date.now();
  return overrides.some(
    (o) => o.domain === domain && o.expiresAt > now
  );
}

/**
 * Increment tonight's blocked attempt counter.
 */
async function incrementBlockCount() {
  const { blockedTonight = 0 } = await chrome.storage.local.get("blockedTonight");
  await chrome.storage.local.set({ blockedTonight: blockedTonight + 1 });
}

/**
 * Main navigation handler.
 * Fires on every top-level navigation and decides whether to block.
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept top-level frame navigations
  if (details.frameId !== 0) return;

  // Don't intercept our own extension pages
  if (details.url.startsWith("chrome-extension://")) return;

  const config = await chrome.storage.local.get([
    "wakeTime", "blockStartTime", "blocklist", "setupComplete"
  ]);

  // If setup hasn't been completed, don't block anything
  if (!config.setupComplete) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const blockStartMinutes = timeToMinutes(config.blockStartTime);
  const wakeMinutes = timeToMinutes(config.wakeTime);

  // Check if we're in the block window
  if (!isInBlockWindow(nowMinutes, blockStartMinutes, wakeMinutes)) return;

  const domain = extractDomain(details.url);
  if (!domain) return;

  const result = checkBlocklist(domain, config.blocklist);
  if (!result.blocked) return;

  // Check for active override
  const overridden = await hasActiveOverride(result.domain);
  if (overridden) return;

  // Block this navigation
  await incrementBlockCount();

  const redirectUrl = chrome.runtime.getURL(
    `blocked.html?site=${encodeURIComponent(result.domain)}&category=${encodeURIComponent(result.category)}`
  );

  // Redirect the tab to blocked.html
  chrome.tabs.update(details.tabId, { url: redirectUrl });
});

/**
 * Reset nightly counters at wake time.
 * Runs every minute to check if it's wake time.
 */
chrome.alarms.create("nightlyReset", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "nightlyReset") return;

  const config = await chrome.storage.local.get([
    "wakeTime", "setupComplete", "lastResetDate"
  ]);
  if (!config.setupComplete) return;

  const now = new Date();
  const todayStr = now.toDateString();

  // Already reset today
  if (config.lastResetDate === todayStr) return;

  const wakeMinutes = timeToMinutes(config.wakeTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if we've passed wake time
  if (nowMinutes >= wakeMinutes && nowMinutes < wakeMinutes + 5) {
    // Calculate streak
    const { overrides = [], streak = 0 } = await chrome.storage.local.get(["overrides", "streak"]);

    // Check if any streak-breaking overrides were used last night
    const blockStart = new Date();
    blockStart.setDate(blockStart.getDate() - 1); // Yesterday
    const lastNightOverrides = overrides.filter((o) => {
      const overrideTime = new Date(o.createdAt);
      return overrideTime >= blockStart;
    });

    const streakBroken = lastNightOverrides.some(
      (o) => o.duration >= 30 || o.duration === -1 // -1 = until wake-up
    );

    const newStreak = streakBroken ? 0 : streak + 1;

    await chrome.storage.local.set({
      streak: newStreak,
      blockedTonight: 0,
      overrides: [], // Clear old overrides
      lastResetDate: todayStr,
      shownQuestions: [] // Reset question tracking
    });
  }
});

// Open options page on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  }
});
