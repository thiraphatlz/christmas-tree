import { GIFT_START_DAY } from '../config';
import { mixColor, pixel, rect } from '../core/draw';
import { giftCount } from '../core/growth';
import { hashRand, randInt } from '../core/rng';
import { PALETTE } from '../palette';
import type { Gift, GiftLayers, RibbonStyle, SceneParams } from '../types';

const STYLES: readonly RibbonStyle[] = ['cross', 'vertical', 'bow'];
const NAVY = PALETTE.skyNight[0];

// ความกว้างสูงสุดของกล่อง index i (ค่าคงที่ ไม่ขึ้นกับ seed): 7 ถึง 14
const maxW = (i: number) => 7 + Math.floor(i * 0.47);
// แถวหลัง (หลังต้นไม้) = คู่ที่ 0, 2, 4, 6 นับจากลำต้น ที่เหลืออยู่แถวหน้า
const isBack = (i: number) => (i >> 1) % 2 === 0;

/** กล่อง index i คำนวณจาก (seed, i) เท่านั้น จึงไม่ขยับเมื่อมีกล่องใหม่ */
function makeGift(seed: number, i: number): Gift {
  const r = (ch: number) => hashRand(seed, i, ch);
  const back = isBack(i);
  const w = maxW(i) - randInt(r(0), 0, 2);
  // แถวหลังทรงสูง แถวหน้าทรงเตี้ย กล่องหลังจึงโผล่พ้นกล่องหน้า
  const h = back ? Math.min(15, w + randInt(r(1), 1, 3)) : Math.max(4, w - randInt(r(1), 1, 3));

  // ช่องของกล่อง: ไล่ออกจากลำต้น ข้างเดียวกันและแถวเดียวกันคือ index ที่ห่างกันทีละ 4
  let near = back ? 1 : 5;
  for (let j = i - 4; j >= 0; j -= 4) near += maxW(j);
  near += randInt(r(2), 0, maxW(i) - w);
  // +1 ทางซ้ายให้สมมาตรรอบแกนลำต้น (ลำต้นอยู่กึ่งกลางที่ x = 0)
  const x = i % 2 === 0 ? -(near + w) + 1 : near;

  // สีวนตาม index (กล่องข้างเคียงสีไม่ซ้ำ) จุดเริ่มมาจาก seed
  const colors = PALETTE.giftColors;
  const color = colors[(i + randInt(hashRand(seed, 99, 3), 0, colors.length - 1)) % colors.length];
  const ribbons = PALETTE.ribbonColors.filter((c) => c !== color);
  return {
    index: i,
    appearDay: GIFT_START_DAY + i,
    x,
    w,
    h,
    color,
    ribbonColor: ribbons[randInt(r(4), 0, ribbons.length - 1)],
    ribbonStyle: STYLES[randInt(r(5), 0, STYLES.length - 1)],
    behindTree: back,
  };
}

/**
 * กล่องของขวัญทั้งหมดของวันนั้น เป็น pure function
 * ความยาว = giftCount(day) และกล่อง index เดิมต้องได้ค่าเดิมทุก field ไม่ว่า day จะเป็นเท่าไร
 */
export function layoutGifts(day: number, seed: number): Gift[] {
  return Array.from({ length: giftCount(day) }, (_, i) => makeGift(seed, i));
}


const DROP_MS = 600;
const DROP_HEIGHT = 40; // หน่วยอ้างอิง คูณ giftScale ตอนวาด
const STAGGER_MS = 80;
const CREAM = '#f3e6c4';

/** ระยะยกจากพื้น (px, ค่าบวก = ลอยอยู่) ที่ t = 0..1: ตกแล้วเด้งเบา ๆ หนึ่งครั้ง */
function dropOffset(t: number, scale: number): number {
  if (t < 0.55) return Math.round(DROP_HEIGHT * scale * (1 - (t / 0.55) ** 2));
  const u = (t - 0.55) / 0.45;
  return Math.round(3 * 4 * u * (1 - u));
}

type Pattern = 'plain' | 'stripes' | 'dots' | 'checks';
const PATTERNS: readonly Pattern[] = ['plain', 'stripes', 'dots', 'checks'];

/** กล่องที่ขยายตาม giftScale แล้ว (พิกัดจำนวนเต็ม เทียบแกนลำต้น) */
interface Box {
  g: Gift;
  x: number;
  w: number;
  h: number;
  pattern: Pattern;
  darkPattern: boolean;
  tag: boolean;
}

function scaleBox(seed: number, g: Gift, s: number): Box {
  // ปัดสองขอบแยกกัน: สมมาตรซ้าย/ขวา และขอบนอกสุดไม่เกิน round(58*s)
  const x = Math.round(g.x * s);
  const w = Math.max(3, Math.round((g.x + g.w) * s) - x);
  const h = Math.max(3, Math.round(g.h * s));
  const r = (ch: number) => hashRand(seed, g.index, ch);
  return {
    g,
    x,
    w,
    h,
    pattern: PATTERNS[randInt(r(10), 0, PATTERNS.length - 1)],
    darkPattern: r(11) < 0.5,
    tag: r(12) < 0.45,
  };
}

