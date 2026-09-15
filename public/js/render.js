import { TILE, COLORS } from "/shared/constants.js";
import { T } from "/shared/map.js";
import { drawOutfit, drawHairBack, drawHairFront } from "./avatarDraw.js";

const TREE_GREEN = ["#1f6b3a", "#2d8a4c", "#247844"];
const FLOWER = ["#ff7aa2", "#ffd36e", "#fff7e8", "#9b7dff"];

export function createRenderer(canvas, map) {
  const ctx = canvas.getContext("2d");
  const camera = { x: 0, y: 0 };
  let dpr = 1;
  const bubbles = [];
  const particles = [];
  const pokeFx = [];
  const vis = new Map();

  function visPos(p) {
    let v = vis.get(p.id);
    if (!v) {
      v = { x: p.x, y: p.y };
      vis.set(p.id, v);
    }
    v.x += (p.x - v.x) * 0.38;
    v.y += (p.y - v.y) * 0.38;
    return v;
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(canvas.parentElement || canvas);
  resize();

  function follow(player) {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    camera.x = player.x - w / 2;
    camera.y = player.y - h / 2;
    camera.x = Math.max(0, Math.min(map.cols * TILE - w, camera.x));
    camera.y = Math.max(0, Math.min(map.rows * TILE - h, camera.y));
  }

  function tileAt(tx, ty) {
    return map.tiles[ty]?.[tx] || 0;
  }

  function drawMap() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const x0 = Math.max(0, Math.floor(camera.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(camera.y / TILE) - 1);
    const x1 = Math.min(map.cols, Math.ceil((camera.x + w) / TILE) + 1);
    const y1 = Math.min(map.rows, Math.ceil((camera.y + h) / TILE) + 1);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = tileAt(x, y);
        const px = x * TILE - camera.x;
        const py = y * TILE - camera.y;
        drawTile(t, px, py, x, y);
      }
    }
  }

  function drawTile(t, px, py, x, y) {
    if (t === T.GRASS || t === T.GRASS2) {
      ctx.fillStyle = t === T.GRASS2 ? "#62b14a" : "#6cbc52";
      ctx.fillRect(px, py, TILE, TILE);
      if ((x * 7 + y * 13) % 11 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(px + 10, py + 16, 4, 4);
      }
      return;
    }
    if (t === T.PATH) {
      ctx.fillStyle = "#e2c48a";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#d3b16f";
      ctx.fillRect(px + 6, py + 18, 8, 5);
      return;
    }
    if (t === T.STONE) {
      ctx.fillStyle = "#cfd8d3";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#b7c2bc";
      ctx.fillRect(px + ((x % 2) * 12), py + 10, 10, 7);
      return;
    }
    if (t === T.WATER) {
      ctx.fillStyle = "#4ec3e0";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.ellipse(px + 20, py + 18 + Math.sin(Date.now() / 400 + x) * 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (t === T.FLOWER) {
      ctx.fillStyle = "#6cbc52";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = FLOWER[(x + y) % FLOWER.length];
      ctx.beginPath();
      ctx.arc(px + 20, py + 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff3a1";
      ctx.beginPath();
      ctx.arc(px + 20, py + 18, 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (t === T.BENCH) {
      ctx.fillStyle = "#6cbc52";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#b8894e";
      ctx.fillRect(px + 4, py + 16, 32, 10);
      ctx.fillRect(px + 6, py + 26, 6, 8);
      ctx.fillRect(px + 28, py + 26, 6, 8);
      return;
    }
    if (t === T.WOOD) {
      ctx.fillStyle = "#d9a066";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = "rgba(90,40,10,0.2)";
      ctx.beginPath();
      ctx.moveTo(px, py + 20);
      ctx.lineTo(px + TILE, py + 20);
      ctx.stroke();
      return;
    }
    if (t === T.WALL || t === T.ROOF) {
      ctx.fillStyle = t === T.ROOF ? "#c45c4a" : "#8d6a4a";
      ctx.fillRect(px, py, TILE, TILE);
      return;
    }
    if (t === T.TREE || t === T.BUSH) {
      ctx.fillStyle = "#6cbc52";
      ctx.fillRect(px, py, TILE, TILE);
      if (t === T.TREE) {
        ctx.fillStyle = "#6b4423";
        ctx.fillRect(px + 17, py + 24, 6, 12);
      }
      ctx.fillStyle = TREE_GREEN[(x + y) % TREE_GREEN.length];
      ctx.beginPath();
      ctx.arc(px + 20, py + 16, t === T.BUSH ? 12 : 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.arc(px + 14, py + 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAvatar(p, youId, game, pos) {
    let x = (pos?.x ?? p.x) - camera.x;
    let y = (pos?.y ?? p.y) - camera.y;
    if (p.shakeUntil && p.shakeUntil > Date.now()) {
      const remain = Math.max(0, (p.shakeUntil - Date.now()) / 1500);
      const amp = 5 * remain;
      x += Math.sin(Date.now() / 28) * amp;
      y += Math.cos(Date.now() / 34) * amp * 0.65;
    } else if (p.shakeUntil) {
      p.shakeUntil = 0;
    }
    const sitting = p.sitting;
    const dancing = Boolean(p.dancing);
    const dancePhase = Date.now() / 95 + (p.x || 0) * 0.01;
    let bob = 0;
    if (dancing) bob = Math.abs(Math.sin(dancePhase)) * 5.5;
    else if (!sitting) bob = p.running ? Math.sin(Date.now() / 70 + p.x) * 2.2 : Math.sin(Date.now() / 180 + p.y) * 1.1;
    const sway = dancing ? Math.sin(dancePhase * 2) * 4.5 : 0;
    const ghost = p.alive === false && !p.pooped && game?.type !== "poop";
    ctx.save();
    ctx.globalAlpha = ghost ? 0.45 : 1;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 16, sitting ? 16 : 14, sitting ? 5 : 6, 0, 0, Math.PI * 2);
    ctx.fill();

    x += sway;
    const bodyY = y - (sitting ? 0 : 10) + bob;
    const lean = dancing ? Math.sin(dancePhase) * 0.18 : 0;
    if (lean) {
      ctx.translate(x, bodyY + 12);
      ctx.rotate(lean);
      ctx.translate(-x, -(bodyY + 12));
    }
    drawOutfit(ctx, x, bodyY, sitting, p.outfit ?? 0, p.color || COLORS[0]);

    const headCy = bodyY - (sitting ? 4 : 2);
    const headR = sitting ? 11 : 12;
    const wearingBomb = game?.type === "bomb" && game.holderId === p.id;
    const eyeOff = p.dir === 1 ? -2.5 : p.dir === 3 ? 2.5 : 0;
    const hairColor = p.hairColor || "#1a1a1a";

    drawHairBack(ctx, x, headCy, headR, p.hair ?? 1, hairColor);

    ctx.fillStyle = p.role === "zombie" ? "#5ecf4a" : "#ffe0c8";
    ctx.beginPath();
    ctx.arc(x, headCy, headR, 0, Math.PI * 2);
    ctx.fill();

    if (!wearingBomb) {
      drawHairFront(ctx, x, headCy, headR, p.hair ?? 1, hairColor, eyeOff);
    }

    if (p.pooped || (game?.type === "poop" && p.alive === false)) {
      const hx = x;
      const hy = bodyY - (sitting ? 18 : 20);
      ctx.fillStyle = "#6b3f1f";
      ctx.beginPath();
      ctx.ellipse(hx, hy, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx - 4, hy - 5, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(hx + 3, hy - 8, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3d8c4e";
      ctx.fillRect(hx - 1.5, hy - 16, 3, 7);
    }

    if (wearingBomb) {
      const bombR = headR + 9;
      const faceX = x + eyeOff * 0.35;
      // Shell wraps whole head
      ctx.fillStyle = "#1a1a1f";
      ctx.beginPath();
      ctx.arc(x, headCy - 1, bombR, 0, Math.PI * 2);
      ctx.fill();
      // Gloss
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.ellipse(x - 6, headCy - 8, 7, 5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // Cap / fuse base
      ctx.fillStyle = "#2e2e34";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 6, headCy - bombR - 4, 12, 8, 3);
      else ctx.rect(x - 6, headCy - bombR - 4, 12, 8);
      ctx.fill();
      ctx.strokeStyle = "#c4a35a";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, headCy - bombR - 2);
      ctx.quadraticCurveTo(x + 7, headCy - bombR - 14, x + 2, headCy - bombR - 20);
      ctx.stroke();
      const spark = (Date.now() / 80) % 1;
      ctx.fillStyle = spark > 0.45 ? "#ffd36e" : "#ff6b3a";
      ctx.beginPath();
      ctx.arc(x + 2, headCy - bombR - 20, 2.6, 0, Math.PI * 2);
      ctx.fill();
      // Face window — only face peeks through
      ctx.fillStyle = p.role === "zombie" ? "#5ecf4a" : "#ffe0c8";
      ctx.beginPath();
      ctx.ellipse(faceX, headCy + 1, 9.5, 8.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Eyes inside the opening
      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath();
      ctx.arc(x - 3.5 + eyeOff, bodyY - 2.5, 1.7, 0, Math.PI * 2);
      ctx.arc(x + 3.5 + eyeOff, bodyY - 2.5, 1.7, 0, Math.PI * 2);
      ctx.fill();
      const t = Math.max(0, (game.explodeAt - Date.now()) / 1000);
      ctx.fillStyle = t < 3 ? "#ff6b8a" : "#fff";
      ctx.font = "bold 11px IBM Plex Sans KR";
      ctx.textAlign = "center";
      ctx.fillText(t.toFixed(1), x, headCy - bombR - 26);
    } else {
      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath();
      ctx.arc(x - 4 + eyeOff, bodyY - 3, 1.6, 0, Math.PI * 2);
      ctx.arc(x + 4 + eyeOff, bodyY - 3, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (p.role === "zombie") {
      ctx.fillStyle = "#2d6b28";
      ctx.fillRect(x - 5 + eyeOff * 0.2, bodyY - 4, 3, 2);
    }

    if (game?.type === "pick" && game.pickedId === p.id) {
      ctx.strokeStyle = "#ffd36e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, headCy, headR + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🎲", x, headCy - headR - 10);
    }

    ctx.font = "bold 12px IBM Plex Sans KR, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.fillStyle = p.id === youId ? "#7dffb3" : "white";
    const label = (p.id === game?.hostId ? "★ " : "") + p.name;
    ctx.strokeText(label, x, y + 28);
    ctx.fillText(label, x, y + 28);
    if (p.id === youId) {
      ctx.fillStyle = "#ffd36e";
      ctx.font = "10px sans-serif";
      const markerLift = wearingBomb ? 52 : game?.type === "pick" && game.pickedId === p.id ? 48 : 36;
      ctx.fillText("▼", x, y - markerLift + bob);
    }
    ctx.restore();
  }

  function drawColorPaint(game) {
    if (game?.type !== "color" || !game.grid || !game.palette) return;
    const cols = game.cols || 1;
    for (let i = 0; i < game.grid.length; i++) {
      const c = game.grid[i];
      if (c == null || c < 0) continue;
      const tx = i % cols;
      const ty = Math.floor(i / cols);
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = game.palette[c] || "#fff";
      ctx.fillRect(tx * TILE - camera.x, ty * TILE - camera.y, TILE + 0.5, TILE + 0.5);
    }
    ctx.globalAlpha = 1;
  }

  function drawPoops(game) {
    if (game?.type !== "poop") return;
    for (const poop of game.poops || []) {
      const x = poop.x - camera.x;
      const y = poop.y - camera.y;
      ctx.fillStyle = "#6b3f1f";
      ctx.beginPath();
      ctx.ellipse(x, y, poop.r || 12, (poop.r || 12) * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8b5a2b";
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3d8c4e";
      ctx.fillRect(x - 2, y - (poop.r || 12) - 6, 4, 7);
    }
    if (game.arena) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(game.arena.x - camera.x, game.arena.y - camera.y, game.arena.w, game.arena.h);
      ctx.setLineDash([]);
    }
  }

  function addBubble(playerId, text) {
    bubbles.push({ playerId, text, until: Date.now() + 2800 });
  }

  function addPoke(fromId, toId) {
    pokeFx.push({
      fromId,
      toId,
      startedAt: Date.now(),
      until: Date.now() + 650,
    });
  }

  function addBoom(x, y) {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x,
        y,
        vx: Math.cos((i / 18) * Math.PI * 2) * 80,
        vy: Math.sin((i / 18) * Math.PI * 2) * 80,
        until: Date.now() + 500,
        color: i % 2 ? "#ffd36e" : "#ff6b8a",
      });
    }
  }

  function drawFx(players) {
    const now = Date.now();
    for (const fx of pokeFx) {
      if (fx.until < now) continue;
      const from = players.find((p) => p.id === fx.fromId);
      const to = players.find((p) => p.id === fx.toId);
      if (!from || !to) continue;
      const t = 1 - (fx.until - now) / (fx.until - fx.startedAt);
      const ease = Math.min(1, Math.max(0, t));
      const wx = from.x + (to.x - from.x) * (0.2 + ease * 0.45);
      const wy = from.y + (to.y - from.y) * (0.2 + ease * 0.45) - 12;
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.save();
      ctx.globalAlpha = 1 - ease * 0.25;
      ctx.translate(wx - camera.x, wy - camera.y);
      ctx.rotate(angle);
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🥊", 0, 0);
      ctx.restore();
    }
    for (const b of bubbles) {
      const p = players.find((x) => x.id === b.playerId);
      if (!p || b.until < now) continue;
      const x = p.x - camera.x;
      const y = p.y - camera.y - 48;
      ctx.font = "12px IBM Plex Sans KR";
      const w = Math.min(180, ctx.measureText(b.text).width + 16);
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 18, w, 22, 8);
      else ctx.rect(x - w / 2, y - 18, w, 22);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.textAlign = "center";
      ctx.fillText(b.text.slice(0, 18), x, y - 2);
    }
    for (const pt of particles) {
      if (pt.until < now) continue;
      const t = (pt.until - now) / 500;
      ctx.globalAlpha = t;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - camera.x + pt.vx * (1 - t), pt.y - camera.y + pt.vy * (1 - t), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    while (bubbles[0] && bubbles[0].until < now) bubbles.shift();
    while (particles[0] && particles[0].until < now) particles.shift();
    while (pokeFx[0] && pokeFx[0].until < now) pokeFx.shift();
  }

  function draw(state) {
    if (!canvas.width || !canvas.height) resize();
    const me = state.players.find((p) => p.id === state.you?.id) || state.you;
    const mePos = me ? visPos(me) : null;
    if (me && mePos) follow({ x: mePos.x, y: mePos.y });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawColorPaint(state.game);
    drawPoops(state.game);
    const ordered = [...state.players].sort((a, b) => a.y - b.y);
    for (const p of ordered) {
      drawAvatar(p, state.you?.id, { ...state.game, hostId: state.hostId }, visPos(p));
    }
    drawFx(state.players);
  }

  function hitTest(world, players, youId) {
    let best = null;
    let bestD = 36;
    for (const p of players) {
      if (p.id === youId) continue;
      const d = Math.hypot(p.x - world.x, p.y - world.y);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  return { draw, camera, addBubble, addPoke, addBoom, hitTest, resize };
}

export function createPaint() {
  let color = 2;
  let onBrush = () => {};
  let boundKey = null;

  function bindPalette(root, palette) {
    if (!root || !palette) return;
    root.innerHTML = "";
    palette.forEach((c, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.background = c;
      if (idx === color) b.classList.add("on");
      b.onclick = () => {
        color = idx;
        onBrush({ kind: "brush", color: idx });
        bindPalette(root, palette);
      };
      root.append(b);
    });
  }

  return {
    sync(game) {
      if (!game?.palette) return;
      const key = game.startedAt;
      if (boundKey !== key) {
        boundKey = key;
        color = 2;
        bindPalette(document.getElementById("palette"), game.palette);
        onBrush({ kind: "brush", color });
      }
    },
    bindPalette,
    setHandler(fn) {
      onBrush = fn;
    },
    apply() {},
  };
}
