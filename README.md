# FutureSelf

**Your PC doesn't have a bedtime. Now it does.**

A Chrome extension that blocks distracting websites during your sleep window — including work tools, AI tools, and search engines. Not just social media.

---

## The Problem Nobody's Solving

Every website blocker on the market assumes the enemy of sleep is entertainment. Block YouTube. Block Reddit. Block TikTok. Problem solved.

**Wrong.**

For people who work from their laptops, the real sleep killer is the other half of late-night screen time that nobody talks about: *fake productivity*.

- Editing a Google Doc at 12:30 AM that could wait until morning
- A 45-minute ChatGPT rabbit hole that started with one question
- Reorganizing Notion pages to feel productive instead of going to bed
- Opening 14 tabs of to-do lists "planning tomorrow" instead of sleeping

FutureSelf is the first blocker that treats late-night productivity as just as dangerous to sleep as late-night entertainment.

> *"Nothing you're doing at 1 AM on a laptop is more valuable than the sleep you're losing."*

---

## How It Works

1. **Set your sleep schedule once** — wake-up time, hours of sleep, wind-down buffer
2. **FutureSelf does the math** — `Block Start = Wake-Up Time − Sleep Hours − Buffer`
3. **Every night, automatically** — blocking activates at your calculated bedtime, lifts at wake-up
4. **When you try to open a blocked site** — you hit a Question Gate, not a wall

No nightly setup. No decision fatigue. Set it and forget it.

---

## What Gets Blocked

FutureSelf blocks everything — including categories other blockers ignore:

| Category | Examples |
|---|---|
| Social Media | YouTube, Twitter/X, Reddit, Instagram, TikTok |
| Entertainment | Netflix, Twitch, Prime Video, Spotify |
| ⚠️ AI & Research Tools | ChatGPT, Claude, Perplexity, Wikipedia |
| ⚠️ Work & Productivity | Google Docs, Notion, Slack, Gmail, Figma, GitHub |
| Search Engines | Google, Bing, DuckDuckGo |
| News & Forums | CNN, NYT, Hacker News |
| Shopping | Amazon, Etsy |

The ⚠️ categories are the secret weapon. No other blocker suggests these by default.

Every site is a checkbox — users have full control. But the fact that we *suggest* blocking them makes a statement: **sleep is more productive than productivity.**

---

## The Question Gate

Instead of a cold BLOCKED screen, users see a fun, lightly guilt-inducing question from their future self:

> *"That doc will take you 20 minutes tonight with a tired brain. Or 7 minutes tomorrow with a fresh one. Which sounds smarter?"*

> *"You installed a sleep extension. You literally asked for this intervention. And now you're trying to dodge it. The irony is chef's kiss."*

> *"Future-you is watching from tomorrow morning. Future-you has bags under their eyes. Future-you blames this exact moment."*

A 10-second countdown runs before any buttons appear — forcing the user to actually read it and break autopilot.

**Two choices appear:**
- ✅ "You're right. Goodnight." — big, green
- 🔓 "Nah, let me through." — small, muted → leads to flexible override (2 min to 24 hrs)

---

## Features

- **Sleep math** — auto-calculates block start from wake time + sleep hours + buffer
- **Total block list** — work tools, AI tools, search engines, social, entertainment
- **Question Gate** — 30+ rotating reflective questions, category-aware
- **Fake productivity callout** — when you try to open a work/AI tool, it knows and responds accordingly
- **Flexible override** — 2 min, 5 min, 15 min, 30 min, 1 hr, or until wake-up
- **Streak tracking** — consecutive zero-override nights
- **Set once** — config persists forever, no nightly prompts
- **100% local** — no backend, no accounts, no cloud, no data collection

---

## Tech Stack

- Chrome Extension, Manifest V3
- Vanilla JavaScript
- Chrome Storage API (local only)
- No backend, no database, no accounts

---

## Project Structure

```
futureself/
├── manifest.json       # Extension config and permissions
├── background.js       # Core blocking logic, runs on every navigation
├── blocked.html        # Intercept page (Question Gate)
├── blocked.js          # Question selection, timer, override logic
├── blocked.css         # Intercept page styles
├── popup.html          # Dashboard (status, streak, settings)
├── popup.js            # Dashboard logic
├── popup.css           # Dashboard styles
├── options.html        # Sleep schedule + block list settings
├── options.js          # Settings logic
├── options.css         # Settings styles
├── questions.json      # All question bank, categorized
├── login.html          # Auth page
├── login.js            # Auth logic
└── icons/              # Extension icons
```

---

## Installation (Development)

1. Clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked**
5. Select the `futureself` folder
6. Click the extension icon → complete setup

---

## Roadmap

| Phase | Focus |
|---|---|
| ✅ MVP | Schedule setup, block list, Question Gate, override, dashboard |
| Phase 1 | 50+ questions, animations, wind-down warning, morning recap |
| Phase 2 | Chrome Web Store launch |
| Phase 3 | Streak badges, notifications, custom question packs |
| Phase 4 | Premium tier — themes, advanced stats |
| Phase 5 | Firefox, desktop app, mobile companion |

---

## Why FutureSelf Wins

| Everyone Else | FutureSelf |
|---|---|
| "Block social media to be more productive" | "Block EVERYTHING to protect your sleep. Including your work." |
| "Here's a wall. Deal with it." | "Here's a question. Think about it." |
| "We'll restrict you." | "We'll make you choose consciously." |
| Productivity tool | Sleep protection tool that makes your productivity better |

**We don't compete on strictness. We compete on self-awareness.**

---

*"The most productive thing you can do at midnight is sleep."*
