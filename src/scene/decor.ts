import { GROW_DAYS, TREE_REF_HEIGHT } from '../config';
import { getTreeShape, halfWidthAt, ornamentCount, ribbonCount, tinselCount, trinketCount } from '../core/growth';
import { drawSprite, mixColor, pixel, rect } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer, TreeShape } from '../types';

// ของตกแต่งบนต้น: tinsel ลูกบอล โบว์ ดาวยอด (ทุกชิ้นมี slot คงที่ต่อ seed)

const NAVY = '#14204a';
const CANDIDATES = 12;
const CH = { size: 30, color: 32, stripe: 34, phase: 36, bow: 42, slotV: 100, slotS: 101 };

const BLUE: [string, string] = ['#3f7fd6', '#27518f'];
const PURPLE: [string, string] = ['#8e4fa8', '#5e2f73'];
const BAUBLE_COLORS: [string, string][] = [
  [PALETTE.red, PALETTE.redDark],
  [PALETTE.gold, PALETTE.goldDark],
  [PALETTE.white, '#c3bdae'],
  BLUE,
  PURPLE,
  [PALETTE.red, PALETTE.redDark],
  [PALETTE.gold, PALETTE.goldDark],
];
const BAND_COLORS: [string, string][] = [
  [PALETTE.white, '#c3bdae'],
  [PALETTE.gold, PALETTE.goldDark],
];
const BOW_COLORS: [string, string, string][] = [
  [PALETTE.red, PALETTE.redDark, PALETTE.gold],
  [PALETTE.gold, PALETTE.goldDark, PALETTE.red],
  [PALETTE.white, '#c3bdae', PALETTE.red],
  [BLUE[0], BLUE[1], PALETTE.white],
  [PURPLE[0], PURPLE[1], PALETTE.gold],
];
const BOW7 = ['.cc.cc.', 'ccdkdcc', '.cckcc.', '..d.d..', '.d...d.'];
const BOW5 = ['cc.cc', 'cckcc', '.d.d.'];

// ของจุกจิก 4 แบบ: [ใหญ่, เล็ก] (ทุกแถวยาวเท่ากัน) r แดง w ขาว g ทอง d ทองเข้ม k กระดิ่ง s ดาว i น้ำแข็ง
const TRINKETS: [string[], string[]][] = [
  [['.rw.', 'w..r', 'r...', 'w...', 'r...', 'w...', 'r...', 'w...'], ['.rw', 'w..', 'r..', 'w..', 'r..', 'w..']],
  [['..g..', '.ggg.', 'ggggg', 'ddddd', '..k..'], ['.g.', 'ggg', 'ddd', '.k.']],
  [['..s..', '.sss.', 'sswss', '.sss.', '.s.s.'], ['.s.', 'sws', '.s.']],
  [['i.w.i', '.iwi.', 'wwwww', '.iwi.', 'i.w.i'], ['iwi', 'www', 'iwi']],
];
const TRINKET_COLORS: Record<string, string>[] = [
  { r: PALETTE.red, w: PALETTE.white },
  { g: PALETTE.gold, d: PALETTE.goldDark, k: '#7a5518' },
  { s: '#ffeaa0', w: PALETTE.white },
  { i: '#9fd4ff', w: PALETTE.white },
];

/** ความสูงของ garland ลำดับที่ i (สัดส่วนในใบ) คงที่ เพิ่มวันแล้วเพิ่มเส้นเท่านั้น */
const GARLAND_V = [0.5, 0.26, 0.72, 0.38, 0.6, 0.15];

interface Slot {
  v: number;
  s: number;
}
interface Bauble extends Slot {
  d: number;
  base: string;
  dark: string;
  band: string;
  bandDark: string;
  striped: boolean;
  phase: number;
  // สีที่หรี่ตามกลางคืนแล้ว
  c: string;
  cd: string;
  b: string;
  bd: string;
  hi: string;
}
interface Bow extends Slot {
  w: number;
  rows: readonly string[];
  col: [string, string, string];
  cur: Record<string, string>;
}
interface Trinket extends Slot {
  rows: readonly string[];
  type: number;
  phase: number;
}
interface Layout {
  baubles: Bauble[];
  bows: Bow[];
  trinkets: Trinket[];
  // legend ที่หรี่ตามกลางคืนแล้ว ต่อชนิด
  legends: Record<string, string>[];
}

