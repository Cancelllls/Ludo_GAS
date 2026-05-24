# 🎲 Ludo MultiPlayer (GAS Edition)

[![GAS](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white)](https://developers.google.com/apps-script)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **A high-performance, zero-trust, and fault-tolerant Ludo implementation built for the Google Apps Script ecosystem.** 🚀

---

## ✨ Core Pillars

### 🏆 Advanced Win-Condition (N-1)
Traditional Ludo ends when one person wins. **Ludo GAS** continues until there is only one loser left.
- **Ranked Placements:** Supports 1st, 2nd, and 3rd place badges.
- **Dynamic Leaderboard:** Automatically logs points (+3, +2, +1, 0) to a "LudoPlayers" Google Sheet.

### 🛡️ Zero-Trust Security
The backend doesn't trust the client. Period.
- **Authoritative Engine:** Moves are mathematically calculated and verified on the server.
- **Anti-Cheat:** Prevents illegal piece starts, overshooting home squares, or moving out of turn.
- **LockService Hardening:** Protects against race conditions with 5s atomic wait locks and automatic retry-wrappers.

### ⚡ Enterprise-Grade Sync
- **Linear State Versioning:** Every action increments a `stateVersion`. Stale network packets are discarded to prevent "time-travel" bugs.
- **Optimistic UI:** Provides 60FPS pathing animations that instantly reconcile with the server upon completion.
- **Recursive Polling:** A self-healing network loop that prevents "Poll Overlapping" and minimizes memory leaks.

---

## 🎮 Game Feel & Hardware

| Feature | Implementation |
| :--- | :--- |
| **Audio** | Synced Web Audio API for Dice, Hops, Captures, and Wins. |
| **Haptics** | Custom `navigator.vibrate` patterns for physical feedback. |
| **Visuals** | 15x15 CSS Grid with glossy 2.5D radial gradient tokens. |
| **HUD** | Real-time connectivity status (Online, Busy, Error) with auto-reconnect. |

---

## 🛠️ Tech Stack

- **Backend:** Google Apps Script (`Code.gs`)
- **Frontend:** Vanilla HTML5, Modern CSS3, and ES6+ JavaScript.
- **Database:** `CacheService` (High-speed temporary storage).
- **Storage:** Google Sheets (Persistent Leaderboards).

---

## 🚀 Quick Start

1.  **Clone the Code:** Copy `Code.gs` and `App.html` into a new [Google Apps Script](https://script.google.com) project.
2.  **Deploy:** Click **Deploy > New Deployment**. Select **Web App**.
    - *Execute as:* Me
    - *Access:* Anyone
3.  **Leaderboard (Optional):** Create a Google Sheet and name a tab **"LudoPlayers"**.
4.  **Play:** Share the generated 4-letter Room Code with friends!

---

## 📐 Engineering Standards

- **Memory Safety:** Centralized `cleanupEngine` to clear all timeouts/animations.
- **Fault Tolerance:** Automatic retry logic masks platform "Server Busy" states.
- **Clustering:** Dynamic CSS offsets allow multiple pieces to stack neatly on safe squares.
- **AI Heuristics:** A risk-aware bot engine with a safety-breaker to prevent infinite loops.

---

<p align="center">
  Built with ❤️ for the Google Apps Script Community
</p>
