// SleepShield — Options / Onboarding Page

const DEFAULT_CATEGORIES = {
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

// Callouts for specific categories
const CATEGORY_CALLOUTS = {
  "Work & Productivity": "Yes, we block work tools too. At midnight, work is a distraction from sleep."
};

// State
let customDomains = [];
let checkedDomains = {}; // { "facebook.com": true, ... }

// DOM refs
const wakeTimeInput = document.getElementById("wake-time");
const sleepHoursInput = document.getElementById("sleep-hours");
const sleepHoursValue = document.getElementById("sleep-hours-value");
const bufferSelect = document.getElementById("buffer");
const blockTimeDisplay = document.getElementById("block-time");
const categoriesContainer = document.getElementById("blocklist-categories");
const customDomainInput = document.getElementById("custom-domain");
const customDomainList = document.getElementById("custom-domain-list");
const btnAddDomain = document.getElementById("btn-add-domain");
const btnSave = document.getElementById("btn-save");
const saveMsg = document.getElementById("save-msg");

// Initialize
init();

async function init() {
  // Load saved config if it exists
  const saved = await chrome.storage.local.get([
    "wakeTime", "sleepHours", "buffer", "blocklist",
    "customDomains", "setupComplete"
  ]);

  if (saved.wakeTime) wakeTimeInput.value = saved.wakeTime;
  if (saved.sleepHours) {
    sleepHoursInput.value = saved.sleepHours;
    sleepHoursValue.textContent = saved.sleepHours + " hrs";
  }
  if (saved.buffer !== undefined) bufferSelect.value = saved.buffer;
  if (saved.customDomains) customDomains = saved.customDomains;

  // Initialize checked state: if saved blocklist exists, use it; otherwise all checked
  if (saved.blocklist) {
    // Build checked map from saved blocklist
    for (const [cat, domains] of Object.entries(DEFAULT_CATEGORIES)) {
      const savedCatDomains = saved.blocklist[cat] || [];
      for (const d of domains) {
        checkedDomains[d] = savedCatDomains.includes(d);
      }
    }
  } else {
    // All checked by default
    for (const domains of Object.values(DEFAULT_CATEGORIES)) {
      for (const d of domains) {
        checkedDomains[d] = true;
      }
    }
  }

  renderCategories();
  renderCustomDomains();
  updateCalculation();

  // Listeners
  wakeTimeInput.addEventListener("input", updateCalculation);
  sleepHoursInput.addEventListener("input", () => {
    sleepHoursValue.textContent = sleepHoursInput.value + " hrs";
    updateCalculation();
  });
  bufferSelect.addEventListener("change", updateCalculation);
  btnAddDomain.addEventListener("click", addCustomDomain);
  customDomainInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addCustomDomain();
  });
  btnSave.addEventListener("click", saveConfig);
}

/**
 * Calculate and display the block start time.
 */
function updateCalculation() {
  const wakeTime = wakeTimeInput.value;
  const sleepHours = parseFloat(sleepHoursInput.value);
  const buffer = parseInt(bufferSelect.value, 10);

  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  const totalWakeMinutes = wakeH * 60 + wakeM;

  // Block start = wake time - sleep hours - buffer
  const sleepMinutes = sleepHours * 60;
  let blockStartMinutes = totalWakeMinutes - sleepMinutes - buffer;

  // Handle negative (wrap around midnight)
  if (blockStartMinutes < 0) blockStartMinutes += 1440;

  const blockH = Math.floor(blockStartMinutes / 60);
  const blockM = Math.round(blockStartMinutes % 60);

  blockTimeDisplay.textContent = formatTime12h(blockH, blockM);
}

/**
 * Render the categorized blocklist with checkboxes.
 */
