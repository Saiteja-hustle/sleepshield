// SleepShield — Blocked Page Logic
// Shows a reflective question, countdown timer, and override options.

(async function () {
  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const site = params.get("site") || "a website";
  const category = params.get("category") || "";

  // Determine if this is a work/AI site (for question prioritization)
  const isWorkAI = ["Work & Productivity", "AI & Research Tools"].includes(category);

  // Load config
  const config = await chrome.storage.local.get([
    "wakeTime", "streak", "shownQuestions", "attemptCount"
  ]);
  const wakeTime = config.wakeTime || "06:00";
  const streak = config.streak || 0;
  const shownQuestions = config.shownQuestions || [];
  const attemptCount = (config.attemptCount || 0) + 1;

  // Save incremented attempt count
  await chrome.storage.local.set({ attemptCount });

  // Format current time
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Calculate hours left until wake time
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  const wakeDate = new Date(now);
  wakeDate.setHours(wakeH, wakeM, 0, 0);
  if (wakeDate <= now) wakeDate.setDate(wakeDate.getDate() + 1);
  const hoursLeft = ((wakeDate - now) / 3600000).toFixed(1);

  // Format wake time for display
  const wakeTimeDisplay = formatTime12h(wakeTime);

  // Update header
  document.getElementById("site-name").textContent =
    `You're trying to open ${site}`;
  document.getElementById("time-notice").textContent =
    `It's ${timeStr}. Your alarm is at ${wakeTimeDisplay}.`;

  // Load and display a question
  const question = await pickQuestion(isWorkAI, shownQuestions);
  const questionText = fillVariables(question.text, {
    site, time: timeStr, wake_time: wakeTimeDisplay,
    hours_left: hoursLeft, streak, attempt_count: attemptCount
  });
  document.getElementById("question-text").textContent = questionText;

  // Track shown questions
  shownQuestions.push(question.id);
  await chrome.storage.local.set({ shownQuestions });

  // Countdown timer: 10s base + 5s per additional attempt, max 30s
  const countdownDuration = Math.min(10 + (attemptCount - 1) * 5, 30);
  startCountdown(countdownDuration);

  // Button handlers
  document.getElementById("btn-sleep").addEventListener("click", () => {
    window.close();
    // Fallback: navigate to a blank page if window.close() doesn't work
    setTimeout(() => { window.location.href = "about:blank"; }, 100);
  });

  document.getElementById("btn-override").addEventListener("click", () => {
    document.getElementById("main-screen").classList.add("hidden");
    document.getElementById("override-screen").classList.remove("hidden");
  });

  document.getElementById("btn-back").addEventListener("click", () => {
    window.close();
    setTimeout(() => { window.location.href = "about:blank"; }, 100);
  });

  // Duration buttons
  document.querySelectorAll(".btn-duration").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const minutes = parseInt(btn.dataset.minutes, 10);
      await createOverride(site, minutes, attemptCount);

      // Navigate to the originally blocked site
      window.location.href = `https://${site}`;
    });
  });

  /**
   * Pick a question, prioritizing fake_productivity for work/AI sites.
   * Avoids repeating questions shown this session.
   */
  async function pickQuestion(isWorkAI, shownIds) {
    const res = await fetch(chrome.runtime.getURL("questions.json"));
    const bank = await res.json();

    // Build weighted pool
    let pool = [];
    if (isWorkAI) {
      // Heavily prioritize fake productivity questions
      pool = pool.concat(bank.fake_productivity, bank.fake_productivity);
    }
    // Add all categories
    pool = pool.concat(
      bank.fake_productivity,
      bank.playful_roast,
      bank.cost_calculator,
      bank.identity_nudge,
      bank.absurd_funny
    );

    // Filter out already-shown questions
    let available = pool.filter((q) => !shownIds.includes(q.id));

    // If all shown, reset
    if (available.length === 0) {
      available = pool;
      await chrome.storage.local.set({ shownQuestions: [] });
    }

    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Replace [placeholders] in question text with actual values.
   */
  function fillVariables(text, vars) {
    return text
      .replace(/\[site\]/g, vars.site)
      .replace(/\[time\]/g, vars.time)
      .replace(/\[wake_time\]/g, vars.wake_time)
      .replace(/\[hours_left\]/g, vars.hours_left)
      .replace(/\[streak\]/g, vars.streak)
      .replace(/\[attempt_count\]/g, vars.attempt_count);
  }

  /**
   * Start the countdown timer, then reveal action buttons.
   */
  function startCountdown(seconds) {
    const fill = document.getElementById("countdown-fill");
    const text = document.getElementById("countdown-text");
    const actions = document.getElementById("actions");
    let remaining = seconds;

    text.textContent = `Take a breath... ${remaining}s`;
    fill.style.width = "100%";

    const interval = setInterval(() => {
      remaining--;
      const pct = (remaining / seconds) * 100;
      fill.style.width = pct + "%";
      text.textContent = remaining > 0
        ? `Take a breath... ${remaining}s`
        : "";

      if (remaining <= 0) {
        clearInterval(interval);
        actions.classList.remove("hidden");
        document.getElementById("countdown").style.display = "none";
      }
    }, 1000);
  }

  /**
   * Create an override entry and store it.
   */
  async function createOverride(domain, minutes, attemptNum) {
    const { overrides = [] } = await chrome.storage.local.get("overrides");

    const now = Date.now();
    let expiresAt;
    if (minutes === -1) {
      // Until wake-up
      const [wh, wm] = wakeTime.split(":").map(Number);
      const wake = new Date();
      wake.setHours(wh, wm, 0, 0);
      if (wake <= new Date()) wake.setDate(wake.getDate() + 1);
      expiresAt = wake.getTime();

      // Reset streak for "until wake-up"
      await chrome.storage.local.set({ streak: 0 });
    } else {
      expiresAt = now + minutes * 60 * 1000;
    }

    overrides.push({
      domain,
      createdAt: now,
      expiresAt,
      duration: minutes,
      override_number: attemptNum
    });

    await chrome.storage.local.set({ overrides });
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
})();
