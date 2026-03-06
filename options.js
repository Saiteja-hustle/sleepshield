// Future Self — Options / Onboarding Page

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

const CATEGORY_CALLOUTS = {
  "Work & Productivity": "Yes, we block work tools too. Because at midnight, work is a distraction from sleep."
};

// State
var customDomains = [];
var checkedDomains = {};

// DOM refs
var wakeTimeInput = document.getElementById("wake-time");
var sleepHoursInput = document.getElementById("sleep-hours");
var sleepHoursValue = document.getElementById("sleep-hours-value");
var bufferSelect = document.getElementById("buffer");
var blockTimeDisplay = document.getElementById("block-time");
var categoriesContainer = document.getElementById("blocklist-categories");
var customDomainInput = document.getElementById("custom-domain");
var customDomainList = document.getElementById("custom-domain-list");
var btnAddDomain = document.getElementById("btn-add-domain");
var btnSave = document.getElementById("btn-save");
var saveMsg = document.getElementById("save-msg");
var activationInput = document.getElementById("activation-code");

// Initialize
init();

async function init() {
  var saved = await chrome.storage.local.get([
    "futureself_wakeTime", "futureself_sleepHours", "futureself_buffer",
    "futureself_blocklist", "futureself_customDomains", "futureself_setupComplete"
  ]);

  if (saved.futureself_wakeTime) wakeTimeInput.value = saved.futureself_wakeTime;
  if (saved.futureself_sleepHours) {
    sleepHoursInput.value = saved.futureself_sleepHours;
    sleepHoursValue.textContent = saved.futureself_sleepHours + " hrs";
  }
  if (saved.futureself_buffer !== undefined) bufferSelect.value = saved.futureself_buffer;
  if (saved.futureself_customDomains) customDomains = saved.futureself_customDomains;

  if (saved.futureself_blocklist) {
    for (var cat in DEFAULT_CATEGORIES) {
      var domains = DEFAULT_CATEGORIES[cat];
      var savedCatDomains = saved.futureself_blocklist[cat] || [];
      for (var i = 0; i < domains.length; i++) {
        checkedDomains[domains[i]] = savedCatDomains.includes(domains[i]);
      }
    }
  } else {
    for (var cat in DEFAULT_CATEGORIES) {
      var domains = DEFAULT_CATEGORIES[cat];
      for (var i = 0; i < domains.length; i++) {
        checkedDomains[domains[i]] = true;
      }
    }
  }

  renderCategories();
  renderCustomDomains();
  updateCalculation();

  wakeTimeInput.addEventListener("input", updateCalculation);
  sleepHoursInput.addEventListener("input", function () {
    sleepHoursValue.textContent = sleepHoursInput.value + " hrs";
    updateCalculation();
  });
  bufferSelect.addEventListener("change", updateCalculation);
  btnAddDomain.addEventListener("click", addCustomDomain);
  customDomainInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addCustomDomain();
  });
  btnSave.addEventListener("click", saveConfig);

  // Hidden activation code
  activationInput.addEventListener("input", function () {
    if (activationInput.value === "FUTURESELF2026") {
      chrome.storage.local.set({ futureself_isPaid: true });
      activationInput.value = "";
      activationInput.placeholder = "Activated!";
      activationInput.disabled = true;
    }
  });
}

function updateCalculation() {
  var wakeTime = wakeTimeInput.value;
  var sleepHours = parseFloat(sleepHoursInput.value);
  var buffer = parseInt(bufferSelect.value, 10);

  var parts = wakeTime.split(":").map(Number);
  var totalWakeMinutes = parts[0] * 60 + parts[1];

  var sleepMinutes = sleepHours * 60;
  var blockStartMinutes = totalWakeMinutes - sleepMinutes - buffer;

  if (blockStartMinutes < 0) blockStartMinutes += 1440;

  var blockH = Math.floor(blockStartMinutes / 60);
  var blockM = Math.round(blockStartMinutes % 60);

  blockTimeDisplay.textContent = formatTime12h(blockH, blockM);
}

