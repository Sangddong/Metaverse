import { COLORS } from "/shared/constants.js";
import {
  $,
  bindLobby,
  bindHud,
  showLobbyError,
  enterGame,
  renderPlayers,
  appendChat,
  loadChat,
  renderBanner,
  updateGameOverlays,
  toast,
  setRoomUrl,
  showFlash,
  parseRoomFromUrl,
} from "./ui.js";
import { createRenderer, createPaint } from "./render.js";
import { createInput } from "./input.js";
import { createMap } from "/shared/map.js";

const socket = io({ transports: ["websocket", "polling"] });
const map = createMap();
const canvas = $("world");
const renderer = createRenderer(canvas, map);
const input = createInput(canvas);
const paint = createPaint();

const lobbyState = {
  color: localStorage.getItem("playza-color") || COLORS[Math.floor(Math.random() * COLORS.length)],
};
if (!COLORS.includes(lobbyState.color)) {
  lobbyState.color = COLORS[Math.floor(Math.random() * COLORS.length)];
}

const state = {
  you: null,
  players: [],
  hostId: null,
  roomId: "PLAZ",
  game: null,
  maxPlayers: 30,
};

let lastSent = { vx: 0, vy: 0, running: false, dir: 2 };
let joining = false;
let pendingJoin = null;

function rememberRoom(roomId) {
  const code = String(roomId || "PLAZ").toUpperCase();
  localStorage.setItem("playza-room", code);
  setRoomUrl(code);
}

function emitJoin({ roomId, name, color }) {
  const cleaned = String(name || "").trim();
  if (!cleaned) {
    showLobbyError("닉네임을 입력하세요.");
    joining = false;
    return;
  }
  joining = true;
  pendingJoin = { roomId, name: cleaned, color };
  socket.emit("join", { roomId: roomId || "PLAZ", name: cleaned, color });
}

function joinRoom(roomId) {
  const name = ($("nameInput")?.value || "").trim();
  if (!name) {
    showLobbyError("닉네임을 입력하세요.");
    $("nameInput")?.focus();
    return;
  }
  localStorage.setItem("playza-name", name);
  localStorage.setItem("playza-color", lobbyState.color);
  showLobbyError("");
  const payload = {
    roomId: roomId || localStorage.getItem("playza-room") || "PLAZ",
    name,
    color: lobbyState.color,
  };
  if (socket.connected) emitJoin(payload);
  else pendingJoin = payload;
}

bindLobby(lobbyState, {
  join: joinRoom,
});

bindHud({
  getName: () => state.you?.name || "",
  getColor: () => state.you?.color || lobbyState.color,
  getRoomId: () => state.roomId,
  recolor(color) {
    lobbyState.color = color;
    localStorage.setItem("playza-color", color);
    if (state.you) state.you.color = color;
    socket.emit("recolor", color);
  },
  rename(name) {
    const next = String(name || "").trim().slice(0, 12);
    if (!next) {
      toast("닉네임을 입력하세요.");
      return;
    }
    localStorage.setItem("playza-name", next);
    if (state.you) {
      state.you = { ...state.you, name: next };
      const i = state.players.findIndex((p) => p.id === state.you.id);
      if (i >= 0) state.players[i] = { ...state.players[i], name: next };
      renderPlayers(state);
    }
    if ($("nameInput")) $("nameInput").value = next;
    socket.emit("rename", next);
    toast("닉네임이 저장되었습니다.");
  },
  startGame(type) {
    socket.emit("host:startGame", type);
  },
  stopGame() {
    socket.emit("host:stopGame");
  },
  lock() {
    socket.emit("host:lock");
  },
  kick(id) {
    socket.emit("host:kick", id);
  },
  mute(id) {
    socket.emit("host:mute", id);
  },
  transfer(id) {
    socket.emit("host:transfer", id);
  },
  chat(text) {
    socket.emit("chat", text);
  },
  guess(text) {
    socket.emit("chat", text);
  },
  clearPaint() {
    socket.emit("gameAction", { kind: "clear" });
  },
});

paint.setHandler((action) => socket.emit("gameAction", action));

function applyJoined(payload) {
  joining = false;
  pendingJoin = null;
  state.you = payload.you;
  state.players = payload.players;
  state.hostId = payload.hostId;
  state.roomId = payload.id;
  state.game = payload.game;
  state.maxPlayers = payload.maxPlayers;
  lobbyState.color = payload.you.color || lobbyState.color;
  localStorage.setItem("playza-name", payload.you.name);
  localStorage.setItem("playza-color", lobbyState.color);
  rememberRoom(payload.id);
  sessionStorage.setItem("playza-in-game", "1");
  enterGame();
  renderer.resize();
  loadChat(payload.chat);
  renderPlayers(state);
  renderBanner(state.game);
  updateGameOverlays(state, paint);
}

function tryAutoJoin() {
  // 같은 탭에서 이미 입장했던 경우(새로고침/재연결)만 자동 재입장
  if (sessionStorage.getItem("playza-in-game") !== "1") return;

  if (state.you?.name && state.roomId) {
    emitJoin({
      roomId: state.roomId,
      name: state.you.name,
      color: state.you.color || lobbyState.color,
    });
    return;
  }
  if (pendingJoin?.name) {
    emitJoin(pendingJoin);
    return;
  }
  const roomFromUrl = parseRoomFromUrl();
  const name = ($("nameInput")?.value || localStorage.getItem("playza-name") || "").trim();
  if (roomFromUrl && name && $("lobby") && !$("lobby").hidden) {
    if ($("nameInput") && !$("nameInput").value) $("nameInput").value = name;
    joinRoom(roomFromUrl);
  }
}

