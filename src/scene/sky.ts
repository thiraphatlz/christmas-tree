import { drawSprite, mixColor } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

const BAND = 6; // ความสูงแถบสีท้องฟ้า (px)
const MAX_STARS = 120;
const AURORA_BANDS = 4;
const SPARKLES = 40;

const MOON = ['..MMMM..', '.MMMMmM.', 'MMMMMMMM', 'MMmMMMMM', 'MMMMMMMM', 'MMMMMmmM', '.MMMMMM.', '..MMMM..'];
const MOON_LEGEND = { M: PALETTE.moon, m: mixColor(PALETTE.moon, PALETTE.skyNight[1], 0.3) };
const SUN = [
  '.....SS.....',
  '..S......S..',
  '....SSSS....',
  '...SSSSSS...',
  '..SSSSSSSS..',
  'S.SSSSSSSS.S',
  'S.SSSSSSSS.S',
  '..SSSSSSSS..',
  '...SSSSSS...',
  '....SSSS....',
  '..S......S..',
  '.....SS.....',
];
const SUN_LEGEND = { S: PALETTE.sun };

/** เติมสีจากเส้นขอบบนเป็นคลื่น (เนินนุ่ม ๆ) ลงไปถึง bottom โดยรวมคอลัมน์ที่สูงเท่ากันเป็น rect เดียว */
function wavyFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  bottom: number,
  amp: number,
  phase: number,
  color: string,
): void {
  ctx.fillStyle = color;
  let runStart = 0;
  let runTop = 0;
  for (let x = 0; x <= width; x++) {
    const top =
      x === width ? NaN : baseY - Math.round(amp * (1 + 0.6 * Math.sin(x * 0.035 + phase) + 0.4 * Math.sin(x * 0.011 + phase * 2)));
    if (x === 0) runTop = top;
    if (top !== runTop) {
      if (bottom > runTop) ctx.fillRect(runStart, runTop, x - runStart, bottom - runTop);
      runStart = x;
      runTop = top;
    }
  }
}