function renderCategories() {
  categoriesContainer.innerHTML = "";

  for (const [category, domains] of Object.entries(DEFAULT_CATEGORIES)) {
    const catDiv = document.createElement("div");
    catDiv.className = "category";

    // Header with toggle all
    const header = document.createElement("div");
    header.className = "category-header";

    const title = document.createElement("h3");
    title.textContent = category;
    header.appendChild(title);

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "category-toggle";
    const allChecked = domains.every((d) => checkedDomains[d]);
    toggleBtn.textContent = allChecked ? "Uncheck all" : "Check all";
    toggleBtn.addEventListener("click", () => {
      const newState = !domains.every((d) => checkedDomains[d]);
      domains.forEach((d) => { checkedDomains[d] = newState; });
      renderCategories();
    });
    header.appendChild(toggleBtn);
    catDiv.appendChild(header);

    // Category callout if applicable
    if (CATEGORY_CALLOUTS[category]) {
      const callout = document.createElement("div");
      callout.className = "category-callout";
      callout.textContent = CATEGORY_CALLOUTS[category];
      catDiv.appendChild(callout);
    }

    // Domain chips
    const chipContainer = document.createElement("div");
    chipContainer.className = "domain-list";

    for (const domain of domains) {
      const chip = document.createElement("label");
      chip.className = "domain-chip" + (checkedDomains[domain] ? " checked" : "");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = checkedDomains[domain];
      cb.addEventListener("change", () => {
        checkedDomains[domain] = cb.checked;
        chip.classList.toggle("checked", cb.checked);
        // Update toggle button text
        const parentToggle = catDiv.querySelector(".category-toggle");
        parentToggle.textContent = domains.every((d) => checkedDomains[d])
          ? "Uncheck all" : "Check all";
      });

      chip.appendChild(cb);
      chip.appendChild(document.createTextNode(domain));
      chipContainer.appendChild(chip);
    }

    catDiv.appendChild(chipContainer);
    categoriesContainer.appendChild(catDiv);
  }
}

/**
 * Add a custom domain to the list.
 */
function addCustomDomain() {
  let domain = customDomainInput.value.trim().toLowerCase();
  if (!domain) return;

  // Strip protocol and path
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  if (!domain || customDomains.includes(domain)) {
    customDomainInput.value = "";
    return;
  }

  customDomains.push(domain);
  customDomainInput.value = "";
  renderCustomDomains();
}

/**
 * Render the custom domain chips.
 */
function renderCustomDomains() {
  customDomainList.innerHTML = "";
  for (const domain of customDomains) {
    const li = document.createElement("li");
    li.className = "custom-chip";
    li.textContent = domain;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "\u00D7";
    removeBtn.addEventListener("click", () => {
      customDomains = customDomains.filter((d) => d !== domain);
      renderCustomDomains();
    });
    li.appendChild(removeBtn);
    customDomainList.appendChild(li);
  }
}

/**
 * Save configuration to chrome.storage.local.
 */
async function saveConfig() {
  const wakeTime = wakeTimeInput.value;
  const sleepHours = parseFloat(sleepHoursInput.value);
  const buffer = parseInt(bufferSelect.value, 10);

  // Calculate block start time
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  const totalWakeMinutes = wakeH * 60 + wakeM;
  let blockStartMinutes = totalWakeMinutes - sleepHours * 60 - buffer;
  if (blockStartMinutes < 0) blockStartMinutes += 1440;

  const blockH = Math.floor(blockStartMinutes / 60);
  const blockM = Math.round(blockStartMinutes % 60);
  const blockStartTime = `${String(blockH).padStart(2, "0")}:${String(blockM).padStart(2, "0")}`;

  // Build blocklist from checked domains + custom domains
  const blocklist = {};
  for (const [category, domains] of Object.entries(DEFAULT_CATEGORIES)) {
    const checked = domains.filter((d) => checkedDomains[d]);
    if (checked.length > 0) {
      blocklist[category] = checked;
    }
  }

  // Add custom domains as their own category
  if (customDomains.length > 0) {
    blocklist["Custom"] = [...customDomains];
  }

  await chrome.storage.local.set({
    wakeTime,
    sleepHours,
    buffer,
    blockStartTime,
    blocklist,
    customDomains,
    setupComplete: true
  });

  // Check if block time has already passed — activate immediately
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const wakeMinutes = wakeH * 60 + wakeM;
  const isCurrentlyBlocking = isInBlockWindow(nowMinutes, blockStartMinutes, wakeMinutes);

  saveMsg.classList.remove("hidden");
  if (isCurrentlyBlocking) {
    saveMsg.textContent = "Settings saved! Blocking is active right now. Sweet dreams.";
    saveMsg.className = "save-msg info";
  } else {
    saveMsg.textContent = `Settings saved! Screens off at ${formatTime12h(blockH, blockM)}.`;
    saveMsg.className = "save-msg success";
  }
}

function isInBlockWindow(now, start, wake) {
  if (start <= wake) {
    return now >= start && now < wake;
  }
  return now >= start || now < wake;
}

function formatTime12h(h, m) {
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