function renderCategories() {
  categoriesContainer.innerHTML = "";

  for (var category in DEFAULT_CATEGORIES) {
    var domains = DEFAULT_CATEGORIES[category];
    var catDiv = document.createElement("div");
    catDiv.className = "fs-category";

    var header = document.createElement("div");
    header.className = "fs-category-header";

    var title = document.createElement("h3");
    title.textContent = category;
    header.appendChild(title);

    var toggleBtn = document.createElement("button");
    toggleBtn.className = "fs-category-toggle";
    var allChecked = domains.every(function (d) { return checkedDomains[d]; });
    toggleBtn.textContent = allChecked ? "Uncheck all" : "Check all";
    (function (cat, doms, btn) {
      btn.addEventListener("click", function () {
        var newState = !doms.every(function (d) { return checkedDomains[d]; });
        doms.forEach(function (d) { checkedDomains[d] = newState; });
        renderCategories();
      });
    })(category, domains, toggleBtn);
    header.appendChild(toggleBtn);
    catDiv.appendChild(header);

    if (CATEGORY_CALLOUTS[category]) {
      var callout = document.createElement("div");
      callout.className = "fs-category-callout";
      callout.textContent = CATEGORY_CALLOUTS[category];
      catDiv.appendChild(callout);
    }

    var chipContainer = document.createElement("div");
    chipContainer.className = "fs-domain-list";

    for (var i = 0; i < domains.length; i++) {
      (function (domain) {
        var chip = document.createElement("label");
        chip.className = "fs-domain-chip" + (checkedDomains[domain] ? " fs-checked" : "");

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = checkedDomains[domain];
        cb.addEventListener("change", function () {
          checkedDomains[domain] = cb.checked;
          chip.classList.toggle("fs-checked", cb.checked);
          var parentToggle = catDiv.querySelector(".fs-category-toggle");
          parentToggle.textContent = domains.every(function (d) { return checkedDomains[d]; })
            ? "Uncheck all" : "Check all";
        });

        chip.appendChild(cb);
        chip.appendChild(document.createTextNode(domain));
        chipContainer.appendChild(chip);
      })(domains[i]);
    }

    catDiv.appendChild(chipContainer);
    categoriesContainer.appendChild(catDiv);
  }
}

function addCustomDomain() {
  var domain = customDomainInput.value.trim().toLowerCase();
  if (!domain) return;

  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  if (!domain || customDomains.includes(domain)) {
    customDomainInput.value = "";
    return;
  }

  customDomains.push(domain);
  customDomainInput.value = "";
  renderCustomDomains();
}

function renderCustomDomains() {
  customDomainList.innerHTML = "";
  for (var i = 0; i < customDomains.length; i++) {
    (function (domain) {
      var li = document.createElement("li");
      li.className = "fs-custom-chip";
      li.textContent = domain;

      var removeBtn = document.createElement("button");
      removeBtn.textContent = "\u00D7";
      removeBtn.addEventListener("click", function () {
        customDomains = customDomains.filter(function (d) { return d !== domain; });
        renderCustomDomains();
      });
      li.appendChild(removeBtn);
      customDomainList.appendChild(li);
    })(customDomains[i]);
  }
}

async function saveConfig() {
  var wakeTime = wakeTimeInput.value;
  var sleepHours = parseFloat(sleepHoursInput.value);
  var buffer = parseInt(bufferSelect.value, 10);

  var parts = wakeTime.split(":").map(Number);
  var totalWakeMinutes = parts[0] * 60 + parts[1];
  var blockStartMinutes = totalWakeMinutes - sleepHours * 60 - buffer;
  if (blockStartMinutes < 0) blockStartMinutes += 1440;

  var blockH = Math.floor(blockStartMinutes / 60);
  var blockM = Math.round(blockStartMinutes % 60);
  var blockStartTime = String(blockH).padStart(2, "0") + ":" + String(blockM).padStart(2, "0");

  var blocklist = {};
  for (var category in DEFAULT_CATEGORIES) {
    var domains = DEFAULT_CATEGORIES[category];
    var checked = domains.filter(function (d) { return checkedDomains[d]; });
    if (checked.length > 0) {
      blocklist[category] = checked;
    }
  }

  if (customDomains.length > 0) {
    blocklist["Custom"] = customDomains.slice();
  }

  await chrome.storage.local.set({
    futureself_wakeTime: wakeTime,
    futureself_sleepHours: sleepHours,
    futureself_buffer: buffer,
    futureself_blockStartTime: blockStartTime,
    futureself_blocklist: blocklist,
    futureself_customDomains: customDomains,
    futureself_setupComplete: true
  });

  var now = new Date();
  var nowMinutes = now.getHours() * 60 + now.getMinutes();
  var wakeMinutes = parts[0] * 60 + parts[1];
  var isCurrentlyBlocking = isInBlockWindow(nowMinutes, blockStartMinutes, wakeMinutes);

  saveMsg.classList.remove("fs-hidden");
  if (isCurrentlyBlocking) {
    saveMsg.textContent = "Settings saved! Blocking is active right now. Sweet dreams.";
    saveMsg.className = "fs-save-msg fs-info";
  } else {
    saveMsg.textContent = "Settings saved! Screens off at " + formatTime12h(blockH, blockM) + ".";
    saveMsg.className = "fs-save-msg fs-success";
  }
}

function isInBlockWindow(now, start, wake) {
  if (start <= wake) {
    return now >= start && now < wake;
  }
  return now >= start || now < wake;
}

function formatTime12h(h, m) {
  var suffix = h >= 12 ? "PM" : "AM";
  var h12 = h % 12 || 12;
  return h12 + ":" + String(m).padStart(2, "0") + " " + suffix;
}
