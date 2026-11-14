import { GIFT_START_DAY, GROW_DAYS, TREE_HEIGHT_FRAC_FULL, TREE_HEIGHT_FRAC_START, TREE_REF_HEIGHT } from '../config';
import type { TreeShape, TreeTier } from '../types';

// ตารางการเติบโต: ทุกค่าเป็น pure function ของ day (0..25) และไม่ลดลงเมื่อ day เพิ่ม
// ความสูงเพิ่มทุกวัน จึงมีของใหม่อย่างน้อย 1 อย่างต่อวันเสมอ

const clampDay = (day: number) => Math.max(0, Math.min(GROW_DAYS, Math.floor(day)));

/**
 * ความสูงต้น (logical px, ไม่รวมดาว) เมื่อต้นเต็มสูง max: วันที่ 0 = 0, วันที่ 25 = max
 * วันที่ 1 = max * (25% / 80%) แล้วโตเป็นเส้นตรงทุกวัน
 */
export function treeHeight(day: number, max: number = TREE_REF_HEIGHT): number {
  const d = clampDay(day);
  if (d === 0) return 0;
  const start = TREE_HEIGHT_FRAC_START / TREE_HEIGHT_FRAC_FULL;
  return Math.round(max * (start + ((1 - start) * (d - 1)) / (GROW_DAYS - 1)));
}

/** จำนวนเส้น tinsel/garland พาดต้น: เริ่มวันที่ 8 เพิ่มทุก 3 วัน (วันที่ 25 = 6) */
export function tinselCount(day: number): number {
  return Math.max(0, Math.floor((clampDay(day) - 5) / 3));
}

/**
 * ของตกแต่งชิ้นเล็กบนต้น (ไม้เท้าลูกกวาด กระดิ่ง ดาวเล็ก เกล็ดหิมะ วนตาม index):
 * เริ่มวันที่ 7 เพิ่มวันละชิ้น (วันที่ 25 = 19)
 */
export function trinketCount(day: number): number {
  return Math.max(0, clampDay(day) - 6);
}

/** ของวางรอบโคนต้น (ถุงเท้า ขนม ไม้เท้าลูกกวาด โคม/เทียน): เริ่มวันที่ 13 เพิ่มทุก 2 วัน (วันที่ 25 = 7) */
export function groundItemCount(day: number): number {
  return Math.max(0, Math.floor((clampDay(day) - 11) / 2));
}

/** ผ้ารองโคนต้นมาวันที่ 4 */
export function hasSkirt(day: number): boolean {
  return clampDay(day) >= 4;
}

/** จำนวนชั้นใบ: 1 ชั้นตั้งแต่วันที่ 1 เพิ่มทุก 4 วัน สูงสุด 6 ชั้น (วันที่ 21) */
export function tierCount(day: number): number {
  const d = clampDay(day);
  return d === 0 ? 0 : Math.min(6, Math.ceil(d / 4));
}

/** จำนวนไฟประดับ: เริ่มวันที่ 3 เพิ่มวันละ 2 ดวง (วันที่ 25 = 46) */
export function lightCount(day: number): number {
  return Math.max(0, (clampDay(day) - 2) * 2);
}

/** จำนวนลูกบอลประดับ: เริ่มวันที่ 6 (วันที่ 25 = 30) */
export function ornamentCount(day: number): number {
  return Math.max(0, Math.floor((clampDay(day) - 5) * 1.5));
}

/** จำนวนริบบิ้น/โบว์บนต้น: เริ่มวันที่ 12 เพิ่มทุก 2 วัน (วันที่ 25 = 7) */
export function ribbonCount(day: number): number {
  return Math.max(0, Math.floor((clampDay(day) - 10) / 2));
}

/** จำนวนกล่องของขวัญ: เริ่มวันที่ 10 เพิ่มวันละกล่อง (วันที่ 25 = 16) */
export function giftCount(day: number): number {
  return Math.max(0, clampDay(day) - GIFT_START_DAY + 1);
}

/** ดาวบนยอดมาวันที่ 25 */
export function hasStar(day: number): boolean {
  return clampDay(day) >= GROW_DAYS;
}

/** รูปทรงต้นไม้ของวันนั้น เมื่อต้นเต็มสูง max (พิกัดเทียบโคนต้น ดู TreeShape) */
export function getTreeShape(day: number, max: number = TREE_REF_HEIGHT): TreeShape {
  const d = clampDay(day);
  const height = treeHeight(d, max);
  const n = tierCount(d);
  const trunkHeight = height === 0 ? 0 : Math.max(2, Math.round(height * 0.12));
  const trunkHalf = height === 0 ? 0 : Math.max(1, Math.round(height * 0.04));
  const baseHalfWidth = height === 0 ? 0 : Math.max(3, Math.round(height * 0.38));
  const tiers: TreeTier[] = [];
  if (n > 0) {
    const foliage = height - trunkHeight;
    // แต่ละชั้นสูง 1.5 ช่วง ซ้อนทับชั้นบนครึ่งช่วง ชั้นบนสุดจบที่ยอดพอดี
    const step = foliage / (n + 0.5);
    for (let i = 0; i < n; i++) {
      const bottomY = -Math.round(trunkHeight + i * step);
      const topY = i === n - 1 ? -height : -Math.round(trunkHeight + (i + 1.5) * step);
      const bottomHalf = Math.max(2, Math.round(baseHalfWidth * (1 - (0.8 * i) / n)));
      const topHalf = i === n - 1 ? 0 : Math.max(1, Math.round(bottomHalf * 0.35));
      tiers.push({ topY, bottomY, topHalf, bottomHalf });
    }
  }
  return { day: d, height, trunkHeight, trunkHalf, tiers, baseHalfWidth, hasStar: hasStar(d) };
}

/** ครึ่งความกว้างของใบที่ความสูง y (ติดลบ = เหนือพื้น) ของ shape, 0 ถ้าไม่มีใบที่ระดับนั้น */
export function halfWidthAt(shape: TreeShape, y: number): number {
  let best = 0;
  for (const t of shape.tiers) {
    // ชั้นใบถูกวาดที่แถว topY <= y < bottomY (ไม่รวม bottomY)
    if (y >= t.bottomY || y < t.topY) continue;
    const k = t.bottomY === t.topY ? 0 : (t.bottomY - y) / (t.bottomY - t.topY);
    best = Math.max(best, t.bottomHalf + (t.topHalf - t.bottomHalf) * k);
  }
  return best;
}
