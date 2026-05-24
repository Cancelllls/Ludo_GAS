/**
 * Ludo GAS - Backend Logic
 * Architecture: CacheService (DB) + LockService (Concurrency)
 */

const CACHE_TTL = 21600; // 6 hours
const COLORS = ['red', 'green', 'yellow', 'blue'];
const SAFE_SQUARES = [1, 9, 14, 22, 27, 35, 40, 48]; // Logical indices in SharedTrack

function doGet() {
  return HtmlService.createHtmlOutputFromFile('App')
    .setTitle('Ludo MultiPlayer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * UTILS & STATE MANAGEMENT
 */

function getLock() {
  return LockService.getScriptLock();
}

function getCache() {
  return CacheService.getScriptCache();
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function saveState(gameId, state) {
  state.lastUpdate = Date.now();
  getCache().put(gameId, JSON.stringify(state), CACHE_TTL);
}

function getState(gameId) {
  const cached = getCache().get(gameId);
  if (!cached) return null;
  return JSON.parse(cached);
}

/**
 * ENDPOINTS
 */

function createGame(playerName, color) {
  const lock = getLock();
  try {
    lock.waitLock(5000);
    const gameId = generateRoomCode();
    const state = {
      gameId: gameId,
      players: { red: null, green: null, yellow: null, blue: null },
      currentTurn: color,
      dice: { value: null, hasRolled: false },
      pieces: {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1]
      },
      consecutiveSixes: { red: 0, green: 0, yellow: 0, blue: 0 },
      status: 'waiting',
      lastUpdate: Date.now()
    };
    state.players[color] = playerName;
    saveState(gameId, state);
    return state;
  } catch (e) {
    throw new Error("Could not create game: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function joinGame(gameId, playerName, color) {
  const lock = getLock();
  try {
    lock.waitLock(5000);
    const state = getState(gameId);
    if (!state) throw new Error("Game not found.");
    if (state.players[color]) throw new Error("Color already taken.");
    
    state.players[color] = playerName;
    
    // Check if we should start
    const playerCount = Object.values(state.players).filter(p => p !== null).length;
    if (playerCount >= 2 && state.status === 'waiting') {
      state.status = 'playing';
    }
    
    saveState(gameId, state);
    return state;
  } catch (e) {
    throw new Error("Could not join game: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function getGameState(gameId) {
  const state = getState(gameId);
  if (!state) return null;
  
  // Basic turn-timeout check (30 seconds)
  if (state.status === 'playing' && state.lastUpdate && (Date.now() - state.lastUpdate > 30000)) {
    // If player hasn't moved in 30s, skip turn
    // To be safe, we only do this if it's been a while since the last roll or update
    // For now, let's keep it simple and just return the state.
    // In a more robust impl, we'd rotate the turn here.
  }
  
  return state;
}

function rollDice(gameId, requestingColor) {
  const lock = getLock();
  try {
    lock.waitLock(5000);
    const state = getState(gameId);
    if (!state) throw new Error("Game not found.");
    if (state.currentTurn !== requestingColor) throw new Error("Not your turn.");
    if (state.dice.hasRolled) throw new Error("Already rolled.");
    
    const roll = Math.floor(Math.random() * 6) + 1;
    
    // Rule of Three 6s
    if (roll === 6) {
      state.consecutiveSixes[requestingColor]++;
    } else {
      state.consecutiveSixes[requestingColor] = 0;
    }

    if (state.consecutiveSixes[requestingColor] === 3) {
      state.consecutiveSixes[requestingColor] = 0;
      state.dice.hasRolled = false;
      state.dice.value = null;
      state.currentTurn = getNextPlayer(state);
    } else {
      state.dice.value = roll;
      state.dice.hasRolled = true;
      
      // Check if player has any legal moves. If not, auto-rotate turn.
      if (!hasLegalMoves(state, requestingColor, roll)) {
        state.dice.hasRolled = false;
        state.dice.value = null;
        state.currentTurn = getNextPlayer(state);
      }
    }
    
    saveState(gameId, state);
    return state;
  } catch (e) {
    throw new Error("Roll failed: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function movePiece(gameId, requestingColor, pieceIndex) {
  const lock = getLock();
  try {
    lock.waitLock(5000);
    const state = getState(gameId);
    if (!state) throw new Error("Game not found.");
    if (state.currentTurn !== requestingColor) throw new Error("Not your turn.");
    if (!state.dice.hasRolled) throw new Error("Roll the dice first.");
    
    const roll = state.dice.value;
    const currentPos = state.pieces[requestingColor][pieceIndex];
    let nextPos = currentPos;
    
    if (currentPos === -1) {
      if (roll === 6) {
        nextPos = 0; // Enter board
      } else {
        throw new Error("Need a 6 to enter board.");
      }
    } else if (currentPos >= 0 && currentPos <= 56) {
      nextPos = currentPos + roll;
      if (nextPos > 57) throw new Error("Invalid move.");
    } else {
      throw new Error("Piece already finished.");
    }
    
    // Check for capture if on shared track
    if (nextPos >= 0 && nextPos <= 51) {
      const logicalGlobalIndex = getGlobalIndex(requestingColor, nextPos);
      if (!SAFE_SQUARES.includes(logicalGlobalIndex)) {
        // Check other players' pieces
        COLORS.forEach(color => {
          if (color === requestingColor) return;
          state.pieces[color] = state.pieces[color].map(pos => {
            if (pos >= 0 && pos <= 51) {
              if (getGlobalIndex(color, pos) === logicalGlobalIndex) {
                return -1; // Captured!
              }
            }
            return pos;
          });
        });
      }
    }
    
    state.pieces[requestingColor][pieceIndex] = nextPos;
    
    // Check for win
    const finished = state.pieces[requestingColor].every(p => p === 57);
    if (finished) {
      state.status = 'gameOver';
    } else {
      // Rotation logic
      if (roll !== 6) {
        state.currentTurn = getNextPlayer(state);
      }
      state.dice.hasRolled = false;
      state.dice.value = null;
    }
    
    saveState(gameId, state);
    return state;
  } catch (e) {
    throw new Error("Move failed: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * LUDO LOGIC HELPERS
 */

function getNextPlayer(state) {
  const currentIndex = COLORS.indexOf(state.currentTurn);
  for (let i = 1; i < 4; i++) {
    const nextColor = COLORS[(currentIndex + i) % 4];
    if (state.players[nextColor]) return nextColor;
  }
  return state.currentTurn;
}

function hasLegalMoves(state, color, roll) {
  return state.pieces[color].some((pos, idx) => {
    if (pos === -1) return roll === 6;
    if (pos === 57) return false;
    return (pos + roll) <= 57;
  });
}

/**
 * Translates local logical index (0-51) to global track index (0-51)
 * Red Start: 1, Green: 14, Yellow: 27, Blue: 40
 */
function getGlobalIndex(color, localIndex) {
  if (localIndex < 0 || localIndex > 51) return -1;
  const offsets = { red: 1, green: 14, yellow: 27, blue: 40 };
  return (localIndex + offsets[color]) % 52;
}