/** แถวที่ y กับความสูง rows: ความกว้างสูงสุดที่ใช้ได้ (ครึ่งหนึ่งข้างเดียว) */
function span(shape: TreeShape, yTop: number, rows: number, margin: number): number {
  let m = Infinity;
  for (let r = 0; r < rows; r++) m = Math.min(m, halfWidthAt(shape, yTop + r));
  return Math.max(0, m - margin);
}
const yOf = (shape: TreeShape, v: number) => -Math.round(shape.trunkHeight + v * (shape.height - shape.trunkHeight));

/** pixel disc ต่อเส้นผ่านศูนย์กลาง: kind 0 พื้น, 1 เงา, 2 ไฮไลต์, 3 แถบ, 4 แถบเงา */
const discCache = new Map<number, { i: number; j: number; k: number }[]>();
function disc(d: number) {
  let cells = discCache.get(d);
  if (cells) return cells;
  cells = [];
  const rr = (d / 2 - 0.2) ** 2;
  let hi = -1;
  let hiScore = Infinity;
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < d; i++) {
      const dx = i + 0.5 - d / 2;
      const dy = j + 0.5 - d / 2;
      if (dx * dx + dy * dy > rr) continue;
      const band = d >= 4 && j === Math.floor(d / 2);
      const shade = dx + dy > d * 0.28;
      cells.push({ i, j, k: band ? (shade ? 4 : 3) : shade ? 1 : 0 });
      const sc = (dx + 0.2 * d) ** 2 + (dy + 0.2 * d) ** 2;
      if (!shade && sc < hiScore) {
        hiScore = sc;
        hi = cells.length - 1;
      }
    }
  }
  if (hi >= 0) cells[hi].k = 2;
  discCache.set(d, cells);
  return cells;
}

let cache: { seed: number; max: number; layout: Layout } | null = null;

function buildLayout(seed: number, max: number): Layout {
  const sc = max / TREE_REF_HEIGHT;
  const ref = getTreeShape(GROW_DAYS, max);
  const placed: { x: number; y: number }[] = [];

  // เลือก slot ที่ดีที่สุดจาก 12 ตัวเลือก (ไกลจากของก่อนหน้ามากสุด)
  const pick = (i: number, base: number, rows: number, half: number): Slot => {
    let best: Slot = { v: 0.5, s: 0 };
    let bestScore = -1;
    let bx = 0;
    let by = 0;
    for (let k = 0; k < CANDIDATES; k++) {
      const v = 0.07 + 0.71 * hashRand(seed, i, base + CH.slotV + k * 2);
      const s = hashRand(seed, i, base + CH.slotS + k * 2) * 2 - 1;
      const y = yOf(ref, v);
      const x = Math.round(s * span(ref, y - Math.floor(rows / 2), rows, half + 1));
      let score = Infinity;
      for (const q of placed) score = Math.min(score, (q.x - x) ** 2 + (q.y - y) ** 2);
      if (score > bestScore) {
        bestScore = score;
        best = { v, s };
        bx = x;
        by = y;
      }
    }
    placed.push({ x: bx, y: by });
    return best;
  };

  const baubles: Bauble[] = [];
  for (let i = 0; i < ornamentCount(GROW_DAYS); i++) {
    const sizes = [2, 2.67, 3.33, 4];
    const d = Math.max(2, Math.round(sizes[Math.floor(hashRand(seed, i, CH.size) * 4)] * sc));
    const [base, dark] = BAUBLE_COLORS[Math.floor(hashRand(seed, i, CH.color) * BAUBLE_COLORS.length)];
    const [band, bandDark] = BAND_COLORS[base === PALETTE.white ? 1 : Math.floor(hashRand(seed, i, CH.stripe + 1) * 2)];
    const slot = pick(i, 0, d, Math.ceil(d / 2));
    baubles.push({
      ...slot, d, base, dark, band, bandDark,
      striped: hashRand(seed, i, CH.stripe) < 0.4,
      phase: hashRand(seed, i, CH.phase),
      c: base, cd: dark, b: band, bd: bandDark, hi: '#fff',
    });
  }
  const bows: Bow[] = [];
  const rows = sc >= 1.25 ? BOW7 : BOW5;
  for (let i = 0; i < ribbonCount(GROW_DAYS); i++) {
    const col = BOW_COLORS[Math.floor(hashRand(seed, i, CH.bow) * BOW_COLORS.length)];
    const slot = pick(i, 1000, rows.length, Math.floor(rows[0].length / 2));
    bows.push({ ...slot, w: rows[0].length, rows, col, cur: {} });
  }
  // ของจุกจิก: slot ต่อจากโบว์ (channel 2000+ ไม่ชนของเดิม)
  const trinkets: Trinket[] = [];
  for (let i = 0; i < trinketCount(GROW_DAYS); i++) {
    const type = i % 4;
    const r = TRINKETS[type][sc >= 1.25 ? 0 : 1];
    const slot = pick(i, 2000, r.length, Math.floor(r[0].length / 2));
    trinkets.push({ ...slot, rows: r, type, phase: hashRand(seed, i, 2200) });
  }
  return { baubles, bows, trinkets, legends: TRINKET_COLORS.map((l) => ({ ...l })) };
}

