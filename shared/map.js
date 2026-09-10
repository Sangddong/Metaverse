import { COLS, ROWS, TILE } from "./constants.js";

export const T = {
  GRASS: 1,
  GRASS2: 2,
  PATH: 3,
  STONE: 4,
  WATER: 5,
  TREE: 6,
  BENCH: 7,
  FLOWER: 8,
  BUSH: 9,
  WALL: 10,
  WOOD: 11,
  ROOF: 12,
};

const SOLID = new Set([T.WATER, T.TREE, T.BUSH, T.WALL, T.ROOF]);

export function isSolid(tile) {
  return SOLID.has(tile);
}

function fill(tiles, x, y, w, h, v) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i >= 0 && j >= 0 && i < COLS && j < ROWS) tiles[j][i] = v;
    }
  }
}

function hline(tiles, x, y, w, v) {
  fill(tiles, x, y, w, 1, v);
}

function vline(tiles, x, y, h, v) {
  fill(tiles, x, y, 1, h, v);
}

export function createMap() {
  const tiles = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => ((x + y) % 5 === 0 ? T.GRASS2 : T.GRASS)),
  );

  for (let x = 0; x < COLS; x++) {
    tiles[0][x] = T.TREE;
    tiles[1][x] = x % 3 === 0 ? T.BUSH : T.TREE;
    tiles[ROWS - 1][x] = T.TREE;
    tiles[ROWS - 2][x] = x % 4 === 0 ? T.BUSH : T.TREE;
  }
  for (let y = 0; y < ROWS; y++) {
    tiles[y][0] = T.TREE;
    tiles[y][1] = y % 3 === 0 ? T.BUSH : T.TREE;
    tiles[y][COLS - 1] = T.TREE;
    tiles[y][COLS - 2] = y % 4 === 0 ? T.BUSH : T.TREE;
  }

  fill(tiles, 20, 12, 14, 12, T.STONE);
  fill(tiles, 24, 16, 6, 5, T.WATER);
  fill(tiles, 25, 17, 4, 3, T.WATER);

  hline(tiles, 4, 18, 16, T.PATH);
  hline(tiles, 34, 18, 16, T.PATH);
  vline(tiles, 26, 4, 12, T.PATH);
  vline(tiles, 27, 4, 12, T.PATH);
  vline(tiles, 26, 24, 12, T.PATH);
  vline(tiles, 27, 24, 12, T.PATH);

  fill(tiles, 8, 6, 8, 6, T.PATH);
  fill(tiles, 38, 6, 8, 6, T.PATH);
  fill(tiles, 8, 26, 8, 6, T.PATH);
  fill(tiles, 38, 26, 8, 6, T.PATH);

  const trees = [
    [6, 10], [7, 11], [15, 8], [16, 9],
    [36, 8], [44, 10], [45, 11], [12, 22],
    [40, 22], [18, 30], [34, 30], [10, 16],
    [42, 16], [22, 8], [30, 8], [22, 28], [31, 28],
  ];
  for (const [x, y] of trees) {
    if (tiles[y]?.[x] === T.GRASS || tiles[y]?.[x] === T.GRASS2) tiles[y][x] = T.TREE;
  }

  const flowers = [
    [5, 8], [6, 8], [5, 9], [17, 7], [18, 7],
    [35, 7], [36, 7], [46, 8], [47, 9],
    [5, 28], [6, 29], [17, 32], [35, 32], [46, 28],
    [19, 14], [34, 14], [19, 23], [34, 23],
  ];
  for (const [x, y] of flowers) {
    if (tiles[y]?.[x] === T.GRASS || tiles[y]?.[x] === T.GRASS2) tiles[y][x] = T.FLOWER;
  }

  const benches = [
    [21, 14], [32, 14], [21, 22], [32, 22],
    [10, 12], [43, 12], [10, 24], [43, 24],
  ];
  for (const [x, y] of benches) tiles[y][x] = T.BENCH;

  fill(tiles, 4, 4, 5, 4, T.WOOD);
  fill(tiles, 4, 3, 5, 1, T.ROOF);
  fill(tiles, 3, 4, 1, 4, T.WALL);
  fill(tiles, 9, 4, 1, 4, T.WALL);
  tiles[7][6] = T.PATH;

  return { tiles, cols: COLS, rows: ROWS, tile: TILE };
}

export function spawnPoint() {
  return { x: 27 * TILE + 20, y: 23 * TILE + 20 };
}

export function collide(px, py, radius, tiles) {
  const minX = Math.floor((px - radius) / TILE);
  const maxX = Math.floor((px + radius) / TILE);
  const minY = Math.floor((py - radius) / TILE);
  const maxY = Math.floor((py + radius) / TILE);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = tiles[y]?.[x];
      if (t == null || isSolid(t)) {
        const left = x * TILE;
        const top = y * TILE;
        const closestX = Math.max(left, Math.min(px, left + TILE));
        const closestY = Math.max(top, Math.min(py, top + TILE));
        const dx = px - closestX;
        const dy = py - closestY;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
  }
  return false;
}

export function clampMove(x, y, nx, ny, radius, tiles) {
  if (!collide(nx, ny, radius, tiles)) return { x: nx, y: ny };
  if (!collide(nx, y, radius, tiles)) return { x: nx, y };
  if (!collide(x, ny, radius, tiles)) return { x, y: ny };
  return { x, y };
}

/** 현재 좌표가 막혀 있으면(물 등) 근처 통행 가능한 지점으로만 보정. 통과 가능하면 그대로. */
export function resolveWalkable(px, py, radius, tiles) {
  if (!collide(px, py, radius, tiles)) return { x: px, y: py };
  const cx = Math.floor(px / TILE);
  const cy = Math.floor(py / TILE);
  for (let r = 0; r <= 16; r++) {
    for (let ty = cy - r; ty <= cy + r; ty++) {
      for (let tx = cx - r; tx <= cx + r; tx++) {
        if (r > 0 && Math.abs(tx - cx) !== r && Math.abs(ty - cy) !== r) continue;
        const x = tx * TILE + TILE / 2;
        const y = ty * TILE + TILE / 2;
        if (!collide(x, y, radius, tiles)) return { x, y };
      }
    }
  }
  return spawnPoint();
}

export const POOP_ARENA = {
  x: 20 * TILE,
  y: 12 * TILE,
  w: 14 * TILE,
  h: 12 * TILE,
};
