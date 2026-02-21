// SleepShield — Blocked Page Logic (v2)
// Zone-aware question selection, 10-second friction timer, and override reason flow.

(async function () {
  // ── Parse URL params ──
  const params = new URLSearchParams(window.location.search);
  const site = params.get("site") || "a website";

  // ── Load config from storage ──
  const config = await chrome.storage.local.get([
    "wakeTime", "blockStartTime", "streak", "shownQuestions", "overrides"
  ]);

  const wakeTime = config.wakeTime || "06:00";
  const blockStartTime = config.blockStartTime || "22:00";
  const streak = config.streak || 0;
  const shownQuestions = config.shownQuestions || [];
  const overrides = config.overrides || [];
  const attempts = overrides.length; // how many overrides performed tonight

  // ── Time calculations ──
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const wakeTimeDisplay = formatTime12h(wakeTime);
  const hoursLeft = calcHoursLeft(now, wakeTime);

  // ── Determine zone ──
  const zone = determineZone(now, blockStartTime, wakeTime);

  // ── Update header ──
  document.getElementById("site-name").textContent =
    `You're trying to open ${site}`;
  document.getElementById("time-notice").textContent =
    `It's ${timeStr}. Your alarm is at ${wakeTimeDisplay}.`;

  // ── Load and display question ──
  const question = await pickQuestion(zone, streak, shownQuestions);
  const questionText = fillVariables(question.text, {
    time: timeStr,
    wake: wakeTimeDisplay,
    hours_left: hoursLeft,
    streak,
    attempts,
    site
  });
  document.getElementById("question-text").textContent = questionText;

  // Track shown question
  shownQuestions.push(question.id);
  await chrome.storage.local.set({ shownQuestions });

  // ── Start 10-second friction timer ──
  startFrictionTimer();

  // ── Button handlers ──
  document.getElementById("btn-sleep").addEventListener("click", closePage);
  document.getElementById("btn-back").addEventListener("click", closePage);

  document.getElementById("btn-override").addEventListener("click", () => {
    document.getElementById("main-screen").classList.add("hidden");
    const overrideScreen = document.getElementById("override-screen");
    overrideScreen.classList.remove("hidden");
    overrideScreen.classList.add("screen-enter");
  });

  // Reason buttons
  document.querySelectorAll(".btn-reason").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reason = btn.dataset.reason;
      await createOverride(site, reason, zone);
      window.location.href = `https://${site}`;
    });
  });

  // ═══════════════════════════════════════════
  // Functions
  // ═══════════════════════════════════════════

  /**
   * Determine which zone the user is in: early, mid, or late.
   *
   * - early: first 1.5 hours of sleep window
   * - mid:   1.5 to 3 hours into sleep window
   * - late:  3+ hours in OR less than 5 hours until alarm
   */
  function determineZone(now, blockStart, wake) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const blockStartMin = timeToMinutes(blockStart);
    const wakeMin = timeToMinutes(wake);

    // Minutes elapsed since block window started
    let elapsed;
    if (nowMinutes >= blockStartMin) {
      elapsed = nowMinutes - blockStartMin;
    } else {
      // Past midnight: e.g., now=1:00 (60), blockStart=22:00 (1320)
      elapsed = (1440 - blockStartMin) + nowMinutes;
    }

    // Hours remaining until wake
    let minutesUntilWake;
    if (wakeMin > nowMinutes) {
      minutesUntilWake = wakeMin - nowMinutes;
    } else {
      minutesUntilWake = (1440 - nowMinutes) + wakeMin;
    }
    const hoursUntilWake = minutesUntilWake / 60;

    // Less than 5 hours until alarm → always late
    if (hoursUntilWake < 5) return "late";

    // Time-based zones
    if (elapsed <= 90) return "early";
    if (elapsed <= 180) return "mid";
    return "late";
  }

  /**
   * Pick a question using category weighting by zone.
   *
   * Zone weighting:
   * - early: humor ×3, morning_pull ×3, others ×1
   * - mid:   all categories equal ×1
   * - late:  future_self ×3, intention_check ×3, others ×1
   */
  async function pickQuestion(zone, streak, shownIds) {
    const res = await fetch(chrome.runtime.getURL("questions.json"));
    const allQuestions = await res.json();

    // Filter to current zone
    let pool = allQuestions.filter((q) => q.zone === zone);

    // Filter out streak questions if streak < 2
    if (streak < 2) {
      pool = pool.filter((q) => !q.text.includes("{streak}"));
    }

    // Filter out already-shown questions
    let available = pool.filter((q) => !shownIds.includes(q.id));

    // If all shown in this zone, reset tracking
    if (available.length === 0) {
      available = pool;
      await chrome.storage.local.set({ shownQuestions: [] });
    }

    // Group by category
    const byCategory = {};
    for (const q of available) {
      if (!byCategory[q.category]) byCategory[q.category] = [];
      byCategory[q.category].push(q);
    }

    // Category weights based on zone
    const weights = getCategoryWeights(zone);

    // Build weighted category list
    const weightedCategories = [];
    for (const [cat, questions] of Object.entries(byCategory)) {
      const w = weights[cat] || 1;
      for (let i = 0; i < w; i++) {
        weightedCategories.push(cat);
      }
    }

    // Pick random category, then random question within it
    const chosenCat = weightedCategories[
      Math.floor(Math.random() * weightedCategories.length)
    ];
    const catQuestions = byCategory[chosenCat];
    return catQuestions[Math.floor(Math.random() * catQuestions.length)];
  }

  /**
   * Get category weight multipliers for a zone.
   */
  function getCategoryWeights(zone) {
    if (zone === "early") {
      return {
        future_self: 1,
        intention_check: 1,
        pattern_recognition: 1,
        humor: 3,
        science: 1,
        identity: 1,
        morning_pull: 3
      };
    }
    if (zone === "late") {
      return {
        future_self: 3,
        intention_check: 3,
        pattern_recognition: 1,
        humor: 1,
        science: 1,
        identity: 1,
        morning_pull: 1
      };
    }
    // mid: all equal
    return {
      future_self: 1,
      intention_check: 1,
      pattern_recognition: 1,
      humor: 1,
      science: 1,
      identity: 1,
      morning_pull: 1
    };
  }

  /**
   * Replace {placeholders} in question text with actual values.
   */
  function fillVariables(text, vars) {
    return text
      .replace(/\{site\}/g, vars.site)
      .replace(/\{time\}/g, vars.time)
      .replace(/\{wake\}/g, vars.wake)
      .replace(/\{hours_left\}/g, vars.hours_left)
      .replace(/\{streak\}/g, vars.streak)
      .replace(/\{attempts\}/g, vars.attempts);
  }

  /**
   * 10-second friction timer.
   *
   * 0-3s:  Question fades in (handled by CSS animation)
   * 3-7s:  Countdown text visible: "Take a moment... 7... 6..."
   * 7-10s: Override button fades in (CSS), countdown continues
   * 10s:   Both buttons fully visible and clickable
   */
  function startFrictionTimer() {
    const countdownEl = document.getElementById("countdown-text");
    const actionsEl = document.getElementById("actions");
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed++;

      if (elapsed >= 3 && elapsed < 10) {
        const remaining = 10 - elapsed;
        countdownEl.textContent = `Take a moment... ${remaining}`;
      }

      if (elapsed >= 10) {
        clearInterval(interval);
        countdownEl.textContent = "";
        actionsEl.classList.add("visible");
      }
    }, 1000);
  }

  /**
   * Create an override entry and store it.
   * All overrides are 15 minutes.
   */
  async function createOverride(domain, reason, zone) {
    const { overrides = [] } = await chrome.storage.local.get("overrides");

    const now = new Date();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    overrides.push({
      domain,
      createdAt: Date.now(),
      expiresAt,
      duration: 15,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      site: domain,
      reason,
      zone
    });

    await chrome.storage.local.set({ overrides });
  }

  /**
   * Calculate hours + minutes remaining until wake time.
   * Returns a string like "6h 23m".
   */
  function calcHoursLeft(now, wakeTimeStr) {
    const [wakeH, wakeM] = wakeTimeStr.split(":").map(Number);
    const wakeDate = new Date(now);
    wakeDate.setHours(wakeH, wakeM, 0, 0);
    if (wakeDate <= now) wakeDate.setDate(wakeDate.getDate() + 1);

    const diffMs = wakeDate - now;
    const totalMin = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  }

  /**
   * Parse "HH:MM" to total minutes from midnight.
   */
  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }

  /**
   * Format 24h time string to 12h display.
   */
  function formatTime12h(time24) {
    const [h, m] = time24.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  }

  /**
   * Close the page or navigate to blank.
   */
  function closePage() {
    window.close();
    setTimeout(() => { window.location.href = "about:blank"; }, 100);
  }
})();
