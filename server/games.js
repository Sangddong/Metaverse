import { PLAYER_RADIUS, POKE_RANGE, PALETTE, TILE, COLS, ROWS } from "../shared/constants.js";
import { createMap, resolveWalkable } from "../shared/map.js";
import { pickWord, toChosung, normalizeAnswer } from "./words.js";

const MAP_TILES = createMap().tiles;

function living(room) {
  return [...room.players.values()].filter((p) => p.alive !== false);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function publicGame(game) {
  if (!game) return null;
  const base = {
    type: game.type,
    startedAt: game.startedAt,
    endsAt: game.endsAt || null,
    status: game.status,
    message: game.message || "",
    scores: game.scores || {},
    eliminated: game.eliminated || [],
  };
  if (game.type === "zombie") {
    return { ...base, zombies: game.zombies, humans: game.humans };
  }
  if (game.type === "chosung" || game.type === "namechosung") {
    return {
      ...base,
      round: game.round,
      totalRounds: game.totalRounds,
      clue: game.clue,
      hint: game.hint,
      roundEndsAt: game.roundEndsAt,
      answered: game.answered,
      lastAnswer: game.lastAnswer,
    };
  }
  if (game.type === "pick") {
    return {
      ...base,
      pickedId: game.pickedId,
      pickedName: game.pickedName,
      flash: game.flash || null,
    };
  }
  if (game.type === "poop") {
    return {
      ...base,
      poops: game.poops,
      arena: game.arena || null,
      level: game.level,
      totalLevels: game.totalLevels,
      phase: game.phase,
      levelEndsAt: game.levelEndsAt || null,
      intermissionEndsAt: game.intermissionEndsAt || null,
      flash: game.flash || null,
    };
  }
  if (game.type === "color") {
    return {
      ...base,
      cols: game.cols,
      rows: game.rows,
      grid: game.grid,
      palette: PALETTE,
    };
  }
  if (game.type === "bomb") {
    return {
      ...base,
      holderId: game.holderId,
      explodeAt: game.explodeAt,
      canPassAt: game.canPassAt,
    };
  }
  return base;
}

export function startGame(room, type) {
  const players = [...room.players.values()];
  if (players.length < 1) return { ok: false, error: "플레이어가 없습니다." };

  const now = Date.now();
  for (const p of players) {
    p.alive = true;
    p.role = "player";
    p.pooped = false;
    // 모든 게임: 제자리 시작 (물/장애물에 끼인 경우만 근처로 보정)
    const pos = resolveWalkable(p.x, p.y, PLAYER_RADIUS, MAP_TILES);
    p.x = pos.x;
    p.y = pos.y;
    p.vx = 0;
    p.vy = 0;
    p.sitting = false;
    p.dancing = false;
    p.running = false;
  }

  if (type === "zombie") return startZombie(room, players, now);
  if (type === "chosung") return startChosung(room, players, now);
  if (type === "namechosung") return startNameChosung(room, players, now);
  if (type === "pick") return startPick(room, players, now);
  if (type === "poop") return startPoop(room, players, now);
  if (type === "color") return startColor(room, players, now);
  if (type === "bomb") return startBomb(room, players, now);
  return { ok: false, error: "알 수 없는 게임입니다." };
}

function startZombie(room, players, now) {
  if (players.length < 2) return { ok: false, error: "좀비 게임은 2명 이상 필요해요." };
  const zombieCount = Math.min(players.length - 1, Math.max(1, Math.floor(players.length / 5)));
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const zombies = shuffled.slice(0, zombieCount).map((p) => p.id);
  for (const p of players) p.role = zombies.includes(p.id) ? "zombie" : "human";
  room.game = {
    type: "zombie",
    status: "running",
    startedAt: now,
    endsAt: now + 60_000,
    zombies,
    humans: players.filter((p) => !zombies.includes(p.id)).map((p) => p.id),
    scores: {},
    message: `좀비 ${zombieCount}명 등장! 1분 뒤 인원이 더 많은 쪽이 승리합니다.`,
  };
  return { ok: true, announce: "🧟 좀비 게임이 시작되었습니다! (1분 · 다수결 승리)" };
}

function startChosung(room, players, now) {
  const picked = pickWord();
  room.game = {
    type: "chosung",
    status: "running",
    startedAt: now,
    round: 1,
    totalRounds: 8,
    used: [picked.word],
    clue: toChosung(picked.word),
    hint: picked.hint,
    answer: picked.word,
    roundEndsAt: now + 25_000,
    answered: {},
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    lastAnswer: null,
    message: "초성을 보고 정답을 입력하세요!",
  };
  return { ok: true, announce: "🔤 초성 게임 시작! 채팅으로 답을 입력하세요." };
}

function pickMemberName(players, usedNames = []) {
  const pool = players.filter((p) => !usedNames.includes(p.name));
  const list = pool.length ? pool : players;
  return randomOf(list);
}

function startNameChosung(room, players, now) {
  if (players.length < 2) return { ok: false, error: "멤버 초성 퀴즈는 2명 이상 필요해요." };
  const target = pickMemberName(players);
  const totalRounds = Math.min(8, Math.max(3, players.length));
  room.game = {
    type: "namechosung",
    status: "running",
    startedAt: now,
    round: 1,
    totalRounds,
    used: [target.name],
    clue: toChosung(target.name),
    hint: "지금 방에 있는 멤버 이름",
    answer: target.name,
    answerId: target.id,
    roundEndsAt: now + 25_000,
    answered: {},
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    lastAnswer: null,
    message: "멤버 이름 초성을 보고 채팅으로 맞혀보세요!",
  };
  return { ok: true, announce: "👤 멤버 초성 퀴즈 시작! 채팅으로 이름을 맞혀보세요." };
}

function startPick(room, players, now) {
  if (players.length < 1) return { ok: false, error: "멤버가 없어요." };
  const picked = randomOf(players);
  const msg = `🎲 ${picked.name}님이 뽑혔습니다!`;
  room.game = {
    type: "pick",
    status: "running",
    startedAt: now,
    endsAt: now + 6_000,
    pickedId: picked.id,
    pickedName: picked.name,
    message: msg,
    flash: { text: msg, until: now + 5500 },
    scores: {},
  };
  return { ok: true, announce: msg };
}

const POOP_TOTAL_LEVELS = 5;
const POOP_LEVELS = [
  { duration: 12000, spawnEvery: 720, speedMin: 150, speedMax: 210, radius: [11, 15] },
  { duration: 12000, spawnEvery: 560, speedMin: 180, speedMax: 250, radius: [11, 16] },
  { duration: 13000, spawnEvery: 420, speedMin: 210, speedMax: 290, radius: [12, 17] },
  { duration: 14000, spawnEvery: 310, speedMin: 250, speedMax: 340, radius: [12, 18] },
  { duration: 15000, spawnEvery: 210, speedMin: 290, speedMax: 400, radius: [13, 19] },
];
const POOP_INTERMISSION_MS = 3200;

function survivorNames(room) {
  return living(room).map((p) => p.name);
}

function formatNames(names) {
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  return names.join(", ");
}

function beginPoopLevel(room, game, level, now) {
  const cfg = POOP_LEVELS[level - 1] || POOP_LEVELS[POOP_LEVELS.length - 1];
  game.level = level;
  game.phase = "running";
  game.poops = [];
  game.spawnAcc = 0;
  game.spawnEvery = cfg.spawnEvery;
  game.levelEndsAt = now + cfg.duration;
  game.intermissionEndsAt = null;
  game.graceUntil = now + 1200;
  game.endsAt = game.levelEndsAt;
  game.message = `레벨 ${level} · 똥을 피하세요!`;
  game.flash = null;
}

function startPoop(room, players, now) {
  if (players.length < 1) return { ok: false, error: "플레이어가 필요합니다." };
  for (const p of players) {
    p.alive = true;
    p.pooped = false;
  }
  room.game = {
    type: "poop",
    status: "running",
    startedAt: now,
    totalLevels: POOP_TOTAL_LEVELS,
    level: 1,
    phase: "running",
    poops: [],
    spawnAcc: 0,
    scores: {},
    eliminated: [],
    arena: null,
    message: "레벨 1 · 똥을 피하세요!",
    flash: null,
  };
  beginPoopLevel(room, room.game, 1, now);
  return { ok: true, announce: "💩 똥피하기 시작! 레벨 1부터 시작합니다." };
}

function startColor(room, players, now) {
  players.forEach((p, i) => {
    p.brush = 2 + (i % Math.max(1, PALETTE.length - 2));
  });
  room.game = {
    type: "color",
    status: "running",
    startedAt: now,
    endsAt: now + 90_000,
    cols: COLS,
    rows: ROWS,
    grid: Array(COLS * ROWS).fill(-1),
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    message: "맵을 돌아다니며 바닥을 색칠하세요!",
  };
  return { ok: true, announce: "🎨 색칠하기 시작! 걸어다니며 맵을 칠하세요." };
}

function startBomb(room, players, now) {
  if (players.length < 2) return { ok: false, error: "폭탄 옮기기는 2명 이상 필요해요." };
  const holder = randomOf(players);
  room.game = {
    type: "bomb",
    status: "running",
    startedAt: now,
    holderId: holder.id,
    explodeAt: now + 8000 + Math.floor(Math.random() * 10000),
    canPassAt: now + 700,
    eliminated: [],
    scores: {},
    message: `${holder.name}님에게 폭탄이 씌워졌습니다! 다른 사람에게 닿으면 넘어갑니다.`,
  };
  return { ok: true, announce: "💣 폭탄 옮기기 시작! 터지기 전에 다른 사람에게 넘기세요." };
}

export function stopGame(room, reason = "게임이 종료되었습니다.") {
  if (!room.game) return;
  room.game.status = "ended";
  room.game.message = reason;
  for (const p of room.players.values()) {
    p.alive = true;
    p.role = "player";
    p.pooped = false;
    p.brush = undefined;
  }
  const ended = room.game;
  room.game = null;
  return ended;
}

function nextChosungRound(room) {
  const game = room.game;
  if (!game || game.round >= game.totalRounds) {
    const ranking = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    const winner = ranking[0];
    const name = winner ? room.players.get(winner[0])?.name : null;
    const label = game.type === "namechosung" ? "멤버 초성 퀴즈" : "초성 게임";
    const msg = name ? `${name} 님이 ${label}에서 승리했습니다! (${winner[1]}점)` : `${label}가 끝났습니다.`;
    stopGame(room, msg);
    return { ended: true, message: msg };
  }
  if (game.type === "namechosung") {
    const players = [...room.players.values()];
    const target = pickMemberName(players, game.used);
    game.round += 1;
    game.used.push(target.name);
    game.clue = toChosung(target.name);
    game.hint = "지금 방에 있는 멤버 이름";
    game.answer = target.name;
    game.answerId = target.id;
    game.roundEndsAt = Date.now() + 25_000;
    game.answered = {};
    game.lastAnswer = null;
    game.message = `${game.round}라운드!`;
    return { ended: false };
  }
  const picked = pickWord(game.used);
  game.round += 1;
  game.used.push(picked.word);
  game.clue = toChosung(picked.word);
  game.hint = picked.hint;
  game.answer = picked.word;
  game.roundEndsAt = Date.now() + 25_000;
  game.answered = {};
  game.lastAnswer = null;
  game.message = `${game.round}라운드!`;
  return { ended: false };
}

export function handleChatAnswer(room, player, text) {
  const game = room.game;
  if (!game || !["chosung", "namechosung"].includes(game.type) || game.status !== "running") return null;
  if (game.answered[player.id]) return null;
  if (normalizeAnswer(text) !== normalizeAnswer(game.answer)) return null;
  const first = Object.keys(game.answered).length === 0;
  const pts = first ? 2 : 1;
  game.answered[player.id] = true;
  game.scores[player.id] = (game.scores[player.id] || 0) + pts;
  game.lastAnswer = { id: player.id, name: player.name, first };
  if (first) {
    const result = nextChosungRound(room);
    return { correct: true, first: true, points: pts, ...result };
  }
  return { correct: true, first: false, points: pts };
}

export function handleGameAction(room, player, action) {
  const game = room.game;
  if (!game || game.status !== "running") return { ok: false };
  if ((game.type === "chosung" || game.type === "namechosung") && action?.kind === "guess") {
    const res = handleChatAnswer(room, player, action.text || "");
    return { ok: Boolean(res), result: res };
  }
  if (game.type === "color" && action?.kind === "brush") {
    const c = Math.max(0, Math.min(PALETTE.length - 1, Number(action.color) || 0));
    player.brush = c;
    return { ok: true, brush: c };
  }
  if (game.type === "color" && action?.kind === "clear") {
    game.grid = Array(game.grid.length).fill(-1);
    return { ok: true, cleared: true };
  }
  return { ok: false };
}

function paintUnderPlayer(game, player) {
  const brush = Number.isInteger(player.brush) ? player.brush : 2;
  const cx = Math.floor(player.x / TILE);
  const cy = Math.floor(player.y / TILE);
  let painted = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > 1) continue;
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx < 0 || ty < 0 || tx >= game.cols || ty >= game.rows) continue;
      const i = ty * game.cols + tx;
      if (game.grid[i] !== brush) {
        game.grid[i] = brush;
        painted += 1;
      }
    }
  }
  if (painted) game.scores[player.id] = (game.scores[player.id] || 0) + painted;
  return painted;
}

