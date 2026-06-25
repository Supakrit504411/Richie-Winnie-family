import type { AppState } from '@/lib/types';

export const CHAR_LEVELS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 50 },
  { level: 3, xp: 150 },
  { level: 4, xp: 300 },
  { level: 5, xp: 500 },
  { level: 6, xp: 800 },
];

export const HOUSE_LEVELS = [
  { level: 1, name: 'เต็นท์', emoji: '⛺' },
  { level: 2, name: 'บ้านเล็ก', emoji: '🏠' },
  { level: 3, name: 'บ้านใหญ่', emoji: '🏡' },
  { level: 4, name: 'ปราสาทเล็ก', emoji: '🏰' },
  { level: 5, name: 'ปราสาท', emoji: '🏯' },
];

export const CAR_LEVELS = [
  { level: 1, name: 'รถจักรยาน', emoji: '🚲' },
  { level: 2, name: 'รถมอเตอร์ไซค์', emoji: '🏍️' },
  { level: 3, name: 'รถยนต์', emoji: '🚗' },
  { level: 4, name: 'รถสปอร์ต', emoji: '🏎️' },
  { level: 5, name: 'รถสูตรหนึ่ง', emoji: '🚀' },
];

export const HOUSE_COSTS = [120, 250, 400, 600];
export const CAR_COSTS = [100, 220, 380, 550];

export const CHILD_AVATARS = ['🐯', '🦁', '🐰', '🐻', '🦊', '🐼', '🐨', '🐸', '🦄', '🐙', '🦋', '🐝'];

export function uid(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function todayStr(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function fmtCoin(n: number): string {
  return `${n.toLocaleString()} เหรียญ`;
}

export function charLevelInfo(xp: number) {
  let level = 1;
  for (let i = CHAR_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= CHAR_LEVELS[i].xp) {
      level = CHAR_LEVELS[i].level;
      break;
    }
  }
  const current = CHAR_LEVELS.find(l => l.level === level)!;
  const next = CHAR_LEVELS.find(l => l.level === level + 1);
  const progress = next
    ? ((xp - current.xp) / (next.xp - current.xp)) * 100
    : 100;
  return { level, progress, current, next };
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function freshState(): AppState {
  return {
    parentPin: '1234',
    children: [],
    missions: defaultMissions(),
    shop: defaultShop(),
    submissions: [],
    redemptions: [],
    history: [],
  };
}

export function defaultMissions(): AppState['missions'] {
  return [
    { id: uid('m'), title: 'ตื่นก่อน 06:15 น.', icon: '⏰', type: 'daily' as const, deadline: '06:15', coin: 15, xp: 15, active: true },
    { id: uid('m'), title: 'แปรงฟันเช้า-เย็น', icon: '🦷', type: 'daily' as const, deadline: '20:00', coin: 10, xp: 10, active: true },
    { id: uid('m'), title: 'เก็บเตียงนอน', icon: '🛏️', type: 'daily' as const, deadline: '07:00', coin: 10, xp: 10, active: true },
    { id: uid('m'), title: 'ช่วยงานบ้าน 1 อย่าง', icon: '🧹', type: 'daily' as const, deadline: '18:00', coin: 20, xp: 20, active: true },
    { id: uid('m'), title: 'อ่านหนังสือ 15 นาที', icon: '📚', type: 'daily' as const, deadline: '21:00', coin: 15, xp: 15, active: true },
  ];
}

export function defaultShop() {
  return [
    { id: uid('s'), name: 'ไปสวนน้ำ', icon: '🌊', cost: 350 },
    { id: uid('s'), name: 'เลือกอาหารเย็น 1 อย่าง', icon: '🍕', cost: 200 },
    { id: uid('s'), name: 'ดูทีวีเพิ่ม 30 นาที', icon: '📺', cost: 150 },
    { id: uid('s'), name: 'ไปห้างกับครอบครัว', icon: '🛒', cost: 250 },
    { id: uid('s'), name: 'เลือกภาพยนตร์ดู', icon: '🎬', cost: 180 },
    { id: uid('s'), name: 'ขนมพิเศษ', icon: '🍦', cost: 100 },
  ];
}
