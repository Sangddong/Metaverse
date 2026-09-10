/** Canvas avatar hair & outfit drawing (shared by world render + preview). */

function shade(hex, amt) {
  const n = hex.replace("#", "");
  const num = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function drawOutfit(ctx, x, bodyY, sitting, outfit, color) {
  const c = color || "#4d96ff";
  const dark = shade(c, -35);
  const light = shade(c, 40);
  const w = sitting ? 30 : 26;
  const h = sitting ? 14 : 24;
  const left = x - w / 2;
  const id = outfit | 0;

  ctx.fillStyle = c;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(left, bodyY, w, h, sitting ? 8 : 10);
  else ctx.rect(left, bodyY, w, h);
  ctx.fill();

  if (id === 1) {
    // hoodie hood flap
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(x, bodyY + 2, 14, 6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.fillRect(x - 2, bodyY + 8, 4, sitting ? 4 : 10);
  } else if (id === 2) {
    // overalls straps
    ctx.fillStyle = "#3d5a80";
    ctx.fillRect(left + 4, bodyY, 4, h);
    ctx.fillRect(left + w - 8, bodyY, 4, h);
    ctx.fillStyle = "#ee6c4d";
    ctx.beginPath();
    ctx.arc(left + 6, bodyY + 6, 2, 0, Math.PI * 2);
    ctx.arc(left + w - 6, bodyY + 6, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 3) {
    // dress flare
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(left + 2, bodyY + h * 0.35);
    ctx.lineTo(left - 4, bodyY + h + 6);
    ctx.lineTo(left + w + 4, bodyY + h + 6);
    ctx.lineTo(left + w - 2, bodyY + h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = light;
    ctx.fillRect(x - 3, bodyY + 2, 6, 3);
  } else if (id === 4) {
    // suit lapels
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x, bodyY + 2);
    ctx.lineTo(left + 3, bodyY + h);
    ctx.lineTo(x - 2, bodyY + h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, bodyY + 2);
    ctx.lineTo(left + w - 3, bodyY + h);
    ctx.lineTo(x + 2, bodyY + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff7e8";
    ctx.fillRect(x - 2, bodyY + 3, 4, sitting ? 6 : 12);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(x - 1, bodyY + 3, 2, 5);
  } else if (id === 5) {
    // stripes
    ctx.fillStyle = light;
    for (let i = 0; i < 4; i++) ctx.fillRect(left, bodyY + 3 + i * 5, w, 2);
  } else if (id === 6) {
    // tank top — cut shoulders
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.arc(left + 3, bodyY + 2, 5, 0, Math.PI * 2);
    ctx.arc(left + w - 3, bodyY + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.fillRect(left + 5, bodyY, w - 10, h);
  } else if (id === 7) {
    // knit ribbing
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(left + 3 + i * 4, bodyY + 2);
      ctx.lineTo(left + 3 + i * 4, bodyY + h - 2);
      ctx.stroke();
    }
    ctx.fillStyle = dark;
    ctx.fillRect(left, bodyY + h - 4, w, 4);
  } else if (id === 8) {
    // raincoat hood + buttons
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x, bodyY, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#ffd36e";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, bodyY + 6 + i * 5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 9) {
    // vest over shirt
    ctx.fillStyle = "#fff7e8";
    ctx.fillRect(left + 6, bodyY, w - 12, h);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(left, bodyY);
    ctx.lineTo(left + 8, bodyY);
    ctx.lineTo(left + 6, bodyY + h);
    ctx.lineTo(left, bodyY + h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(left + w, bodyY);
    ctx.lineTo(left + w - 8, bodyY);
    ctx.lineTo(left + w - 6, bodyY + h);
    ctx.lineTo(left + w, bodyY + h);
    ctx.closePath();
    ctx.fill();
  } else if (id === 10) {
    // hanbok-ish ribbon
    ctx.fillStyle = "#fff7e8";
    ctx.fillRect(left + 2, bodyY + 2, w - 4, 4);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(x - 2, bodyY + 2, 4, sitting ? 10 : 18);
    ctx.beginPath();
    ctx.moveTo(x, bodyY + 10);
    ctx.lineTo(x + 8, bodyY + 16);
    ctx.lineTo(x, bodyY + 14);
    ctx.lineTo(x - 8, bodyY + 16);
    ctx.closePath();
    ctx.fill();
  } else if (id === 11) {
    // scarf
    ctx.fillStyle = "#e76f51";
    ctx.beginPath();
    ctx.ellipse(x, bodyY + 3, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 6, bodyY + 4, 5, sitting ? 8 : 14);
  } else if (id === 12) {
    // jersey number
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px IBM Plex Sans KR, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("7", x, bodyY + (sitting ? 11 : 16));
    ctx.fillStyle = dark;
    ctx.fillRect(left, bodyY, w, 3);
  } else if (id === 13) {
    // apron
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left + 4, bodyY + 4, w - 8, h, 4);
    else ctx.rect(left + 4, bodyY + 4, w - 8, h);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left + 6, bodyY);
    ctx.lineTo(left + 8, bodyY + 5);
    ctx.moveTo(left + w - 6, bodyY);
    ctx.lineTo(left + w - 8, bodyY + 5);
    ctx.stroke();
  } else if (id === 14) {
    // armor plates
    ctx.fillStyle = "#8d99ae";
    ctx.fillRect(left + 3, bodyY + 3, w - 6, sitting ? 8 : 14);
    ctx.fillStyle = "#2b2d42";
    ctx.fillRect(left + 5, bodyY + 5, w - 10, 3);
    ctx.fillRect(left + 5, bodyY + 10, w - 10, 3);
  } else if (id === 15) {
    // zip-up
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, bodyY + 2);
    ctx.lineTo(x, bodyY + h - 2);
    ctx.stroke();
    ctx.fillStyle = "#bbb";
    ctx.fillRect(x - 2, bodyY + 4, 4, 3);
  } else if (id === 16) {
    // layered tee
    ctx.fillStyle = light;
    ctx.fillRect(left - 2, bodyY + h - 8, w + 4, 8);
    ctx.fillStyle = dark;
    ctx.fillRect(left + 8, bodyY, w - 16, 4);
  } else if (id === 17) {
    // long coat
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(left - 2, bodyY + 4);
    ctx.lineTo(left - 4, bodyY + h + 8);
    ctx.lineTo(left + w + 4, bodyY + h + 8);
    ctx.lineTo(left + w + 2, bodyY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c;
    ctx.fillRect(left + 4, bodyY, w - 8, h);
  } else if (id === 18) {
    // tunic belt
    ctx.fillStyle = dark;
    ctx.fillRect(left - 1, bodyY + h * 0.55, w + 2, 4);
    ctx.fillStyle = "#c4a35a";
    ctx.fillRect(x - 3, bodyY + h * 0.55, 6, 4);
  } else if (id === 19) {
    // baseball jacket sleeves contrast
    ctx.fillStyle = "#fff7e8";
    ctx.beginPath();
    ctx.ellipse(left + 2, bodyY + 8, 5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(left + w - 2, bodyY + 8, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(left, bodyY + h - 3, w, 3);
  }
}

export function drawHairBack(ctx, x, headCy, headR, style, hairColor) {
  const hc = hairColor || "#1a1a1a";
  const id = style | 0;
  ctx.fillStyle = hc;

  if (id === 4 || id === 18) {
    ctx.beginPath();
    ctx.ellipse(x, headCy + 4, headR + 4, headR + 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 5) {
    ctx.beginPath();
    ctx.ellipse(x + 10, headCy + 8, 5, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 6) {
    ctx.beginPath();
    ctx.ellipse(x - 12, headCy + 6, 5, 11, -0.25, 0, Math.PI * 2);
    ctx.ellipse(x + 12, headCy + 6, 5, 11, 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 15) {
    ctx.beginPath();
    ctx.moveTo(x + 8, headCy);
    ctx.quadraticCurveTo(x + 18, headCy + 16, x + 10, headCy + 22);
    ctx.quadraticCurveTo(x + 6, headCy + 10, x + 8, headCy);
    ctx.fill();
  }
}

export function drawHairFront(ctx, x, headCy, headR, style, hairColor, eyeOff = 0) {
  const hc = hairColor || "#1a1a1a";
  const hi = shade(hc, 30);
  const id = style | 0;
  ctx.fillStyle = hc;

  if (id === 0) return;

  if (id === 1) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 1, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(x, headCy - headR - 4, x - headR, headCy - 2);
    ctx.fill();
  } else if (id === 2) {
    ctx.beginPath();
    ctx.arc(x, headCy - 1, headR + 3, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, headCy - 2, headR + 1, 5, 0, Math.PI, 0);
    ctx.fill();
  } else if (id === 3) {
    ctx.beginPath();
    ctx.arc(x - 2, headCy - 3, headR + 2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.moveTo(x + eyeOff * 0.5, headCy - headR + 2);
    ctx.lineTo(x + 4 + eyeOff, headCy + 2);
    ctx.lineTo(x - 1, headCy - 2);
    ctx.fill();
  } else if (id === 4 || id === 18) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 2, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    if (id === 18) {
      ctx.beginPath();
      ctx.ellipse(x - 8, headCy + 2, 4, 6, -0.4, 0, Math.PI * 2);
      ctx.ellipse(x + 8, headCy + 2, 4, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 5) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 2, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 2, headCy - headR + 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 6) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 11, headCy - 4, 5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 11, headCy - 4, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 7) {
    ctx.beginPath();
    ctx.arc(x, headCy - 4, headR + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(x - 5, headCy - 8, 4, 0, Math.PI * 2);
    ctx.arc(x + 6, headCy - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 8) {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 4, headCy - 4);
      ctx.lineTo(x + i * 5, headCy - headR - 10);
      ctx.lineTo(x + i * 4 + 3, headCy - 4);
      ctx.fill();
    }
  } else if (id === 9) {
    ctx.beginPath();
    ctx.moveTo(x - 4, headCy - 2);
    ctx.lineTo(x, headCy - headR - 14);
    ctx.lineTo(x + 4, headCy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 3, headCy - 6, 6, 8);
  } else if (id === 10) {
    ctx.beginPath();
    ctx.arc(x, headCy - 1, headR + 2, Math.PI * 1.0, Math.PI * 2.0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 9, headCy + 4, 4, 7, 0.2, 0, Math.PI * 2);
    ctx.ellipse(x + 9, headCy + 4, 4, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 11) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 1, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, headCy - headR - 4, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(x, headCy - headR - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 12) {
    for (const [dx, dy, r] of [
      [-8, -6, 5],
      [0, -10, 6],
      [8, -6, 5],
      [-6, 0, 4],
      [6, 0, 4],
    ]) {
      ctx.beginPath();
      ctx.arc(x + dx, headCy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 13) {
    ctx.beginPath();
    ctx.arc(x, headCy - 3, headR + 1, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + eyeOff * 0.3, headCy - 4, headR - 1, 4.5, 0, Math.PI, 0);
    ctx.fill();
  } else if (id === 14) {
    ctx.beginPath();
    ctx.arc(x + 3, headCy - 3, headR, Math.PI * 1.2, Math.PI * 1.95);
    ctx.fill();
    ctx.fillStyle = shade(hc, -20);
    ctx.fillRect(x - headR - 1, headCy - 4, 6, 10);
  } else if (id === 15) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 1, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    ctx.strokeStyle = hi;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 6, headCy - 2 + i);
      ctx.quadraticCurveTo(x + 14, headCy + 8 + i * 3, x + 8, headCy + 16 + i * 2);
      ctx.stroke();
    }
  } else if (id === 16) {
    // cap
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.ellipse(x, headCy - 6, headR + 2, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 8, headCy - 4, 10, 3.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hc;
    ctx.beginPath();
    ctx.arc(x - 4, headCy - 2, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 17) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI - Math.PI * 0.1;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * (headR - 2),
        headCy - 2 + Math.sin(a) * (headR - 4),
        3.5,
        5,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (id === 19) {
    ctx.beginPath();
    ctx.arc(x, headCy - 2, headR + 1, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5, headCy - headR + 2);
    ctx.lineTo(x, headCy - headR - 10);
    ctx.lineTo(x + 5, headCy - headR + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, headCy - headR - 8, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintMiniAvatar(ctx, { color, hair, outfit, hairColor, w = 56, h = 72 }) {
  ctx.clearRect(0, 0, w, h);
  const x = w / 2;
  const bodyY = h * 0.42;
  const sitting = false;
  drawOutfit(ctx, x, bodyY, sitting, outfit, color);
  const headCy = bodyY - 2;
  const headR = 12;
  drawHairBack(ctx, x, headCy, headR, hair, hairColor);
  ctx.fillStyle = "#ffe0c8";
  ctx.beginPath();
  ctx.arc(x, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  drawHairFront(ctx, x, headCy, headR, hair, hairColor, 0);
  ctx.fillStyle = "#1b1b1b";
  ctx.beginPath();
  ctx.arc(x - 4, bodyY - 3, 1.6, 0, Math.PI * 2);
  ctx.arc(x + 4, bodyY - 3, 1.6, 0, Math.PI * 2);
  ctx.fill();
}
