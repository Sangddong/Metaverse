import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import {
  MAX_PLAYERS,
  NAME_MAX,
  CHAT_MAX,
  TICK_MS,
  WALK_SPEED,
  RUN_SPEED,
  PLAYER_RADIUS,
  COLORS,
  GAME_TYPES,
} from "../shared/constants.js";
import { createMap, spawnPoint, clampMove } from "../shared/map.js";
import {
  startGame,
  stopGame,
  tickGame,
  handleGameAction,
  handleChatAnswer,
  publicGame,
  tryPoke,
} from "./games.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

app.use("/shared", express.static(path.join(ROOT, "shared")));
app.use(express.static(path.join(ROOT, "public")));
app.get("/r/:code", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

const mapData = createMap();
const rooms = new Map();

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? makeCode() : code;
}

function sanitizeName(name, fallback) {
  const cleaned = String(name || "")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .trim()
    .slice(0, NAME_MAX);
  return cleaned || fallback;
}

function sanitizeChat(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, CHAT_MAX);
}

function createRoom(code, hostName) {
  const room = {
    id: code,
    createdAt: Date.now(),
    hostId: null,
    players: new Map(),
    chat: [],
    game: null,
    mutes: new Set(),
    locked: false,
  };
  rooms.set(code, room);
  return room;
}

function getOrCreate(code) {
  return rooms.get(code) || createRoom(code);
}

function snapshotPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    x: p.x,
    y: p.y,
    dir: p.dir,
    running: p.running,
    sitting: p.sitting,
    dancing: Boolean(p.dancing),
    alive: p.alive !== false,
    pooped: Boolean(p.pooped),
    shakeUntil: p.shakeUntil || 0,
    role: p.role || "player",
    emote: p.emote || null,
  };
}

function roomState(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    locked: room.locked,
    players: [...room.players.values()].map(snapshotPlayer),
    chat: room.chat.slice(-40),
    game: publicGame(room.game),
    maxPlayers: MAX_PLAYERS,
    mutes: [...room.mutes],
  };
}

function emitState(room) {
  io.to(room.id).emit("state", roomState(room));
}

function system(room, text) {
  const msg = { id: `sys-${Date.now()}`, system: true, name: "시스템", text, ts: Date.now() };
  room.chat.push(msg);
  if (room.chat.length > 80) room.chat.shift();
  io.to(room.id).emit("chat", msg);
}

function ensureHost(room) {
  if (room.hostId && room.players.has(room.hostId)) return;
  const first = room.players.values().next().value;
  room.hostId = first ? first.id : null;
  if (first) system(room, `${first.name} 님이 방장이 되었습니다.`);
}

function requireHost(socket, room) {
  if (socket.id !== room.hostId) {
    socket.emit("errorMsg", "방장만 할 수 있는 행동입니다.");
    return false;
  }
  return true;
}

