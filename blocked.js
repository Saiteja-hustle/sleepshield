// SleepShield — Blocked Page Logic (v3)
// 60/40 question-vs-game selection, 3 mini-games, breathwork,
// zone-aware questions, time selector, farewell flow.

(async function () {
  // ── Constants ──────────────────────────────

  const FAREWELL_MESSAGES = [
    { emoji: "\u23f3", text: "Clock's ticking \u23f3 Make it count." },
    { emoji: "\ud83e\udee1", text: "You've got {dur}. Use them wisely \ud83e\udee1" },
    { emoji: "\ud83c\udfc3", text: "Alright, go speed-run whatever this is \ud83c\udfc3" },
    { emoji: "\ud83d\udecf\ufe0f", text: "The bed will be waiting \ud83d\udecf\ufe0f" },
    { emoji: "\ud83d\udc40", text: "Fine. But we're watching \ud83d\udc40" },
    { emoji: "\ud83e\udee1", text: "Permission granted, soldier \ud83e\udee1 Return to base soon." },
    { emoji: "\ud83d\ude2e\u200d\ud83d\udca8", text: "Your pillow just sighed \ud83d\ude2e\u200d\ud83d\udca8" }
  ];

  const SLIDER_POSITIONS = [
    { emoji: "\ud83d\ude0e", label: "Full battery mode", desc: "Tomorrow-you wakes up feeling like a superhero. Meetings? Crushed. Workout? Easy. Vibes? Immaculate.", bg: "#0f1a2e", ring: "#4ade80", offset: 0 },
    { emoji: "\ud83d\ude42", label: "Mostly fine", desc: "Slightly less sharp but you'll survive. Coffee will do the heavy lifting.", bg: "#121a2e", ring: "#86efac", offset: 0.5 },
    { emoji: "\ud83d\ude10", label: "Tomorrow's gonna be mid", desc: "That 2pm meeting? You're zoning out. That workout? Skipped. But hey, you saw some memes.", bg: "#1a142e", ring: "#fbbf24", offset: 1 },
    { emoji: "\ud83d\ude35\u200d\ud83d\udcab", label: "Brain fog incoming", desc: "Your decision-making drops to 'should I get a third coffee?' levels. Productivity is a myth.", bg: "#261428", ring: "#f97316", offset: 1.5 },
    { emoji: "\ud83e\udd74", label: "Zombie mode activated", desc: "You'll reread the same email 4 times. Your face will look like you slept in a washing machine.", bg: "#2e0f14", ring: "#ef4444", offset: 2 },
    { emoji: "\ud83d\udc80", label: "RIP tomorrow", desc: "Just cancel your plans. Tomorrow isn't a day \u2014 it's a survival mission.", bg: "#1a0505", ring: "#dc2626", offset: 3 }
  ];

  const TYPING_SENTENCES = {
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

  const TRIVIA_TF = [
    { statement: "Your brain is more active during REM sleep than when you're awake.", answer: true, reveal: "Your brain is basically running a full Netflix series in there. \ud83c\udfac" },
    { statement: "You can 'catch up' on sleep over the weekend.", answer: false, reveal: "Sleep debt compounds. Weekend lie-ins help a little but don't erase the damage. \ud83d\udcca" },
    { statement: "Sleeping less than 6 hours affects you like being legally drunk.", answer: true, reveal: "After 17+ hours awake, your impairment equals 0.05% blood alcohol. \ud83c\udf7a" },
    { statement: "Your phone's night mode makes screen time before bed safe.", answer: false, reveal: "Night mode reduces blue light ~30-50%, but the stimulation from content still delays sleep. \ud83d\udcf1" },
    { statement: "Hitting snooze actually makes you MORE tired.", answer: true, reveal: "Each snooze starts a new sleep cycle your body can't finish. That's why you feel worse. \u23f0" }
  ];

  const TRIVIA_FACTS = [
    "Right now your body temperature is dropping to prepare for sleep. Fighting it means fighting biology. \ud83c\udf21\ufe0f",
    "Melatonin has been flooding your system. Your screen is the only thing holding the dam. \ud83c\udf0a",
    "Your brain is ready to start its nightly cleanup \u2014 flushing out toxins. But only if you sleep. \ud83e\uddf9",
    "Growth hormone peaks in the first 2 hours of sleep. Every minute you delay, that window shrinks. \ud83d\udcc9"
  ];

  const TRIVIA_PICKS = [
    { question: "Pick your morning tomorrow:", a: "Alarm goes off, I stretch, I feel human \ud83c\udf05", b: "Alarm goes off, snooze \u00d74, I hate everything \ud83d\ude24", reveal: "Choice A requires closing this tab. Just saying." },
    { question: "What sounds better right now?", a: "Cozy blanket + actual rest \ud83d\udecf\ufe0f", b: "Scroll content I won't remember in 10 min \ud83d\udcf1", reveal: "We both know the answer. Goodnight. \ud83d\ude34" }
  ];

  const TRIVIA_GOODNIGHTS = [
    "That's your Sleep Shield for tonight. Sweet dreams. \ud83d\udee1\ufe0f",
    "Cards done. Brain done. Screen done. Go be horizontal. \ud83d\udecf",
    "You made it through the cards. Now make it through the night. \u2728",
    "That's all we've got. The rest is up to you and your pillow. \ud83d\udca4"
  ];

  // ── Parse URL params ───────────────────────

  const params = new URLSearchParams(window.location.search);
  const site = params.get("site") || "a website";

  // ── Load config from storage ───────────────

  const config = await chrome.storage.local.get([
    "wakeTime", "blockStartTime", "streak",
    "shownQuestions", "overrides", "shownGamesTonight"
  ]);

  const wakeTime = config.wakeTime || "06:00";
  const blockStartTime = config.blockStartTime || "22:00";
  const streak = config.streak || 0;
  const shownQuestions = config.shownQuestions || [];
  const overrides = config.overrides || [];
  const attempts = overrides.length;
  const shownGames = config.shownGamesTonight || [];

  // ── Time calculations ──────────────────────

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const wakeTimeDisplay = formatTime12h(wakeTime);
  const hoursLeft = calcHoursLeft(now, wakeTime);
  const hoursLeftNum = calcHoursLeftNum(now, wakeTime);

  // ── Determine zone ─────────────────────────

  const zone = determineZone(now, blockStartTime, wakeTime);

  // ── Track chosen override reason across screens ──

  let chosenReason = "";

  // ── Choose and render experience ───────────

  hideAllScreens();
  const experience = chooseExperience();

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

  // Reason buttons → show time screen
  document.querySelectorAll(".btn-reason").forEach(function (btn) {
    btn.addEventListener("click", function () {
      chosenReason = btn.dataset.reason;
      showScreen("screen-time");
    });
  });

  // Time buttons → create override + farewell
  document.querySelectorAll(".btn-time").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var minutes = parseInt(btn.dataset.minutes, 10);
      await createOverride(site, chosenReason, zone, minutes);
      showFarewell(minutes);
    });
  });

  // Back buttons
  document.getElementById("reason-back").addEventListener("click", closePage);
  document.getElementById("time-back").addEventListener("click", closePage);

  // Breathwork buttons
  document.querySelectorAll(".btn-breathe").forEach(function (btn) {
    btn.addEventListener("click", startBreathwork);
  });
  document.getElementById("breathwork-back").addEventListener("click", function () {
    document.getElementById("screen-breathwork").classList.add("hidden");
  });

  // ═══════════════════════════════════════════
  // Experience Selection
  // ═══════════════════════════════════════════

  function chooseExperience() {
    // Determine probabilities: 60% question, 15% slider, 15% typing, 10% trivia
    // Bias away from games already shown tonight
    var roll = Math.random();
    var gamePool = [];

    if (!shownGames.includes("slider")) gamePool.push("slider");
    if (!shownGames.includes("typing")) gamePool.push("typing");
    if (!shownGames.includes("trivia")) gamePool.push("trivia");

    // If all games have been shown, reset bias — allow any game
    if (gamePool.length === 0) gamePool = ["slider", "typing", "trivia"];

    if (roll < 0.60) {
      return "question";
    } else if (roll < 0.75) {
      // 15% — prefer slider, fallback to pool
      return gamePool.includes("slider") ? "slider" : gamePool[Math.floor(Math.random() * gamePool.length)];
    } else if (roll < 0.90) {
      // 15% — prefer typing
      return gamePool.includes("typing") ? "typing" : gamePool[Math.floor(Math.random() * gamePool.length)];
    } else {
      // 10% — prefer trivia
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
      "It\u2019s " + timeStr + ". Your alarm is at " + wakeTimeDisplay + ".";

    var question = await pickQuestion(zone, streak, shownQuestions);
    var text = fillVariables(question.text);
    document.getElementById("question-text").textContent = text;

    shownQuestions.push(question.id);
    await chrome.storage.local.set({ shownQuestions: shownQuestions });

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

    // Update slider thumb color
    var thumb = document.querySelector(".sleep-slider");
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

    // Build character spans
    renderTypingChars(display, sentence, "");

    // Focus the hidden input
    input.focus();
    display.addEventListener("click", function () { input.focus(); });

    // Disable paste
    input.addEventListener("paste", function (e) { e.preventDefault(); });

    input.addEventListener("input", function () {
      var typed = input.value;
      renderTypingChars(display, sentence, typed);

      if (typed.length > 0) {
        hint.textContent = typed.length + " / " + sentence.length + " characters";
      }

      // Check completion
      if (typed.length >= sentence.length) {
        // Verify all correct
        var allCorrect = true;
        for (var i = 0; i < sentence.length; i++) {
          if (typed[i] !== sentence[i]) { allCorrect = false; break; }
        }
        if (allCorrect) {
          document.getElementById("typing-display").classList.add("hidden");
          hint.classList.add("hidden");
          input.disabled = true;
          document.getElementById("typing-complete").classList.remove("hidden");
          // Auto-proceed to reason screen after 1.5s
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
      var cls = "pending";
      if (i < typed.length) {
        cls = typed[i] === target[i] ? "correct" : "wrong";
      } else if (i === typed.length) {
        cls = "pending cursor";
      }
      var ch = target[i] === " " ? "&nbsp;" : escapeHtml(target[i]);
      html += '<span class="typing-char ' + cls + '">' + ch + "</span>";
    }
    display.innerHTML = html;
  }

  // ═══════════════════════════════════════════
  // Game 3: Trivia Swipe Cards
  // ═══════════════════════════════════════════

  function renderTriviaGame() {
    showScreen("screen-trivia");
    trackGameShown("trivia");

    // Assemble 5 cards: 2 T/F + 1 Fact + 1 Pick + 1 Goodnight
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

    // Build dots
    dotsContainer.innerHTML = "";
    for (var d = 0; d < cards.length; d++) {
      var dot = document.createElement("div");
      dot.className = "trivia-dot" + (d === 0 ? " active" : "");
      dotsContainer.appendChild(dot);
    }

    // Build cards
    track.innerHTML = "";
    for (var c = 0; c < cards.length; c++) {
      var cardEl = document.createElement("div");
      cardEl.className = "trivia-card";
      cardEl.id = "trivia-card-" + c;
      cardEl.innerHTML = buildCardHTML(cards[c], c);
      track.appendChild(cardEl);
    }

    // Wire card interactions
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
      var dots = dotsContainer.querySelectorAll(".trivia-dot");
      for (var i = 0; i < dots.length; i++) {
        dots[i].className = "trivia-dot" + (i < idx ? " done" : "") + (i === idx ? " active" : "");
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
      return '<div class="trivia-card-label">True or False</div>' +
        '<p class="trivia-card-text">' + escapeHtml(card.data.statement) + '</p>' +
        '<div class="trivia-btns">' +
          '<button class="trivia-btn true-btn" data-card="' + idx + '" data-answer="true">TRUE</button>' +
          '<button class="trivia-btn false-btn" data-card="' + idx + '" data-answer="false">FALSE</button>' +
        '</div>' +
        '<div class="trivia-reveal-area" id="trivia-reveal-' + idx + '"></div>';
    }
    if (card.type === "fact") {
      return '<div class="trivia-card-label">What\u2019s happening right now</div>' +
        '<p class="trivia-card-text">' + escapeHtml(card.data) + '</p>';
    }
    if (card.type === "pick") {
      return '<div class="trivia-card-label">Quick pick</div>' +
        '<p class="trivia-card-text">' + escapeHtml(card.data.question) + '</p>' +
        '<div class="trivia-btns">' +
          '<button class="trivia-btn" data-card="' + idx + '" data-pick="a">A) ' + escapeHtml(card.data.a) + '</button>' +
        '</div>' +
        '<div class="trivia-btns" style="margin-top:0">' +
          '<button class="trivia-btn" data-card="' + idx + '" data-pick="b">B) ' + escapeHtml(card.data.b) + '</button>' +
        '</div>' +
        '<div class="trivia-reveal-area" id="trivia-reveal-' + idx + '"></div>';
    }
    if (card.type === "goodnight") {
      return '<div class="trivia-card-label">Goodnight</div>' +
        '<p class="trivia-card-goodnight">' + escapeHtml(card.data) + '</p>';
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
          area.innerHTML = '<div class="trivia-reveal ' + (correct ? "correct" : "wrong") + '">' +
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
          area.innerHTML = '<div class="trivia-reveal neutral">' + escapeHtml(card.data.reveal) + '</div>';
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
    screen.classList.remove("hidden");

    var circle = document.getElementById("breathwork-circle");
    var text = document.getElementById("breathwork-text");
    var countEl = document.getElementById("breathwork-count");
    var doneEl = document.getElementById("breathwork-done");

    var breath = 0;
    var totalBreaths = 10;

    function runCycle() {
      if (breath >= totalBreaths) {
        text.textContent = "";
        circle.className = "breathwork-circle";
        countEl.classList.add("hidden");
        doneEl.classList.remove("hidden");
        return;
      }

      countEl.textContent = "Breath " + (breath + 1) + " of " + totalBreaths;

      // Inhale 4s
      circle.className = "breathwork-circle inhale";
      text.textContent = "Breathe in\u2026";
      setTimeout(function () {
        // Hold 4s
        circle.className = "breathwork-circle hold-in";
        text.textContent = "Hold\u2026";
        setTimeout(function () {
          // Exhale 6s
          circle.className = "breathwork-circle exhale";
          text.textContent = "Breathe out\u2026";
          setTimeout(function () {
            // Hold 2s
            circle.className = "breathwork-circle hold-out";
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
    var stored = await chrome.storage.local.get("overrides");
    var ov = stored.overrides || [];

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

    await chrome.storage.local.set({ overrides: ov });
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
      await chrome.storage.local.set({ shownQuestions: [] });
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
        actionsEl.classList.add("visible");
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
      document.getElementById(ids[i]).classList.add("hidden");
    }
  }

  function showScreen(id) {
    hideAllScreens();
    var el = document.getElementById(id);
    el.classList.remove("hidden");
    el.classList.add("screen-enter");
    // Reset body background when leaving slider
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
    await chrome.storage.local.set({ shownGamesTonight: shownGames });
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
