// STUB: agent "easter-egg" เขียนของจริงแทน (คง signature เดิม)
import { SANTA_WINDOW } from '../config';

export type SantaWindow = {
  readonly start: { readonly month: number; readonly day: number; readonly hour: number; readonly minute: number };
  readonly end: { readonly month: number; readonly day: number; readonly hour: number; readonly minute: number };
};

/** ตอนนี้อยู่ในช่วง Easter egg ไหม (เวลาท้องถิ่น, start <= now < end) เป็น pure function */
export function isSantaWindow(_now: Date, _window: SantaWindow = SANTA_WINDOW): boolean {
  return false;
}

/**
 * ms จนถึงการโผล่ครั้งถัดไป: first=true ใช้ SANTA_FIRST_DELAY_MS, ไม่งั้นใช้ SANTA_INTERVAL_MS
 * rand คืนค่า [0, 1) ผลลัพธ์อยู่ในช่วง [min, max] เสมอ
 */
export function nextSantaDelayMs(_rand: () => number, _first: boolean): number {
  return Infinity;
}
