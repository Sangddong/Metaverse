import {
  COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_STYLES,
  GAME_TYPES,
  clampHair,
  clampOutfit,
  clampHairColor,
} from "/shared/constants.js";
import { paintMiniAvatar } from "./avatarDraw.js";

export function $(id) {
  return document.getElementById(id);
}

export function roomUrl(code) {
  const origin = window.location.origin;
  return `${origin}/r/${encodeURIComponent(String(code || "PLAZ").toUpperCase())}`;
}

export function parseRoomFromUrl() {
  const path = window.location.pathname || "";
  const match = path.match(/^\/r\/([A-Za-z0-9]{1,6})\/?$/i);
  if (match) return match[1].toUpperCase();
  const q = new URLSearchParams(window.location.search).get("room");
  if (q) return q.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  return null;
}

export function setRoomUrl(code) {
  const next = `/r/${encodeURIComponent(String(code || "PLAZ").toUpperCase())}`;
  if (window.location.pathname !== next) {
    history.replaceState(null, "", next);
  }
}

export function fillColors(root, selected, onPick, palette = COLORS) {
  if (!root) return;
  root.innerHTML = "";
  for (const c of palette) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (c === selected ? " on" : "");
    b.style.background = c;
    b.addEventListener("click", () => onPick(c));
    root.appendChild(b);
  }
}

export function fillHairColorIndices(root, selectedIndex, onPick) {
  if (!root) return;
  root.innerHTML = "";
  HAIR_COLORS.forEach((c, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (idx === selectedIndex ? " on" : "");
    b.style.background = c;
    b.addEventListener("click", () => onPick(idx));
    root.appendChild(b);
  });
}

export function fillStyleGrid(root, styles, selectedId, appearance, kind, onPick) {
  if (!root) return;
  root.innerHTML = "";
  for (const s of styles) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "style-pick" + (s.id === selectedId ? " on" : "");
    const canvas = document.createElement("canvas");
    canvas.width = 56;
    canvas.height = 72;
    const ctx = canvas.getContext("2d");
    paintMiniAvatar(ctx, {
      color: appearance.color,
      hair: kind === "hair" ? s.id : appearance.hair,
      outfit: kind === "outfit" ? s.id : appearance.outfit,
      hairColor: HAIR_COLORS[appearance.hairColorIndex] || HAIR_COLORS[0],
    });
    const label = document.createElement("span");
    label.textContent = s.name;
    b.append(canvas, label);
    b.addEventListener("click", () => onPick(s.id));
    root.appendChild(b);
  }
}

export function renderLobbyAppearance(state) {
  fillColors($("colorRow"), state.color, (c) => {
    state.color = c;
    renderLobbyAppearance(state);
  });
  fillHairColorIndices($("hairColorRow"), state.hairColorIndex, (idx) => {
    state.hairColorIndex = idx;
    renderLobbyAppearance(state);
  });
  fillStyleGrid($("hairRow"), HAIR_STYLES, state.hair, state, "hair", (id) => {
    state.hair = id;
    renderLobbyAppearance(state);
  });
  fillStyleGrid($("outfitRow"), OUTFIT_STYLES, state.outfit, state, "outfit", (id) => {
    state.outfit = id;
    renderLobbyAppearance(state);
  });
}

export function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

export function bindLobby(state, handlers) {
  const saved = localStorage.getItem("playza-name");
  if (saved) $("nameInput").value = saved;
  state.hair = clampHair(localStorage.getItem("playza-hair") ?? state.hair ?? 1);
  state.outfit = clampOutfit(localStorage.getItem("playza-outfit") ?? state.outfit ?? 0);
  state.hairColorIndex = clampHairColor(localStorage.getItem("playza-hairColor") ?? state.hairColorIndex ?? 0);
  renderLobbyAppearance(state);

  const inviteCode = parseRoomFromUrl();
  if (inviteCode) {
    $("homeFields").hidden = true;
    $("inviteActions").hidden = false;
    $("inviteHint").hidden = false;
    $("inviteCode").textContent = inviteCode;
    $("joinInvite").onclick = () => handlers.join(inviteCode);
    $("nameInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") handlers.join(inviteCode);
    });
    setTimeout(() => $("nameInput")?.focus(), 0);
  } else {
    $("homeFields").hidden = false;
    $("inviteActions").hidden = true;
    $("inviteHint").hidden = true;
    $("joinPublic").onclick = () => handlers.join("PLAZ");
    $("joinCode").onclick = () => handlers.join(($("roomInput").value || "").trim());
    $("createRoom").onclick = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      $("roomInput").value = code;
      handlers.join(code);
    };
  }
}

