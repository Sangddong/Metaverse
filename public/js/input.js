const MOVE_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export function createInput(canvas) {
  const keys = new Set();
  let runHeld = false;

  function blurChat() {
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
      el.blur();
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.isComposing) return;
    // 채팅 포커스 중에는 게임 키를 가로채지 않음 (한글 WASD 포함)
    if (isTyping()) return;

    if (MOVE_CODES.has(e.code) || e.code === "Space" || e.key === " ") {
      e.preventDefault();
    }
    keys.add(e.code);
    if (e.code === "Space") runHeld = true;
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    if (e.code === "Space") runHeld = false;
  });
  window.addEventListener("blur", () => {
    keys.clear();
    runHeld = false;
  });

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.id === "chatInput") return true;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function vector() {
    if (isTyping()) return { vx: 0, vy: 0, running: false, dir: null, typing: true };
    let vx = 0;
    let vy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) vx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) vx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) vy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) vy += 1;
    let dir = null;
    if (vy > 0) dir = 0;
    else if (vx < 0) dir = 1;
    else if (vx > 0) dir = 3;
    else if (vy < 0) dir = 2;
    return { vx, vy, running: runHeld && (vx || vy), dir, typing: false };
  }

  function screenToWorld(ev, camera) {
    const rect = canvas.getBoundingClientRect();
    const sx = ((ev.clientX - rect.left) / rect.width) * canvas.clientWidth;
    const sy = ((ev.clientY - rect.top) / rect.height) * canvas.clientHeight;
    return { x: sx + camera.x, y: sy + camera.y };
  }

  return { vector, isTyping, screenToWorld, keys, blurChat };
}
