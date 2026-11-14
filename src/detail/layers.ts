// ตารางชั้นรายละเอียดและสถานะตามวัน (pure) เพิ่มชั้นใหม่ = เพิ่มแถวใน DETAIL_LAYERS แล้วเขียนตัววาด
import { GROW_DAYS } from '../config';
import type { DetailLayerDef, DetailLayerState } from '../types';

export const DETAIL_LAYERS: readonly DetailLayerDef[] = [
  { id: 'marketGround', label: 'เนินตลาด', steps: [3], fullDay: 4 },
  { id: 'marketLights', label: 'เสาและสายไฟตลาด', steps: [3, 5, 9, 14], fullDay: 21 },
  { id: 'stalls', label: 'ร้านค้า', steps: [4, 5, 7, 9, 11, 14], fullDay: 21 },
  { id: 'bunting', label: 'สายธง', steps: [6, 10, 15], fullDay: 15 },
  { id: 'people', label: 'ผู้คน', steps: [8, 8, 10, 12, 14, 16, 18, 20, 21, 22, 23, 24], fullDay: 24 },
  { id: 'props', label: 'ลัง ถัง รอยเท้า', steps: [10, 12, 15, 18], fullDay: 18 },
  { id: 'ferris', label: 'ชิงช้าสวรรค์', steps: [13], fullDay: 21 },
  { id: 'litPines', label: 'ต้นสนประดับไฟ', steps: [15, 16, 18, 20], fullDay: 21 },
  { id: 'carolers', label: 'คณะร้องเพลง', steps: [16], fullDay: 20 },
  { id: 'steam', label: 'ไอน้ำและควันจากร้าน', steps: [4], fullDay: 17 },
  { id: 'sparkles', label: 'ประกายแสงลอย', steps: [21, 21, 22, 22, 23, 23, 24, 24], fullDay: 24 },
  { id: 'marketFireworks', label: 'พลุเหนือตลาด', steps: [25], fullDay: 25 },
];

const clampDay = (day: number) => Math.max(0, Math.min(GROW_DAYS, Math.floor(day)));

/** สถานะของชั้นหนึ่งในวันนั้น: ไม่ลดลงเมื่อวันเพิ่ม และค้างที่ค่าของวันที่ 25 หลังจากนั้น */
export function getLayerState(def: DetailLayerDef, day: number): DetailLayerState {
  const d = clampDay(day);
  const unlockDay = def.steps[0];
  const active = d >= unlockDay;
  let count = 0;
  for (const s of def.steps) if (d >= s) count++;
  const span = def.fullDay - unlockDay + 1;
  const intensity = active ? Math.min(1, (d - unlockDay + 1) / Math.max(1, span)) : 0;
  return { id: def.id, label: def.label, unlockDay, active, count, maxCount: def.steps.length, intensity };
}

/** สถานะของทุกชั้นในวันนั้น เรียงตามตาราง */
export function getLayerStates(day: number, defs: readonly DetailLayerDef[] = DETAIL_LAYERS): DetailLayerState[] {
  return defs.map((def) => getLayerState(def, day));
}