function transferBomb(game, from, to, now) {
  game.holderId = to.id;
  game.canPassAt = now + 650;
  game.message = `${from.name} → ${to.name}`;
}

export function tickGame(room, dt) {
  const game = room.game;
  if (!game || game.status !== "running") return null;
  const now = Date.now();
  if (game.type === "zombie") return tickZombie(room, game, now);
  if (game.type === "chosung" || game.type === "namechosung") return tickChosung(room, game, now);
  if (game.type === "pick") return tickPick(room, game, now);
  if (game.type === "poop") return tickPoop(room, game, dt, now);
  if (game.type === "color") return tickColor(room, game, now);
  if (game.type === "bomb") return tickBomb(room, game, now);
  return null;
}

function tickPick(room, game, now) {
  if (now >= game.endsAt) {
    const msg = `추첨 종료! 당첨: ${game.pickedName}`;
    stopGame(room, msg);
    return { event: "end", message: msg };
  }
  return { event: "update" };
}

function tickZombie(room, game, now) {
  const players = [...room.players.values()];
  for (const z of players.filter((p) => p.role === "zombie" && p.alive !== false)) {
    for (const h of players.filter((p) => p.role === "human" && p.alive !== false)) {
      if (dist(z, h) < PLAYER_RADIUS * 2 + 6) {
        h.role = "zombie";
        game.zombies = players.filter((p) => p.role === "zombie").map((p) => p.id);
        game.humans = players.filter((p) => p.role === "human").map((p) => p.id);
        game.message = `${h.name} 님이 좀비가 되었습니다!`;
      }
    }
  }
  const zombies = players.filter((p) => p.role === "zombie");
  const humans = players.filter((p) => p.role === "human");
  if (humans.length === 0) {
    const msg = `좀비 승리! 전원 감염 (${zombies.length} vs 0)`;
    stopGame(room, msg);
    return { event: "end", message: msg };
  }
  if (now >= game.endsAt) {
    const zc = zombies.length;
    const hc = humans.length;
    let msg;
    if (zc > hc) msg = `좀비 승리! (${zc} vs ${hc})`;
    else if (hc > zc) msg = `인간 승리! (${hc} vs ${zc})`;
    else msg = `무승부! (${hc} vs ${zc})`;
    stopGame(room, msg);
    return { event: "end", message: msg };
  }
  return { event: "update" };
}

