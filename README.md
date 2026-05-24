# Ludo GAS (Google Apps Script)

A real-time, 4-player multiplayer Ludo game running entirely on **Google Apps Script** (backend) and **Vanilla HTML/CSS/JS** (frontend).

## 🚀 Features
- **Server-Authoritative Logic:** Dice rolls and piece movements are validated on the server to prevent cheating.
- **Real-Time Multiplayer:** State synchronization via 1.5s polling loop.
- **High Performance:** Uses `CacheService` as a high-speed, serverless database.
- **Concurrency Control:** `LockService` handles simultaneous actions from multiple players.
- **CSS Grid Board:** A responsive 15x15 grid-based game board (no Canvas).
- **Ludo Rules:** Includes base entry (roll 6), capturing opponents, safe squares, and home stretch logic.

## 🛠️ Architecture
- **Backend (`Code.gs`):** Google Apps Script functions handling game state, concurrency, and logic.
- **Frontend (`App.html`):** Single-page application with vanilla JS and CSS Grid.
- **Database:** `CacheService.getScriptCache()` (No external DB required).
- **Concurrency:** `LockService.getScriptLock()` with 5-second wait locks.

## 📦 Deployment Instructions
1. Go to [script.google.com](https://script.google.com).
2. Create a new project named "Ludo GAS".
3. Replace the contents of `Code.gs` with the `Code.gs` from this repo.
4. Create a new HTML file in the Apps Script editor named `App.html` and paste the contents of `App.html` from this repo.
5. Click **Deploy** > **New Deployment**.
6. Select **Web App**:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Copy the Web App URL and share it with your friends!

## 🎮 How to Play
1. Enter your name and pick a color.
2. If you are starting a new game, leave the "Room Code" empty.
3. Share the generated 4-letter Room Code with other players.
4. Roll the dice when it's your turn.
5. Click on glowing pieces to move them.
6. Reach the center with all 4 pieces to win!

## 📜 License
MIT
