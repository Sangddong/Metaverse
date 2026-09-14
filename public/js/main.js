import { COLORS, HAIR_COLORS, clampHair, clampOutfit, clampHairColor } from "/shared/constants.js";
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
import { createScreenShare } from "./screenShare.js";

const socket = io({ transports: ["websocket", "polling"] });
const map = createMap();
const canvas = $("world");
const renderer = createRenderer(canvas, map);
const input = createInput(canvas);
const paint = createPaint();

const lobbyState = {
  color: localStorage.getItem("playza-color") || COLORS[Math.floor(Math.random() * COLORS.length)],
  hair: clampHair(localStorage.getItem("playza-hair") ?? 1),
  outfit: clampOutfit(localStorage.getItem("playza-outfit") ?? 0),
  hairColorIndex: clampHairColor(localStorage.getItem("playza-hairColor") ?? 0),
};
if (!COLORS.includes(lobbyState.color)) {
  lobbyState.color = COLORS[Math.floor(Math.random() * COLORS.length)];
}

function saveAppearance() {
  localStorage.setItem("playza-color", lobbyState.color);
  localStorage.setItem("playza-hair", String(lobbyState.hair));
  localStorage.setItem("playza-outfit", String(lobbyState.outfit));
  localStorage.setItem("playza-hairColor", String(lobbyState.hairColorIndex));
}

function syncAppear(patch = {}) {
  Object.assign(lobbyState, patch);
  saveAppearance();
  if (state.you) {
    state.you = {
      ...state.you,
      color: lobbyState.color,
      hair: lobbyState.hair,
      outfit: lobbyState.outfit,
      hairColorIndex: lobbyState.hairColorIndex,
      hairColor: HAIR_COLORS[lobbyState.hairColorIndex],
    };
    const i = state.players.findIndex((p) => p.id === state.you.id);
    if (i >= 0) state.players[i] = { ...state.players[i], ...state.you };
  }
  socket.emit("appear", {
    color: lobbyState.color,
    hair: lobbyState.hair,
    outfit: lobbyState.outfit,
    hairColorIndex: lobbyState.hairColorIndex,
  });
}

const state = {
  you: null,
  players: [],
  hostId: null,
  roomId: "PLAZ",
  game: null,
  maxPlayers: 30,
  screenShare: null,
};

const screen = createScreenShare({
  socket,
  getYouId: () => state.you?.id,
  getYouName: () => state.you?.name,
  toast,
  onStateChange: () => {
    state.screenShare = screen.getScreenShare();
    updateScreenShareUi();
  },
});

function updateScreenShareUi() {
  const btn = $("screenShareBtn");
  const icon = $("screenShareIcon");
  const stop = $("screenStopBtn");
  const dock = $("screenShareDock");
  if (!btn || !icon || !stop || !dock) return;
  const sharing = Boolean(state.screenShare);
  const mine = screen.iAmSharer();
  dock.hidden = $("game")?.hidden === true;
  stop.hidden = !mine;
  btn.classList.toggle("live", sharing);
  if (!sharing) {
    icon.textContent = "🖥️";
    btn.title = "화면 공유 시작";
  } else if (mine) {
    icon.textContent = "📡";
    btn.title = "내 공유 화면 보기";
  } else {
    icon.textContent = "📺";
    btn.title = `${state.screenShare.name}님 화면 보기`;
  }
  renderPlayers(state);
}

function openScreenViewer() {
  const viewer = $("screenViewer");
  const title = $("screenViewerTitle");
  const video = $("screenVideo");
  if (!viewer || !state.screenShare) {
    toast("공유 중인 화면이 없어요.");
    return;
  }
  title.textContent = `${state.screenShare.name}님의 화면`;
  viewer.hidden = false;
  screen.ensureViewerConnection(video);
}

function closeScreenViewer() {
  const viewer = $("screenViewer");
  const card = $("screenViewerCard");
  if (document.fullscreenElement && card && document.fullscreenElement === card) {
    document.exitFullscreen?.().catch(() => {});
  }
  if (viewer) viewer.hidden = true;
}

function isScreenFullscreen() {
  const card = $("screenViewerCard");
  return Boolean(card && document.fullscreenElement === card);
}

async function toggleScreenFullscreen() {
  const card = $("screenViewerCard");
  const btn = $("screenFullscreenBtn");
  const video = $("screenVideo");
  if (!card) return;
  try {
    if (isScreenFullscreen()) {
      await document.exitFullscreen();
    } else {
      if (card.requestFullscreen) await card.requestFullscreen();
      else if (video?.requestFullscreen) await video.requestFullscreen();
      else if (video?.webkitEnterFullscreen) video.webkitEnterFullscreen();
    }
  } catch {
    toast("전체화면으로 전환하지 못했어요.");
  }
  if (btn) btn.textContent = isScreenFullscreen() ? "전체화면 종료" : "전체화면";
}

let lastSent = { vx: 0, vy: 0, running: false, dir: 2 };
let joining = false;
let pendingJoin = null;

function rememberRoom(roomId) {
  const code = String(roomId || "PLAZ").toUpperCase();
  localStorage.setItem("playza-room", code);
  setRoomUrl(code);
}

