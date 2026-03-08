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
  "Work & Productivity": "At midnight, work is a distraction from sleep."
};

// State
var customDomains = [];
var checkedDomains = {};
var customCategories = []; // [{name: "Gaming", domains: ["steam.com"]}]
var editingCategoryIndex = -1; // -1 = creating new, >= 0 = renaming

// DOM refs
var wakeTimeInput = document.getElementById("wake-time");
var sleepHoursInput = document.getElementById("sleep-hours");
var sleepHoursValue = document.getElementById("sleep-hours-value");
var bufferSelect = document.getElementById("buffer");
var blockTimeDisplay = document.getElementById("block-time");
var categoriesContainer = document.getElementById("blocklist-categories");
var customDomainInput = document.getElementById("custom-domain");
var btnAddDomain = document.getElementById("btn-add-domain");
var btnSave = document.getElementById("btn-save");
var saveMsg = document.getElementById("save-msg");
var activationInput = document.getElementById("activation-code"); // may be null if removed from HTML
var btnNewCategory = document.getElementById("btn-new-category");
var categoryForm = document.getElementById("category-form");
var categoryNameInput = document.getElementById("category-name-input");
var btnSaveCategory = document.getElementById("btn-save-category");
var btnCancelCategory = document.getElementById("btn-cancel-category");
var customCategoriesContainer = document.getElementById("custom-categories-container");
var customDomainCategorySelect = document.getElementById("custom-domain-category");

// Initialize
init();

async function init() {
  var saved = await chrome.storage.local.get([
    "futureself_wakeTime", "futureself_sleepHours", "futureself_buffer",
    "futureself_blocklist", "futureself_customDomains", "futureself_setupComplete",
    "futureself_customCategories"
  ]);

  if (saved.futureself_wakeTime) wakeTimeInput.value = saved.futureself_wakeTime;
  if (saved.futureself_sleepHours) {
    sleepHoursInput.value = saved.futureself_sleepHours;
    sleepHoursValue.textContent = saved.futureself_sleepHours + " hrs";
  }
  if (saved.futureself_buffer !== undefined) bufferSelect.value = saved.futureself_buffer;
  if (saved.futureself_customDomains) customDomains = saved.futureself_customDomains;
  if (saved.futureself_customCategories) customCategories = saved.futureself_customCategories;

  if (saved.futureself_blocklist) {
    // Restore default category checks
    for (var cat in DEFAULT_CATEGORIES) {
      var domains = DEFAULT_CATEGORIES[cat];
      var savedCatDomains = saved.futureself_blocklist[cat] || [];
      for (var i = 0; i < domains.length; i++) {
        checkedDomains[domains[i]] = savedCatDomains.includes(domains[i]);
      }
    }
    // Restore custom category domain checks
    for (var c = 0; c < customCategories.length; c++) {
      var cc = customCategories[c];
      var savedDoms = saved.futureself_blocklist[cc.name] || [];
      for (var j = 0; j < cc.domains.length; j++) {
        checkedDomains[cc.domains[j]] = savedDoms.includes(cc.domains[j]);
      }
    }
  } else {
    for (var cat in DEFAULT_CATEGORIES) {
      var domains = DEFAULT_CATEGORIES[cat];
      for (var i = 0; i < domains.length; i++) {
        checkedDomains[domains[i]] = true;
      }
    }
    // New custom category domains default to checked
    for (var c = 0; c < customCategories.length; c++) {
      for (var j = 0; j < customCategories[c].domains.length; j++) {
        checkedDomains[customCategories[c].domains[j]] = true;
      }
    }
  }

  renderCategories();
  renderCustomCategories();
  populateCategoryDropdown();
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

  // Custom category form
  btnNewCategory.addEventListener("click", showNewCategoryForm);
  btnSaveCategory.addEventListener("click", saveCategory);
  btnCancelCategory.addEventListener("click", hideCategoryForm);
  categoryNameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") saveCategory();
    if (e.key === "Escape") hideCategoryForm();
  });

  // Hidden activation code (legacy — kept for backward compat)
  if (activationInput) {
    activationInput.addEventListener("input", function () {
      if (activationInput.value === "FUTURESELF2026") {
        chrome.storage.local.set({ futureself_isPaid: true });
        activationInput.value = "";
        activationInput.placeholder = "Activated!";
        activationInput.disabled = true;
      }
    });
  }
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
    var checkedCount = domains.filter(function (d) { return checkedDomains[d]; }).length;
    var countBadge = document.createElement("span");
    countBadge.className = "fs-category-count";
    countBadge.textContent = checkedCount + "/" + domains.length;
    title.appendChild(document.createTextNode(" "));
    title.appendChild(countBadge);
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
          var badge = catDiv.querySelector(".fs-category-count");
          if (badge) badge.textContent = domains.filter(function (d) { return checkedDomains[d]; }).length + "/" + domains.length;
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

