// ต้นคริสต์มาส: ลำต้น ชั้นใบ ของตกแต่ง ดาว และเอฟเฟกต์ตอนโตขึ้น (วาดด้วยโค้ดล้วน)
import { GROW_DAYS } from '../config';
import { drawSprite, mixColor, pixel, rect } from '../core/draw';
import { getTreeShape, halfWidthAt, ornamentCount, ribbonCount } from '../core/growth';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, SceneParams, TreeShape } from '../types';

const NAVY = PALETTE.skyNight[0];
/** ความยาวเอฟเฟกต์ตอนต้นโต (ms) */
const POP_MS = 1300;
const SPARKLES = 9;
/** ระยะห่างจากขอบใบของลูกบอล/โบว์ (px) */
const ORN_MARGIN = 3;
const BOW_MARGIN = 4;

// channel ของ hashRand (แยกกันเพื่อไม่ให้ค่าสุ่มซ้ำ)
const CH = { jagL: 10, jagR: 11, speck: 12, teeth: 13, snow: 20, orn: 30, ornColor: 32, bow: 40, bowColor: 42, spark: 50 };

const MOUND = ['...he...', '..sees..', '.ssssss.', 'ssdsssds'];
const BAUBLE = ['hcc', 'ccc', 'ccd'];
const BOW = ['cc.cc', 'cckcc', '.d.d.'];
const STAR = ['...g...', '...s...', 'sssssss', '.sssss.', '..sss..', '.ss.ss.', '.s...s.'];

// [สีหลัก, สีเงา] ของลูกบอล และ [สีโบว์, สีหาง, สีปม]
const BAUBLE_COLORS = [
  [PALETTE.red, PALETTE.redDark],
  [PALETTE.gold, PALETTE.goldDark],
  [PALETTE.white, PALETTE.snowShade],
  [PALETTE.lights[2], PALETTE.giftColors[1]],
] as const;
const BOW_COLORS = [
  [PALETTE.red, PALETTE.redDark, PALETTE.gold],
  [PALETTE.gold, PALETTE.goldDark, PALETTE.red],
  [PALETTE.white, PALETTE.snowShade, PALETTE.red],
] as const;