/** ท้องฟ้าไล่ระดับ ดาว พระจันทร์/พระอาทิตย์ และพื้นหิมะ (วาดเต็มจอเป็นชั้นล่างสุด) */
export function createSky(): SceneLayer {
  // cache: สีแถบท้องฟ้า/สีหิมะ คำนวณใหม่เฉพาะตอนค่าเปลี่ยน
  let bands: string[] = [];
  let kTop = '';
  let kBottom = '';
  let kCount = -1;
  let kDark = -1;
  let snow = '';
  let shade = '';
  let hill = '';

  // ดาว: [fx, fy, phase, speed] ตำแหน่งเป็นสัดส่วนของจอ จึงไม่ต้องคำนวณใหม่ตอน resize
  let stars: Float32Array | null = null;
  let starSeed = 0;
  // ประกายหิมะ: [fx, fy, phase, speed]
  let sparks: Float32Array | null = null;
  let sparkSeed = 0;

  return {
    render(p) {
      const { ctx, width, height, groundY, daylight, seed } = p;
      const dark = daylight.darkness;

      // --- ท้องฟ้าเป็นแถบ ---
      const n = Math.max(1, Math.ceil(groundY / BAND));
      if (daylight.skyTop !== kTop || daylight.skyBottom !== kBottom || n !== kCount) {
        kTop = daylight.skyTop;
        kBottom = daylight.skyBottom;
        kCount = n;
        bands = [];
        for (let i = 0; i < n; i++) bands.push(mixColor(kTop, kBottom, n === 1 ? 0 : i / (n - 1)));
      }
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = bands[i];
        ctx.fillRect(0, i * BAND, width, BAND);
      }

      // --- ดาว ---
      if (!stars || starSeed !== seed) {
        starSeed = seed;
        stars = new Float32Array(MAX_STARS * 4);
        for (let i = 0; i < MAX_STARS; i++) {
          stars[i * 4] = hashRand(seed, i, 10);
          stars[i * 4 + 1] = hashRand(seed, i, 11) * 0.9;
          stars[i * 4 + 2] = hashRand(seed, i, 12) * Math.PI * 2;
          stars[i * 4 + 3] = 0.6 + hashRand(seed, i, 13) * 1.6;
        }
      }
      if (dark > 0.02) {
        const count = Math.min(MAX_STARS, Math.floor((width * groundY) / 350));
        const t = p.reducedMotion ? 0 : p.timeMs / 1000;
        ctx.fillStyle = PALETTE.skyStar;
        for (let i = 0; i < count; i++) {
          const o = i * 4;
          ctx.globalAlpha = dark * (0.65 + 0.35 * Math.sin(t * stars[o + 3] + stars[o + 2]));
          ctx.fillRect(Math.floor(stars[o] * width), Math.floor(stars[o + 1] * groundY), 1, 1);
        }
      }

      // --- ออโรราจาง ๆ (กลางคืนเท่านั้น) แถบแนวตั้งกว้าง alpha ต่ำ ---
      if (dark > 0.05) {
        const t = p.reducedMotion ? 0 : p.timeMs / 1000;
        const top = 1;
        const maxH = Math.round(groundY * 0.42);
        for (let b = 0; b < AURORA_BANDS; b++) {
          const cx = (0.12 + 0.76 * hashRand(seed, b, 30)) * width + (p.reducedMotion ? 0 : Math.sin(t * 0.05 + b) * 6);
          const half = Math.max(14, Math.round(width * (0.08 + 0.06 * hashRand(seed, b, 31))));
          const h0 = maxH * (0.55 + 0.45 * hashRand(seed, b, 32));
          const ph = hashRand(seed, b, 33) * 6.28;
          ctx.fillStyle = PALETTE.aurora[b % PALETTE.aurora.length];
          const x0 = Math.round(cx - half);
          for (let x = Math.max(0, x0); x < Math.min(width, x0 + half * 2); x += 2) {
            const f = 1 - Math.abs((x - cx) / half); // 0..1 กลางแถบสว่างสุด
            const h = Math.round(h0 * (0.7 + 0.3 * Math.sin(x * 0.12 + t * 0.5 + ph)) * (0.4 + 0.6 * f));
            const a = dark * 0.16 * (0.75 + 0.25 * Math.sin(t * 0.4 + ph + x * 0.05));
            ctx.globalAlpha = a * (0.5 + 0.5 * f);
            ctx.fillRect(x, top, 2, h);
            ctx.globalAlpha = a * 0.5 * f; // แกนสว่างส่วนบน
            ctx.fillRect(x, top, 2, Math.round(h * 0.5));
          }
        }
        ctx.globalAlpha = 1;
      }

      // --- พระจันทร์ / พระอาทิตย์ (อยู่ชิดขอบบน เว้นทางให้เลื่อนซานต้า) ---
      // อยู่ใต้ fairy lights (12px บนสุด) จะได้ไม่ถูกสายไฟพาดทับ
      const bodyY = Math.max(15, Math.round(groundY * 0.1));
      if (dark > 0.02) {
        ctx.globalAlpha = dark;
        drawSprite(ctx, MOON, MOON_LEGEND, Math.round(width * 0.68) - 4, bodyY);
      }
      if (dark < 0.98) {
        ctx.globalAlpha = 1 - dark;
        drawSprite(ctx, SUN, SUN_LEGEND, Math.round(width * 0.2) - 6, bodyY);
      }
      ctx.globalAlpha = 1;

      // --- พื้นหิมะ ---
      if (dark !== kDark) {
        kDark = dark;
        snow = mixColor(PALETTE.snow, PALETTE.snowNight, dark * 0.85);
        shade = mixColor(PALETTE.snowShade, mixColor(PALETTE.snowNight, PALETTE.skyNight[1], 0.35), dark);
        hill = mixColor(PALETTE.snowShade, mixColor(PALETTE.snowNight, PALETTE.skyNight[1], 0.6), dark);
      }
      const ph = (seed % 628) / 100;
      wavyFill(ctx, width, groundY, groundY, 3, ph, hill); // เนินไกล โผล่เหนือเส้นพื้น
      ctx.fillStyle = snow;
      ctx.fillRect(0, groundY, width, height - groundY);
      wavyFill(ctx, width, groundY + Math.round((height - groundY) * 0.6), height, 2, ph + 2, shade); // เงากองหิมะด้านล่าง

      // --- ประกายหิมะบนพื้น ---
      if (!sparks || sparkSeed !== seed) {
        sparkSeed = seed;
        sparks = new Float32Array(SPARKLES * 4);
        for (let i = 0; i < SPARKLES; i++) {
          sparks[i * 4] = hashRand(seed, i, 40);
          sparks[i * 4 + 1] = hashRand(seed, i, 41);
          sparks[i * 4 + 2] = hashRand(seed, i, 42) * Math.PI * 2;
          sparks[i * 4 + 3] = 1 + hashRand(seed, i, 43) * 2.5;
        }
      }
      const sh = height - groundY;
      if (sh > 2) {
        const st = p.reducedMotion ? 0 : p.timeMs / 1000;
        const n2 = Math.min(SPARKLES, Math.max(8, Math.floor(width / 8)));
        ctx.fillStyle = PALETTE.white;
        for (let i = 0; i < n2; i++) {
          const o = i * 4;
          const v = p.reducedMotion ? (i % 3 === 0 ? 0.8 : 0) : Math.sin(st * sparks[o + 3] + sparks[o + 2]);
          if (v < 0.5) continue; // วาบเป็นช่วงสั้น ๆ
          ctx.globalAlpha = (0.4 + 0.6 * v) * (1 - dark * 0.4);
          ctx.fillRect(Math.floor(sparks[o] * width), groundY + Math.floor(sparks[o + 1] * (sh - 1)), 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
}
