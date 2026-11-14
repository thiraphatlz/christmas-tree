// ต้นคริสต์มาส: ลำต้น ชั้นใบ หิมะ เงาที่พื้น และประกายตอนโต (ของตกแต่งอยู่ใน decor.ts)
import { mixColor, pixel, rect } from '../core/draw';
import { halfWidthAt } from '../core/growth';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, SceneParams } from '../types';

const NAVY = PALETTE.skyNight[0];
const SPARKLES = 12;

// channel ของ hashRand
const CH = { jagL: 10, jagR: 11, snow: 20, snowLen: 22, spark: 50 };

/** สุ่มคงที่แบบเบาต่อ pixel (ไม่มี state) ใช้แทน hashRand ในลูป pixel */
function nz(seed: number, a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2246822519) ^ seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** กองดินกับเมล็ด (วันที่ 0) ขนาดตาม scale */
function drawMound(p: SceneParams, dim: (c: string, k?: number) => string): void {
  const { ctx, centerX: ox, groundY: oy, scale } = p;
  const h = Math.max(3, Math.round(4 * scale));
  const hw = Math.max(4, Math.round(6 * scale));
  for (let i = 0; i < h; i++) {
    const half = Math.round(hw * Math.pow((i + 1) / h, 0.6));
    const y = oy - h + i;
    rect(ctx, ox - half, y, half * 2, 1, dim(PALETTE.soil));
    // ด้านขวาและแถวล่างเป็นเงา
    rect(ctx, ox + Math.round(half * 0.4), y, half - Math.round(half * 0.4), 1, dim(PALETTE.trunkDark));
    if (i === h - 1) rect(ctx, ox - half, y, half * 2, 1, dim(PALETTE.trunkDark));
  }
  const sd = Math.max(1, Math.round(scale));
  rect(ctx, ox - sd, oy - h - sd + 1, sd * 2, sd + 1, dim(PALETTE.seed, 0.3));
  pixel(ctx, ox - sd, oy - h - sd + 1, dim(PALETTE.starGlow, 0.3));
}

