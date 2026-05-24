# Ludo MultiPlayer (GAS Edition)

A robust, high-performance, and fault-tolerant Ludo implementation for Google Apps Script (HTML/JS/CSS frontend and Code.gs backend).

## Key Features

- **N-1 Win Condition**: The game continues until only one loser remains, providing a full placement leaderboard (1st, 2nd, 3rd).
- **Zero-Trust Backend**: Every move and dice roll is validated mathematically on the server to prevent cheating and client-side manipulation.
- **Enterprise-Grade Synchronization**:
  - **Linear State Versioning**: Prevents "time-travel" bugs from out-of-order network packets.
  - **Optimistic UI with Rollback**: Provides 60FPS animations while maintaining authoritative server state.
  - **Recursive Polling**: Self-healing network layer that prevents overlapping requests and memory leaks.
- **Audio & Haptics**: Immersive "Game Feel" with synced Web Audio and hardware vibration patterns for rolling, hopping, capturing, and finishing.
- **Hybrid Game Modes**: Supports Online Multiplayer, Local "Pass & Play", and AI "Play Computer" modes.
- **Connectivity HUD**: Real-time status indicators (Online, Busy, Error) with automatic retry logic for server busy-states.
- **Leaderboard Integration**: Automatically logs game results and point distributions (+3, +2, +1, 0) to a "LudoPlayers" Google Sheet tab.

## Architecture

- **Backend**: Google Apps Script (`Code.gs`) with `CacheService` for state management and `LockService` for concurrency safety.
- **Frontend**: Single-page application (`App.html`) using Vanilla CSS Grid (15x15) and Optimistic State reconciliation.
- **Security**: Strict zero-trust validation on all endpoints. Server-side authoritative capture and destination calculation.

## Setup

1. Create a new Google Apps Script project.
2. Copy the contents of `Code.gs` and `App.html` into the respective files.
3. Deploy as a Web App.
4. (Optional) Create a Google Sheet and name a tab "LudoPlayers" to track the leaderboard.

## Engineering Standards

This project follows strict senior engineering standards:
- Explicit memory management with a centralized `cleanupEngine`.
- LockService fallback handling with automatic client-side retries.
- Dynamic CSS clustering for stacked pieces on safe squares.
- AI safety breakers to prevent infinite decision loops.