socket.on("connect", tryAutoJoin);
if (socket.connected) tryAutoJoin();

socket.on("joined", applyJoined);
socket.on("joinDenied", (msg) => {
  joining = false;
  showLobbyError(msg);
  toast(msg);
});
socket.on("kicked", (msg) => {
  toast(msg);
  sessionStorage.removeItem("playza-in-game");
  localStorage.removeItem("playza-room");
  location.href = "/";
});
socket.on("errorMsg", toast);
socket.on("state", (payload) => {
  const me = payload.players.find((p) => p.id === state.you?.id);
  state.you = me || state.you;
  state.players = payload.players;
  state.hostId = payload.hostId;
  state.roomId = payload.id;
  const prevGame = state.game;
  state.game = payload.game;
  if (prevGame && !payload.game) input.blurChat();
  renderPlayers(state);
  renderBanner(state.game);
  updateGameOverlays(state, paint);
});
socket.on("tick", (payload) => {
  const prevGame = state.game;
  state.players = payload.players;
  state.game = payload.game;
  if (prevGame && !payload.game) input.blurChat();
  const me = payload.players.find((p) => p.id === state.you?.id);
  if (me) state.you = me;
  renderBanner(state.game);
  if (state.game?.type === "chosung" || state.game?.type === "namechosung" || state.game?.type === "color" || prevGame) {
    updateGameOverlays(state, paint);
  }
});
socket.on("chat", (msg) => {
  appendChat(msg);
  if (!msg.system && msg.playerId) renderer.addBubble(msg.playerId, msg.text);
  if (msg.system && /탈락|시작합니다|게임 종료|뽑혔습니다|추첨/.test(msg.text)) {
    showFlash(msg.text, msg.text.includes("뽑혔") || msg.text.includes("게임 종료") ? 3500 : 2800);
  }
});
socket.on("poked", ({ to, shakeUntil }) => {
  const until = shakeUntil || Date.now() + 420;
  const i = state.players.findIndex((x) => x.id === to);
  if (i >= 0) state.players[i] = { ...state.players[i], shakeUntil: until };
  if (state.you?.id === to) state.you = { ...state.you, shakeUntil: until };
});
socket.on("playerJoined", () => {});
socket.on("playerPatch", (p) => {
  const i = state.players.findIndex((x) => x.id === p.id);
  if (i >= 0) state.players[i] = { ...state.players[i], ...p };
  if (state.you?.id === p.id) state.you = { ...state.you, ...p };
});

function pokeNearest() {
  const me = state.you;
  if (!me) return;
  let best = null;
  let d0 = 80;
  for (const p of state.players) {
    if (p.id === me.id) continue;
    const d = Math.hypot(p.x - me.x, p.y - me.y);
    if (d < d0) {
      best = p;
      d0 = d;
    }
  }
  if (best) socket.emit("poke", best.id);
  else toast("가까이 있는 사람이 없어요.");
}

canvas.addEventListener("pointerdown", () => {
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
});

canvas.addEventListener("click", (e) => {
  const world = input.screenToWorld(e, renderer.camera);
  const hit = renderer.hitTest(world, state.players, state.you?.id);
  if (hit) socket.emit("poke", hit.id);
});

function toggleSitLocal() {
  if (!state.you) return;
  const next = !state.you.sitting;
  state.you = { ...state.you, sitting: next, running: false, dancing: false };
  const i = state.players.findIndex((p) => p.id === state.you.id);
  if (i >= 0) state.players[i] = { ...state.players[i], sitting: next, running: false, dancing: false };
}

function toggleDanceLocal() {
  if (!state.you) return;
  const next = !state.you.dancing;
  state.you = { ...state.you, dancing: next, sitting: false, running: false };
  const i = state.players.findIndex((p) => p.id === state.you.id);
  if (i >= 0) state.players[i] = { ...state.players[i], dancing: next, sitting: false, running: false };
}

window.addEventListener("keydown", (e) => {
  if (e.isComposing) return;
  // 채팅창 포커스 중에는 입력만 허용 (게임 단축키 / 포커스 해제 금지)
  if (input.isTyping()) {
    if (e.key === "Escape") {
      document.activeElement.blur();
      e.preventDefault();
    }
    return;
  }
  if (e.code === "Enter") {
    $("chatInput").focus();
    e.preventDefault();
    return;
  }
  if (e.code === "KeyC" || e.code === "KeyZ" || e.code === "KeyX" || e.code === "Space") {
    e.preventDefault();
  }
  if (e.repeat) return;
  if (e.code === "KeyC") {
    toggleSitLocal();
    socket.emit("sit");
  } else if (e.code === "KeyZ") {
    pokeNearest();
  } else if (e.code === "KeyX") {
    toggleDanceLocal();
    socket.emit("dance");
  }
});

setInterval(() => {
  const v = input.vector();
  if (v.typing) return;
  if (v.vx !== lastSent.vx || v.vy !== lastSent.vy || v.running !== lastSent.running || v.dir !== lastSent.dir) {
    lastSent = { vx: v.vx, vy: v.vy, running: !!v.running, dir: v.dir ?? lastSent.dir };
    socket.emit("input", lastSent);
  }
}, 50);

function loop() {
  renderer.draw(state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(() => {
  if (state.game) {
    renderBanner(state.game);
    if (state.game.type === "chosung" || state.game.type === "namechosung" || state.game.type === "color") {
      updateGameOverlays(state, paint);
    }
  }
}, 250);
