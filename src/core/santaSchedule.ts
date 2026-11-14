import { SANTA_FIRST_DELAY_MS, SANTA_INTERVAL_MS, SANTA_WINDOW } from '../config';

export type SantaWindow = {
  readonly start: { readonly month: number; readonly day: number; readonly hour: number; readonly minute: number };
  readonly end: { readonly month: number; readonly day: number; readonly hour: number; readonly minute: number };
};

/** ตอนนี้อยู่ในช่วง Easter egg ไหม (เวลาท้องถิ่น, start <= now < end) เป็น pure function */
export function isSantaWindow(now: Date, window: SantaWindow = SANTA_WINDOW): boolean {
  const year = now.getFullYear();
  const at = (m: SantaWindow['start']) => new Date(year, m.month - 1, m.day, m.hour, m.minute).getTime();
  const t = now.getTime();
  return at(window.start) <= t && t < at(window.end);
}

/**
 * ms จนถึงการโผล่ครั้งถัดไป: first=true ใช้ SANTA_FIRST_DELAY_MS, ไม่งั้นใช้ SANTA_INTERVAL_MS
 * rand คืนค่า [0, 1) ผลลัพธ์อยู่ในช่วง [min, max] เสมอ
 */
export function nextSantaDelayMs(rand: () => number, first: boolean): number {
  const { min, max } = first ? SANTA_FIRST_DELAY_MS : SANTA_INTERVAL_MS;
  return min + rand() * (max - min);
}