// ---- Custom Category CRUD ----

function showNewCategoryForm() {
  editingCategoryIndex = -1;
  categoryNameInput.value = "";
  categoryForm.classList.remove("fs-hidden");
  categoryNameInput.focus();
}

function showRenameCategoryForm(index) {
  editingCategoryIndex = index;
  categoryNameInput.value = customCategories[index].name;
  categoryForm.classList.remove("fs-hidden");
  categoryNameInput.focus();
}

function hideCategoryForm() {
  categoryForm.classList.add("fs-hidden");
  categoryNameInput.value = "";
  editingCategoryIndex = -1;
}

function saveCategory() {
  var name = categoryNameInput.value.trim();
  if (!name) return;

  // Check for name conflicts with default categories
  if (DEFAULT_CATEGORIES[name]) {
    categoryNameInput.value = "";
    categoryNameInput.placeholder = "Name already used by a default category";
    return;
  }

  // Check for duplicate custom category names (excluding the one being renamed)
  for (var i = 0; i < customCategories.length; i++) {
    if (i !== editingCategoryIndex && customCategories[i].name === name) {
      categoryNameInput.value = "";
      categoryNameInput.placeholder = "Category already exists";
      return;
    }
  }

  if (editingCategoryIndex >= 0) {
    // Renaming — update blocklist key mapping
    var oldName = customCategories[editingCategoryIndex].name;
    customCategories[editingCategoryIndex].name = name;
  } else {
    // Creating new
    customCategories.push({ name: name, domains: [] });
  }

  hideCategoryForm();
  renderCustomCategories();
  populateCategoryDropdown();
}

function deleteCategory(index) {
  var cat = customCategories[index];
  // Remove all domain checked states for this category
  for (var i = 0; i < cat.domains.length; i++) {
    delete checkedDomains[cat.domains[i]];
  }
  customCategories.splice(index, 1);
  renderCustomCategories();
  populateCategoryDropdown();
}

function removeDomainFromCategory(catIndex, domain) {
  customCategories[catIndex].domains = customCategories[catIndex].domains.filter(function (d) {
    return d !== domain;
  });
  delete checkedDomains[domain];
  renderCustomCategories();
}

// ---- Populate category dropdown for adding domains ----

function populateCategoryDropdown() {
  customDomainCategorySelect.innerHTML = "";

  var defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Category...";
  customDomainCategorySelect.appendChild(defaultOpt);

  // Custom categories first
  for (var i = 0; i < customCategories.length; i++) {
    var opt = document.createElement("option");
    opt.value = "custom:" + i;
    opt.textContent = customCategories[i].name;
    customDomainCategorySelect.appendChild(opt);
  }

  // Uncategorized option (legacy "Custom" bucket)
  var uncatOpt = document.createElement("option");
  uncatOpt.value = "uncategorized";
  uncatOpt.textContent = "Uncategorized";
  customDomainCategorySelect.appendChild(uncatOpt);
}

// ---- Add custom domain (now with category selection) ----

function addCustomDomain() {
  var domain = customDomainInput.value.trim().toLowerCase();
  if (!domain) return;

  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!domain) {
    customDomainInput.value = "";
    return;
  }

  var catValue = customDomainCategorySelect.value;

  if (catValue.startsWith("custom:")) {
    // Add to a custom category
    var catIdx = parseInt(catValue.split(":")[1], 10);
    if (catIdx >= 0 && catIdx < customCategories.length) {
      if (!customCategories[catIdx].domains.includes(domain)) {
        customCategories[catIdx].domains.push(domain);
        checkedDomains[domain] = true;
      }
    }
  } else {
    // Uncategorized / legacy "Custom" bucket
    if (!customDomains.includes(domain)) {
      customDomains.push(domain);
    }
  }

  customDomainInput.value = "";
  customDomainCategorySelect.value = "";
  renderCustomCategories();
}

// ---- Render custom categories (same UI as default categories) ----

