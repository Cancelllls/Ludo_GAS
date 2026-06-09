function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Ludo King')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

const CACHE_TIMEOUT = 21600; 
const LOCK_TIMEOUT = 5000;

function generateRoomCode() {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getActiveRooms() {
  const cache = CacheService.getScriptCache();
  const roomsStr = cache.get('LOBBY_ROOMS');
  return roomsStr ? JSON.parse(roomsStr) : [];
}

function saveActiveRooms(rooms) {
  const cache = CacheService.getScriptCache();
  cache.put('LOBBY_ROOMS', JSON.stringify(rooms), CACHE_TIMEOUT);
}

function getLobbyState() {
  const rooms = getActiveRooms();
  const cache = CacheService.getScriptCache();
  const activeLobby = [];
  
  if (rooms.length > 0) {
    const keys = rooms.map(r => 'R_' + r);
    const roomData = cache.getAll(keys);
    
    let activeCodes = [];
    for (let rCode of rooms) {
      let dataStr = roomData['R_' + rCode];
      if (dataStr) {
        let state = JSON.parse(dataStr);
        activeCodes.push(rCode);
        if (!state.isPrivate) {
          activeLobby.push({
            roomCode: rCode,
            host: state.players.length > 0 ? state.players[0].name : 'Unknown',
            playerCount: state.players.length,
            claimedColors: state.claimedColors || [],
            status: state.state
          });
        }
      }
    }
    
    if (activeCodes.length !== rooms.length) {
      const lock = LockService.getScriptLock();
      if (lock.tryLock(2000)) {
        try {
          saveActiveRooms(activeCodes);
        } finally {
          lock.releaseLock();
        }
      }
    }
  }
  return activeLobby;
}

function createRoom(playerName, isPrivate, hostColor, settings) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(LOCK_TIMEOUT)) {
    throw new Error('Could not acquire lock to create room. Please try again.');
  }
  
  try {
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
    } while (cache.get('R_' + roomCode) && attempts < 10);
    
    if (attempts >= 10) throw new Error('Failed to generate a unique room code.');
    
    const initialGameState = {
      version: 1,
      isPrivate: !!isPrivate,
      settings: settings || { splitMoves: false, bounties: false, blitz: false, alliance: false, threeSixes: true, autoMove: true, blockades: true },
      claimedColors: [hostColor],
      players: [{ id: 0, name: playerName, color: hostColor, isBot: false }],
      spectators: [],
      turnIndex: 0,
      state: 'WAITING',
      board: null,
      diceRoll: null,
      rollId: null,
      sixesRolled: 0,
      reactions: [],
      turnCount: 0,
      bounties: [],
      guaranteedSix: {},
      remainingRoll: 0,
      lastAction: 'Room created'
    };
    
    cache.put('R_' + roomCode, JSON.stringify(initialGameState), CACHE_TIMEOUT);
    
    const rooms = getActiveRooms();
    rooms.push(roomCode);
    saveActiveRooms(rooms);
    
    return { success: true, roomCode: roomCode, state: initialGameState, playerId: 0, isSpectator: false };
  } finally {
    lock.releaseLock();
  }
}

function joinRoom(roomCode, playerName, chosenColor) {
  roomCode = roomCode.trim();
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(LOCK_TIMEOUT)) throw new Error('Lock error.');
  
  try {
    const stateStr = cache.get('R_' + roomCode);
    if (!stateStr) return { success: false, error: 'Room not found or expired.' };
    
    const state = JSON.parse(stateStr);
    
    let isSpectator = false;
    let newPlayerId = -1;
    
    if (state.players.length >= 4) {
      isSpectator = true;
      state.spectators.push(playerName);
      state.lastAction = playerName + ' joined as spectator';
    } else if (state.state !== 'WAITING') {
      isSpectator = true;
      state.spectators.push(playerName);
      state.lastAction = playerName + ' joined as spectator';
    } else {
      if ((state.claimedColors || []).includes(chosenColor)) {
         return { success: false, error: 'Color already claimed!' };
      }
      
      newPlayerId = state.players.length;
      if (!state.claimedColors) state.claimedColors = [];
      state.claimedColors.push(chosenColor);
      
      state.players.push({
        id: newPlayerId,
        name: playerName,
        color: chosenColor,
        isBot: false
      });
      state.lastAction = playerName + ' joined';
    }
    
    state.version++;
    cache.put('R_' + roomCode, JSON.stringify(state), CACHE_TIMEOUT);
    
    return { success: true, state: state, playerId: newPlayerId, isSpectator: isSpectator };
  } finally {
    lock.releaseLock();
  }
}

function addBotToRoom(roomCode, botColor) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(LOCK_TIMEOUT)) throw new Error('Lock error.');
  
  try {
    const stateStr = cache.get('R_' + roomCode);
    if (!stateStr) return { success: false, error: 'Room not found.' };
    
    const state = JSON.parse(stateStr);
    
    if (state.state !== 'WAITING') return { success: false, error: 'Game already started.' };
    if (state.players.length >= 4) return { success: false, error: 'Room is full.' };
    if ((state.claimedColors || []).includes(botColor)) return { success: false, error: 'Color already claimed.' };
    
    const newPlayerId = state.players.length;
    if (!state.claimedColors) state.claimedColors = [];
    state.claimedColors.push(botColor);
    
    state.players.push({
      id: newPlayerId,
      name: 'Bot ' + (newPlayerId),
      color: botColor,
      isBot: true
    });
    
    state.version++;
    state.lastAction = 'Bot added';
    
    cache.put('R_' + roomCode, JSON.stringify(state), CACHE_TIMEOUT);
    return { success: true, state: state };
  } finally {
    lock.releaseLock();
  }
}

