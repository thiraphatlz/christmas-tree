import { mulberry32 } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, SnowLayers } from '../types';

interface SnowOpts {
  cap: number; // จำนวนเกล็ดสูงสุด
  density: number; // พื้นที่ (px²) ต่อ 1 เกล็ด
  minSpeed: number; // px ต่อวินาที
  maxSpeed: number;
  alpha: number;
  sway: number; // ระยะแกว่งซ้ายขวา (px)
  big: boolean; // มีเกล็ด 2px ปนหรือไม่
  salt: number;
}

function makeLayer(o: SnowOpts): SceneLayer {
  // [fx, fy, speed, phase] ตำแหน่งเป็นสัดส่วน 0..1 ของจอ จึงรองรับ resize เอง
  let flakes: Float32Array | null = null;
  let flakeSeed = 0;

  return {
    render(p) {
      const { ctx, width, height } = p;
      if (!flakes || flakeSeed !== p.seed) {
        flakeSeed = p.seed;
        const rand = mulberry32(p.seed ^ o.salt);
        flakes = new Float32Array(o.cap * 4);
        for (let i = 0; i < o.cap; i++) {
          flakes[i * 4] = rand();
          flakes[i * 4 + 1] = rand();
          flakes[i * 4 + 2] = o.minSpeed + rand() * (o.maxSpeed - o.minSpeed);
          flakes[i * 4 + 3] = rand() * Math.PI * 2;
        }
      }

      let count = Math.min(o.cap, Math.floor((width * height) / o.density));
      const still = p.reducedMotion;
      if (still) count = Math.floor(count / 3); // reduced motion: โปรยบาง ๆ อยู่นิ่ง
      const t = p.timeMs / 1000;
      const fall = still ? 0 : p.dt / 1000 / height;

      ctx.fillStyle = PALETTE.snow;
      ctx.globalAlpha = o.alpha;
      for (let i = 0; i < count; i++) {
        const k = i * 4;
        let fy = flakes[k + 1] + flakes[k + 2] * fall;
        if (fy >= 1) fy -= 1;
        flakes[k + 1] = fy;
        const dx = still ? 0 : Math.sin(t * 0.9 + flakes[k + 3]) * o.sway;
        const size = o.big && i % 3 === 0 ? 2 : 1;
        ctx.fillRect(Math.floor(flakes[k] * width + dx), Math.floor(fy * height), size, size);
      }
      ctx.globalAlpha = 1;
    },
  };
}

export function createSnow(): SnowLayers {
  return {
    far: makeLayer({ cap: 140, density: 300, minSpeed: 6, maxSpeed: 13, alpha: 0.5, sway: 0, big: false, salt: 0x51 }),
    near: makeLayer({ cap: 60, density: 800, minSpeed: 18, maxSpeed: 34, alpha: 0.9, sway: 2, big: true, salt: 0xa7 }),
  };
}