export function createTree(): SceneLayer {
  return {
    render(p: SceneParams): void {
      const { ctx, seed, scale: sc } = p;
      const ox = p.centerX;
      const oy = p.groundY;
      const dark = p.daylight.darkness;
      const dim = (c: string, k = 0.45) => mixColor(c, NAVY, dark * k);
      const s = p.tree;

      if (s.height === 0) {
        drawMound(p, dim);
        return;
      }

      // ---------- เงาใต้ต้นบนหิมะ ----------
      const shRows = Math.max(2, Math.round(2.5 * sc));
      const shHalf = s.baseHalfWidth * 1.1 + 2;
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < shRows; i++) {
        const half = Math.round(shHalf * Math.sqrt(1 - (i / shRows) * (i / shRows)));
        rect(ctx, ox - half, oy + i, half * 2 + 1, 1, dim(PALETTE.snowNight, 0.3));
      }
      ctx.globalAlpha = 1;

      // ---------- ลำต้น (ยื่นขึ้นไปหลังชายใบ 1 แถว) ----------
      const th = s.trunkHalf;
      const tw = th * 2 + 1;
      rect(ctx, ox - th, oy - s.trunkHeight - 1, tw, s.trunkHeight + 1, dim(PALETTE.trunk));
      rect(ctx, ox + th - Math.floor(th / 2), oy - s.trunkHeight - 1, Math.floor(th / 2) + 1, s.trunkHeight + 1, dim(PALETTE.trunkDark));
      for (let y = 1; y < s.trunkHeight; y++) {
        if (nz(seed, y, 0, 3) < 0.35) pixel(ctx, ox - th + 1 + Math.floor(nz(seed, y, 1, 3) * Math.max(1, th)), oy - y, dim(PALETTE.trunkDark));
      }
      if (s.trunkHeight > 2) rect(ctx, ox - th, oy - s.trunkHeight, tw, 1, dim(PALETTE.trunkDark));

      // ---------- ชั้นใบ: ล่างขึ้นบน ชั้นบนทับชั้นล่าง ----------
      // 0 = มืดสุด, 1 = เงา, 2 = กลาง, 3 = รับแสง, 4 = หิมะ, 5 = เงาหิมะ
      const shades = [
        dim(PALETTE.leafDark),
        dim(PALETTE.leafMid),
        dim(PALETTE.leaf),
        dim(PALETTE.leafLight),
        dim(PALETTE.snow, 0.35),
        dim(PALETTE.snowShade, 0.35),
      ];
      const period = Math.max(4, Math.round(4 * sc)); // ระยะห่างกิ่ง
      const bandH = Math.max(4, Math.round(5 * sc)); // ระยะห่างก้อนหิมะบนกิ่ง
      const toothW = Math.max(2, Math.round(2 * sc));
      s.tiers.forEach((tier, ti) => {
        const rows = tier.bottomY - tier.topY;
        const under = rows >= 6 ? Math.max(2, Math.round(1.5 * sc)) : rows >= 3 ? 1 : 0;
        const toothH = rows >= 3 ? Math.max(1, Math.round(1.5 * sc)) : 0;
        for (let y = tier.topY; y < tier.bottomY; y++) {
          const rb = tier.bottomY - 1 - y; // แถวนับจากชายล่างของชั้น
          const w = tier.bottomHalf + (tier.topHalf - tier.bottomHalf) * (rows > 1 ? rb / (rows - 1) : 0);
          const key = ti * 100 + rb;
          const jag = (ch: number) => {
            if (w < 3) return 0;
            const r = hashRand(seed, key, ch);
            return r < 0.3 ? -1 : r > 0.85 ? 1 : 0;
          };
          const wl = Math.round(w) + jag(CH.jagL);
          const wr = Math.round(w) + jag(CH.jagR);
          const litTo = -wl + Math.floor(w * 0.25);
          const toothRow = w >= 3 && rb <= toothH;
          // หิมะเกาะบนกิ่งที่ลาดด้านบน: แถวบนของแต่ละแถบเต็ม แถวล่างสั้นกว่าและเป็นเงา
          const phase = rb % bandH;
          const band = Math.floor(rb / bandH);
          let snowLenL = 0;
          let snowLenR = 0;
          let snowCol = 4;
          if (w >= 4 && rb > rows * 0.3 && phase >= bandH - 2) {
            const len = Math.max(2, Math.round((2 + hashRand(seed, ti * 64 + band, CH.snowLen) * 3) * (sc / 1.5)));
            const k = phase === bandH - 1 ? len : len - 1;
            snowCol = phase === bandH - 1 ? 4 : 5;
            if (hashRand(seed, ti * 64 + band, CH.snow) < 0.6) snowLenL = k;
            if (hashRand(seed, ti * 64 + band, CH.snow + 1) < 0.6) snowLenR = k;
          }
          let runStart = -wl;
          let runShade = -1;
          for (let x = -wl; x <= wr + 1; x++) {
            let sh = -1; // -1 = โปร่งใส
            if (x <= wr) {
              // ชายล่างเป็นซี่ฟัน: คอลัมน์ละความยาวไม่เท่ากัน
              const cell = Math.floor((x + 256) / toothW);
              const cut = toothRow ? Math.floor(nz(seed, ti, cell, 7) * (toothH + 1)) : 0;
              if (rb >= cut) {
                const u = x < 0 ? -x : x;
                sh = rb < under ? 0 : w >= 3 && x <= litTo ? 3 : x > w * 0.3 ? 1 : 2;
                const r = nz(seed, key, x, 1);
                if (r < 0.1) sh--;
                else if (r > 0.92) sh++;
                // กิ่งโค้งห้อยลง (เส้นเข้มเฉียง) และปลายใบสว่างสลับแถว
                if (u >= 2 && u < w - 1 && rb >= under) {
                  const ph = (rb + (u >> 1) + ti * 3) % period;
                  if (ph === 0) sh--;
                  else if (ph === 1 && ((u + rb) & 1) === 0 && nz(seed, key, x, 2) < 0.7) sh++;
                }
                sh = sh < 0 ? 0 : sh > 3 ? 3 : sh;
                // หิมะบนลาดกิ่ง และปลายซี่ฟันที่ชายล่าง
                if ((snowLenL && x + wl < snowLenL) || (snowLenR && wr - x < snowLenR)) sh = snowCol;
                else if (toothRow && rb === cut && nz(seed, ti, cell, 8) < 0.35) sh = 4;
              }
            }
            if (sh !== runShade) {
              if (runShade >= 0) rect(ctx, ox + runStart, oy + y, x - runStart, 1, shades[runShade]);
              runStart = x;
              runShade = sh;
            }
          }
        }
      });

      // ---------- ประกายรอบต้นตอนโต (reduced motion: จุดนิ่ง) ----------
      const t = p.growT;
      if (t !== null) {
        const n = p.reducedMotion ? 4 : SPARKLES;
        for (let j = 0; j < n; j++) {
          const idx = p.day * 16 + j;
          const y = -Math.round((0.3 + 0.75 * hashRand(seed, idx, CH.spark)) * s.height);
          const side = j % 2 ? 1 : -1;
          const x = ox + side * Math.round(halfWidthAt(p.tree, y) + 2 + 3 * sc * hashRand(seed, idx, CH.spark + 1));
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

