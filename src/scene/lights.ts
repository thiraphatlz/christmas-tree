import { GROW_DAYS } from '../config';
import { mixColor } from '../core/draw';
import { halfWidthAt, lightCount } from '../core/growth';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, TreeShape } from '../types';

const COLORS = PALETTE.lights;
const DIM = COLORS.map((c) => mixColor(c, PALETTE.leafDark, 0.55)); // สีหลอดตอนหรี่
const MAX = lightCount(GROW_DAYS);

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

      const zigs = Math.max(1, Math.round(rows / 8));
      const ox = p.centerX;
      const oy = p.groundY;

      // สายไฟ: ต่อแต่ละแถวกับแถวก่อนหน้าด้วยเส้นแนวนอน ให้เป็นขั้นบันไดต่อเนื่อง
      ctx.fillStyle = PALETTE.leafDark;
      let prev = wireX(tree, yTop, 0, zigs);
      for (let y = yTop; y <= yBot; y++) {
        const x = wireX(tree, y, (y - yTop) / rows, zigs);
        const lo = Math.min(prev, x);
        ctx.fillRect(ox + lo, oy + y, Math.abs(x - prev) + 1, 1);
        prev = x;
      }

      // หลอดไฟ
      const dark = p.daylight.darkness;
      for (let i = 0; i < count; i++) {
        const t = bulbs[i * 3];
        const y = Math.round(yTop + rows * t);
        const x = ox + wireX(tree, y, (y - yTop) / rows, zigs);
        const sy = oy + y;
        const blink = p.reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(p.timeMs * bulbs[i * 3 + 1] + bulbs[i * 3 + 2]);
        const c = colorIdx[i];

        ctx.fillStyle = COLORS[c];
        const halo = 0.35 * dark * blink;
        if (halo > 0.02) {
          ctx.globalAlpha = halo;
          ctx.fillRect(x - 1, sy, 3, 1);
          ctx.fillRect(x, sy - 1, 1, 3);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = DIM[c];
        ctx.fillRect(x, sy, 1, 1);
        // กลางวันสว่างสุดแค่ครึ่งเดียว กลางคืนสว่างเต็ม
        ctx.globalAlpha = blink * (0.5 + 0.5 * dark);
        ctx.fillStyle = COLORS[c];
        ctx.fillRect(x, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
    },
  };
}
