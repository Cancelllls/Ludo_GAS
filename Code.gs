const COLORS = ['red', 'green', 'yellow', 'blue'];
const SAFE_SQUARES = [1, 9, 14, 22, 27, 35, 40, 48];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('App')
    .setTitle('Ludo MultiPlayer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** STATE MANAGEMENT **/
function getLock() { return LockService.getScriptLock(); }
function getCache() { return CacheService.getScriptCache(); }
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
const CACHE_TTL = 21600; // 6 hours

function saveState(gameId, state) { 
  state.stateVersion = (state.stateVersion || 0) + 1;
  state.lastUpdate = Date.now(); 
  getCache().put(gameId, JSON.stringify(state), CACHE_TTL); 
}
function getState(gameId) { const cached = getCache().get(gameId); return cached ? JSON.parse(cached) : null; }

/** ENDPOINTS **/
function createGame(playerName, color) {
  const lock = getLock();
  try {
    if (!lock.tryLock(5000)) return { success: false, error: "SERVER_BUSY" };
    const gameId = generateRoomCode();
    const state = {
      gameId: gameId,
      stateVersion: 1,
      host: color,
      players: { red: null, green: null, yellow: null, blue: null },
      currentTurn: color,
      dice: { value: null, hasRolled: false, rollId: null },
      pieces: { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
      consecutiveSixes: { red: 0, green: 0, yellow: 0, blue: 0 },
      placements: [],
      status: 'waiting',
      lastUpdate: Date.now()
    };
    state.players[color] = playerName;
    saveState(gameId, state);
    return { success: true, state: state };
  } catch (e) { return { success: false, error: e.message }; } finally { lock.releaseLock(); }
}

function joinGame(gameId, playerName, color) {
  const lock = getLock();
  try {
    if (!lock.tryLock(5000)) return { success: false, error: "SERVER_BUSY" };
    const state = getState(gameId);
    if (!state) return { success: false, error: "ROOM_NOT_FOUND" };
    if (state.status !== 'waiting') return { success: false, error: "GAME_ALREADY_STARTED" };
    
    let finalColor = color;
    if (state.players[finalColor]) {
      finalColor = COLORS.find(c => !state.players[c]);
    }
    if (!finalColor) return { success: false, error: "ROOM_FULL" };
    
    state.players[finalColor] = playerName;
    saveState(gameId, state);
    return { success: true, state: state };
  } catch (e) { return { success: false, error: e.message }; } finally { lock.releaseLock(); }
}

function startGame(gameId, requestingColor) {
  const lock = getLock();
  try {
    if (!lock.tryLock(5000)) return { success: false, error: "SERVER_BUSY" };
    const state = getState(gameId);
    if (!state) return { success: false, error: "ROOM_NOT_FOUND" };
    if (state.host !== requestingColor) return { success: false, error: "NOT_HOST" };
    const activePlayers = Object.values(state.players).filter(p => p !== null).length;
    if (activePlayers < 2) return { success: false, error: "NEED_MORE_PLAYERS" };
    
    state.status = 'playing';
    saveState(gameId, state);
    return { success: true, state: state };
  } catch (e) { return { success: false, error: e.message }; } finally { lock.releaseLock(); }
}

function getGameState(gameId) { 
  const state = getState(gameId);
  if (!state) return { success: false, error: "ROOM_NOT_FOUND" };
  return { success: true, state: state };
}

function rollDice(gameId, requestingColor) {
  const lock = getLock();
  try {
    if (!lock.tryLock(5000)) return { success: false, error: "SERVER_BUSY" };
    const state = getState(gameId);
    if (!state) return { success: false, error: "ROOM_NOT_FOUND" };
    if (state.currentTurn !== requestingColor || state.dice.hasRolled || state.status !== 'playing') {
       return { success: false, error: "ILLEGAL_ROLL", syncRequired: true };
    }
    
    const roll = Math.floor(Math.random() * 6) + 1;
    state.dice.rollId = Date.now();
    if (roll === 6) state.consecutiveSixes[requestingColor]++;
    else state.consecutiveSixes[requestingColor] = 0;

    if (state.consecutiveSixes[requestingColor] === 3) {
      state.consecutiveSixes[requestingColor] = 0;
      state.dice.hasRolled = false; state.dice.value = null;
      state.currentTurn = getNextPlayer(state);
    } else {
      state.dice.value = roll;
      state.dice.hasRolled = true;
    }
    saveState(gameId, state);
    return { success: true, state: state };
  } catch (e) { return { success: false, error: e.message }; } finally { lock.releaseLock(); }
}

function passTurn(gameId, requestingColor) {
  const lock = getLock();
  try {
    if (!lock.tryLock(5000)) return { success: false, error: "SERVER_BUSY" };
    const state = getState(gameId);
    if (!state) return { success: false, error: "ROOM_NOT_FOUND" };
    if (state.currentTurn !== requestingColor || !state.dice.hasRolled || state.status !== 'playing') {
      return { success: false, error: "ILLEGAL_PASS", syncRequired: true };
    }
    
    if (hasLegalMoves(state, requestingColor, state.dice.value)) {
      return { success: false, error: "LEGAL_MOVES_EXIST", syncRequired: true };
    }
    
    state.dice.hasRolled = false; state.dice.value = null;
    state.currentTurn = getNextPlayer(state);
    
    saveState(gameId, state);
    return { success: true, state: state };
  } catch (e) { return { success: false, error: e.message }; } finally { lock.releaseLock(); }
}

function movePiece(gameId, requestingColor, pieceIndex) {
  const lock = getLock();
  try {
    if (!lock.tryLock(5000)) return { success: false, error: "SERVER_BUSY" };
    const state = getState(gameId);
    if (!state) return { success: false, error: "ROOM_NOT_FOUND" };
    
    // Zero-Trust Validation
    if (state.currentTurn !== requestingColor || !state.dice.hasRolled || state.status !== 'playing') {
      return { success: false, error: "STATE_VIOLATION", syncRequired: true };
    }
    
    const roll = state.dice.value;
    const currentPos = state.pieces[requestingColor][pieceIndex];
    
    // Server-side Move Validity (Authoritative)
    if (currentPos === -1 && roll !== 6) return { success: false, error: "ILLEGAL_MOVE_START", syncRequired: true };
    if (currentPos !== -1 && currentPos + roll > 57) return { success: false, error: "ILLEGAL_MOVE_OVERSHOT", syncRequired: true };
    if (currentPos === 57) return { success: false, error: "ILLEGAL_MOVE_FINISHED", syncRequired: true };

    const nextPos = (currentPos === -1) ? 0 : currentPos + roll;

    // Authoritative Capture Logic
    if (nextPos >= 0 && nextPos <= 51) {
      const gIdx = getGlobalIndex(requestingColor, nextPos);
      if (!SAFE_SQUARES.includes(gIdx)) {
        COLORS.forEach(c => {
          if (c === requestingColor) return;
          state.pieces[c] = state.pieces[c].map(p => (p >= 0 && p <= 51 && getGlobalIndex(c, p) === gIdx) ? -1 : p);
        });
      }
    }
    
    state.pieces[requestingColor][pieceIndex] = nextPos;
    
    // Check finish state
    const piecesFinishedCount = state.pieces[requestingColor].filter(p => p === 57).length;
    if (piecesFinishedCount === 4 && !state.placements.includes(requestingColor)) {
      state.placements.push(requestingColor);
    }

    const activePlayers = Object.keys(state.players).filter(c => state.players[c]);
    if (state.placements.length >= activePlayers.length - 1) {
      state.status = 'gameOver';
      writeLeaderboard(state);
    } else {
      // Turn Advancement Logic
      if (roll !== 6 || piecesFinishedCount === 4) {
        state.currentTurn = getNextPlayer(state);
      }
      state.dice.hasRolled = false; state.dice.value = null;
    }
    
    saveState(gameId, state);
    return { success: true, state: state };
  } catch (e) { return { success: false, error: "INTERNAL_ERROR" }; } finally { lock.releaseLock(); }
}

/** HELPERS **/
function getNextPlayer(state) {
  const currentIndex = COLORS.indexOf(state.currentTurn);
  for (let i = 1; i < 4; i++) {
    const next = COLORS[(currentIndex + i) % 4];
    if (state.players[next] && !state.placements.includes(next)) return next;
  }
  return state.currentTurn;
}

function hasLegalMoves(state, color, roll) {
  return state.pieces[color].some(p => (p === -1) ? (roll === 6) : (p < 57 && p + roll <= 57));
}

function getGlobalIndex(color, localIndex) {
  const offsets = { red: 1, green: 14, yellow: 27, blue: 40 };
  return (localIndex + offsets[color]) % 52;
}

function writeLeaderboard(state) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create("Ludo Leaderboard");
    let sheet = ss.getSheetByName("LudoPlayers");
    if (!sheet) sheet = ss.insertSheet("LudoPlayers");
    
    const active = Object.keys(state.players).filter(c => state.players[c]);
    const loser = active.find(c => !state.placements.includes(c));
    const finalOrder = [...state.placements, loser];
    
    finalOrder.forEach((color, i) => {
      let points = 0;
      if (i === finalOrder.length - 1) {
        points = 0; // The loser always gets 0
      } else {
        // 1st: 3, 2nd: 2, 3rd: 1
        points = 3 - i;
      }
      if (points < 0) points = 0;
      
      sheet.appendRow([new Date(), state.players[color], color, i + 1, points, state.gameId]);
    });
  } catch (e) {}
}