function tickChosung(room, game, now) {
  if (now >= game.roundEndsAt) {
    game.lastAnswer = { timeout: true, answer: game.answer };
    const result = nextChosungRound(room);
    if (result.ended) return { event: "end", message: result.message };
    return { event: "round", message: `시간 초과! 정답은 ${game.used[game.used.length - 2] || ""}` };
  }
  return null;
}

function endPoopGame(room, message) {
  stopGame(room, message);
  return { event: "end", message };
}

function tickPoop(room, game, dt, now) {
  if (game.phase === "intermission") {
    if (now >= game.intermissionEndsAt) {
      beginPoopLevel(room, game, game.level, now);
      game.message = `레벨 ${game.level} · 똥을 피하세요!`;
      return { event: "announce", message: `레벨 ${game.level} 시작!` };
    }
    return { event: "update" };
  }

  const cfg = POOP_LEVELS[game.level - 1] || POOP_LEVELS[0];
  const targets = living(room);
  game.arena = null;

  if (now >= (game.graceUntil || 0) && targets.length) {
    game.spawnAcc += dt;
    while (game.spawnAcc >= cfg.spawnEvery) {
      game.spawnAcc -= cfg.spawnEvery;
      const [rMin, rMax] = cfg.radius;
      const focus = randomOf(targets);
      game.poops.push({
        id: `${now}-${Math.random().toString(36).slice(2, 6)}`,
        x: focus.x + (Math.random() - 0.5) * 220,
        y: focus.y - 140 - Math.random() * 100,
        vy: cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin),
        r: rMin + Math.random() * (rMax - rMin),
      });
    }
  }

  for (const poop of game.poops) poop.y += poop.vy * (dt / 1000);
  game.poops = game.poops.filter((p) => {
    const lowest = targets.length ? Math.max(...targets.map((t) => t.y)) + 200 : p.y + 1;
    return p.y < lowest;
  });

  let hitMsg = null;
  if (now >= (game.graceUntil || 0)) {
    const alive = living(room);
    for (const poop of game.poops) {
      for (const p of alive) {
        if (p.alive === false) continue;
        if (Math.hypot(p.x - poop.x, p.y - poop.y) < PLAYER_RADIUS + (poop.r || 14)) {
          p.alive = false;
          p.pooped = true;
          game.eliminated.push(p.id);
          hitMsg = `${p.name}님이 똥을 맞아 탈락했습니다!`;
          game.message = hitMsg;
          game.flash = { text: hitMsg, until: now + 2500 };
          poop.y = 99999;
        }
      }
    }
  }

  const remain = living(room);
  if (remain.length === 0) {
    return endPoopGame(room, "게임 종료! 모두 탈락했습니다.");
  }
  if (remain.length === 1 && game.eliminated.length > 0) {
    return endPoopGame(room, `게임 종료! 우승자: ${remain[0].name}`);
  }

  if (now >= game.levelEndsAt) {
    if (game.level >= game.totalLevels) {
      const names = formatNames(survivorNames(room));
      return endPoopGame(room, `게임 종료! ${names}님이 살아남았습니다`);
    }
    const nextLevel = game.level + 1;
    const names = formatNames(survivorNames(room));
    const flash = `레벨${nextLevel}가 시작합니다. 생존자: ${names}`;
    game.level = nextLevel;
    game.phase = "intermission";
    game.poops = [];
    game.spawnAcc = 0;
    game.intermissionEndsAt = now + POOP_INTERMISSION_MS;
    game.levelEndsAt = game.intermissionEndsAt;
    game.endsAt = game.intermissionEndsAt;
    game.message = flash;
    game.flash = { text: flash, until: now + POOP_INTERMISSION_MS };
    return { event: "announce", message: flash };
  }

  if (hitMsg) return { event: "elim", message: hitMsg };
  return { event: "update" };
}