io.on("connection", (socket) => {
  let joined = null;

  socket.on("join", ({ roomId, name, color } = {}) => {
    const code = String(roomId || "PLAZ")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "PLAZ";
    const cleanedName = sanitizeName(name, "");
    if (!cleanedName) {
      socket.emit("joinDenied", "닉네임을 입력하세요.");
      return;
    }
    const room = getOrCreate(code);
    if (room.players.size >= MAX_PLAYERS) {
      socket.emit("joinDenied", "방이 가득 찼습니다. (최대 30명)");
      return;
    }
    if (room.locked && room.players.size > 0) {
      socket.emit("joinDenied", "방이 잠겨 있습니다.");
      return;
    }

    // 같은 소켓이 이미 방에 있으면 재입장 처리
    if (joined) {
      const prevRoom = rooms.get(joined);
      const prev = prevRoom?.players.get(socket.id);
      if (prev && joined === code) {
        prev.name = cleanedName;
        if (COLORS.includes(color)) prev.color = color;
        socket.emit("joined", { you: snapshotPlayer(prev), ...roomState(prevRoom) });
        emitState(prevRoom);
        return;
      }
      if (prevRoom) {
        prevRoom.players.delete(socket.id);
        if (prevRoom.hostId === socket.id) ensureHost(prevRoom);
        if (prevRoom.players.size === 0) rooms.delete(prevRoom.id);
        else emitState(prevRoom);
      }
      socket.leave(joined);
      joined = null;
    }

    const spawn = spawnPoint();
    const player = {
      id: socket.id,
      name: cleanedName,
      color: COLORS.includes(color) ? color : COLORS[room.players.size % COLORS.length],
      x: spawn.x + (Math.random() * 80 - 40),
      y: spawn.y + (Math.random() * 60 - 30),
      vx: 0,
      vy: 0,
      dir: 2,
      running: false,
      sitting: false,
      dancing: false,
      alive: true,
      role: "player",
      emote: null,
      lastPokeAt: 0,
      lastInputAt: Date.now(),
    };

    room.players.set(socket.id, player);
    if (!room.hostId) room.hostId = socket.id;
    joined = room.id;
    socket.join(room.id);
    socket.emit("joined", { you: snapshotPlayer(player), ...roomState(room) });
    socket.to(room.id).emit("playerJoined", snapshotPlayer(player));
    system(room, `${player.name} 님이 입장했습니다. (${room.players.size}/${MAX_PLAYERS})`);
    emitState(room);
  });

  socket.on("input", (data = {}) => {
    const room = rooms.get(joined);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    const vx = Math.max(-1, Math.min(1, Number(data.vx) || 0));
    const vy = Math.max(-1, Math.min(1, Number(data.vy) || 0));
    if (p.sitting && (vx || vy)) p.sitting = false;
    if (p.dancing && (vx || vy)) p.dancing = false;
    if (p.alive === false && room.game) {
      p.vx = vx;
      p.vy = vy;
      p.running = false;
      p.sitting = false;
      return;
    }
    if (p.dancing) {
      p.vx = 0;
      p.vy = 0;
      p.running = false;
      p.sitting = false;
      p.lastInputAt = Date.now();
      return;
    }
    p.vx = vx;
    p.vy = vy;
    p.running = Boolean(data.running) && !p.sitting;
    if (data.dir != null) p.dir = Number(data.dir);
    p.lastInputAt = Date.now();
  });

  socket.on("sit", () => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p) return;
    if (room.game && ["poop", "zombie", "bomb"].includes(room.game.type) && p.alive !== false) return;
    p.sitting = !p.sitting;
    p.running = false;
    p.dancing = false;
    p.vx = 0;
    p.vy = 0;
    io.to(room.id).emit("playerPatch", snapshotPlayer(p));
    emitState(room);
  });

  socket.on("dance", () => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p) return;
    if (p.alive === false) return;
    p.dancing = !p.dancing;
    if (p.dancing) {
      p.sitting = false;
      p.running = false;
      p.vx = 0;
      p.vy = 0;
    }
    io.to(room.id).emit("playerPatch", snapshotPlayer(p));
    emitState(room);
  });

  socket.on("poke", (targetId) => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p) return;
    const res = tryPoke(room, p, targetId);
    if (!res.ok) {
      socket.emit("errorMsg", res.error || "찌를 수 없어요.");
      return;
    }
    const target = room.players.get(res.targetId);
    io.to(room.id).emit("poked", {
      from: p.id,
      to: res.targetId,
      shakeUntil: target?.shakeUntil || Date.now() + 420,
    });
    io.to(room.id).emit("playerPatch", snapshotPlayer(target));
  });

  socket.on("rename", (name) => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p) return;
    const next = sanitizeName(name, p.name);
    if (next === p.name) {
      socket.emit("errorMsg", "닉네임을 확인해주세요.");
      return;
    }
    const prev = p.name;
    p.name = next;
    system(room, `${prev} 님의 이름이 ${next} (으)로 바뀌었습니다.`);
    emitState(room);
  });

  socket.on("recolor", (color) => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p || !COLORS.includes(color)) return;
    p.color = color;
    io.to(room.id).emit("playerPatch", snapshotPlayer(p));
  });

  socket.on("chat", (text) => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p) return;
    if (room.mutes.has(p.id)) {
      socket.emit("errorMsg", "채팅이 금지된 상태입니다.");
      return;
    }
    const cleaned = sanitizeChat(text);
    if (!cleaned) return;
    if (room.game?.type === "chosung" || room.game?.type === "namechosung") {
      const hit = handleChatAnswer(room, p, cleaned);
      if (hit) {
        const announce = hit.first
          ? `${p.name}님이 정답을 맞혔습니다!${hit.ended ? ` ${hit.message}` : " 다음 라운드!"}`
          : `${p.name}님이 정답을 맞혔습니다!`;
        system(room, announce);
        emitState(room);
        return;
      }
    }
    const msg = {
      id: `${Date.now()}-${p.id}`,
      playerId: p.id,
      name: p.name,
      color: p.color,
      text: cleaned,
      ts: Date.now(),
    };
    room.chat.push(msg);
    if (room.chat.length > 80) room.chat.shift();
    io.to(room.id).emit("chat", msg);
  });

  socket.on("gameAction", (action) => {
    const room = rooms.get(joined);
    const p = room?.players.get(socket.id);
    if (!p) return;
    const res = handleGameAction(room, p, action);
    if (res.paint) io.to(room.id).emit("paint", res.paint);
    else if (res.cleared) emitState(room);
    else if (res.ok) emitState(room);
    if (res.error) socket.emit("errorMsg", res.error);
  });

  socket.on("host:startGame", (type) => {
    const room = rooms.get(joined);
    if (!room) return;
    if (!GAME_TYPES[type]) {
      socket.emit("errorMsg", "없는 게임입니다.");
      return;
    }
    if (room.game) stopGame(room, "새 게임을 위해 이전 게임을 종료했습니다.");
    const res = startGame(room, type);
    if (!res.ok) {
      socket.emit("errorMsg", res.error);
      return;
    }
    system(room, res.announce);
    emitState(room);
  });

  socket.on("host:stopGame", () => {
    const room = rooms.get(joined);
    if (!room) return;
    if (!room.game) return;
    stopGame(room, "게임이 종료되었습니다.");
    system(room, "미니게임이 종료되었습니다.");
    emitState(room);
  });

  socket.on("host:kick", (id) => {
    const room = rooms.get(joined);
    if (!room || !requireHost(socket, room)) return;
    if (id === room.hostId) return;
    const target = room.players.get(id);
    if (!target) return;
    const sock = io.sockets.sockets.get(id);
    system(room, `${target.name} 님이 방에서 내보내졌습니다.`);
    room.players.delete(id);
    sock?.emit("kicked", "방장에 의해 강퇴되었습니다.");
    sock?.disconnect(true);
    emitState(room);
  });

  socket.on("host:mute", (id) => {
    const room = rooms.get(joined);
    if (!room || !requireHost(socket, room)) return;
    const target = room.players.get(id);
    if (!target) return;
    if (room.mutes.has(id)) {
      room.mutes.delete(id);
      system(room, `${target.name} 님의 채팅 금지가 해제되었습니다.`);
    } else {
      room.mutes.add(id);
      system(room, `${target.name} 님의 채팅이 금지되었습니다.`);
    }
    emitState(room);
  });

  socket.on("host:transfer", (id) => {
    const room = rooms.get(joined);
    if (!room || !requireHost(socket, room)) return;
    const target = room.players.get(id);
    if (!target) return;
    room.hostId = id;
    system(room, `${target.name} 님이 새 방장이 되었습니다.`);
    emitState(room);
  });

  socket.on("host:lock", () => {
    const room = rooms.get(joined);
    if (!room || !requireHost(socket, room)) return;
    room.locked = !room.locked;
    system(room, room.locked ? "방이 잠겼습니다. 새 입장이 막힙니다." : "방 잠금이 해제되었습니다.");
    emitState(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(joined);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    room.players.delete(socket.id);
    room.mutes.delete(socket.id);
    system(room, `${p.name} 님이 퇴장했습니다.`);
    if (room.hostId === socket.id) {
      room.locked = false;
      ensureHost(room);
    }
    if (room.players.size === 0) {
      rooms.delete(room.id);
      return;
    }
    emitState(room);
  });
});