function renderCustomCategories() {
  customCategoriesContainer.innerHTML = "";

  for (var ci = 0; ci < customCategories.length; ci++) {
    (function (catIndex) {
      var cat = customCategories[catIndex];
      var domains = cat.domains;

      var catDiv = document.createElement("div");
      catDiv.className = "fs-category fs-custom-category-block";

      // Header
      var header = document.createElement("div");
      header.className = "fs-category-header";

      var title = document.createElement("h3");
      title.textContent = cat.name;

      if (domains.length > 0) {
        var checkedCount = domains.filter(function (d) { return checkedDomains[d]; }).length;
        var countBadge = document.createElement("span");
        countBadge.className = "fs-category-count";
        countBadge.textContent = checkedCount + "/" + domains.length;
        title.appendChild(document.createTextNode(" "));
        title.appendChild(countBadge);
      }

      header.appendChild(title);

      // Action buttons container
      var actions = document.createElement("div");
      actions.className = "fs-category-actions";

      if (domains.length > 0) {
        var toggleBtn = document.createElement("button");
        toggleBtn.className = "fs-category-toggle";
        var allChecked = domains.every(function (d) { return checkedDomains[d]; });
        toggleBtn.textContent = allChecked ? "Uncheck all" : "Check all";
        toggleBtn.addEventListener("click", function () {
          var newState = !cat.domains.every(function (d) { return checkedDomains[d]; });
          cat.domains.forEach(function (d) { checkedDomains[d] = newState; });
          renderCustomCategories();
        });
        actions.appendChild(toggleBtn);
      }

      var renameBtn = document.createElement("button");
      renameBtn.className = "fs-category-toggle";
      renameBtn.textContent = "Rename";
      renameBtn.addEventListener("click", function () {
        showRenameCategoryForm(catIndex);
      });
      actions.appendChild(renameBtn);

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "fs-category-toggle fs-delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", function () {
        deleteCategory(catIndex);
      });
      actions.appendChild(deleteBtn);

      header.appendChild(actions);
      catDiv.appendChild(header);

      // Domain chips (same as default categories)
      if (domains.length > 0) {
        var chipContainer = document.createElement("div");
        chipContainer.className = "fs-domain-list";

        for (var i = 0; i < domains.length; i++) {
          (function (domain) {
            var chip = document.createElement("label");
            chip.className = "fs-domain-chip" + (checkedDomains[domain] ? " fs-checked" : "");

            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = !!checkedDomains[domain];
            cb.addEventListener("change", function () {
              checkedDomains[domain] = cb.checked;
              chip.classList.toggle("fs-checked", cb.checked);
              // Update badge
              var badge = catDiv.querySelector(".fs-category-count");
              if (badge) {
                badge.textContent = cat.domains.filter(function (d) { return checkedDomains[d]; }).length + "/" + cat.domains.length;
              }
              // Update toggle text
              var toggle = catDiv.querySelector(".fs-category-toggle");
              if (toggle && cat.domains.length > 0) {
                toggle.textContent = cat.domains.every(function (d) { return checkedDomains[d]; })
                  ? "Uncheck all" : "Check all";
              }
            });

            chip.appendChild(cb);
            chip.appendChild(document.createTextNode(domain));

            // Remove single domain button
            var removeBtn = document.createElement("button");
            removeBtn.className = "fs-chip-remove";
            removeBtn.textContent = "\u00D7";
            removeBtn.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              removeDomainFromCategory(catIndex, domain);
            });
            chip.appendChild(removeBtn);

            chipContainer.appendChild(chip);
          })(domains[i]);
        }

        catDiv.appendChild(chipContainer);
      } else {
        var emptyMsg = document.createElement("p");
        emptyMsg.className = "fs-empty-category";
        emptyMsg.textContent = "No domains yet. Add one below.";
        catDiv.appendChild(emptyMsg);
      }

      customCategoriesContainer.appendChild(catDiv);
    })(ci);
  }

  // Also render uncategorized custom domains
  if (customDomains.length > 0) {
    var uncatDiv = document.createElement("div");
    uncatDiv.className = "fs-category";

    var uncatHeader = document.createElement("div");
    uncatHeader.className = "fs-category-header";
    var uncatTitle = document.createElement("h3");
    uncatTitle.textContent = "Uncategorized";
    var uncatBadge = document.createElement("span");
    uncatBadge.className = "fs-category-count";
    uncatBadge.textContent = customDomains.length + " sites";
    uncatTitle.appendChild(document.createTextNode(" "));
    uncatTitle.appendChild(uncatBadge);
    uncatHeader.appendChild(uncatTitle);
    uncatDiv.appendChild(uncatHeader);

    var uncatChips = document.createElement("div");
    uncatChips.className = "fs-domain-list";

    for (var i = 0; i < customDomains.length; i++) {
      (function (domain) {
        var chip = document.createElement("label");
        chip.className = "fs-domain-chip fs-checked";

        chip.appendChild(document.createTextNode(domain));

        var removeBtn = document.createElement("button");
        removeBtn.className = "fs-chip-remove";
        removeBtn.textContent = "\u00D7";
        removeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          customDomains = customDomains.filter(function (d) { return d !== domain; });
          renderCustomCategories();
        });
        chip.appendChild(removeBtn);
        uncatChips.appendChild(chip);
      })(customDomains[i]);
    }

    uncatDiv.appendChild(uncatChips);
    customCategoriesContainer.appendChild(uncatDiv);
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

  // Add custom category domains to blocklist
  for (var c = 0; c < customCategories.length; c++) {
    var cc = customCategories[c];
    var ccChecked = cc.domains.filter(function (d) { return checkedDomains[d]; });
    if (ccChecked.length > 0) {
      blocklist[cc.name] = ccChecked;
    }
  }

  // Uncategorized custom domains go to "Custom" bucket
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
    futureself_customCategories: customCategories,
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
