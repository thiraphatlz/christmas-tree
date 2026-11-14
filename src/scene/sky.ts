import { drawSprite, mixColor } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

const BAND = 6; // ความสูงแถบสีท้องฟ้า (px)
const MAX_STARS = 120;

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

      // --- พระจันทร์ / พระอาทิตย์ (อยู่ชิดขอบบน เว้นทางให้เลื่อนซานต้า) ---
      const bodyY = Math.max(3, Math.round(groundY * 0.05));
      if (dark > 0.02) {
        ctx.globalAlpha = dark;
        drawSprite(ctx, MOON, MOON_LEGEND, Math.round(width * 0.8) - 4, bodyY);
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
    },
  };
}