/** ย่อ/ยืด shape (ใช้ตอนเล่นเอฟเฟกต์โต) ทุกอย่างที่วาดจาก shape จะขยับตามเอง */
function scaleShape(s: TreeShape, sx: number, sy: number): TreeShape {
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

type Slot = readonly [h: number, v: number];

/** แมปตำแหน่งสัดส่วน (h = ความสูงในพุ่มใบ 0..1, v = ซ้ายขวา -1..1) ลง shape ปัจจุบัน */
function toPx(s: TreeShape, [h, v]: Slot, margin: number): [number, number] | null {
  const y = -Math.round(s.trunkHeight + 1 + h * (s.height - s.trunkHeight));
  const hw = halfWidthAt(s, y) - margin;
  return hw < 0 ? null : [Math.round(v * hw), y];
}

/**
 * ตำแหน่งสัดส่วนตายตัวของของตกแต่งทุกชิ้น (คำนวณครั้งเดียว)
 * ชิ้นที่ i เลือกจากตัวเลือก hashRand หลายค่า เอาค่าที่ห่างจากชิ้นก่อนหน้ามากสุดบนต้นโตเต็มที่ (ไม่กระจุก)
 * ขึ้นกับชิ้นก่อนหน้าเท่านั้น จึงไม่สลับที่เมื่อ day เพิ่ม
 */
function layout(seed: number): { orn: Slot[]; bow: Slot[] } {
  const ref = getTreeShape(GROW_DAYS);
  const placed: [number, number][] = [];
  const make = (count: number, ch: number, margin: number): Slot[] =>
    Array.from({ length: count }, (_, i) => {
      let best: Slot = [0, 0];
      let bestPx: [number, number] = [0, 0];
      let bestD = -1;
      for (let k = 0; k < 12; k++) {
        // sqrt ชดเชยทรงสามเหลี่ยม: ยอดแคบได้ของน้อยกว่าโคน (สูงสุดราว 81% ของพุ่มใบ)
        const slot: Slot = [
          0.03 + (1 - Math.sqrt(1 - 0.95 * hashRand(seed, i * 16 + k, ch))),
          hashRand(seed, i * 16 + k, ch + 1) * 2 - 1,
        ];
        const px = toPx(ref, slot, margin);
        if (!px) continue;
        let d = Infinity;
        for (const q of placed) d = Math.min(d, Math.hypot(q[0] - px[0], q[1] - px[1]));
        if (d > bestD) {
          best = slot;
          bestPx = px;
          bestD = d;
        }
      }
      placed.push(bestPx);
      return best;
    });
  return { orn: make(ornamentCount(GROW_DAYS), CH.orn, ORN_MARGIN), bow: make(ribbonCount(GROW_DAYS), CH.bow, BOW_MARGIN) };
}

export function createTree(): SceneLayer {
  let prevDay = -1; // -1 = ยังไม่เคยวาด (เฟรมแรกไม่เล่นเอฟเฟกต์)
  let shownH = 0; // ความสูงที่วาดจริงเฟรมก่อน (จุดเริ่มของเอฟเฟกต์โต)
  let fromH = 0;
  let animStart = -Infinity;
  let slots: ReturnType<typeof layout> | undefined;
  let slotsSeed = NaN;

  return {
    render(p: SceneParams): void {
      const { ctx, seed } = p;
      const ox = p.centerX;
      const oy = p.groundY;
      const dark = p.daylight.darkness;
      const dim = (c: string, k = 0.45) => mixColor(c, NAVY, dark * k);

      if (prevDay >= 0 && p.day > prevDay) {
        animStart = p.timeMs;
        fromH = shownH;
      } else if (p.day < prevDay) {
        animStart = -Infinity;
      }
      prevDay = p.day;

      // ---------- วันที่ 0: กองดินกับเมล็ด ----------
      if (p.tree.height === 0) {
        shownH = 0;
        drawSprite(
          ctx,
          MOUND,
          { s: dim(PALETTE.soil), d: dim(PALETTE.trunkDark), e: dim(PALETTE.seed, 0.3), h: dim(PALETTE.starGlow, 0.3) },
          ox - 4,
          oy - MOUND.length,
        );
        return;
      }

      // ---------- เอฟเฟกต์โต: โตจากขนาดเดิม + เด้งยืดหด ----------
      const t = (p.timeMs - animStart) / POP_MS;
      const animating = t >= 0 && t < 1;
      let s = p.tree;
      if (animating && !p.reducedMotion) {
        const ratio = Math.max(0.3, Math.min(1, fromH / s.height));
        const grow = ratio + (1 - ratio) * (1 - Math.pow(1 - Math.min(1, t / 0.45), 3));
        const amp = Math.min(0.25, Math.max(0.06, 1.5 / s.height));
        const pop = amp * Math.sin(t * Math.PI * 3) * (1 - t);
        s = scaleShape(s, grow * (1 - pop * 0.6), grow * (1 + pop));
      }
      shownH = s.height;

      // ---------- ลำต้น (ยื่นขึ้นไปหลังชายใบ 1 แถว) ----------
      const tw = s.trunkHalf * 2 + 1;
      rect(ctx, ox - s.trunkHalf, oy - s.trunkHeight - 1, tw, s.trunkHeight + 1, dim(PALETTE.trunk));
      rect(ctx, ox + s.trunkHalf - Math.floor(s.trunkHalf / 2), oy - s.trunkHeight - 1, Math.floor(s.trunkHalf / 2) + 1, s.trunkHeight + 1, dim(PALETTE.trunkDark));
      if (s.trunkHeight > 2) rect(ctx, ox - s.trunkHalf, oy - s.trunkHeight, tw, 1, dim(PALETTE.trunkDark));

      // ---------- ชั้นใบ: ล่างขึ้นบน ชั้นบนทับชั้นล่าง ----------
      // 0 = ใต้ชั้น (มืดสุด), 1 = ด้านเงา, 2 = กลาง, 3 = ด้านรับแสง
      const shades = [dim(PALETTE.leafDark), dim(PALETTE.leafMid), dim(PALETTE.leaf), dim(PALETTE.leafLight)];
      s.tiers.forEach((tier, ti) => {
        const rows = tier.bottomY - tier.topY;
        const under = rows >= 6 ? 2 : rows >= 3 ? 1 : 0;
        for (let y = tier.topY; y < tier.bottomY; y++) {
          const rb = tier.bottomY - 1 - y; // แถวนับจากชายล่างของชั้น
          const w = tier.bottomHalf + (tier.topHalf - tier.bottomHalf) * (rows > 1 ? rb / (rows - 1) : 0);
          const key = ti * 100 + rb;
          // ขอบหยัก: แต่ละแถวหด/ยื่น 1px แบบสุ่มคงที่
          const jag = (ch: number) => {
            if (w < 3) return 0;
            const r = hashRand(seed, key, ch);
            return r < 0.3 ? -1 : r > 0.85 ? 1 : 0;
          };
          const wl = Math.round(w) + jag(CH.jagL);
          const wr = Math.round(w) + jag(CH.jagR);
          const teeth = rb === 0 && rows >= 3 && w >= 3; // ชายล่างเป็นซี่ฟัน
          const litTo = -wl + Math.floor(w * 0.25);
          let runStart = -wl;
          let runShade = -1;
          for (let x = -wl; x <= wr + 1; x++) {
            let sh = -1; // -1 = โปร่งใส
            if (x <= wr && !(teeth && hashRand(seed, key * 128 + x + 64, CH.teeth) < 0.4)) {
              sh = rb < under ? 0 : w >= 3 && x <= litTo ? 3 : x > w * 0.3 ? 1 : 2;
              const r = hashRand(seed, key * 128 + x + 64, CH.speck);
              if (r < 0.1) sh = Math.max(0, sh - 1);
              else if (r > 0.92) sh = Math.min(3, sh + 1);
            }
            if (sh !== runShade) {
              if (runShade >= 0) rect(ctx, ox + runStart, oy + y, x - runStart, 1, shades[runShade]);
              runStart = x;
              runShade = sh;
            }
          }
        }
      });

      // ---------- หิมะเกาะขอบชั้น ----------
      const snow = dim(PALETTE.snow, 0.35);
      const snowShade = dim(PALETTE.snowShade, 0.35);
      s.tiers.forEach((tier, ti) => {
        const rows = tier.bottomY - tier.topY;
        if (tier.bottomHalf < 6 || rows < 4) return;
        for (let j = 0; j < 2 + (ti % 2); j++) {
          const side = (j + ti) % 2 ? 1 : -1;
          const ax = Math.round((0.6 + 0.35 * hashRand(seed, ti * 8 + j, CH.snow)) * tier.bottomHalf);
          const f = (tier.bottomHalf - ax) / (tier.bottomHalf - tier.topHalf);
          const y = oy + Math.round(tier.bottomY - 1 - f * (rows - 1));
          rect(ctx, ox + (side > 0 ? ax - 2 : -ax), y, 3, 1, snow);
          pixel(ctx, ox + side * (ax - 1), y + 1, snowShade);
        }
      });

      // ---------- ลูกบอล ----------
      if (!slots || slotsSeed !== seed) {
        slots = layout(seed);
        slotsSeed = seed;
      }
      const hi = dim('#ffffff', 0.2);
      for (let i = 0, n = ornamentCount(p.day); i < n; i++) {
        const pos = toPx(s, slots.orn[i], ORN_MARGIN);
        if (!pos) continue;
        const [c, d] = BAUBLE_COLORS[Math.floor(hashRand(seed, i, CH.ornColor) * BAUBLE_COLORS.length)];
        drawSprite(ctx, BAUBLE, { c: dim(c, 0.25), d: dim(d, 0.25), h: hi }, ox + pos[0] - 1, oy + pos[1] - 1);
      }

      // ---------- โบว์ ----------
      for (let i = 0, n = ribbonCount(p.day); i < n; i++) {
        const pos = toPx(s, slots.bow[i], BOW_MARGIN);
        if (!pos) continue;
        const [c, d, k] = BOW_COLORS[Math.floor(hashRand(seed, i, CH.bowColor) * BOW_COLORS.length)];
        drawSprite(ctx, BOW, { c: dim(c, 0.25), d: dim(d, 0.25), k: dim(k, 0.25) }, ox + pos[0] - 2, oy + pos[1] - 1);
      }

      // ---------- ดาว (ไม่หรี่ตอนกลางคืน) + แสงเรืองเต้นช้าๆ ----------
      if (s.hasStar) {
        const cy = oy - s.height - 3;
        const pulse = p.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(p.timeMs / 700);
        ctx.globalAlpha = (0.12 + 0.12 * pulse) * (0.6 + 0.4 * dark);
        rect(ctx, ox - 5, cy - 1, 11, 3, PALETTE.starGlow);
        rect(ctx, ox - 1, cy - 5, 3, 11, PALETTE.starGlow);
        rect(ctx, ox - 3, cy - 3, 7, 7, PALETTE.starGlow);
        ctx.globalAlpha = 1;
        drawSprite(ctx, STAR, { s: PALETTE.star, g: PALETTE.starGlow }, ox - 3, cy - 3);
        pixel(ctx, ox, cy, PALETTE.starGlow);
      }

      // ---------- ประกายรอบต้นตอนโต (reduced motion: จุดนิ่งสั้นๆ) ----------
      if (animating && (!p.reducedMotion || t < 0.45)) {
        for (let j = 0; j < SPARKLES; j++) {
          const idx = p.day * 16 + j;
          const y = -Math.round((0.3 + 0.75 * hashRand(seed, idx, CH.spark)) * s.height);
          const side = j % 2 ? 1 : -1;
          const x = ox + side * Math.round(halfWidthAt(s, y) + 2 + 3 * hashRand(seed, idx, CH.spark + 1));
          const color = j % 3 ? PALETTE.starGlow : PALETTE.white;
          if (p.reducedMotion) {
            pixel(ctx, x, oy + y, color);
            continue;
          }
          // แต่ละดวงกะพริบคนละจังหวะ: จุด -> กากบาท -> จุด
          const local = t * 2 - hashRand(seed, idx, CH.spark + 2);
          if (local < 0 || local >= 1) continue;
          pixel(ctx, x, oy + y, color);
          if (local > 0.3 && local < 0.7) {
            rect(ctx, x - 1, oy + y, 3, 1, color);
            rect(ctx, x, oy + y - 1, 1, 3, color);
          }
        }
      }
    },
  };
}