function tickColor(room, game, now) {
  for (const p of room.players.values()) {
    paintUnderPlayer(game, p);
  }
  if (now >= game.endsAt) {
    stopGame(room, "색칠하기 시간이 끝났습니다. 멋진 그림이에요!");
    return { event: "end", message: "색칠하기가 끝났습니다." };
  }
  return { event: "update" };
}

function tickBomb(room, game, now) {
  const touchRange = PLAYER_RADIUS * 2 + 8;
  let holder = room.players.get(game.holderId);

  if (!holder || holder.alive === false) {
    const candidates = living(room).filter((p) => !game.eliminated.includes(p.id));
    if (candidates.length === 0) {
      const msg = "게임 종료! 폭탄 게임이 끝났습니다.";
      stopGame(room, msg);
      return { event: "end", message: msg };
    }
    holder = randomOf(candidates);
    game.holderId = holder.id;
    game.canPassAt = now + 500;
    game.message = `${holder.name}님에게 폭탄이 씌워졌습니다!`;
  }

  if (now >= (game.canPassAt || 0) && holder) {
    for (const other of living(room)) {
      if (other.id === holder.id) continue;
      if (dist(holder, other) <= touchRange) {
        transferBomb(game, holder, other, now);
        holder = other;
        break;
      }
    }
  }

  if (now >= game.explodeAt) {
    const boom = room.players.get(game.holderId);
    const name = boom?.name || "누군가";
    if (boom) {
      boom.alive = false;
      game.eliminated.push(boom.id);
    }
    const msg = `게임 종료! 💣 ${name}님의 폭탄이 터졌습니다!`;
    stopGame(room, msg);
    return { event: "end", message: msg, boom: boom?.id };
  }
  return { event: "update" };
}

export function tryPoke(room, player, targetId) {
  const now = Date.now();
  const target = room.players.get(targetId);
  if (!target || target.id === player.id) return { ok: false, error: "대상을 찾을 수 없어요." };
  if (dist(player, target) > POKE_RANGE) return { ok: false, error: "너무 멀어요." };
  target.shakeUntil = now + 1500;
  return { ok: true, targetId: target.id };
}