export function showLobbyError(msg) {
  const el = $("lobbyError");
  el.hidden = !msg;
  el.textContent = msg || "";
}

export function enterGame() {
  $("lobby").hidden = true;
  $("game").hidden = false;
}

export function renderPlayers(state) {
  const ul = $("playerList");
  ul.innerHTML = "";
  $("countBadge").textContent = `${state.players.length}/${state.maxPlayers || 30}`;
  $("roomBadge").textContent = state.roomId;
  $("hostBtn").hidden = state.you?.id !== state.hostId;
  $("gamesWrap").hidden = false;
  for (const p of state.players) {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = p.color;
    const name = document.createElement("span");
    name.textContent = p.name + (p.alive === false ? " (관전)" : "") + (p.role === "zombie" ? " 🧟" : "");
    li.append(dot, name);
    if (p.id === state.you?.id) {
      const you = document.createElement("span");
      you.className = "you-tag";
      you.textContent = "나";
      li.append(you);
    }
    if (p.id === state.hostId) {
      const host = document.createElement("span");
      host.className = "host-tag";
      host.textContent = "방장";
      li.append(host);
    }
    if (state.you?.id === state.hostId && p.id !== state.you.id) {
      const ops = document.createElement("div");
      ops.className = "player-ops";
      ops.innerHTML = `<button data-kick="${p.id}">강퇴</button><button data-mute="${p.id}">채금</button><button data-host="${p.id}">위임</button>`;
      li.append(ops);
    }
    ul.append(li);
  }
}

export function appendChat(msg) {
  const log = $("chatLog");
  const p = document.createElement("p");
  if (msg.system) p.className = "sys";
  if (msg.correct) p.className = "ok";
  p.textContent = msg.system ? msg.text : `${msg.name}: ${msg.text}`;
  log.append(p);
  log.scrollTop = log.scrollHeight;
}

export function loadChat(list) {
  $("chatLog").innerHTML = "";
  for (const m of list || []) appendChat(m);
}

export function renderBanner(game) {
  const el = $("gameBanner");
  const timer = $("remainTimer");
  if (!game) {
    el.hidden = true;
    if (timer) timer.hidden = true;
    updateGameFlash(null);
    updateStopGameBtn(false);
    return;
  }
  el.hidden = false;
  updateStopGameBtn(true);
  const remain = remainSeconds(game);
  if (timer) {
    const timed = game.type === "bomb" || game.type === "poop" || game.type === "color" || game.type === "zombie";
    timer.hidden = !timed || remain == null;
    if (!timer.hidden) timer.textContent = `남은시간: ${remain}초`;
  }
  const names = {
    zombie: `🧟 좀비 ${game.zombies?.length || 0} · 인간 ${game.humans?.length || 0}`,
    chosung: `🔤 초성 ${game.round}/${game.totalRounds} · ${game.clue}`,
    namechosung: `👤 멤버 초성 ${game.round}/${game.totalRounds} · ${game.clue}`,
    pick: `🎲 랜덤 추첨 · ${game.pickedName || "?"}`,
    poop:
      game.phase === "intermission"
        ? game.message
        : `💩 레벨 ${game.level || 1}/${game.totalLevels || 5}`,
    color: `🎨 색칠하기 · 걸어다니며 칠하세요`,
    bomb: `💣 폭탄 옮기기`,
  };
  el.textContent = game.message || names[game.type] || "게임 진행 중";
  updateGameFlash(game);
}

function remainSeconds(game) {
  if (!game) return null;
  if (game.type === "bomb" && game.explodeAt) {
    return Math.max(0, Math.ceil((game.explodeAt - Date.now()) / 1000));
  }
  if (game.endsAt) return Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000));
  return null;
}

function updateStopGameBtn(visible) {
  const btn = $("stopGameBtn");
  if (btn) btn.hidden = !visible;
}

export function showFlash(text, ms = 2800) {
  const flash = $("gameFlash");
  const el = $("gameFlashText");
  if (!flash || !el || !text) return;
  el.textContent = text;
  flash.hidden = false;
  clearTimeout(showFlash._t);
  showFlash._t = setTimeout(() => {
    flash.hidden = true;
    el.textContent = "";
  }, ms);
}

