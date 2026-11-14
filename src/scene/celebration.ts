import { hasStar } from '../core/growth';
import { pixel } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, SceneParams } from '../types';

/** ประกาย/พลุเล็ก ๆ ลอยขึ้นเบา ๆ ในวันที่ 25 (วาดบนท้องฟ้า หลังต้นไม้) */

const SLOTS = 5;
const SPARKLES = 9;
const RISE_MS = 1500;
const BURST_MS = 1500;
const COLORS = [...PALETTE.lights, PALETTE.gold, PALETTE.star];
// ทิศวงแหวน 8 ทิศ (ทแยงใช้ 0.7 ของรัศมี)
const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 0.7], [-1, 1, 0.7], [1, -1, 0.7], [-1, -1, 0.7],
];

interface Slot {
  period: number;
  phase: number;
  cycle: number;
  x: number;
  y: number;
  color: string;
  big: boolean;
}

export function createCelebration(): SceneLayer {
  let key = '';
  let slots: Slot[] = [];
  let sparks: { x: number; y: number; phase: number; color: string }[] = [];
  let lo = 0;
  let hi = 0;
  let topY = 0;
  let botY = 0;

  const zone = (p: SceneParams) => {
    // พื้นที่ว่างสองข้างต้น: เว้นแกนกลาง 0.4*treeMax ถ้าจอแคบก็ลดลงให้เหลือที่พอ
    const ex = Math.min(0.4 * p.treeMax, Math.max(6, p.centerX - 20));
    topY = 22;
    botY = Math.max(topY + 6, Math.round(p.groundY - p.treeMax * 0.6));
    lo = 8;
    hi = p.width - 8;
    return ex;
  };
  // x ฝั่ง side (0 ซ้าย 1 ขวา) จากค่าสุ่ม r
  const pickX = (p: SceneParams, ex: number, side: number, r: number) => {
    const a = side ? p.centerX + ex : lo;
    const b = side ? hi : p.centerX - ex;
    return Math.round(a + r * Math.max(0, b - a));
  };

  const build = (p: SceneParams) => {
    const ex = zone(p);
    slots = [];
    for (let j = 0; j < SLOTS; j++) {
      slots.push({ period: 5200 + Math.floor(hashRand(p.seed, j, 500) * 1800), phase: Math.floor(hashRand(p.seed, j, 501) * 6000), cycle: -1, x: 0, y: 0, color: '', big: false });
    }
    sparks = [];
    for (let i = 0; i < SPARKLES; i++) {
      sparks.push({
        x: pickX(p, ex, i % 2, hashRand(p.seed, i, 510)),
        y: topY + Math.floor(hashRand(p.seed, i, 511) * (botY - topY + 14)),
        phase: hashRand(p.seed, i, 512) * 6.283,
        color: i % 3 === 0 ? PALETTE.gold : PALETTE.white,
      });
    }
  };

  return {
    render(p) {
      if (!hasStar(p.day) || p.tree.height <= 0) return;
      const { ctx } = p;
      const k = `${p.seed}|${p.width}|${p.centerX}|${p.groundY}|${p.treeMax}`;
      if (k !== key) {
        key = k;
        build(p);
      }
      const ex = zone(p);
      // กลางคืนเด่น กลางวันจาง
      const vis = 0.3 + 0.7 * p.daylight.darkness;

      if (p.reducedMotion) {
        ctx.globalAlpha = vis * 0.8;
        for (let i = 0; i < 6; i++) pixel(ctx, sparks[i].x, sparks[i].y, sparks[i].color);
        ctx.globalAlpha = 1;
        return;
      }

      const t = p.timeMs;
      // ประกายกะพริบเบา ๆ
      for (const s of sparks) {
        const v = Math.sin(t / 700 + s.phase);
        if (v < 0.3) continue;
        ctx.globalAlpha = vis * (v - 0.3) * 1.1;
        pixel(ctx, s.x, s.y, s.color);
        if (v > 0.85) {
          pixel(ctx, s.x - 1, s.y, s.color);
          pixel(ctx, s.x + 1, s.y, s.color);
          pixel(ctx, s.x, s.y - 1, s.color);
          pixel(ctx, s.x, s.y + 1, s.color);
        }
      }

      // พลุเล็ก: ไต่ขึ้น -> บาน -> จาง -> พัก (สุ่มตำแหน่งใหม่ทุกรอบ)
      for (let j = 0; j < SLOTS; j++) {
        const s = slots[j];
        const tt = t + s.phase;
        const cycle = Math.floor(tt / s.period);
        const u = tt - cycle * s.period;
        if (u >= RISE_MS + BURST_MS) continue;
        if (cycle !== s.cycle) {
          s.cycle = cycle;
          s.x = pickX(p, ex, j % 2, hashRand(p.seed, j * 977 + cycle, 520));
          s.y = topY + Math.floor(hashRand(p.seed, j * 977 + cycle, 521) * (botY - topY));
          s.color = COLORS[Math.floor(hashRand(p.seed, j * 977 + cycle, 522) * COLORS.length)];
          s.big = hashRand(p.seed, j * 977 + cycle, 523) > 0.5;
        }
        if (u < RISE_MS) {
          const f = u / RISE_MS;
          const y = Math.round(s.y + 24 * (1 - f));
          ctx.globalAlpha = vis * 0.8;
          pixel(ctx, s.x, y, PALETTE.starGlow);
          ctx.globalAlpha = vis * 0.35;
          pixel(ctx, s.x, y + 1, s.color);
          pixel(ctx, s.x, y + 2, s.color);
          continue;
        }
        const f = (u - RISE_MS) / BURST_MS;
        const R = (s.big ? 4 : 3) * (1 - (1 - f) * (1 - f)) + 1;
        ctx.globalAlpha = vis * (1 - f) * 0.9;
        for (const [dx, dy, m] of DIRS) pixel(ctx, s.x + Math.round(dx * R * m), s.y + Math.round(dy * R * m), s.color);
        if (f < 0.4) pixel(ctx, s.x, s.y, PALETTE.white);
      }
      ctx.globalAlpha = 1;
    },
  };
}
