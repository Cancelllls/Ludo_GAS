# Ludo King - Google Apps Script (GAS) Edition

A fully-featured, production-ready, zero-dependency clone of Ludo King running entirely on Google Apps Script (GAS). This architecture leverages Google's `CacheService` for lightning-fast polling, providing a seamless real-time multiplayer experience natively in the browser.

## 🚀 Features

- **Real-Time Multiplayer**: Natively bypasses GAS web-socket limitations using Optimistic UI and hyper-optimized polling loops (`CacheService`).
- **Premium Desktop-First UI/UX**: Features a massive, perfectly-centered, borderless board optimized for desktop monitors. Boasts crisp high-DPI resolution scaling (`window.devicePixelRatio`) to prevent blurriness, a polished 3-column grid layout (with statistics and 3D dice controls consistently aligned next to player panels), and a responsive frosted-glass interface.
- **Master Rules Engine**: Toggleable mechanics tailored for competitive play:
  - **3 Sixes Penalty**: Rolling three 6s in a row forfeits the turn instantly.
  - **Move Splitting**: Distribute dice roll points across multiple tokens sequentially via a native custom slider UI.
  - **Dynamic Bounties**: Every 5 turns, randomized Shields (🛡️) and Golden Dice (🎲) spawn on the board.
  - **2v2 Alliance Mode**: Team up (Red/Green vs Blue/Yellow). Share exact-tile blockades and seamlessly command your ally's pieces once your own tokens reach the center!
  - **Token Blockades**: Placing two of your tokens on the same tile blocks enemy pieces from passing.
- **Turn & AFK Timers**: A visual countdown timer (Blitz = 15s, Standard = 45s). If players idle, the localized `LudoBot` takes over automatically to execute the turn and prevent room freezes.
- **Reconnection Support**: A "Rejoin Active Game" banner on the main menu automatically stores and restores active player sessions upon refresh.
- **Dynamic Board Themes**: Toggle between `Classic`, `Neon`, `Wooden`, and `Pastel` themes dynamically to adapt the board canvas and tokens.
- **Dynamic chiptune Web Audio Synthesizer**: real-time chiptune synthesizer using browser `AudioContext` to play roll, move, jackpot 6, capture, home, victory, error, and turn warning tick sounds without asset-loading delay.
- **Quick Chat & Reactions**: Built-in chat phrases (e.g., "Good game!", "Hurry up!") and emoji reactions sync asynchronously over the network.
- **Intelligent Bot AI**: Natively scales with all advanced logic (Bounties, Splitting, and Alliances) to organically fill lobbies or challenge offline players.

## 🛠️ Architecture

- **Frontend**: Vanilla HTML5 Canvas, CSS, and JS. NO external libraries. Extremely robust state isolation.
- **Backend**: Google Apps Script (`Code.gs`)
- **State Sync**: 
  - Host generates 4-digit PINs. 
  - Room state serialized and cached via `CacheService.put()`. 
  - `LockService` strictly prevents read/write network collisions during intense simultaneous actions.

## ⚙️ Installation / Deployment

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Replace `Code.gs` with the code provided in the `Code.gs` file.
3. Create the corresponding HTML files: `Index.html`, `Style.html`, `App.html`, `Engine.html`, `Bot.html`, and `Sounds.html`. Paste the respective raw code into each.
4. Click **Deploy** > **New Deployment**.
5. Select type **Web app**.
6. Set **Execute as** to `User accessing the web app` (or yourself, depending on your authentication preference).
7. Set **Who has access** to `Anyone`.
8. Click Deploy and open the web app URL!

## 🎲 Controls & Mechanics
- Click the **3D Dice** or the player panel to roll.
- Click the **🎨 (Theme)** toggle button to cycle board colors.
- Click the **🔊 (Sound)** toggle button to mute/unmute audio.
- The canvas will dynamically compute valid moves. 
- If multiple choices exist, valid pieces will glow with a native pulsing white aura. Click a piece to move.
- In Online mode, use the **Emoji Panel** to cast reactions or trigger **Quick Chat** speech bubbles!
