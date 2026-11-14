import { groundItemCount, hasSkirt } from '../core/growth';
import { drawSprite, mixColor, rect } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

const NAVY = '#14204a';
const FLAME = ['#ffb53a', '#fff2b0'];

// ของวางรอบโคนต้น (ลำดับตาม index): [ใหญ่, เล็ก], side -1 ซ้าย 1 ขวา, legend ('f' = เปลวไฟ กะพริบ)
interface Def {
  side: -1 | 1;
  rows: [string[], string[]];
  colors: Record<string, string>;
  glow: boolean;
}
const LANTERN = {
  rows: [['..d..', '.ddd.', 'dgggd', 'dgfgd', 'dgggd', 'ddddd'], ['.d.', 'ddd', 'dfd', 'dgd', 'ddd']] as [string[], string[]],
  colors: { d: '#3a2a1e', g: '#e9a93a' },
  glow: true,
};
const STOCKING = {
  rows: [['wwww..', 'rrrr..', 'rrrr..', 'rrrr..', 'rrraaa', 'rrraaa'], ['ww..', 'rr..', 'rr..', 'rraa']] as [string[], string[]],
  glow: false,
};
const DEFS: Def[] = [
  { side: -1, ...LANTERN },
  { side: 1, ...STOCKING, colors: { r: PALETTE.red, w: PALETTE.white, a: '#2a7d4a' } },
  {
    side: -1, glow: false, colors: { r: PALETTE.candyRed, w: PALETTE.white },
    rows: [['.rw.', 'w..r', 'r...', 'w...', 'r...', 'w...', 'r...', 'w...'], ['.rw', 'w..', 'r..', 'w..', 'r..', 'w..']],
  },
  {
    side: 1, glow: false, colors: { b: '#b8742f', r: PALETTE.red, g: '#2a7d4a', w: PALETTE.white, d: PALETTE.snowShade },
    rows: [['..bb...', '.bbbbr.', 'bbbbrrg', 'wwwwwww', '.ddddd.'], ['.bbr.', 'bbbrg', 'wwwww']],
  },
  {
    side: -1, glow: true, colors: { k: '#3a2a1e', w: PALETTE.white, d: '#c3bdae', h: PALETTE.gold },
    rows: [['.f.', '.f.', '.k.', 'wwd', 'wwd', 'wwd', 'hhh'], ['.f.', '.k.', 'wwd', 'wwd', 'hhh']],
  },
  { side: 1, ...STOCKING, colors: { r: '#2a7d4a', w: PALETTE.white, a: PALETTE.gold } },
  { side: 1, ...LANTERN },
];

interface Item {
  def: Def;
  rows: string[];
  x: number; // มุมซ้ายบนเทียบ centerX
  fx: number;
  fy: number;
  phase: number;
  legend: Record<string, string>;
}
const flameAt = (rows: string[]) => {
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].indexOf('f');
    if (c >= 0) return [c, r] as const;
  }
  return [-1, -1] as const;
};
let cache: { key: string; items: Item[] } | null = null;
let dimStep = -1;

/** วางทุกชิ้นครั้งเดียวต่อ (seed, ขนาดจอ): ชิ้นที่ล้นขอบจอถูกข้าม แต่ยังนับพื้นที่ */
function layout(p: Parameters<SceneLayer['render']>[0]): Item[] {
  const small = p.scale < 1.25 ? 1 : 0;
  const key = `${p.seed}|${p.width}|${p.centerX}|${p.giftScale}|${small}`;
  if (cache?.key === key) return cache.items;
  const cursor = { '-1': Math.ceil(58 * p.giftScale + 3), '1': Math.ceil(58 * p.giftScale + 3) };
  const items: Item[] = [];
  DEFS.forEach((def, i) => {
    const rows = def.rows[small];
    const w = rows[0].length;
    const cur = cursor[String(def.side) as '-1' | '1'];
    const x = def.side < 0 ? -cur - w : cur;
    cursor[String(def.side) as '-1' | '1'] = cur + w + 2 + Math.floor(hashRand(p.seed, i, 400) * 3);
    const left = p.centerX + x;
    if (left < 2 || left + w > p.width - 2) return;
    const [fx, fy] = flameAt(rows);
    items.push({ def, rows, x, fx, fy, phase: hashRand(p.seed, i, 401), legend: { ...def.colors } });
  });
  cache = { key, items };
  dimStep = -1;
  return items;
}

