import { GROW_DAYS } from '../config';

/** วันของการเติบโต: 0 = ก่อน 1 ธ.ค. (ม.ค. ถึง พ.ย.), 1..25 = 1 ถึง 25 ธ.ค., 26 ถึง 31 ธ.ค. ค้างที่ 25 */
export function getDay(now: Date): number {
  if (now.getMonth() !== 11) return 0;
  return Math.min(now.getDate(), GROW_DAYS);
}

/** progress 0..1 = day / 25 */
export function getProgress(now: Date): number {
  return getDay(now) / GROW_DAYS;
}

/** ms จนถึง 1 ธ.ค. 00:00 ของปีนี้ (0 ถ้าถึงแล้ว) */
export function msUntilDec1(now: Date): number {
  return Math.max(0, new Date(now.getFullYear(), 11, 1).getTime() - now.getTime());
}

/** ms จนถึง 25 ธ.ค. 00:00 ของปีนี้ (0 ถ้าถึงแล้ว) */
export function msUntilChristmas(now: Date): number {
  return Math.max(0, new Date(now.getFullYear(), 11, 25).getTime() - now.getTime());
}

/** แยก ms เป็น วัน/ชั่วโมง/นาที/วินาที สำหรับแสดงนับถอยหลัง */
export function splitDuration(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** ชั่วโมงท้องถิ่นแบบทศนิยม 0..24 */
export function fractionalHour(now: Date): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

/**
 * วันเวลาจำลองจาก query string: ?date=YYYY-MM-DD และ ?time=HH:mm (เวลาท้องถิ่น)
 * ส่วนที่ไม่ระบุหรือรูปแบบผิดจะใช้ค่าจาก realNow
 */
export function parseSimulatedNow(search: string, realNow: Date): Date {
  const q = new URLSearchParams(search);
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.get('date') ?? '');
  const t = /^(\d{1,2}):(\d{2})$/.exec(q.get('time') ?? '');
  const out = new Date(realNow);
  if (d) out.setFullYear(+d[1], +d[2] - 1, +d[3]);
  if (t && +t[1] < 24 && +t[2] < 60) out.setHours(+t[1], +t[2], 0, 0);
  return out;
}
