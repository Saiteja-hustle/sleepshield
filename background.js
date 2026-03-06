// Future Self — Background Service Worker
// Intercepts navigation and redirects blocked sites during the sleep window.
// Includes 1-day free trial system.

var TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Default blocklist with categories
var DEFAULT_BLOCKLIST = {
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

var WORK_AI_CATEGORIES = ["Work & Productivity", "AI & Research Tools"];

function timeToMinutes(timeStr) {
  var parts = timeStr.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function isInBlockWindow(nowMinutes, blockStartMinutes, wakeMinutes) {
  if (blockStartMinutes <= wakeMinutes) {
    return nowMinutes >= blockStartMinutes && nowMinutes < wakeMinutes;
  }
  return nowMinutes >= blockStartMinutes || nowMinutes < wakeMinutes;
}

function extractDomain(urlStr) {
  try {
    var url = new URL(urlStr);
    return url.hostname.replace(/^www\./, "");
  } catch (e) {
    return null;
  }
}

function checkBlocklist(domain, blocklist) {
  for (var category in blocklist) {
    var domains = blocklist[category];
    for (var i = 0; i < domains.length; i++) {
      if (domain === domains[i] || domain.endsWith("." + domains[i])) {
        return { blocked: true, domain: domains[i], category: category };
      }
    }
  }
  return { blocked: false };
}

async function hasActiveOverride(domain) {
  var data = await chrome.storage.local.get("futureself_overrides");
  var overrides = data.futureself_overrides || [];
  var now = Date.now();
  return overrides.some(function (o) {
    return o.domain === domain && o.expiresAt > now;
  });
}

async function incrementBlockCount() {
  var data = await chrome.storage.local.get("futureself_blockedTonight");
  var count = data.futureself_blockedTonight || 0;
  await chrome.storage.local.set({ futureself_blockedTonight: count + 1 });
}

async function checkTrialStatus() {
  var data = await chrome.storage.local.get([
    "futureself_trialStart", "futureself_isPaid"
  ]);

  if (data.futureself_isPaid === true) {
    return "paid";
  }

  var trialStart = data.futureself_trialStart;
  if (!trialStart) {
    return "no_trial";
  }

  if (Date.now() - trialStart < TRIAL_DURATION_MS) {
    return "trial_active";
  }

  return "trial_expired";
}

// Main navigation handler
chrome.webNavigation.onBeforeNavigate.addListener(async function (details) {
  if (details.frameId !== 0) return;
  if (details.url.startsWith("chrome-extension://")) return;

  var config = await chrome.storage.local.get([
    "futureself_wakeTime", "futureself_blockStartTime",
    "futureself_blocklist", "futureself_setupComplete"
  ]);

  if (!config.futureself_setupComplete) return;

  var now = new Date();
  var nowMinutes = now.getHours() * 60 + now.getMinutes();
  var blockStartMinutes = timeToMinutes(config.futureself_blockStartTime);
  var wakeMinutes = timeToMinutes(config.futureself_wakeTime);

  if (!isInBlockWindow(nowMinutes, blockStartMinutes, wakeMinutes)) return;

  var domain = extractDomain(details.url);
  if (!domain) return;

  var result = checkBlocklist(domain, config.futureself_blocklist);
  if (!result.blocked) return;

  // Check trial/paid status
  var trialStatus = await checkTrialStatus();

  if (trialStatus === "trial_expired") {
    // Show upgrade page instead of block page
    var upgradeUrl = chrome.runtime.getURL(
      "upgrade.html?site=" + encodeURIComponent(result.domain)
    );
    chrome.tabs.update(details.tabId, { url: upgradeUrl });
    return;
  }

  if (trialStatus === "no_trial") {
    // No trial started and not paid — don't block
    return;
  }

  // Trial active or paid — normal blocking
  var overridden = await hasActiveOverride(result.domain);
  if (overridden) return;

  await incrementBlockCount();

  var redirectUrl = chrome.runtime.getURL(
    "blocked.html?site=" + encodeURIComponent(result.domain) + "&category=" + encodeURIComponent(result.category)
  );

  chrome.tabs.update(details.tabId, { url: redirectUrl });
});

// Reset nightly counters at wake time
chrome.alarms.create("nightlyReset", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async function (alarm) {
  if (alarm.name !== "nightlyReset") return;

  var config = await chrome.storage.local.get([
    "futureself_wakeTime", "futureself_setupComplete", "futureself_lastResetDate"
  ]);
  if (!config.futureself_setupComplete) return;

  var now = new Date();
  var todayStr = now.toDateString();

  if (config.futureself_lastResetDate === todayStr) return;

  var wakeMinutes = timeToMinutes(config.futureself_wakeTime);
  var nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= wakeMinutes && nowMinutes < wakeMinutes + 5) {
    var streakData = await chrome.storage.local.get([
      "futureself_overrides", "futureself_streak"
    ]);
    var overrides = streakData.futureself_overrides || [];
    var streak = streakData.futureself_streak || 0;

    var blockStart = new Date();
    blockStart.setDate(blockStart.getDate() - 1);
    var lastNightOverrides = overrides.filter(function (o) {
      return new Date(o.createdAt) >= blockStart;
    });

    var streakBroken = lastNightOverrides.length > 0;
    var newStreak = streakBroken ? 0 : streak + 1;

    await chrome.storage.local.set({
      futureself_streak: newStreak,
      futureself_blockedTonight: 0,
      futureself_overrides: [],
      futureself_lastResetDate: todayStr,
      futureself_shownQuestions: [],
      futureself_shownGamesTonight: []
    });
  }
});

// On install: open options page and initialize trial
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    // Initialize trial
    chrome.storage.local.set({
      futureself_trialStart: Date.now(),
      futureself_trialStatus: "active",
      futureself_isPaid: false
    });

    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  }
});
