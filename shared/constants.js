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

export const HAIR_COLORS = [
  "#1a1a1a",
  "#2c1810",
  "#4a2c1a",
  "#6b3f1f",
  "#8b5a2b",
  "#c4a35a",
  "#e8d5a3",
  "#f5f0e6",
  "#ff6b8a",
  "#4d96ff",
  "#9b59b6",
  "#20c997",
];

export const HAIR_STYLES = [
  { id: 0, name: "민머리" },
  { id: 1, name: "짧은 머리" },
  { id: 2, name: "바가지" },
  { id: 3, name: "가르마" },
  { id: 4, name: "장발" },
  { id: 5, name: "포니테일" },
  { id: 6, name: "트윈테일" },
  { id: 7, name: "둥근 펌" },
  { id: 8, name: "스파이크" },
  { id: 9, name: "모히칸" },
  { id: 10, name: "단발" },
  { id: 11, name: "상투/번" },
  { id: 12, name: "곱슬" },
  { id: 13, name: "앞머리" },
  { id: 14, name: "언더컷" },
  { id: 15, name: "땋은머리" },
  { id: 16, name: "캡모자" },
  { id: 17, name: "헝클어진" },
  { id: 18, name: "웨이브" },
  { id: 19, name: "탑노트" },
];

export const OUTFIT_STYLES = [
  { id: 0, name: "기본 티" },
  { id: 1, name: "후드티" },
  { id: 2, name: "멜빵바지" },
  { id: 3, name: "원피스" },
  { id: 4, name: "정장" },
  { id: 5, name: "줄무늬" },
  { id: 6, name: "나시" },
  { id: 7, name: "니트" },
  { id: 8, name: "우비" },
  { id: 9, name: "조끼" },
  { id: 10, name: "한복풍" },
  { id: 11, name: "목도리" },
  { id: 12, name: "유니폼" },
  { id: 13, name: "앞치마" },
  { id: 14, name: "갑옷조끼" },
  { id: 15, name: "집업" },
  { id: 16, name: "레이어드" },
  { id: 17, name: "롱코트" },
  { id: 18, name: "튜닉" },
  { id: 19, name: "야구점퍼" },
];

export function clampHair(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(HAIR_STYLES.length - 1, Math.floor(n)));
}

export function clampOutfit(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(OUTFIT_STYLES.length - 1, Math.floor(n)));
}

export function clampHairColor(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(HAIR_COLORS.length - 1, Math.floor(n)));
}

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
