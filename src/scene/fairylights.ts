import { mixColor } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

const COLORS = PALETTE.lights;
const DIM = COLORS.map((c) => mixColor(c, PALETTE.trunkDark, 0.55));
const TOP_LIMIT = 12; // ไม่ล้ำลงมาเกินนี้ จะได้ไม่ทับดาว

/** fairy lights พาดขอบบนของจอ กะพริบเป็นจังหวะต่างกัน (วาดหน้าต้นไม้ ก่อนหิมะชั้นใกล้) */
export function createFairyLights(): SceneLayer {
  let key = '';
  let wire: Uint8Array = new Uint8Array(0); // y ของสายแต่ละคอลัมน์
  let bx: number[] = [];
  let by: number[] = [];
  let bc: number[] = [];
  let bf: number[] = []; // ความถี่ rad/ms
  let bp: number[] = []; // เฟส

  return {
    render(p) {
      const { ctx, width, seed } = p;
      const k = `${seed}|${width}`;
      if (k !== key) {
        key = k;
        wire = new Uint8Array(width);
        bx = [];
        by = [];
        bc = [];
        bf = [];
        bp = [];
        const swags = width < 200 ? 2 : 3 + Math.floor(hashRand(seed, 0, 60) * 3); // 3..5
        let idx = 0;
        for (let s = 0; s < swags; s++) {
          const x0 = Math.round((s * width) / swags);
          const x1 = Math.round(((s + 1) * width) / swags);
          const len = Math.max(1, x1 - x0);
          const depth = 5 + Math.floor(hashRand(seed, s, 61) * 4); // 5..8 (บวกหลอด 2px ยังไม่เกิน 12)
          for (let x = x0; x < x1; x++) {
            const t = (2 * (x - x0)) / len - 1;
            wire[x] = 1 + Math.round(depth * (1 - t * t));
          }
          // หลอดทุก 6-8 px เริ่มห่างจุดแขวนเล็กน้อย
          let x = x0 + 4;
          while (x < x1 - 3) {
            bx.push(x);
            by.push(wire[x] + 1);
            bc.push(Math.floor(hashRand(seed, idx, 62) * COLORS.length));
            bf.push((Math.PI * 2) / (700 + hashRand(seed, idx, 63) * 1500));
            bp.push(hashRand(seed, idx, 64) * Math.PI * 2);
            x += 6 + Math.floor(hashRand(seed, idx, 65) * 3);
            idx++;
          }
        }
      }

      const dark = p.daylight.darkness;
      // สาย 1px (รวมคอลัมน์ติดกันที่ y เท่ากัน)
      ctx.fillStyle = PALETTE.trunkDark;
      let run = 0;
      for (let x = 1; x <= width; x++) {
        if (x === width || wire[x] !== wire[run]) {
          ctx.fillRect(run, wire[run], x - run, 1);
          run = x;
        }
      }

      for (let i = 0; i < bx.length; i++) {
        const x = bx[i];
        const y = Math.min(by[i], TOP_LIMIT - 2);
        const c = bc[i];
        const blink = p.reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(p.timeMs * bf[i] + bp[i]);
        const halo = 0.3 * dark * blink;
        if (halo > 0.02) {
          ctx.fillStyle = COLORS[c];
          ctx.globalAlpha = halo;
          ctx.fillRect(x - 1, y - 1, 4, 4);
          ctx.globalAlpha = halo * 0.5;
          ctx.fillRect(x - 2, y, 6, 2);
          ctx.fillRect(x, y - 2, 2, 6);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = DIM[c];
        ctx.fillRect(x, y, 2, 2);
        ctx.globalAlpha = blink * (0.5 + 0.5 * dark);
        ctx.fillStyle = COLORS[c];
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    },
  };
}