function emitJoin({ roomId, name, color, hair, outfit, hairColorIndex }) {
  const cleaned = String(name || "").trim();
  if (!cleaned) {
    showLobbyError("닉네임을 입력하세요.");
    joining = false;
    return;
  }
  joining = true;
  pendingJoin = { roomId, name: cleaned, color, hair, outfit, hairColorIndex };
  socket.emit("join", {
    roomId: roomId || "PLAZ",
    name: cleaned,
    color,
    hair,
    outfit,
    hairColorIndex,
  });
}

function joinRoom(roomId) {
  const name = ($("nameInput")?.value || "").trim();
  if (!name) {
    showLobbyError("닉네임을 입력하세요.");
    $("nameInput")?.focus();
    return;
  }
  localStorage.setItem("playza-name", name);
  saveAppearance();
  showLobbyError("");
  const payload = {
    roomId: roomId || localStorage.getItem("playza-room") || "PLAZ",
    name,
    color: lobbyState.color,
    hair: lobbyState.hair,
    outfit: lobbyState.outfit,
    hairColorIndex: lobbyState.hairColorIndex,
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
  getAppearance: () => ({
    color: state.you?.color || lobbyState.color,
    hair: state.you?.hair ?? lobbyState.hair,
    outfit: state.you?.outfit ?? lobbyState.outfit,
    hairColorIndex: state.you?.hairColorIndex ?? lobbyState.hairColorIndex,
  }),
  getRoomId: () => state.roomId,
  recolor(color) {
    syncAppear({ color });
  },
  setHair(hair) {
    syncAppear({ hair: clampHair(hair) });
  },
  setOutfit(outfit) {
    syncAppear({ outfit: clampOutfit(outfit) });
  },
  setHairColor(hairColorIndex) {
    syncAppear({ hairColorIndex: clampHairColor(hairColorIndex) });
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

$("screenShareBtn").onclick = async () => {
  if (!state.you) return;
  if (!state.screenShare) {
    await screen.startShare();
    return;
  }
  openScreenViewer();
};
$("screenStopBtn").onclick = () => screen.stopShare();
$("screenViewerClose").onclick = () => closeScreenViewer();
$("screenFullscreenBtn").onclick = () => toggleScreenFullscreen();
document.addEventListener("fullscreenchange", () => {
  const btn = $("screenFullscreenBtn");
  if (btn) btn.textContent = isScreenFullscreen() ? "전체화면 종료" : "전체화면";
});
$("screenViewer")?.addEventListener("click", (e) => {
  if (e.target === $("screenViewer")) closeScreenViewer();
});

function applyJoined(payload) {
  joining = false;
  pendingJoin = null;
  state.you = payload.you;
  state.players = payload.players;
  state.hostId = payload.hostId;
  state.roomId = payload.id;
  state.game = payload.game;
  state.maxPlayers = payload.maxPlayers;
  state.screenShare = payload.screenShare || null;
  screen.setScreenShare(state.screenShare);
  lobbyState.color = payload.you.color || lobbyState.color;
  lobbyState.hair = clampHair(payload.you.hair ?? lobbyState.hair);
  lobbyState.outfit = clampOutfit(payload.you.outfit ?? lobbyState.outfit);
  lobbyState.hairColorIndex = clampHairColor(payload.you.hairColorIndex ?? lobbyState.hairColorIndex);
  localStorage.setItem("playza-name", payload.you.name);
  saveAppearance();
  rememberRoom(payload.id);
  sessionStorage.setItem("playza-in-game", "1");
  enterGame();
  renderer.resize();
  loadChat(payload.chat);
  renderPlayers(state);
  renderBanner(state.game);
  updateGameOverlays(state, paint);
  updateScreenShareUi();
}

function tryAutoJoin() {
  // 같은 탭에서 이미 입장했던 경우(새로고침/재연결)만 자동 재입장
  if (sessionStorage.getItem("playza-in-game") !== "1") return;

  if (state.you?.name && state.roomId) {
    emitJoin({
      roomId: state.roomId,
      name: state.you.name,
      color: state.you.color || lobbyState.color,
      hair: state.you.hair ?? lobbyState.hair,
      outfit: state.you.outfit ?? lobbyState.outfit,
      hairColorIndex: state.you.hairColorIndex ?? lobbyState.hairColorIndex,
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
  screen.cleanup();
  sessionStorage.removeItem("playza-in-game");
  localStorage.removeItem("playza-room");
  location.href = "/";
});
socket.on("errorMsg", (msg) => {
  toast(msg);
  if (typeof msg === "string" && msg.includes("이미 화면") && screen.isSharing() && !screen.iAmSharer()) {
    screen.discardLocalOnly();
  }
});
socket.on("state", (payload) => {
  const me = payload.players.find((p) => p.id === state.you?.id);
  state.you = me || state.you;
  state.players = payload.players;
  state.hostId = payload.hostId;
  state.roomId = payload.id;
  state.screenShare = payload.screenShare || null;
  screen.setScreenShare(state.screenShare);
  const prevGame = state.game;
  state.game = payload.game;
  if (prevGame && !payload.game) input.blurChat();
  renderPlayers(state);
  renderBanner(state.game);
  updateGameOverlays(state, paint);
  updateScreenShareUi();
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