export function createDecor(): SceneLayer {
  let dimStep = -1;
  let dimCount = -1;

  return {
    render(p) {
      const { ctx, tree } = p;
      if (tree.height <= 0) return;
      if (!cache || cache.seed !== p.seed || cache.max !== p.treeMax) {
        cache = { seed: p.seed, max: p.treeMax, layout: buildLayout(p.seed, p.treeMax) };
        dimStep = -1;
      }
      const { baubles, bows, trinkets, legends } = cache.layout;
      const nB = Math.min(baubles.length, ornamentCount(p.day));
      const nR = Math.min(bows.length, ribbonCount(p.day));
      const ox = p.centerX;
      const oy = p.groundY;
      const t = p.timeMs;
      const still = p.reducedMotion;

      // หรี่สีตามกลางคืน (คำนวณใหม่เมื่อ step เปลี่ยนเท่านั้น)
      const step = Math.round(p.daylight.darkness * 20);
      if (step !== dimStep || dimCount !== nB + nR) {
        dimStep = step;
        dimCount = nB + nR;
        const k = (step / 20) * 0.3;
        const dim = (c: string) => (k > 0 ? mixColor(c, NAVY, k) : c);
        for (const b of baubles) {
          b.c = dim(b.base);
          b.cd = dim(b.dark);
          b.b = dim(b.band);
          b.bd = dim(b.bandDark);
          b.hi = dim(mixColor(b.base, '#ffffff', 0.8));
        }
        legends.forEach((lg, n) => {
          for (const key in lg) lg[key] = dim(TRINKET_COLORS[n][key]);
        });
        for (const b of bows) b.cur = { c: dim(b.col[0]), d: dim(b.col[1]), k: dim(b.col[2]) };
      }

      // ---- tinsel ----
      const nT = Math.min(GARLAND_V.length, tinselCount(p.day));
      const tw = still ? 0 : Math.floor(t / 240);
      const tc = PALETTE.tinsel;
      const sag = Math.max(1, Math.round(p.scale * 1.7));
      const slope = Math.max(1, Math.round(p.scale * 1.5));
      const fol = tree.height - tree.trunkHeight;
      for (let i = 0; i < nT; i++) {
        const y0 = -Math.round(tree.trunkHeight + GARLAND_V[i] * fol);
        const w = Math.floor(halfWidthAt(tree, y0));
        if (w < 2) continue;
        const dir = i % 2 ? -1 : 1;
        for (let x = -w; x <= w; x++) {
          const u = x / w;
          const y = y0 + Math.round(dir * slope * u + sag * (1 - u * u));
          if (Math.abs(x) <= halfWidthAt(tree, y) - 1) {
            const sparkle = (x * 7 + i * 13 + tw) % 17 === 0 || (still && (x + i * 5) % 19 === 0);
            pixel(ctx, ox + x, oy + y, sparkle ? PALETTE.white : tc[(x + i + 300) % 3]);
            if (x % 2 === 0 && Math.abs(x) <= halfWidthAt(tree, y + 1) - 1) pixel(ctx, ox + x, oy + y + 1, tc[2]);
          }
        }
      }

      // ---- trinkets ----
      const nK = Math.min(trinkets.length, trinketCount(p.day));
      for (let i = 0; i < nK; i++) {
        const k = trinkets[i];
        const h = k.rows.length;
        const w = k.rows[0].length;
        const top = yOf(tree, k.v) - Math.floor(h / 2);
        const half = Math.floor(w / 2);
        let x = Math.round(k.s * span(tree, top, h, half + 1));
        // กระดิ่งแกว่ง 1 px ช้า ๆ
        if (!still && k.type === 1) x += Math.sin(t / (1400 + k.phase * 800) + k.phase * 6.283) > 0.5 ? 1 : 0;
        drawSprite(ctx, k.rows, legends[k.type], ox + x - half, oy + top);
      }

      // ---- baubles ----
      for (let i = 0; i < nB; i++) {
        const b = baubles[i];
        const y = yOf(tree, b.v);
        const top = y - Math.floor(b.d / 2);
        const half = Math.ceil(b.d / 2);
        let x = Math.round(b.s * span(tree, top, b.d, half + 1));
        if (!still) {
          const s = Math.sin(t / (1700 + b.phase * 900) + b.phase * 6.283);
          x += s > 0.6 ? 1 : s < -0.6 ? -1 : 0;
        }
        const left = ox + x - Math.floor(b.d / 2);
        for (const c of disc(b.d)) {
          const col =
            c.k === 2 ? b.hi : c.k === 0 || (c.k === 3 && !b.striped) ? b.c
            : c.k === 1 || (c.k === 4 && !b.striped) ? b.cd
            : c.k === 3 ? b.b : b.bd;
          pixel(ctx, left + c.i, oy + top + c.j, col);
        }
        pixel(ctx, left + Math.floor((b.d - 1) / 2), oy + top - 1, PALETTE.gold);
      }

      // ---- bows ----
      for (let i = 0; i < nR; i++) {
        const b = bows[i];
        const h = b.rows.length;
        const y = yOf(tree, b.v);
        const top = y - Math.floor(h / 2);
        const half = Math.floor(b.w / 2);
        const x = Math.round(b.s * span(tree, top, h, half + 1));
        drawSprite(ctx, b.rows, b.cur, ox + x - half, oy + top);
      }

      // ---- star ----
      if (tree.hasStar) drawStar(p, ox, oy - tree.height, still);
    },
  };
}

