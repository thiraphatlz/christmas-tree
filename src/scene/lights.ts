import { GROW_DAYS } from '../config';
import { mixColor } from '../core/draw';
import { halfWidthAt, lightCount } from '../core/growth';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, TreeShape } from '../types';

const COLORS = PALETTE.lights;
const DIM = COLORS.map((c) => mixColor(c, PALETTE.leafDark, 0.55)); // สีหลอดตอนหรี่
const MAX = lightCount(GROW_DAYS);
/** จำนวนซิกแซกคงที่ (ค่าของต้นวันที่ 25) หลอดเดิมจึงไม่สลับข้างเมื่อต้นโต */
const ZIGS = 10;
/** คลื่นสามเหลี่ยม คาบ 2 ช่วงค่า -1..1 */
const tri = (s: number) => {
  const m = s % 2;
  return m < 1 ? 2 * m - 1 : 3 - 2 * m;
};

/** x ของสายไฟ (เทียบแกนลำต้น) ที่แถว y: t = 0 ที่ยอด, 1 ที่ชายใบล่าง */
const wireX = (tree: TreeShape, y: number, t: number, zigs: number) =>
  Math.round(tri(t * zigs) * Math.max(0, halfWidthAt(tree, y) - 1) * 0.9);

/** สายไฟพันต้นไม้ วาดทับต้นไม้ จำนวนดวงจาก lightCount(day) */
export function createLights(): SceneLayer {
  // ค่าคงที่ของหลอด i: [ตำแหน่งบนสาย 0..1, ความถี่กะพริบ rad/ms, เฟส] + index สี
  let bulbs: Float32Array | null = null;
  let colorIdx: Uint8Array | null = null;
  let bulbSeed = 0;

  return {
    render(p) {
      const { ctx, tree, seed } = p;
      const count = Math.min(MAX, lightCount(p.day));
      if (count === 0 || tree.tiers.length === 0) return;
      const yTop = -tree.height + 2;
      const yBot = tree.tiers[0].bottomY - 1;
      const rows = yBot - yTop;
      if (rows < 1) return;

      if (!bulbs || !colorIdx || bulbSeed !== seed) {
        bulbSeed = seed;
        bulbs = new Float32Array(MAX * 3);
        colorIdx = new Uint8Array(MAX);
        const offset = hashRand(seed, 0, 20);
        for (let i = 0; i < MAX; i++) {
          // อัตราส่วนทองกระจายหลอดสม่ำเสมอ และหลอดเก่าไม่ขยับเมื่อเพิ่มหลอดใหม่
          // sqrt เพราะสายช่วงล่างยาวกว่า (ต้นกว้างกว่า)
          bulbs[i * 3] = Math.sqrt((offset + i * 0.6180339887) % 1);
          bulbs[i * 3 + 1] = (Math.PI * 2) / (900 + hashRand(seed, i, 21) * 1600);
          bulbs[i * 3 + 2] = hashRand(seed, i, 22) * Math.PI * 2;
          colorIdx[i] = Math.floor(hashRand(seed, i, 23) * COLORS.length);
        }
      }

      const zigs = ZIGS;
      const ox = p.centerX;
      const oy = p.groundY;

      // สายไฟ: ต่อแต่ละแถวกับแถวก่อนหน้าด้วยเส้นแนวนอน ให้เป็นขั้นบันไดต่อเนื่อง
      // ต้นเล็กเกินไป (ซิกแซกถี่กว่า 4 แถว) ไม่วาดสาย เหลือแต่หลอด
      if (rows / zigs >= 4) {
        ctx.fillStyle = PALETTE.leafDark;
        let prev = wireX(tree, yTop, 0, zigs);
        for (let y = yTop; y <= yBot; y++) {
          const x = wireX(tree, y, (y - yTop) / rows, zigs);
          // จำกัดปลายทั้งสองไม่ให้ยื่นพ้นใบของแถวนี้
          const lim = Math.max(0, Math.floor(halfWidthAt(tree, y)) - 1);
          const a = Math.max(-lim, Math.min(lim, prev));
          ctx.fillRect(ox + Math.min(a, x), oy + y, Math.abs(x - a) + 1, 1);
          prev = x;
        }
      }

      // หลอดไฟ
      const dark = p.daylight.darkness;
      const big = p.scale >= 1.2;
      const sz = big ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const t = bulbs[i * 3];
        const y = Math.round(yTop + rows * t);
        const x = ox + wireX(tree, y, (y - yTop) / rows, zigs);
        const sy = oy + y;
        const blink = p.reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(p.timeMs * bulbs[i * 3 + 1] + bulbs[i * 3 + 2]);
        const c = colorIdx[i];

        const halo = 0.3 * dark * blink;
        if (halo > 0.02) {
          // ฮาโลเป็นรูปข้าวหลามตัด รัศมี ~3 (ของ 1px: กากบาทเล็ก)
          ctx.fillStyle = COLORS[c];
          ctx.globalAlpha = halo;
          if (big) {
            ctx.fillRect(x - 2, sy - 1, 6, 4);
            ctx.globalAlpha = halo * 0.6;
            ctx.fillRect(x - 3, sy, 8, 2);
            ctx.fillRect(x, sy - 2, 2, 6);
          } else {
            ctx.fillRect(x - 1, sy, 3, 1);
            ctx.fillRect(x, sy - 1, 1, 3);
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = DIM[c];
        ctx.fillRect(x, sy, sz, sz);
        // กลางวันสว่างสุดแค่ครึ่งเดียว กลางคืนสว่างเต็ม
        ctx.globalAlpha = blink * (0.5 + 0.5 * dark);
        ctx.fillStyle = COLORS[c];
        ctx.fillRect(x, sy, sz, sz);
      }
      ctx.globalAlpha = 1;
    },
  };
}