setInterval(() => {
  const dt = TICK_MS;
  for (const room of rooms.values()) {
    let moving = false;
    for (const p of room.players.values()) {
      if (p.sitting || p.dancing) continue;
      const speed = p.alive === false ? WALK_SPEED * 0.7 : p.running ? RUN_SPEED : WALK_SPEED;
      if (p.role === "zombie") {
        // zombies a bit faster
      }
      const zMul = p.role === "zombie" ? 1.12 : 1;
      const ghostMul = p.alive === false ? 0.85 : 1;
      let nx = p.x + p.vx * speed * zMul * ghostMul * (dt / 1000);
      let ny = p.y + p.vy * speed * zMul * ghostMul * (dt / 1000);
      const next = clampMove(p.x, p.y, nx, ny, PLAYER_RADIUS, mapData.tiles);
      if (next.x !== p.x || next.y !== p.y) moving = true;
      p.x = next.x;
      p.y = next.y;
      if (p.emote && p.emote.until < Date.now()) p.emote = null;
    }
    const g = tickGame(room, dt);
    if (g?.event === "end" || g?.event === "boom" || g?.event === "round" || g?.event === "announce" || g?.event === "elim") {
      const msgs = g.messages || (g.message ? [g.message] : []);
      for (const text of msgs) system(room, text);
      emitState(room);
    } else if (moving || room.game) {
      io.to(room.id).emit("tick", {
        players: [...room.players.values()].map(snapshotPlayer),
        game: publicGame(room.game),
      });
    }
  }
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Playza running on http://localhost:${PORT}`);
});
