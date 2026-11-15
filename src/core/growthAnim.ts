import type { TreeShape } from '../types';

/** ความยาวเอฟเฟกต์ตอนต้นเข้าสู่ขั้นใหม่ (ms) */
export const GROW_POP_MS = 1300;

/** ย่อ/ยืด shape ทุกอย่างที่วาดจาก shape (ใบ ไฟ ของตกแต่ง) จะขยับตามเอง */
export function scaleShape(s: TreeShape, sx: number, sy: number): TreeShape {
  const height = Math.max(1, Math.round(s.height * sy));
  const trunkHeight = Math.min(height, Math.max(1, Math.round(s.trunkHeight * sy)));
  const last = s.tiers.length - 1;
  return {
    ...s,
    height,
    trunkHeight,
    trunkHalf: Math.max(1, Math.round(s.trunkHalf * sx)),
    baseHalfWidth: s.baseHalfWidth * sx,
    tiers: s.tiers.map((t, i) => ({
      topY: i === last ? -height : Math.round(t.topY * sy),
      bottomY: i === 0 ? -trunkHeight : Math.round(t.bottomY * sy),
      topHalf: t.topHalf * sx,
      bottomHalf: t.bottomHalf * sx,
    })),
  };
}

/**
 * ตัวติดตามการโต: เมื่อ day เพิ่มขึ้นจากเฟรมก่อน ต้นจะโตจากขนาดเดิมพร้อมเด้งยืดหดสั้น ๆ (ภาพเท่านั้น ไม่มีเสียง)
 * คืน shape ที่ควรวาดในเฟรมนี้ และ growT = 0..1 ระหว่างเอฟเฟกต์ (null = ไม่ได้เล่น)
 * เฟรมแรกไม่เล่น, day ลดลง = ยกเลิก, reducedMotion = ไม่ย่อ/ยืด แต่ยังคืน growT ให้ layer โชว์ประกายนิ่ง ๆ ได้
 */
export function createGrowthAnim() {
  let prevDay = -1;
  let shownH = 0;
  let fromH = 0;
  let start = -Infinity;

  return (day: number, shape: TreeShape, timeMs: number, reducedMotion: boolean): { tree: TreeShape; growT: number | null } => {
    if (prevDay >= 0 && day > prevDay) {
      start = timeMs;
      fromH = shownH;
    } else if (day < prevDay) {
      start = -Infinity;
    }
    prevDay = day;

    const t = (timeMs - start) / GROW_POP_MS;
    const growT = t >= 0 && t < 1 && shape.height > 0 ? t : null;
    let tree = shape;
    if (growT !== null && !reducedMotion) {
      const ratio = Math.max(0.3, Math.min(1, fromH / shape.height));
      const grow = ratio + (1 - ratio) * (1 - Math.pow(1 - Math.min(1, growT / 0.45), 3));
      const pop = 0.05 * Math.sin(growT * Math.PI * 3) * (1 - growT);
      tree = scaleShape(shape, grow * (1 - pop * 0.6), grow * (1 + pop));
    }
    shownH = tree.height;
    return { tree, growT };
  };
}