/** ของตกแต่งรอบโคนต้น: ผ้ารองโคนต้น (วาดหลังต้นไม้ ก่อนกล่องของขวัญแถวหน้า) */
export function createGroundDecor(): SceneLayer {
  return {
    render(p) {
      const { ctx, tree } = p;
      if (!hasSkirt(p.day) || tree.height <= 0) return;
      drawItems(p);
      const k = p.daylight.darkness * 0.3;
      const dim = (c: string) => (k > 0 ? mixColor(c, '#14204a', k) : c);
      const red = dim(PALETTE.red);
      const fold = dim(PALETTE.redDark);
      const white = dim(PALETTE.white);
      const w = Math.max(tree.trunkHalf + 2, Math.round(tree.baseHalfWidth * 0.55));
      const h = Math.max(4, Math.min(6, Math.round(p.scale * 2.8)));
      const ox = p.centerX;
      const top = p.groundY - h;

      // วงรีแบน: แถวล่างกว้างสุด แถวบนแคบลง
      for (let r = 0; r < h; r++) {
        const e = (h - 1 - r) / h;
        const hw = Math.max(tree.trunkHalf + 2, Math.round(w * Math.sqrt(1 - e * e)));
        const last = r === h - 1;
        rect(ctx, ox - hw, top + r, hw * 2 + 1, 1, last ? white : red);
        if (!last && r === h - 2) {
          // ขอบสโคลปสีขาว: ปุ่มนูนขึ้นเหนือแถวล่างทุก 3 px
          for (let x = -hw; x <= hw; x++) if (((x % 3) + 3) % 3 === 0) rect(ctx, ox + x, top + r, 1, 1, white);
        }
      }
      // ร่องสโคลปแถวล่าง
      for (let x = -w; x <= w; x++) if (((x % 3) + 3) % 3 === 1 && h > 3) rect(ctx, ox + x, top + h - 1, 1, 1, red);
      // รอยพับผ้า
      for (const f of [-0.45, 0.2]) {
        const x = Math.round(w * f);
        rect(ctx, ox + x, top + 1, 1, h - 3, fold);
      }
    },
  };
}

/** ของวางบนหิมะ: โคม/เทียนมีเปลวกะพริบ + แสงอุ่นตอนกลางคืน */
function drawItems(p: Parameters<SceneLayer['render']>[0]): void {
  const n = groundItemCount(p.day);
  if (n <= 0) return;
  const { ctx, timeMs: t } = p;
  const items = layout(p);
  const step = Math.round(p.daylight.darkness * 20);
  if (step !== dimStep) {
    dimStep = step;
    for (const it of items) {
      for (const key in it.def.colors) it.legend[key] = step > 0 ? mixColor(it.def.colors[key], NAVY, (step / 20) * 0.3) : it.def.colors[key];
    }
  }
  const dark = p.daylight.darkness;
  for (const it of items) {
    // index ของ def = ลำดับการปรากฏ
    if (DEFS.indexOf(it.def) >= n) continue;
    const h = it.rows.length;
    const x = p.centerX + it.x;
    const y = p.groundY - h;
    let fl = 0.5;
    if (it.def.glow) {
      if (!p.reducedMotion) fl = 0.5 + 0.5 * Math.sin(t / 170 + it.phase * 6) * Math.sin(t / 310 + it.phase * 3);
      it.legend.f = FLAME[fl > 0.45 ? 1 : 0];
      if (dark > 0.05) {
        // แสงอุ่นเป็นเพชรซ้อนกัน
        const cx = x + it.fx;
        const cy = y + it.fy;
        for (const [g, a] of [[6, 0.07], [3, 0.12]] as const) {
          ctx.globalAlpha = dark * (a + 0.05 * fl);
          for (let dy = -g; dy <= g; dy++) {
            const hw = g - Math.abs(dy);
            rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, '#ffb347');
          }
        }
        ctx.globalAlpha = 1;
      }
    }
    drawSprite(ctx, it.rows, it.legend, x, y);
  }
}