export function updateGameFlash(game) {
  const flash = $("gameFlash");
  const text = $("gameFlashText");
  if (!flash || !text) return;
  const payload = game?.flash;
  if (payload?.text && (!payload.until || payload.until > Date.now())) {
    clearTimeout(showFlash._t);
    flash.hidden = false;
    text.textContent = payload.text;
  } else if (!showFlash._t) {
    flash.hidden = true;
    text.textContent = "";
  }
}

export function bindHud(handlers) {
  $("helpBtn").onclick = () => ($("helpModal").hidden = false);
  $("closeHelp").onclick = () => ($("helpModal").hidden = true);
  $("settingsBtn").onclick = () => {
    $("renameInput").value = handlers.getName();
    const appear = handlers.getAppearance();
    const paintSettings = () => {
      const a = handlers.getAppearance();
      fillColors($("settingsColors"), a.color, (c) => {
        handlers.recolor(c);
        paintSettings();
      });
      fillHairColorIndices($("settingsHairColors"), a.hairColorIndex, (idx) => {
        handlers.setHairColor(idx);
        paintSettings();
      });
      fillStyleGrid($("settingsHair"), HAIR_STYLES, a.hair, a, "hair", (id) => {
        handlers.setHair(id);
        paintSettings();
      });
      fillStyleGrid($("settingsOutfit"), OUTFIT_STYLES, a.outfit, a, "outfit", (id) => {
        handlers.setOutfit(id);
        paintSettings();
      });
    };
    paintSettings();
    $("settingsModal").hidden = false;
  };
  $("closeSettings").onclick = () => ($("settingsModal").hidden = true);
  $("saveSettings").onclick = () => {
    handlers.rename($("renameInput").value);
    $("settingsModal").hidden = true;
  };
  $("hostBtn").onclick = () => ($("hostModal").hidden = false);
  $("closeHost").onclick = () => ($("hostModal").hidden = true);
  $("gamesBtn").onclick = (e) => {
    e.stopPropagation();
    $("gamesPanel").hidden = !$("gamesPanel").hidden;
  };
  document.addEventListener("click", () => {
    if ($("gamesPanel")) $("gamesPanel").hidden = true;
  });
  $("gamesPanel").addEventListener("click", (e) => e.stopPropagation());
  $("stopGameBtn").onclick = () => handlers.stopGame();
  $("lockRoomBtn").onclick = () => handlers.lock();
  $("copyLinkBtn").onclick = async () => {
    const url = roomUrl(handlers.getRoomId());
    try {
      await navigator.clipboard.writeText(url);
      toast("방 링크를 복사했어요.");
    } catch {
      toast(url);
    }
  };
  const grid = $("gameStartRow");
  grid.innerHTML = "";
  for (const g of Object.values(GAME_TYPES)) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `${g.icon}  ${g.name}`;
    b.onclick = () => {
      handlers.startGame(g.id);
      $("gamesPanel").hidden = true;
    };
    grid.append(b);
  }
  $("playerList").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.kick) handlers.kick(t.dataset.kick);
    if (t.dataset.mute) handlers.mute(t.dataset.mute);
    if (t.dataset.host) handlers.transfer(t.dataset.host);
  });
  $("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("chatInput").value;
    if (v.trim()) handlers.chat(v);
    $("chatInput").value = "";
  });
  $("clearPaint").onclick = () => handlers.clearPaint();
}

export function updateGameOverlays(state, paint) {
  const game = state.game;
  const chosung = $("chosungOverlay");
  const color = $("colorOverlay");
  const chatInput = $("chatInput");
  chosung.hidden = game?.type !== "chosung" && game?.type !== "namechosung";
  color.hidden = game?.type !== "color";
  updateStopGameBtn(Boolean(game));
  if (chatInput) {
    chatInput.placeholder =
      game?.type === "chosung" || game?.type === "namechosung"
        ? "정답을 채팅으로 입력 (Enter)"
        : "채팅 입력 (Enter)";
  }
  if (game?.type === "chosung" || game?.type === "namechosung") {
    $("chosungRound").textContent = `${game.round} / ${game.totalRounds} 라운드`;
    $("chosungClue").textContent = game.clue;
    $("chosungHint").textContent = `힌트: ${game.hint}`;
    $("chosungTimer").textContent = `${Math.max(0, Math.ceil((game.roundEndsAt - Date.now()) / 1000))}초`;
    const guide = document.querySelector(".chosung-guide");
    if (guide) {
      guide.textContent =
        game.type === "namechosung"
          ? "채팅창에 멤버 이름을 입력하세요"
          : "채팅창에 정답을 입력하세요";
    }
  }
  if (game?.type === "color" && paint) {
    paint.sync(game);
  }
}