const starCache = new Map<number, { x: number; y: number; k: number }[]>();
/** ดาว: k 0 ตัว, 1 แกนสว่าง, 2 จุดกลาง */
function starCells(R: number) {
  let cells = starCache.get(R);
  if (cells) return cells;
  cells = [];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const body = ax + ay <= R * 0.55 || ay * R <= (R - ax) * 1.5 || ax * R <= (R - ay) * 1.5;
      if (!body) continue;
      cells.push({ x: dx, y: dy, k: ax + ay <= 1 ? 2 : ax + ay <= R * 0.3 ? 1 : 0 });
    }
  }
  starCache.set(R, cells);
  return cells;
}

function drawStar(p: Parameters<SceneLayer['render']>[0], ox: number, apexY: number, still: boolean): void {
  const { ctx, timeMs: t } = p;
  const R = Math.max(3, Math.round(p.scale * 4.3));
  const cx = ox;
  const cy = apexY - R + 2;
  const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(t / 650);
  // กลุ่มแสงนุ่ม (เพชรซ้อนกัน)
  for (const [g, a] of [[R + 5, 0.1 + 0.08 * pulse], [R + 2, 0.14 + 0.1 * pulse]] as const) {
    ctx.globalAlpha = a;
    for (let dy = -g; dy <= g; dy++) {
      const hw = g - Math.abs(dy);
      rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, PALETTE.starGlow);
    }
  }
  ctx.globalAlpha = 1;
  const cols = [PALETTE.star, PALETTE.starGlow, PALETTE.white];
  for (const c of starCells(R)) pixel(ctx, cx + c.x, cy + c.y, cols[c.k]);
  // รังสีกากบาทยาวบางๆ + ประกายเป็นช่วง
  const flash = !still && t % 2600 < 220;
  const len = R + 4 + (flash ? 3 : 0);
  ctx.globalAlpha = 0.55 + 0.35 * pulse;
  for (let k = R + 1; k <= len; k++) {
    pixel(ctx, cx - k, cy, PALETTE.starGlow);
    pixel(ctx, cx + k, cy, PALETTE.starGlow);
    pixel(ctx, cx, cy - k, PALETTE.starGlow);
    pixel(ctx, cx, cy + k, PALETTE.starGlow);
  }
  ctx.globalAlpha = 1;
  if (flash) {
    pixel(ctx, cx - R + 2, cy - R + 2, PALETTE.white);
    pixel(ctx, cx + R - 2, cy + R - 2, PALETTE.white);
  }
}
