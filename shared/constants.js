export const MAX_PLAYERS = 30;
export const TILE = 40;
export const COLS = 54;
export const ROWS = 38;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export const PLAYER_RADIUS = 16;
export const WALK_SPEED = 165;
export const RUN_SPEED = 275;
export const POKE_RANGE = 80;
export const PASS_RANGE = 72;

export const TICK_MS = 50;

export const NAME_MAX = 12;
export const CHAT_MAX = 80;
export const ROOM_CODE_LEN = 4;

export const COLORS = [
  "#ff6b8a",
  "#ff9f43",
  "#ffd93d",
  "#6bcb77",
  "#4d96ff",
  "#9b59b6",
  "#20c997",
  "#fd79a8",
  "#74b9ff",
  "#e17055",
  "#00cec9",
  "#a29bfe",
];

export const GAME_TYPES = {
  zombie: { id: "zombie", name: "좀비 게임", icon: "🧟" },
  chosung: { id: "chosung", name: "초성 게임", icon: "🔤" },
  poop: { id: "poop", name: "똥피하기", icon: "💩" },
  color: { id: "color", name: "색칠하기", icon: "🎨" },
  bomb: { id: "bomb", name: "폭탄 옮기기", icon: "💣" },
  pick: { id: "pick", name: "랜덤 멤버 뽑기", icon: "🎲" },
  namechosung: { id: "namechosung", name: "멤버 초성 퀴즈", icon: "👤" },
};

export const PALETTE = [
  "#ffffff",
  "#1a1a1a",
  "#ff4d6d",
  "#ff9f1c",
  "#ffd166",
  "#06d6a0",
  "#118ab2",
  "#073b4c",
  "#9b5de5",
  "#f15bb5",
  "#c9ada7",
  "#6d6875",
  "#8d99ae",
  "#2a9d8f",
  "#e76f51",
  "#264653",
];