function startGame(roomCode) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(LOCK_TIMEOUT)) return null;
  
  try {
    const stateStr = cache.get('R_' + roomCode);
    if (!stateStr) return null;
    
    const state = JSON.parse(stateStr);
    if (state.state === 'WAITING' && state.players.length >= 2) {
      state.state = 'PLAYING';
      state.version++;
      state.lastAction = 'Game started';
      cache.put('R_' + roomCode, JSON.stringify(state), CACHE_TIMEOUT);
    }
    return state;
  } finally {
    lock.releaseLock();
  }
}

function getRoomState(roomCode, clientVersion) {
  const cache = CacheService.getScriptCache();
  const stateStr = cache.get('R_' + roomCode);
  
  if (!stateStr) return { success: false, error: 'Room not found.' };
  
  const state = JSON.parse(stateStr);
  if (state.version > clientVersion) {
    return { success: true, updated: true, state: state };
  } else {
    return { success: true, updated: false, version: state.version };
  }
}

function updateRoomState(roomCode, newStateDelta, expectedVersion) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(LOCK_TIMEOUT)) return { success: false, error: 'Lock timeout' };
  
  try {
    const stateStr = cache.get('R_' + roomCode);
    if (!stateStr) return { success: false, error: 'Room not found' };
    
    const state = JSON.parse(stateStr);
    
    if (state.version !== expectedVersion) {
      return { success: false, error: 'Version mismatch', state: state };
    }
    
    for (let key in newStateDelta) {
      state[key] = newStateDelta[key];
    }
    
    if (state.settings && state.settings.bounties && state.turnCount > 0 && state.turnCount % 5 === 0 && state.bountySpawnedForTurn !== state.turnCount) {
        state.bountySpawnedForTurn = state.turnCount;
        let nonSafe = [];
        for (let i=0; i<52; i++) {
            if (![0, 8, 13, 21, 26, 34, 39, 47].includes(i)) nonSafe.push(i);
        }
        let pos = nonSafe[Math.floor(Math.random() * nonSafe.length)];
        let type = Math.random() > 0.5 ? 'shield' : 'golden_dice';
        if (!state.bounties) state.bounties = [];
        state.bounties.push({ pos: pos, type: type });
    }
    
    state.version++;
    cache.put('R_' + roomCode, JSON.stringify(state), CACHE_TIMEOUT);
    
    return { success: true, state: state };
  } finally {
    lock.releaseLock();
  }
}

function performRoll(roomCode, expectedVersion) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(LOCK_TIMEOUT)) return { success: false, error: 'Lock timeout' };
  
  try {
    const stateStr = cache.get('R_' + roomCode);
    if (!stateStr) return { success: false, error: 'Room not found' };
    
    const state = JSON.parse(stateStr);
    
    if (state.version !== expectedVersion) {
      return { success: false, error: 'Version mismatch', state: state };
    }
    
    if (state.hasRolled || state.winner) {
      return { success: false, error: 'Already rolled' };
    }
    
    let rollResult;
    const pColor = state.players[state.turnIndex].color;
    if (state.guaranteedSix && state.guaranteedSix[pColor]) {
       rollResult = 6;
       state.guaranteedSix[pColor] = false;
    } else {
       rollResult = Math.floor(Math.random() * 6) + 1;
    }
    
    state.diceRoll = rollResult;
    state.rollId = new Date().getTime(); 
    state.hasRolled = true;
    state.remainingRoll = rollResult;
    
    if (state.diceRoll === 6) {
      if (!state.settings || state.settings.threeSixes !== false) {
        state.sixesRolled = (state.sixesRolled || 0) + 1;
        if (state.sixesRolled >= 3) {
           state.hasRolled = false;
           state.sixesRolled = 0;
           state.turnIndex = (state.turnIndex + 1) % state.players.length;
           state.turnCount = (state.turnCount || 0) + 1;
           state.lastAction = '3 Sixes Penalty! Turn lost.';
        } else {
           state.lastAction = '';
        }
      } else {
        state.lastAction = '';
      }
    } else {
      state.lastAction = '';
    }
    
    state.version++;
    cache.put('R_' + roomCode, JSON.stringify(state), CACHE_TIMEOUT);
    return { success: true, state: state };
  } finally {
    lock.releaseLock();
  }
}

function sendReaction(roomCode, playerId, emoji) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT)) return { success: false };
  
  try {
    const stateStr = cache.get('R_' + roomCode);
    if (!stateStr) return { success: false };
    const state = JSON.parse(stateStr);
    
    if (!state.reactions) state.reactions = [];
    state.reactions.push({
      playerId: playerId,
      emoji: emoji,
      time: new Date().getTime()
    });
    
    state.reactions = state.reactions.filter(r => new Date().getTime() - r.time < 10000);
    state.version++;
    
    cache.put('R_' + roomCode, JSON.stringify(state), CACHE_TIMEOUT);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}
