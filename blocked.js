// Future Self — Blocked Page Logic
// 60/40 question-vs-game selection, 3 mini-games, breathwork,
// zone-aware questions, time selector, farewell flow.

(async function () {
  // ── Constants ──────────────────────────────

  var FAREWELL_MESSAGES = [
    { emoji: "\u23f3", text: "Clock's ticking \u23f3 Make it count." },
    { emoji: "\ud83e\udee1", text: "You've got {dur}. Use them wisely \ud83e\udee1" },
    { emoji: "\ud83c\udfc3", text: "Alright, go speed-run whatever this is \ud83c\udfc3" },
    { emoji: "\ud83d\udecf\ufe0f", text: "The bed will be waiting \ud83d\udecf\ufe0f" },
    { emoji: "\ud83d\udc40", text: "Fine. But we're watching \ud83d\udc40" },
    { emoji: "\ud83e\udee1", text: "Permission granted, soldier \ud83e\udee1 Return to base soon." },
    { emoji: "\ud83d\ude2e\u200d\ud83d\udca8", text: "Your pillow just sighed \ud83d\ude2e\u200d\ud83d\udca8" }
  ];

  var SLIDER_POSITIONS = [
    { emoji: "\ud83d\ude0e", label: "Full battery mode", desc: "Tomorrow-you wakes up feeling like a superhero. Meetings? Crushed. Workout? Easy. Vibes? Immaculate.", bg: "#0B0E14", ring: "#4ade80", offset: 0 },
    { emoji: "\ud83d\ude42", label: "Mostly fine", desc: "Slightly less sharp but you'll survive. Coffee will do the heavy lifting.", bg: "#0D1018", ring: "#86efac", offset: 0.5 },
    { emoji: "\ud83d\ude10", label: "Tomorrow's gonna be mid", desc: "That 2pm meeting? You're zoning out. That workout? Skipped. But hey, you saw some memes.", bg: "#12101E", ring: "#fbbf24", offset: 1 },
    { emoji: "\ud83d\ude35\u200d\ud83d\udcab", label: "Brain fog incoming", desc: "Your decision-making drops to 'should I get a third coffee?' levels. Productivity is a myth.", bg: "#1A0F1E", ring: "#f97316", offset: 1.5 },
    { emoji: "\ud83e\udd74", label: "Zombie mode activated", desc: "You'll reread the same email 4 times. Your face will look like you slept in a washing machine.", bg: "#1E0B10", ring: "#ef4444", offset: 2 },
    { emoji: "\ud83d\udc80", label: "RIP tomorrow", desc: "Just cancel your plans. Tomorrow isn't a day \u2014 it's a survival mission.", bg: "#140505", ring: "#dc2626", offset: 3 }
  ];

  var TYPING_SENTENCES = {
    early: [
      "I am choosing memes over dreams",
      "My pillow can wait apparently",
      "Sleep is for quitters and I am not a quitter wait",
      "Tomorrow morning is future me's problem",
      "Plot twist I'm still awake"
    ],
    mid: [
      "I acknowledge that I will be tired tomorrow and I am okay with that",
      "I am trading tomorrows energy for tonights scrolling",
      "My alarm goes off in {hours_left} and I am still here"
    ],
    late: [
      "I am choosing to sacrifice my sleep and I take full responsibility for how tomorrow goes",
      "It is {time} and I am still on my computer instead of sleeping because I cannot stop browsing"
    ]
  };

  var TRIVIA_TF = [
    { statement: "Your brain is more active during REM sleep than when you're awake.", answer: true, reveal: "Your brain is basically running a full Netflix series in there. \ud83c\udfac" },
    { statement: "You can 'catch up' on sleep over the weekend.", answer: false, reveal: "Sleep debt compounds. Weekend lie-ins help a little but don't erase the damage. \ud83d\udcca" },
    { statement: "Sleeping less than 6 hours affects you like being legally drunk.", answer: true, reveal: "After 17+ hours awake, your impairment equals 0.05% blood alcohol. \ud83c\udf7a" },
    { statement: "Your phone's night mode makes screen time before bed safe.", answer: false, reveal: "Night mode reduces blue light ~30-50%, but the stimulation from content still delays sleep. \ud83d\udcf1" },
    { statement: "Hitting snooze actually makes you MORE tired.", answer: true, reveal: "Each snooze starts a new sleep cycle your body can't finish. That's why you feel worse. \u23f0" }
  ];

  var TRIVIA_FACTS = [
    "Right now your body temperature is dropping to prepare for sleep. Fighting it means fighting biology. \ud83c\udf21\ufe0f",
    "Melatonin has been flooding your system. Your screen is the only thing holding the dam. \ud83c\udf0a",
    "Your brain is ready to start its nightly cleanup \u2014 flushing out toxins. But only if you sleep. \ud83e\uddf9",
    "Growth hormone peaks in the first 2 hours of sleep. Every minute you delay, that window shrinks. \ud83d\udcc9"
  ];

  var TRIVIA_PICKS = [
    { question: "Pick your morning tomorrow:", a: "Alarm goes off, I stretch, I feel human \ud83c\udf05", b: "Alarm goes off, snooze \u00d74, I hate everything \ud83d\ude24", reveal: "Choice A requires closing this tab. Just saying." },
    { question: "What sounds better right now?", a: "Cozy blanket + actual rest \ud83d\udecf\ufe0f", b: "Scroll content I won't remember in 10 min \ud83d\udcf1", reveal: "We both know the answer. Goodnight. \ud83d\ude34" }
  ];

  var TRIVIA_GOODNIGHTS = [
    "That's your future self looking out for you tonight. Sweet dreams.",
    "Cards done. Brain done. Screen done. Go be horizontal.",
    "You made it through the cards. Now make it through the night.",
    "That's all we've got. The rest is up to you and your pillow."
  ];

  // ── Parse URL params ───────────────────────

  var params = new URLSearchParams(window.location.search);
  var site = params.get("site") || "a website";

  // ── Load config from storage ───────────────

  var config = await chrome.storage.local.get([
    "futureself_wakeTime", "futureself_blockStartTime", "futureself_streak",
    "futureself_shownQuestions", "futureself_overrides", "futureself_shownGamesTonight"
  ]);

  var wakeTime = config.futureself_wakeTime || "06:00";
  var blockStartTime = config.futureself_blockStartTime || "22:00";
  var streak = config.futureself_streak || 0;
  var shownQuestions = config.futureself_shownQuestions || [];
  var overrides = config.futureself_overrides || [];
  var attempts = overrides.length;
  var shownGames = config.futureself_shownGamesTonight || [];

  // ── Time calculations ──────────────────────

  var now = new Date();
  var timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  var wakeTimeDisplay = formatTime12h(wakeTime);
  var hoursLeft = calcHoursLeft(now, wakeTime);
  var hoursLeftNum = calcHoursLeftNum(now, wakeTime);

  // ── Determine zone ─────────────────────────

  var zone = determineZone(now, blockStartTime, wakeTime);

  // ── Track chosen override reason across screens ──

  var chosenReason = "";

  // ── Choose and render experience ───────────

  hideAllScreens();
  var experience = chooseExperience();

  if (experience === "question") {
    await renderQuestion();
  } else if (experience === "slider") {
    renderSliderGame();
  } else if (experience === "typing") {
    renderTypingGame();
  } else if (experience === "trivia") {
    renderTriviaGame();
  }

  // ── Wire up override flow (shared) ─────────

  document.querySelectorAll(".fs-btn-reason").forEach(function (btn) {
    btn.addEventListener("click", function () {
      chosenReason = btn.dataset.reason;
      showScreen("screen-time");
    });
  });

  document.querySelectorAll(".fs-btn-time").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var minutes = parseInt(btn.dataset.minutes, 10);
      await createOverride(site, chosenReason, zone, minutes);
      showFarewell(minutes);
    });
  });

  document.getElementById("reason-back").addEventListener("click", closePage);
  document.getElementById("time-back").addEventListener("click", closePage);

  document.querySelectorAll(".fs-btn-breathe").forEach(function (btn) {
    btn.addEventListener("click", startBreathwork);
  });
  document.getElementById("breathwork-back").addEventListener("click", function () {
    document.getElementById("screen-breathwork").classList.add("fs-hidden");
  });

  // ═══════════════════════════════════════════
  // Experience Selection
  // ═══════════════════════════════════════════

  function chooseExperience() {
    var roll = Math.random();
    var gamePool = [];

    if (!shownGames.includes("slider")) gamePool.push("slider");
    if (!shownGames.includes("typing")) gamePool.push("typing");
    if (!shownGames.includes("trivia")) gamePool.push("trivia");

    if (gamePool.length === 0) gamePool = ["slider", "typing", "trivia"];

    if (roll < 0.60) {
      return "question";
    } else if (roll < 0.75) {
      return gamePool.includes("slider") ? "slider" : gamePool[Math.floor(Math.random() * gamePool.length)];
    } else if (roll < 0.90) {
      return gamePool.includes("typing") ? "typing" : gamePool[Math.floor(Math.random() * gamePool.length)];
    } else {
      return gamePool.includes("trivia") ? "trivia" : gamePool[Math.floor(Math.random() * gamePool.length)];
    }
  }

  // ═══════════════════════════════════════════
  // Text Question Renderer
  // ═══════════════════════════════════════════

  async function renderQuestion() {
    showScreen("screen-question");

    document.getElementById("site-name").textContent = "You\u2019re trying to open " + site;
    document.getElementById("time-notice").textContent =
      timeStr + " \u2022 alarm at " + wakeTimeDisplay;

    var question = await pickQuestion(zone, streak, shownQuestions);
    var text = fillVariables(question.text);
    document.getElementById("question-text").textContent = text;

    shownQuestions.push(question.id);
    await chrome.storage.local.set({ futureself_shownQuestions: shownQuestions });

    startFrictionTimer("q-countdown", "q-actions", 10);

    document.getElementById("q-sleep").addEventListener("click", closePage);
    document.getElementById("q-override").addEventListener("click", function () {
      showScreen("screen-reason");
    });
  }

  // ═══════════════════════════════════════════
  // Game 1: Sleep Cost Slider
  // ═══════════════════════════════════════════

  function renderSliderGame() {
    showScreen("screen-slider");
    trackGameShown("slider");

    var slider = document.getElementById("sleep-slider");
    updateSliderUI(0);

    slider.addEventListener("input", function () {
      updateSliderUI(parseInt(slider.value, 10));
    });

    startFrictionTimer("s-countdown", "s-actions", 12);

    document.getElementById("s-sleep").addEventListener("click", closePage);
    document.getElementById("s-override").addEventListener("click", function () {
      showScreen("screen-reason");
    });
  }

  function updateSliderUI(pos) {
    var data = SLIDER_POSITIONS[pos];
    document.getElementById("slider-emoji").textContent = data.emoji;
    document.getElementById("slider-label").textContent = data.label;
    document.getElementById("slider-desc").textContent = data.desc;

    var adjustedHours = hoursLeftNum - data.offset;
    if (adjustedHours < 0) adjustedHours = 0;
    var h = Math.floor(adjustedHours);
    var m = Math.round((adjustedHours - h) * 60);
    document.getElementById("slider-hours").textContent = h + "h " + m + "m of sleep";

    document.getElementById("slider-ring").style.borderColor = data.ring;
    document.body.style.backgroundColor = data.bg;

    var thumb = document.querySelector(".fs-sleep-slider");
    if (thumb) thumb.style.setProperty("--thumb-border", data.ring);
  }

  // ═══════════════════════════════════════════
  // Game 2: Commitment Challenge
  // ═══════════════════════════════════════════

  function renderTypingGame() {
    showScreen("screen-typing");
    trackGameShown("typing");

    var sentences = TYPING_SENTENCES[zone] || TYPING_SENTENCES.early;
    var sentence = fillVariables(sentences[Math.floor(Math.random() * sentences.length)]);

    var display = document.getElementById("typing-display");
    var input = document.getElementById("typing-input");
    var hint = document.getElementById("typing-hint");

    renderTypingChars(display, sentence, "");

    input.focus();
    display.addEventListener("click", function () { input.focus(); });

    input.addEventListener("paste", function (e) { e.preventDefault(); });

    input.addEventListener("input", function () {
      var typed = input.value;
      renderTypingChars(display, sentence, typed);

      if (typed.length > 0) {
        hint.textContent = typed.length + " / " + sentence.length + " characters";
      }

      if (typed.length >= sentence.length) {
        var allCorrect = true;
        for (var i = 0; i < sentence.length; i++) {
          if (typed[i] !== sentence[i]) { allCorrect = false; break; }
        }
        if (allCorrect) {
          document.getElementById("typing-display").classList.add("fs-hidden");
          hint.classList.add("fs-hidden");
          input.disabled = true;
          document.getElementById("typing-complete").classList.remove("fs-hidden");
          setTimeout(function () { showScreen("screen-reason"); }, 1500);
        }
      }
    });

    startFrictionTimer("t-countdown", "t-actions", 10);

    document.getElementById("t-sleep").addEventListener("click", closePage);
    document.getElementById("t-override").addEventListener("click", function () {
      showScreen("screen-reason");
    });
  }

  function renderTypingChars(display, target, typed) {
    var html = "";
    for (var i = 0; i < target.length; i++) {
      var cls = "fs-pending";
      if (i < typed.length) {
        cls = typed[i] === target[i] ? "fs-correct" : "fs-wrong";
      } else if (i === typed.length) {
        cls = "fs-pending fs-cursor";
      }
      var ch = target[i] === " " ? "&nbsp;" : escapeHtml(target[i]);
      html += '<span class="fs-typing-char ' + cls + '">' + ch + "</span>";
    }
    display.innerHTML = html;
  }

  // ═══════════════════════════════════════════
  // Game 3: Trivia Swipe Cards
  // ═══════════════════════════════════════════

  function renderTriviaGame() {
    showScreen("screen-trivia");
    trackGameShown("trivia");

    var shuffledTF = shuffle(TRIVIA_TF.slice());
    var cards = [
      { type: "tf", data: shuffledTF[0] },
      { type: "tf", data: shuffledTF[1] },
      { type: "fact", data: TRIVIA_FACTS[Math.floor(Math.random() * TRIVIA_FACTS.length)] },
      { type: "pick", data: TRIVIA_PICKS[Math.floor(Math.random() * TRIVIA_PICKS.length)] },
      { type: "goodnight", data: TRIVIA_GOODNIGHTS[Math.floor(Math.random() * TRIVIA_GOODNIGHTS.length)] }
    ];

    var currentCard = 0;
    var track = document.getElementById("trivia-track");
    var dotsContainer = document.getElementById("trivia-dots");
    var prevBtn = document.getElementById("trivia-prev");
    var nextBtn = document.getElementById("trivia-next");

    dotsContainer.innerHTML = "";
    for (var d = 0; d < cards.length; d++) {
      var dot = document.createElement("div");
      dot.className = "fs-trivia-dot" + (d === 0 ? " fs-active" : "");
      dotsContainer.appendChild(dot);
    }

    track.innerHTML = "";
    for (var c = 0; c < cards.length; c++) {
      var cardEl = document.createElement("div");
      cardEl.className = "fs-trivia-card";
      cardEl.id = "trivia-card-" + c;
      cardEl.innerHTML = buildCardHTML(cards[c], c);
      track.appendChild(cardEl);
    }

    for (var ci = 0; ci < cards.length; ci++) {
      wireCardInteraction(cards[ci], ci);
    }

    updateTriviaNav();

    prevBtn.addEventListener("click", function () {
      if (currentCard > 0) { currentCard--; slideTo(currentCard); }
    });
    nextBtn.addEventListener("click", function () {
      if (currentCard < cards.length - 1) { currentCard++; slideTo(currentCard); }
    });

    function slideTo(idx) {
      track.style.transform = "translateX(-" + (idx * 100) + "%)";
      var dots = dotsContainer.querySelectorAll(".fs-trivia-dot");
      for (var i = 0; i < dots.length; i++) {
        dots[i].className = "fs-trivia-dot" + (i < idx ? " fs-done" : "") + (i === idx ? " fs-active" : "");
      }
      updateTriviaNav();
    }

    function updateTriviaNav() {
      prevBtn.disabled = currentCard === 0;
      nextBtn.disabled = currentCard === cards.length - 1;
    }

    startFrictionTimer("tr-countdown", "tr-actions", 10);

    document.getElementById("tr-sleep").addEventListener("click", closePage);
    document.getElementById("tr-override").addEventListener("click", function () {
      showScreen("screen-reason");
    });
  }

  function buildCardHTML(card, idx) {
    if (card.type === "tf") {
      return '<div class="fs-trivia-card-label">True or false</div>' +
        '<p class="fs-trivia-card-text">' + escapeHtml(card.data.statement) + '</p>' +
        '<div class="fs-trivia-btns">' +
          '<button class="fs-trivia-btn fs-true-btn" data-card="' + idx + '" data-answer="true">TRUE</button>' +
          '<button class="fs-trivia-btn fs-false-btn" data-card="' + idx + '" data-answer="false">FALSE</button>' +
        '</div>' +
        '<div class="fs-trivia-reveal-area" id="trivia-reveal-' + idx + '"></div>';
    }
    if (card.type === "fact") {
      return '<div class="fs-trivia-card-label">What\u2019s happening right now</div>' +
        '<p class="fs-trivia-card-text">' + escapeHtml(card.data) + '</p>';
    }
    if (card.type === "pick") {
      return '<div class="fs-trivia-card-label">Quick pick</div>' +
        '<p class="fs-trivia-card-text">' + escapeHtml(card.data.question) + '</p>' +
        '<div class="fs-trivia-btns">' +
          '<button class="fs-trivia-btn" data-card="' + idx + '" data-pick="a">A) ' + escapeHtml(card.data.a) + '</button>' +
        '</div>' +
        '<div class="fs-trivia-btns" style="margin-top:0">' +
          '<button class="fs-trivia-btn" data-card="' + idx + '" data-pick="b">B) ' + escapeHtml(card.data.b) + '</button>' +
        '</div>' +
        '<div class="fs-trivia-reveal-area" id="trivia-reveal-' + idx + '"></div>';
    }
    if (card.type === "goodnight") {
      return '<div class="fs-trivia-card-label">Goodnight</div>' +
        '<p class="fs-trivia-card-goodnight">' + escapeHtml(card.data) + '</p>';
    }
    return "";
  }

  function wireCardInteraction(card, idx) {
    if (card.type === "tf") {
      var btns = document.querySelectorAll('[data-card="' + idx + '"][data-answer]');
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var userAnswer = btn.dataset.answer === "true";
          var correct = userAnswer === card.data.answer;
          var area = document.getElementById("trivia-reveal-" + idx);
          area.innerHTML = '<div class="fs-trivia-reveal ' + (correct ? "fs-correct" : "fs-wrong") + '">' +
            (correct ? "\u2705 Correct! " : "\u274c Nope! ") + escapeHtml(card.data.reveal) + '</div>';
          btns.forEach(function (b) { b.disabled = true; });
        });
      });
    }
    if (card.type === "pick") {
      var pickBtns = document.querySelectorAll('[data-card="' + idx + '"][data-pick]');
      pickBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var area = document.getElementById("trivia-reveal-" + idx);
          area.innerHTML = '<div class="fs-trivia-reveal fs-neutral">' + escapeHtml(card.data.reveal) + '</div>';
          pickBtns.forEach(function (b) { b.disabled = true; });
        });
      });
    }
  }

  // ═══════════════════════════════════════════
  // Breathwork
  // ═══════════════════════════════════════════

  function startBreathwork() {
    var screen = document.getElementById("screen-breathwork");
    screen.classList.remove("fs-hidden");

    var circle = document.getElementById("breathwork-circle");
    var text = document.getElementById("breathwork-text");
    var countEl = document.getElementById("breathwork-count");
    var doneEl = document.getElementById("breathwork-done");

    var breath = 0;
    var totalBreaths = 10;

    function runCycle() {
      if (breath >= totalBreaths) {
        text.textContent = "";
        circle.className = "fs-breathwork-circle";
        countEl.classList.add("fs-hidden");
        doneEl.classList.remove("fs-hidden");
        return;
      }

      countEl.textContent = "Breath " + (breath + 1) + " of " + totalBreaths;

      circle.className = "fs-breathwork-circle fs-inhale";
      text.textContent = "Breathe in\u2026";
      setTimeout(function () {
        circle.className = "fs-breathwork-circle fs-hold-in";
        text.textContent = "Hold\u2026";
        setTimeout(function () {
          circle.className = "fs-breathwork-circle fs-exhale";
          text.textContent = "Breathe out\u2026";
          setTimeout(function () {
            circle.className = "fs-breathwork-circle fs-hold-out";
            text.textContent = "Hold\u2026";
            setTimeout(function () {
              breath++;
              runCycle();
            }, 2000);
          }, 6000);
        }, 4000);
      }, 4000);
    }

    runCycle();
  }

  // ═══════════════════════════════════════════
  // Override + Time + Farewell Flow
  // ═══════════════════════════════════════════

  function showFarewell(durationMinutes) {
    showScreen("screen-farewell");

    var msg = FAREWELL_MESSAGES[Math.floor(Math.random() * FAREWELL_MESSAGES.length)];
    var durLabel;
    if (durationMinutes === -1) {
      durLabel = "until " + wakeTimeDisplay;
    } else if (durationMinutes >= 60) {
      durLabel = (durationMinutes / 60) + " hour" + (durationMinutes > 60 ? "s" : "");
    } else {
      durLabel = durationMinutes + " min";
    }

    document.getElementById("farewell-emoji").textContent = msg.emoji;
    document.getElementById("farewell-text").textContent = msg.text.replace("{dur}", durLabel);

    setTimeout(function () {
      window.location.href = "https://" + site;
    }, 2000);
  }

  async function createOverride(domain, reason, currentZone, durationMinutes) {
    var stored = await chrome.storage.local.get("futureself_overrides");
    var ov = stored.futureself_overrides || [];

    var nowDate = new Date();
    var expiresAt;
    if (durationMinutes === -1) {
      expiresAt = getWakeTimestamp(wakeTime);
    } else {
      expiresAt = Date.now() + durationMinutes * 60 * 1000;
    }

    ov.push({
      domain: domain,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      duration: durationMinutes,
      date: nowDate.toISOString().split("T")[0],
      time: nowDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      site: domain,
      reason: reason,
      zone: currentZone
    });

    await chrome.storage.local.set({ futureself_overrides: ov });
  }

  // ═══════════════════════════════════════════
  // Question Selection
  // ═══════════════════════════════════════════

  async function pickQuestion(currentZone, currentStreak, shownIds) {
    var res = await fetch(chrome.runtime.getURL("questions.json"));
    var allQuestions = await res.json();

    var pool = allQuestions.filter(function (q) { return q.zone === currentZone; });

    if (currentStreak < 2) {
      pool = pool.filter(function (q) { return q.text.indexOf("{streak}") === -1; });
    }

    var available = pool.filter(function (q) { return shownIds.indexOf(q.id) === -1; });

    if (available.length === 0) {
      available = pool;
      await chrome.storage.local.set({ futureself_shownQuestions: [] });
    }

    var byCategory = {};
    for (var i = 0; i < available.length; i++) {
      var q = available[i];
      if (!byCategory[q.category]) byCategory[q.category] = [];
      byCategory[q.category].push(q);
    }

    var weights = getCategoryWeights(currentZone);
    var weightedCats = [];
    for (var cat in byCategory) {
      var w = weights[cat] || 1;
      for (var j = 0; j < w; j++) weightedCats.push(cat);
    }

    var chosenCat = weightedCats[Math.floor(Math.random() * weightedCats.length)];
    var catQs = byCategory[chosenCat];
    return catQs[Math.floor(Math.random() * catQs.length)];
  }

  function getCategoryWeights(z) {
    if (z === "early") return { future_self: 1, intention_check: 1, pattern_recognition: 1, humor: 3, science: 1, identity: 1, morning_pull: 3 };
    if (z === "late") return { future_self: 3, intention_check: 3, pattern_recognition: 1, humor: 1, science: 1, identity: 1, morning_pull: 1 };
    return { future_self: 1, intention_check: 1, pattern_recognition: 1, humor: 1, science: 1, identity: 1, morning_pull: 1 };
  }

  // ═══════════════════════════════════════════
  // Friction Timer
  // ═══════════════════════════════════════════

  function startFrictionTimer(countdownId, actionsId, totalSeconds) {
    var countdownEl = document.getElementById(countdownId);
    var actionsEl = document.getElementById(actionsId);
    var elapsed = 0;

    var interval = setInterval(function () {
      elapsed++;
      if (elapsed >= 3 && elapsed < totalSeconds) {
        countdownEl.textContent = "Take a moment\u2026 " + (totalSeconds - elapsed);
      }
      if (elapsed >= totalSeconds) {
        clearInterval(interval);
        countdownEl.textContent = "";
        actionsEl.classList.add("fs-visible");
      }
    }, 1000);
  }

  // ═══════════════════════════════════════════
  // Utility Functions
  // ═══════════════════════════════════════════

  function determineZone(nowDate, blockStart, wake) {
    var nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
    var blockStartMin = timeToMinutes(blockStart);
    var wakeMin = timeToMinutes(wake);

    var elapsed;
    if (nowMinutes >= blockStartMin) {
      elapsed = nowMinutes - blockStartMin;
    } else {
      elapsed = (1440 - blockStartMin) + nowMinutes;
    }

    var minutesUntilWake;
    if (wakeMin > nowMinutes) {
      minutesUntilWake = wakeMin - nowMinutes;
    } else {
      minutesUntilWake = (1440 - nowMinutes) + wakeMin;
    }

    if (minutesUntilWake / 60 < 5) return "late";
    if (elapsed <= 90) return "early";
    if (elapsed <= 180) return "mid";
    return "late";
  }

  function fillVariables(text) {
    return text
      .replace(/\{site\}/g, site)
      .replace(/\{time\}/g, timeStr)
      .replace(/\{wake\}/g, wakeTimeDisplay)
      .replace(/\{hours_left\}/g, hoursLeft)
      .replace(/\{streak\}/g, String(streak))
      .replace(/\{attempts\}/g, String(attempts));
  }

  function calcHoursLeft(nowDate, wakeTimeStr) {
    var parts = wakeTimeStr.split(":").map(Number);
    var wakeDate = new Date(nowDate);
    wakeDate.setHours(parts[0], parts[1], 0, 0);
    if (wakeDate <= nowDate) wakeDate.setDate(wakeDate.getDate() + 1);
    var totalMin = Math.floor((wakeDate - nowDate) / 60000);
    return Math.floor(totalMin / 60) + "h " + (totalMin % 60) + "m";
  }

  function calcHoursLeftNum(nowDate, wakeTimeStr) {
    var parts = wakeTimeStr.split(":").map(Number);
    var wakeDate = new Date(nowDate);
    wakeDate.setHours(parts[0], parts[1], 0, 0);
    if (wakeDate <= nowDate) wakeDate.setDate(wakeDate.getDate() + 1);
    return (wakeDate - nowDate) / 3600000;
  }

  function getWakeTimestamp(wakeTimeStr) {
    var parts = wakeTimeStr.split(":").map(Number);
    var wake = new Date();
    wake.setHours(parts[0], parts[1], 0, 0);
    if (wake <= new Date()) wake.setDate(wake.getDate() + 1);
    return wake.getTime();
  }

  function timeToMinutes(timeStr) {
    var parts = timeStr.split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }

  function formatTime12h(time24) {
    var parts = time24.split(":").map(Number);
    var suffix = parts[0] >= 12 ? "PM" : "AM";
    var h12 = parts[0] % 12 || 12;
    return h12 + ":" + String(parts[1]).padStart(2, "0") + " " + suffix;
  }

  function hideAllScreens() {
    var ids = ["screen-question", "screen-slider", "screen-typing",
               "screen-trivia", "screen-reason", "screen-time",
               "screen-farewell", "screen-breathwork"];
    for (var i = 0; i < ids.length; i++) {
      document.getElementById(ids[i]).classList.add("fs-hidden");
    }
  }

  function showScreen(id) {
    hideAllScreens();
    var el = document.getElementById(id);
    el.classList.remove("fs-hidden");
    el.classList.add("fs-screen-enter");
    if (id !== "screen-slider") {
      document.body.style.backgroundColor = "";
    }
  }

  function closePage() {
    window.close();
    setTimeout(function () { window.location.href = "about:blank"; }, 100);
  }

  async function trackGameShown(gameName) {
    shownGames.push(gameName);
    await chrome.storage.local.set({ futureself_shownGamesTonight: shownGames });
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
