// SleepShield — Popup Dashboard

(async function () {
  const config = await chrome.storage.local.get([
    "setupComplete", "wakeTime", "blockStartTime",
    "streak", "blockedTonight"
  ]);

  if (!config.setupComplete) {
    document.getElementById("setup-prompt").classList.remove("hidden");
    document.getElementById("btn-setup").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Show dashboard
  document.getElementById("dashboard").classList.remove("hidden");

  const wakeTime = config.wakeTime || "06:00";
  const blockStart = config.blockStartTime || "22:00";
  const streak = config.streak || 0;
  const blockedTonight = config.blockedTonight || 0;

  // Determine if blocking is currently active
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const blockMinutes = timeToMinutes(blockStart);
  const wakeMinutes = timeToMinutes(wakeTime);
  const isActive = isInBlockWindow(nowMinutes, blockMinutes, wakeMinutes);

  // Status badge
  const badge = document.getElementById("status-badge");
  const icon = document.getElementById("status-icon");
  const text = document.getElementById("status-text");

  if (isActive) {
    badge.className = "status-badge active";
    icon.textContent = "\u{1F6E1}\uFE0F";
    text.textContent = "Active";
  } else {
    badge.className = "status-badge inactive";
    icon.textContent = "\u{1F634}";
    text.textContent = "Inactive";
  }

  // Schedule info
  const info = document.getElementById("schedule-info");
  if (isActive) {
    info.textContent = `Blocking until ${formatTime12h(wakeTime)}`;
  } else {
    info.textContent = `Screens off at ${formatTime12h(blockStart)}`;
  }

  // Stats
  document.getElementById("streak-count").textContent = `\u{1F525} ${streak}`;
  document.getElementById("blocked-count").textContent = blockedTonight;

  // Settings link
  document.getElementById("settings-link").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function isInBlockWindow(now, start, wake) {
    if (start <= wake) {
      return now >= start && now < wake;
    }
    return now >= start || now < wake;
  }

  function formatTime12h(time24) {
    const [h, m] = time24.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  }
})();