function drawGift(p: SceneParams, b: Box, lift: number): void {
  const { ctx } = p;
  const { g, w, h } = b;
  const night = p.daylight.darkness * 0.35;
  const tone = (c: string) => mixColor(c, NAVY, night);
  const body = tone(g.color);
  const shade = tone(mixColor(g.color, NAVY, 0.35));
  const light = tone(mixColor(g.color, PALETTE.white, 0.22));
  const ribbon = tone(g.ribbonColor);
  const ribbonDark = tone(mixColor(g.ribbonColor, NAVY, 0.35));

  const x = p.centerX + b.x;
  const y = p.groundY - h - lift;
  const lidH = h >= 7 ? 2 : 1;

  rect(ctx, x + 1, p.groundY, w, 1, tone(PALETTE.snowShade)); // เงาบนหิมะ
  rect(ctx, x, y, w, h, body);

  // ลายห่อ (เฉพาะส่วนตัวกล่อง ไม่ทับด้านเงา)
  if (b.pattern !== 'plain' && h > lidH + 3) {
    const pc = tone(mixColor(g.color, b.darkPattern ? NAVY : PALETTE.white, 0.18));
    const right = w - (w >= 10 ? 2 : 1);
    for (let cy = lidH + 1; cy < h - 1; cy++) {
      for (let cx = 0; cx < right; cx++) {
        const on =
          b.pattern === 'stripes'
            ? cx % 4 < 2
            : b.pattern === 'dots'
              ? cx % 4 === (cy % 4 < 2 ? 1 : 3) && cy % 2 === 0
              : (cx + cy) % 4 < 2;
        if (on) pixel(ctx, x + cx, y + cy, pc);
      }
    }
  }

  rect(ctx, x, y, w, 1, light); // ขอบบนของฝา
  rect(ctx, x, y + lidH, w, 1, shade); // เส้นฝา
  rect(ctx, x + w - (w >= 10 ? 2 : 1), y + lidH, w >= 10 ? 2 : 1, h - lidH, shade); // ด้านเงา
  rect(ctx, x, y + h - 1, w, 1, shade); // ขอบล่าง

  // ริบบิ้น
  const rw = w >= 16 ? 3 : w >= 10 ? 2 : 1;
  const rx = x + Math.floor((w - rw) / 2);
  rect(ctx, rx, y, rw, h, ribbon);
  if (g.ribbonStyle === 'cross') {
    const bodyTop = y + lidH + 1;
    rect(ctx, x, bodyTop + Math.floor((h - lidH - 1 - rw) / 2), w, rw, ribbon);
  } else if (g.ribbonStyle === 'bow') {
    // โบว์เต็ม: ห่วงสองข้าง + ปม กว้าง rw + 4 (5 ถึง 7 px)
    rect(ctx, rx - 2, y - 1, rw + 4, 1, ribbon);
    rect(ctx, rx - 2, y - 3, 2, 2, ribbon);
    rect(ctx, rx + rw, y - 3, 2, 2, ribbon);
    pixel(ctx, rx - 1, y - 2, ribbonDark); // ช่องว่างในห่วง
    pixel(ctx, rx + rw, y - 2, ribbonDark);
    rect(ctx, rx, y - 2, rw, 2, ribbonDark); // ปม
  }

  // ป้ายชื่อสีครีมห้อยจากริบบิ้น (กล่องใหญ่พอเท่านั้น)
  if (b.tag && w >= 11 && h >= 9) {
    const tx = rx + rw + 1;
    const ty = y + lidH + 1;
    pixel(ctx, tx + 1, ty, ribbonDark); // เชือก
    rect(ctx, tx, ty + 1, 3, 3, tone(CREAM));
    pixel(ctx, tx + 1, ty + 2, tone(PALETTE.trunkDark));
  }
}

export function createGifts(): GiftLayers {
  // state ใช้ร่วมกันสองชั้น: sync() เรียกซ้ำในเฟรมเดียวกันได้ ชั้นไหนวาดก่อนก็ได้ผลเท่ากัน
  let boxes: Box[] = [];
  let key = '';
  let prevCount = -1; // -1 = ยังไม่เคยวาด (เฟรมแรกไม่มีแอนิเมชัน)
  const startAt = new Map<number, number>();

  function sync(p: SceneParams): void {
    const k = `${p.day}:${p.seed}:${p.giftScale}`;
    if (k !== key) {
      key = k;
      boxes = layoutGifts(p.day, p.seed).map((g) => scaleBox(p.seed, g, p.giftScale));
    }
    const n = boxes.length;
    if (p.reducedMotion) startAt.clear();
    else if (prevCount >= 0 && n > prevCount) {
      // กระโดดหลายวัน: กล่องใหม่ทยอยตกทีละกล่อง
      for (let i = prevCount; i < n; i++) startAt.set(i, p.timeMs + (i - prevCount) * STAGGER_MS);
    }
    for (const i of startAt.keys()) if (i >= n) startAt.delete(i); // ย้อนวัน
    prevCount = n;
  }

  const layer = (behind: boolean) => ({
    render(p: SceneParams): void {
      sync(p);
      for (const b of boxes) {
        if (b.g.behindTree !== behind) continue;
        const start = startAt.get(b.g.index);
        let lift = 0;
        if (start !== undefined) {
          const t = (p.timeMs - start) / DROP_MS;
          if (t < 0) continue; // ยังไม่ถึงคิวตก
          if (t >= 1) startAt.delete(b.g.index);
          else lift = dropOffset(t, p.giftScale);
        }
        drawGift(p, b, lift);
      }
    },
  });

  return { behind: layer(true), front: layer(false) };
}
