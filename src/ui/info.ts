// ข้อความของแผงข้อมูล (pure ไม่แตะ DOM ทดสอบได้ง่าย)
import { GROW_DAYS } from '../config';
import { msUntilChristmas, msUntilDec1, splitDuration } from '../core/date';
import type { DaylightMode } from '../types';

export const DAYLIGHT_LABEL: Record<DaylightMode, string> = {
  auto: 'อัตโนมัติ',
  day: 'กลางวัน',
  night: 'กลางคืน',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** เช่น "อีก 3 วัน 04 ชม. 05 นาที 06 วินาที" */
export function formatCountdown(ms: number): string {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  return `อีก ${days} วัน ${pad(hours)} ชม. ${pad(minutes)} นาที ${pad(seconds)} วินาที`;
}

/** หัวข้อและบรรทัดนับถอยหลัง ใช้ now จาก state เสมอ (อาจเป็นวันจำลอง) */
export function infoText(day: number, now: Date): { title: string; count: string } {
  if (day === 0) {
    return { title: 'เมล็ดกำลังรอวันที่ 1 ธันวาคม', count: `เริ่มงอก${formatCountdown(msUntilDec1(now))}` };
  }
  if (day >= GROW_DAYS) {
    return { title: 'สุขสันต์วันคริสต์มาส!', count: `วันที่ ${GROW_DAYS} จาก ${GROW_DAYS} ต้นไม้โตเต็มที่แล้ว` };
  }
  return {
    title: `วันที่ ${day} จาก ${GROW_DAYS}`,
    count: `${formatCountdown(msUntilChristmas(now))} ถึงคริสต์มาส`,
  };
}
