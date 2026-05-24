# Refactor Plan: Ludo N-1 Win Condition & Enhanced UI

This plan outlines the steps to refactor the Ludo application's state machine, room flow, and game feel.

## Phase 1: Backend Refactor (`Code.gs`)
1.  **Win Condition State Machine:**
    *   Update `movePiece` to precisely detect when a player reaches the center (index 57) with all 4 pieces.
    *   Push finished player colors into the `placements` array.
    *   Transition `status` to `'gameOver'` if and only if `placements.length === (totalActivePlayers - 1)`.
    *   Identify the single remaining player as the loser.
2.  **Leaderboard Points Integration:**
    *   Modify `writeLeaderboard` to assign points based on rank:
        *   1st Place: +3 points
        *   2nd Place: +2 points
        *   3rd Place: +1 point
        *   Loser: 0 points
3.  **Strict Room Management:**
    *   Verify `joinGame` rejects any attempt to join when all 4 color slots are filled.
    *   Ensure all endpoints are wrapped in `LockService` for concurrency safety.
    *   Remove any lingering logic that might imply a "Spectator" role.

## Phase 2: Frontend Refactor (`App.html`)
1.  **Lobby & Room Creation:**
    *   Ensure the "Start Game" button is only visible to the host and that it correctly locks the lobby.
    *   Remove any UI references to spectators.
2.  **Audio & Haptics Controller:**
    *   Update `audioHaptic` object with the required sound functions (`diceRoll`, `pieceHop`, `capture`, `playerFinish`, `gameEnd`).
    *   Implement specific `navigator.vibrate` patterns for each event.
    *   Integrate `audioHaptic.playHop()` and `vibrate(10)` inside the `animatePieceHop` loop for perfect sync.
3.  **HUD & Badge Logic:**
    *   Verify the `updateUI` loop correctly renders "1st Place", "2nd Place", and "3rd Place" badges based on the `placements` array.
    *   Ensure the dice button is permanently disabled for players who have finished.

## Phase 3: Validation
1.  **Unit Tests/Mock Runs:**
    *   Simulate a full game with N-1 logic to verify the loser is correctly identified.
    *   Check spreadsheet output for correct point distribution.
2.  **Manual Verification:**
    *   Test Audio/Haptics on a mobile device (if possible) or verify via logs/context.
    *   Confirm room creation and join flow.
