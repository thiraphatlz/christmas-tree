// ชั้น "ตลาดคริสต์มาส" (ของจริง): ลานหิมะไกล ๆ สองข้างต้นไม้ มีร้าน ไฟประดับ ผู้คน ชิงช้าสวรรค์ ฯลฯ
// ของทุกชิ้นหา index จาก hashRand(seed, index, channel) เท่านั้น ชิ้นที่ i จึงอยู่ที่เดิม/หน้าตาเดิมทุกวัน
// ภาพนิ่งเก็บใน offscreen canvas (หลัง/หน้าชิงช้า) ส่วนที่ขยับวาดทุกเฟรม
import { drawSprite, mixColor } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { DetailLayerView, DetailRenderer, DetailViews, SceneParams } from '../types';

/** ผังของตลาด: ขึ้นกับขนาดจอและต้นเต็มเท่านั้น (ไม่ขึ้นกับวัน) ของทุกชิ้นจึงไม่ย้ายที่ */
export interface MarketLayout {
  /** ความสูงของลานตลาดเหนือพื้น (px) */
  terrace: number;
  /** ขอบในของลานฝั่งซ้าย (ฝั่งขวาสมมาตร: width - 1 - x) */
  innerX: number;
  /** ปลายเนินที่ลาดลงถึงพื้น */
  footX: number;
  stallW: number;
  stallH: number;
  /** ขอบซ้ายของร้านแต่ละช่อง เรียงตามลำดับที่ปรากฏ (สลับซ้ายขวา จากในออกนอก) */
  slots: number[];
  /** จุดศูนย์กลางและรัศมีของชิงช้าสวรรค์ (null = จอแคบ ไม่มี) */
  ferris: { x: number; y: number; r: number } | null;
  /** ความกว้างฉากที่คำนวณผังนี้ (ใช้กำหนดเพดานจำนวนคน) */
  width: number;
}

export function getMarketLayout(width: number, centerX: number, groundY: number, treeMax: number, scale: number): MarketLayout | null {
  const u = scale / 1.5;
  const need = 30; // ที่ว่างข้างต้นขั้นต่ำต่อฝั่ง
  if (centerX - need <= 4) return null;
  const baseHalf = 0.38 * treeMax;
  // จอกว้าง: ลานอยู่ระดับหลังคากระท่อม (18px ที่ scale 1.5)
  // จอแคบ: ต้นกินเกือบเต็มความกว้าง จึงยกลานขึ้นครึ่งหนึ่งของความสูงที่ต้นเต็ม (ทรงกรวย) จะเหลือที่ว่างข้างละ need แล้วใช้ร้านขนาดเล็ก
  const wide = 18 * u;
  const raised = treeMax * (1 - (centerX - need) / baseHalf) + 4;
  const compact = raised > wide;
  const terrace = Math.round(compact ? Math.max(wide, raised * 0.5) : wide);
  const halfAt = baseHalf * Math.max(0, 1 - terrace / treeMax);
  const innerX = Math.floor(centerX - halfAt - 5);
  const footX = Math.round(innerX + terrace * 1.1);
  const stallW = compact ? 10 : Math.max(9, Math.round(13 * u));
  const stallH = compact ? 9 : Math.max(8, Math.round(12 * u));
  const pitch = stallW + 4;
  const perSide = Math.max(0, Math.min(3, Math.floor((innerX - 1) / pitch)));
  const slots: number[] = [];
  for (let k = 0; k < perSide; k++) {
    const left = innerX - (k + 1) * pitch + 2;
    slots.push(left, width - 1 - left - stallW + 1);
  }
  const r = Math.round(15 * u);
  const ferris =
    width >= 200 && perSide >= 2
      ? { x: width - 1 - Math.round(innerX - pitch * 1.5), y: groundY - terrace - stallH - r + 3, r }
      : null;
  return { terrace, innerX, footX, stallW, stallH, slots: slots.slice(0, width < 200 ? 3 : 6), ferris, width };
}

/** จำนวนร้าน/คนที่วาดจริงหลังเพดานตามความกว้างจอ (ให้หน้า debug) */
export function getMarketCounts(views: DetailViews, layout: MarketLayout | null): { stalls: number; people: number } {
  if (!layout || !views.marketGround?.active) return { stalls: 0, people: 0 };
  return {
    stalls: Math.min(views.stalls?.count ?? 0, layout.slots.length),
    people: Math.min(views.people?.count ?? 0, layout.width < 200 ? 4 : 12),
  };
}

/** จำนวนครั้งที่สร้างแคชใหม่ (ตรวจสอบว่าไม่สร้างทุกเฟรม) */
export const marketStats = { rebuilds: 0 };

// ---------------- ค่าคงที่ ----------------
const TAU = Math.PI * 2;
const FAR = -1e9;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

// สีดิบ [สี, น้ำหนักการย้อมน้ำเงินตอนกลางคืน]; pal ผสมกับสีฟ้าล่างเล็กน้อย (หมอกไกล) แล้วย้อมตามความมืด
const RAW = {
  wall: [PALETTE.cabinWall, 0.45],
  wallDark: [PALETTE.cabinWallDark, 0.45],
  counterTop: ['#b07a50', 0.45],
  beam: [PALETTE.cabinRoof, 0.4],
  pole: [PALETTE.trunkDark, 0.4],
  iron: ['#59607a', 0.6],
  ironDark: ['#3d4259', 0.6],
  pine: [PALETTE.pine, 0.5],
  pineDark: [PALETTE.pineDark, 0.5],
  white: [PALETTE.white, 0.3],
  red: [PALETTE.red, 0.4],
  redDark: [PALETTE.redDark, 0.4],
  gold: [PALETTE.gold, 0.25],
  goldDark: [PALETTE.goldDark, 0.3],
  green: ['#2a7d4a', 0.4],
  blue: ['#1f6f8b', 0.4],
  pink: ['#e86aa8', 0.35],
  brown: ['#8a5b3c', 0.4],
  brownDark: ['#6e4324', 0.4],
  cream: ['#f4e2c0', 0.3],
  dough: ['#d9a066', 0.35],
  ginger: ['#8a4a2a', 0.4],
  brick: ['#8f3b2b', 0.4],
  smoke: [PALETTE.smoke, 0.6],
} as const;
type RawKey = keyof typeof RAW;
type Pal = Record<RawKey, string> & {
  snow: string;
  shade: string;
  hill: string;
  crest: string;
  plaza: string;
  edge: string;
  face2: string;
  track: string;
  interior: string;
  lantern: string;
  coats: string[];
  hats: string[];
  skins: string[];
  scarves: string[];
  cab: string[];
  bulbDim: string[];
  pennant: string[];
  sign: Record<string, string>[];
};

const COATS = ['#3b4a7a', '#7a3b3b', '#3b6a4f', '#5a4a7a', '#7a5a3b', '#8a4a63', '#3f6f7a'];
const HATS = [PALETTE.red, PALETTE.gold, '#4dc3ff', PALETTE.white, '#5fe36a', '#ff8ad1'];
const SKINS = ['#f2c9a0', '#d9a273', '#b87a52', '#8a5a3c'];
const SCARVES = [PALETTE.red, '#2a7d4a', PALETTE.gold, '#4dc3ff'];
const CABINS = [PALETTE.red, '#1f6f8b', '#2a7d4a', PALETTE.gold, '#8e4fa8', '#e07a3f', '#e86aa8', '#4dc3ff'];

function buildPal(dq: number, glow: number, sky: string): Pal {
  const hz = (c: string) => mixColor(c, sky, 0.1);
  const nt = (c: string, k: number) => mixColor(hz(c), PALETTE.skyNight[0], dq * k);
  const snowMix = (c: string) => mixColor(hz(c), PALETTE.snowNight, dq * 0.85);
  const p = {} as Pal;
  for (const k of Object.keys(RAW) as RawKey[]) p[k] = nt(RAW[k][0], RAW[k][1]);
  const hillBase = mixColor(mixColor(PALETTE.snowShade, sky, 0.35), '#33457f', dq * 0.75);
  p.snow = snowMix(PALETTE.snow);
  p.shade = snowMix(PALETTE.snowShade);
  p.hill = hillBase;
  p.crest = mixColor(mixColor(PALETTE.snow, sky, 0.2), '#5a6fa3', dq * 0.75);
  p.plaza = mixColor(mixColor(PALETTE.snow, sky, 0.12), '#6f84b8', dq * 0.7);
  p.edge = mixColor(hillBase, '#33457f', 0.35);
  p.face2 = mixColor(hillBase, '#33457f', 0.18);
  p.track = mixColor(p.plaza, '#7f93bf', 0.45);
  p.interior = mixColor(mixColor(p.wallDark, PALETTE.windowDay, 0.16 * (1 - dq)), PALETTE.windowGlow, glow * 0.85);
  p.lantern = mixColor(p.goldDark, PALETTE.windowGlow, glow);
  p.coats = COATS.map((c) => nt(c, 0.35));
  p.hats = HATS.map((c) => nt(c, 0.3));
  p.skins = SKINS.map((c) => nt(c, 0.35));
  p.scarves = SCARVES.map((c) => nt(c, 0.35));
  p.cab = CABINS.map((c) => nt(c, 0.3));
  p.bulbDim = PALETTE.lights.map((c) => nt(c, 0.5));
  p.pennant = [p.red, p.gold, p.white, p.green];
  p.sign = [
    { a: p.red, b: p.white },
    { a: p.pink, b: p.white },
    { a: p.blue, b: p.gold },
    { a: p.green, b: p.red },
    { a: p.dough, b: p.white },
    { a: p.red, b: p.gold },
  ];
  return p;
}

// ไอคอนป้ายร้าน 3x3 (ไม่มีตัวอักษร): แก้วร้อน, ลูกกวาด, ของเล่นไม้, พวงหรีด, ขนมปังขิง, ของขวัญ
const SIGNS = [
  ['aa.', 'aab', 'aa.'],
  ['aba', 'bab', 'aba'],
  ['.b.', 'bab', 'aaa'],
  ['aaa', 'a.a', 'aba'],
  ['.a.', 'aaa', 'a.a'],
  ['aba', 'bbb', 'aba'],
];
// หลังคาแต่ละร้าน: ลายริ้ว [สี1, สี2] หรือหลังคาหิมะที่มีชายระบายสีเดียว
const ROOFS: ({ stripe: [RawKey, RawKey] } | { snowy: RawKey })[] = [
  { stripe: ['red', 'white'] },
  { stripe: ['pink', 'white'] },
  { snowy: 'blue' },
  { snowy: 'green' },
  { stripe: ['goldDark', 'cream'] },
  { stripe: ['green', 'red'] },
];
const PINE_HALF = [0, 1, 2, 1, 2, 3, 2, 3, 4, 4];
const PINE_LIGHTS = [-1, 2, 1, 4, -2, 5, 2, 7, -1, 8];

// ---------------- แบบจำลอง (คำนวณใหม่เมื่อผัง/ขนาดจอเปลี่ยนเท่านั้น) ----------------
interface Span {
  wx: number[];
  wy: number[];
  bx: number[];
  by: number[];
  bc: number[];
  bph: number[];
  brate: number[];
}
interface Bunting {
  wx: number[];
  wy: number[];
  px: number[];
  py: number[];
  pc: number[];
}
interface Person {
  side: number;
  kid: boolean;
  coat: number;
  hat: number;
  bobble: boolean;
  scarf: number;
  skin: number;
  carry: number;
  bag: number;
  a: number;
  b: number;
  per: number;
  off: number;
  rest: number;
}
interface Burst {
  cx: number;
  cy: number;
  r: number;
  per: number;
  ph: number;
  col: number;
  cs: number[];
  sn: number[];
}
interface Model {
  L: MarketLayout;
  W: number;
  g: number;
  T: number;
  ty: number;
  yTop: number;
  cacheH: number;
  h: Int16Array;
  flat: Uint8Array;
  streaks: number[];
  stalls: { x: number; kind: number }[];
  poleX: number[][];
  poleTop: number;
  spans: (Span | null)[];
  bunting: (Bunting | null)[];
  pines: { x: number; ok: boolean }[];
  props: { x: number; side: number }[];
  tracks: { sx: number[]; sy: number[]; fx: number[]; fy: number[] };
  people: Person[];
  carolers: { x: number }[];
  sparks: { x: number; y: number; ph: number }[];
  bursts: Burst[];
  rimX: number[];
  rimY: number[];
  rimLight: number;
  innerX: number;
}

function buildModel(p: SceneParams, L: MarketLayout): Model {
  const { width: W, groundY: g, centerX, seed } = p;
  const { terrace: T, innerX, footX, stallW: w, stallH } = L;
  const ty = g - T;
  const pitch = w + 4;
  const ax = (side: number, d: number) => (side ? W - 1 - d : d);
  const h = new Int16Array(W);
  const flat = new Uint8Array(W);
  const streaks: number[] = [];
  for (let x = 0; x < W; x++) {
    const d = Math.min(x, W - 1 - x);
    if (d <= innerX) {
      h[x] = T;
      flat[x] = 1;
    } else if (d >= footX) h[x] = 0;
    else h[x] = Math.round(T * (0.5 + 0.5 * Math.cos((Math.PI * (d - innerX)) / Math.max(1, footX - innerX))));
    if (h[x] > 8 && hashRand(seed, x, 740) < 0.2) streaks.push(x, 5 + Math.floor(hashRand(seed, x, 741) * (h[x] - 9)), 1 + Math.floor(hashRand(seed, x, 742) * 3));
  }
  const stalls = L.slots.map((x, i) => ({ x, kind: i % 6 }));
  const slotSide = (x: number) => (x < centerX ? 0 : 1);
  const slotD = (x: number) => (slotSide(x) ? W - 1 - (x + w - 1) : x); // ระยะจากขอบจอถึงขอบนอกของร้าน
  const freeD = [innerX - 8, innerX - 8];
  for (const x of L.slots) freeD[slotSide(x)] = Math.min(freeD[slotSide(x)], slotD(x));

  // เสาไฟอยู่ในช่องว่างระหว่างร้าน (d = innerX-1-m*pitch)
  let np = 0;
  while (np < 5 && innerX - 1 - np * pitch >= 2) np++;
  const poleX = [0, 1].map((s) => {
    const a: number[] = [];
    for (let m = 0; m < np; m++) a.push(ax(s, innerX - 1 - m * pitch));
    return a;
  });
  const poleTop = ty - stallH - 11;
  const spans: (Span | null)[] = [];
  for (let k = 0; k < 4; k++) {
    for (let s = 0; s < 2; s++) {
      if (k + 1 >= np) {
        spans.push(null);
        continue;
      }
      const d0 = innerX - 1 - k * pitch;
      const sp: Span = { wx: [], wy: [], bx: [], by: [], bc: [], bph: [], brate: [] };
      for (let q = 1; q < pitch; q++) {
        const y = poleTop + 6 + Math.round(2 * Math.sin((Math.PI * q) / pitch));
        sp.wx.push(ax(s, d0 - q));
        sp.wy.push(y);
        if (q % 4 === 2) {
          const j = sp.bx.length;
          const id = k * 40 + j + s * 200;
          sp.bx.push(ax(s, d0 - q));
          sp.by.push(y + 1);
          sp.bc.push((k * 7 + j * 3 + s * 2) % 5);
          sp.bph.push(hashRand(seed, id, 700) * TAU);
          sp.brate.push(450 + hashRand(seed, id, 701) * 900);
        }
      }
      spans.push(sp);
    }
  }
  const bunting: (Bunting | null)[] = [];
  for (let b = 0; b < 3; b++) {
    const s = b & 1;
    const k = b >> 1;
    if (k + 1 >= np) {
      bunting.push(null);
      continue;
    }
    const d0 = innerX - 1 - k * pitch;
    const bu: Bunting = { wx: [], wy: [], px: [], py: [], pc: [] };
    for (let q = 1; q < pitch; q++) {
      const y = poleTop + 1 + Math.round(Math.sin((Math.PI * q) / pitch));
      bu.wx.push(ax(s, d0 - q));
      bu.wy.push(y);
      if (q % 4 === 3) {
        bu.px.push(ax(s, d0 - q));
        bu.py.push(y);
        bu.pc.push((b * 2 + bu.px.length) % 4);
      }
    }
    bunting.push(bu);
  }

  // ต้นสน: ปลายสุดของลาน (k=0) และข้างร้านนอกสุด (k=1)
  const pines: { x: number; ok: boolean }[] = [];
  for (let i = 0; i < 4; i++) {
    const s = i & 1;
    const d = i >> 1 === 0 ? 5 : freeD[s] - 6;
    pines.push({ x: ax(s, d), ok: i >> 1 === 0 || d - 5 >= 9 });
  }
  // ลัง/ถัง/พัสดุ วางในช่องว่างด้านนอกของร้านช่อง 0..2
  const props: { x: number; side: number }[] = [];
  for (let j = 0; j < 3; j++) {
    const sx = L.slots[j];
    if (sx === undefined) props.push({ x: -99, side: 0 });
    else props.push({ x: slotSide(sx) ? sx + w : sx - 3, side: slotSide(sx) });
  }
  // รอยลากเลื่อน (ลานซ้าย) และรอยเท้า (ลานขวา)
  const tracks = { sx: [] as number[], sy: [] as number[], fx: [] as number[], fy: [] as number[] };
  for (let d = 4; d <= freeD[0] - 5; d++) if (hashRand(seed, d, 730) > 0.12) tracks.sx.push(d);
  for (let d = 5; d <= freeD[1] - 6; d += 4) tracks.fx.push(ax(1, d));

  // ผู้คน
  const people: Person[] = [];
  for (let i = 0; i < 12; i++) {
    const s = i & 1;
    const lim = Math.min(L.slots.length - 1, 2 + (i >> 1));
    const cand: number[] = [];
    const lo = s ? W - 1 - (innerX - 4) : 3;
    const hi = s ? W - 4 : innerX - 4;
    for (let j = 0; j <= lim; j++) if (slotSide(L.slots[j]) === s) cand.push(L.slots[j] + (w >> 1));
    cand.push(ax(s, 4 + Math.floor(hashRand(seed, i, 711) * Math.max(1, innerX - 10))));
    const ia = Math.floor(hashRand(seed, i, 712) * cand.length);
    const ib = (ia + 1 + Math.floor(hashRand(seed, i, 713) * Math.max(1, cand.length - 1))) % cand.length;
    const cl = (v: number) => Math.max(lo, Math.min(hi, v));
    people.push({
      side: s,
      kid: hashRand(seed, i, 702) < 0.25,
      coat: Math.floor(hashRand(seed, i, 703) * COATS.length),
      hat: Math.floor(hashRand(seed, i, 704) * HATS.length),
      bobble: hashRand(seed, i, 705) < 0.5,
      scarf: hashRand(seed, i, 706) < 0.55 ? Math.floor(hashRand(seed, i, 707) * SCARVES.length) : -1,
      skin: Math.floor(hashRand(seed, i, 708) * SKINS.length),
      carry: hashRand(seed, i, 709) < 0.2 ? 1 : hashRand(seed, i, 709) < 0.4 ? 2 : 0,
      bag: Math.floor(hashRand(seed, i, 710) * CABINS.length),
      a: cl(cand[ia]),
      b: cl(cand[ib]),
      per: 9000 + hashRand(seed, i, 714) * 7000,
      off: hashRand(seed, i, 715) * 2,
      rest: 0.2 + 0.6 * hashRand(seed, i, 716),
    });
  }

  // คณะร้องเพลง: ซ้ายของมนุษย์หิมะ (ซึ่งอยู่ซ้ายโคมไฟ) ตามสูตรเดียวกับ background
  const u = p.scale / 1.5;
  const sw = u >= 0.83 ? Math.max(12, Math.round(14 * u)) : 9;
  const bx = W - 14 - 4 - sw - 4 - 11;
  const carolers = [0, 1, 2].map((j) => ({ x: bx + j * 4 }));

  const sparks: { x: number; y: number; ph: number }[] = [];
  for (let n = 0; n < 16; n++) {
    sparks.push({
      x: ax(n & 1, 4 + Math.floor(hashRand(seed, n, 720) * Math.max(1, innerX - 6))),
      y: ty - stallH - 8 - Math.floor(hashRand(seed, n, 721) * 18),
      ph: hashRand(seed, n, 722),
    });
  }

  // พลุ: อยู่นอกคอลัมน์ต้นไม้ (centerX ± 0.42*treeMax)
  const bursts: Burst[] = [];
  const colL = centerX - 0.42 * p.treeMax - 8;
  if (colL >= 36) {
    for (let n = 0; n < 4; n++) {
      const r = 11 + hashRand(seed, n, 750) * 7;
      const xl = r + 4 + hashRand(seed, n, 751) * Math.max(0, colL - 2 * r - 8);
      const cs: number[] = [];
      const sn: number[] = [];
      const a0 = hashRand(seed, n, 752) * TAU;
      for (let q = 0; q < 10; q++) {
        cs.push(Math.cos(a0 + (q / 10) * TAU));
        sn.push(Math.sin(a0 + (q / 10) * TAU));
      }
      const per = 5200 + hashRand(seed, n, 753) * 2500;
      bursts.push({
        cx: ax(n & 1, Math.round(xl)),
        cy: Math.max(r + 6, Math.round(ty - 62 - hashRand(seed, n, 754) * 32)),
        r,
        per,
        ph: hashRand(seed, n, 755) * per,
        col: n % 5,
        cs,
        sn,
      });
    }
  }

  // ชิงช้าสวรรค์: วงล้อ (จุดบนขอบเรียงตามมุม เริ่มจากบนสุด)
  const rimX: number[] = [];
  const rimY: number[] = [];
  let rimLight = 0;
  const f = L.ferris;
  if (f) {
    const seen = new Set<number>();
    const N = Math.ceil(TAU * f.r * 2);
    for (let n = 0; n < N; n++) {
      const a = (n / N) * TAU - Math.PI / 2;
      const px = Math.round(f.x + Math.cos(a) * f.r);
      const py = Math.round(f.y + Math.sin(a) * f.r);
      const key = px * 1000 + py + 500;
      if (seen.has(key)) continue;
      seen.add(key);
      rimX.push(px);
      rimY.push(py);
    }
    rimLight = 16;
  }

  const yTop = Math.max(0, Math.min(poleTop - 3, f ? f.y - f.r - 2 : 1e9));
  return {
    L, W, g, T, ty, yTop, cacheH: g - yTop + 1, h, flat, streaks, stalls, poleX, poleTop, spans, bunting, pines, props,
    tracks, people, carolers, sparks, bursts, rimX, rimY, rimLight, innerX,
  };
}

const EMPTY: DetailLayerView = { id: '', label: '', unlockDay: 99, active: false, count: 0, maxCount: 0, intensity: 0, prevCount: 0, appearT: null };

export function createMarket(): DetailRenderer {
  let M: Model | null = null;
  let modelSet = false;
  const mk = [0, 0, 0, 0, 0, 0];
  const mkPrev = [-1, 0, 0, 0, 0, 0];
  let pal: Pal | null = null;
  let palDq = -1;
  let palLq = -1;
  let palSky = '';
  let glow = 0;
  // แคชภาพนิ่ง: หลังชิงช้า (ลาน/รอย/โครงชิงช้า) และหน้าชิงช้า (ร้าน เสา สาย ธง ของ ต้นสน)
  let backC: HTMLCanvasElement | null = null;
  let frontC: HTMLCanvasElement | null = null;
  // คีย์แคช = [W,H,centerX,g,treeMax,scale,seed, darkness/20, intensity/10, จำนวนร้าน/ไฟ/ธง/ของ/สน, ชิงช้า] + สีฟ้าล่าง
  // แคชสร้างใหม่เมื่อคีย์นี้เปลี่ยนเท่านั้น และไม่ใช้แคชขณะมี animation ปรากฏ (วาดตรงแทน)
  const ck = new Array<number>(16).fill(0);
  const ckPrev = new Array<number>(16).fill(-1);
  let ckSky = '';
  let cacheOk = false;

  // สถานะเฟรมปัจจุบัน (ตัวแปรร่วมของฟังก์ชันวาด)
  let ctx!: CanvasRenderingContext2D;
  let V: DetailViews;
  let t = 0;
  let still = false;
  let dq = 0;
  let gAnim = false;
  let clipY = FAR;
  let W = 0;
  let nStalls = 0;
  let dwX = 0;
  let dwMoving = false;
  let dwFx = 1;
  const view = (id: string) => V[id] ?? EMPTY;
  const prog = (lv: DetailLayerView, i: number): number => {
    if (lv.appearT === null || i < lv.prevCount) return 1;
    return gAnim ? Math.max(0, (lv.appearT - 0.6) / 0.4) : lv.appearT;
  };
  const R = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    if (y < clipY) {
      h -= clipY - y;
      y = clipY;
    }
    if (h <= 0 || w <= 0) return;
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };

  // ---------- ภาพนิ่ง: หลังชิงช้า ----------
  function paintBack(g: CanvasRenderingContext2D, rise: number): void {
    const m = M as Model;
    const P = pal as Pal;
    const T = m.T;
    for (let x = 0; x < m.W; x++) {
      const hh = rise < 1 ? Math.round(m.h[x] * rise) : m.h[x];
      if (hh <= 0) continue;
      const top = m.g - hh;
      R(g, x, top, 1, hh, P.hill);
      if (m.flat[x] && hh >= 5) {
        R(g, x, top, 1, 1, P.crest);
        R(g, x, top + 1, 1, 2, P.plaza);
        R(g, x, top + 3, 1, 1, P.edge);
      } else R(g, x, top, 1, 1, P.crest);
    }
    if (rise < 1) return;
    const base = m.g - T;
    for (let i = 0; i < m.streaks.length; i += 3) R(g, m.streaks[i], base + m.streaks[i + 1], m.streaks[i + 2], 1, P.face2);
    // รอยลากเลื่อน + รอยเท้า (props ชิ้นที่ 4)
    const pv = view('props');
    if (pv.count >= 4) {
      const ap = prog(pv, 3);
      const ns = Math.floor(m.tracks.sx.length * ap);
      for (let i = 0; i < ns; i++) {
        const d = m.tracks.sx[i];
        const sh = i > 18 && i < 34 ? 1 : 0;
        R(g, d, base + sh, 1, 1, P.track);
        R(g, d, base + 2 + sh, 1, 1, P.track);
      }
      const nf = Math.floor(m.tracks.fx.length * ap);
      for (let i = 0; i < nf; i++) {
        R(g, m.tracks.fx[i], base + 1, 1, 1, P.track);
        R(g, m.tracks.fx[i] + (i & 1 ? 2 : -2), base + 2, 1, 1, P.track);
      }
    }
    // โครงชิงช้า (A-frame) และขอบวง
    const f = m.L.ferris;
    const fv = view('ferris');
    if (f && fv.active) {
      const fp = prog(fv, 0);
      const span = base - f.y;
      const fl = Math.round(f.r * 0.6);
      const y0 = base - Math.round(span * clamp01(fp / 0.5));
      const offAt = (y: number) => Math.round(((y - f.y) / span) * fl);
      for (let y = Math.max(f.y, y0); y < base; y++) {
        const o = offAt(y);
        R(g, f.x - o - 1, y, 2, 1, P.iron);
        R(g, f.x + o, y, 2, 1, P.iron);
      }
      if (fp >= 0.5) {
        const yb = f.y + Math.round(span * 0.62);
        R(g, f.x - offAt(yb), yb, offAt(yb) * 2 + 1, 1, P.ironDark);
        R(g, f.x - fl - 2, base - 1, 4, 1, P.ironDark);
        R(g, f.x + fl - 1, base - 1, 4, 1, P.ironDark);
        const n = Math.floor(m.rimX.length * clamp01((fp - 0.5) / 0.5));
        g.fillStyle = P.iron;
        for (let i = 0; i < n; i++) g.fillRect(m.rimX[i], m.rimY[i], 1, 1);
      }
    }
  }

  // ---------- ภาพนิ่ง: ร้านค้า ----------
  function paintStall(g: CanvasRenderingContext2D, i: number, ap: number): void {
    const m = M as Model;
    const P = pal as Pal;
    const s = m.stalls[i];
    const w = m.L.stallW;
    const sh = m.L.stallH;
    const x = s.x;
    const ty = m.ty;
    const roofH = Math.max(3, Math.round(sh * 0.32));
    const bodyH = sh - roofH;
    const cf = bodyH >= 8 ? 3 : 2;
    const vis = Math.max(1, Math.round(bodyH * ease(ap / 0.6)));
    const y0 = ty - cf - 1; // แถวบนเคาน์เตอร์
    clipY = ty - vis;
    if (glow > 0.05 && ap >= 1) {
      // แสงอุ่นสาดลงหิมะหน้าร้าน (นุ่ม 2 ชั้น)
      g.globalAlpha = 0.2 * glow;
      R(g, x - 2, ty, w + 4, 3, PALETTE.windowGlow);
      g.globalAlpha = 0.1 * glow;
      R(g, x - 1, ty + 3, w + 2, 1, PALETTE.windowGlow);
      g.globalAlpha = 1;
    }
    R(g, x, ty - bodyH, w, bodyH, P.wall);
    R(g, x + 1, ty - bodyH, w - 2, bodyH - cf - 1, P.interior);
    R(g, x + 1, ty - cf, w - 2, cf, P.wall);
    R(g, x + 1, ty - 1, w - 2, 1, P.wallDark);
    R(g, x, y0, w, 1, P.counterTop);
    R(g, x, ty - bodyH, 1, bodyH, P.wallDark);
    R(g, x + w - 1, ty - bodyH, 1, bodyH, P.wallDark);
    if (vis >= bodyH) {
      const gx = x + 1;
      const gw = w - 6;
      switch (s.kind) {
        case 0: // กาน้ำร้อน + แก้ว
          R(g, gx, y0 - 2, 3, 2, P.iron);
          R(g, gx + 3, y0 - 2, 1, 1, P.iron);
          R(g, gx + gw - 1, y0 - 1, 1, 1, P.red);
          if (gw >= 7) R(g, gx + gw - 3, y0 - 1, 1, 1, P.white);
          break;
        case 1: // โหลลูกกวาด
          for (let j = 0; j + 1 < gw + 1; j += 2) {
            const c = [P.red, P.white, P.pink, P.green][(j / 2 + i) % 4];
            R(g, gx + j, y0 - 2, 2, 2, c);
            R(g, gx + j, y0 - 2, 2, 1, P.cream);
          }
          break;
        case 2: // ของเล่นไม้
          R(g, gx, y0 - 2, 2, 2, P.blue);
          R(g, gx + 2, y0 - 1, 2, 1, P.red);
          if (gw >= 7) {
            R(g, gx + 5, y0 - 3, 1, 3, P.red);
            R(g, gx + 5, y0 - 4, 1, 1, P.skins[0]);
          } else R(g, gx + 2, y0 - 2, 1, 1, P.gold);
          break;
        case 3: // พวงหรีดบนผนัง + เทียน
          R(g, gx + 1, ty - bodyH + 1, 3, 1, P.green);
          if (bodyH >= 8) {
            R(g, gx + 1, ty - bodyH + 2, 1, 1, P.green);
            R(g, gx + 3, ty - bodyH + 2, 1, 1, P.green);
            R(g, gx + 1, ty - bodyH + 3, 3, 1, P.green);
            R(g, gx + 2, ty - bodyH + 3, 1, 1, P.red);
          } else R(g, gx + 2, ty - bodyH + 1, 1, 1, P.red);
          R(g, gx, y0 - 2, 1, 2, P.white);
          R(g, gx, y0 - 3, 1, 1, P.gold);
          if (gw >= 7) {
            R(g, gx + gw - 1, y0 - 2, 1, 2, P.white);
            R(g, gx + gw - 1, y0 - 3, 1, 1, P.gold);
          }
          break;
        case 4: // เบเกอรี่
          R(g, gx, y0 - 1, gw, 1, P.brownDark);
          R(g, gx, y0 - 2, 2, 1, P.dough);
          if (gw >= 5) R(g, gx + 3, y0 - 2, 2, 1, P.dough);
          R(g, gx + gw - 2, y0 - 2, 2, 1, P.ginger);
          break;
        default: // ของขวัญ
          R(g, gx, y0 - 2, 3, 2, P.red);
          R(g, gx + 1, y0 - 2, 1, 2, P.gold);
          R(g, gx + 3, y0 - 2, 2, 2, P.green);
          R(g, gx + 3, y0 - 1, 2, 1, P.white);
          if (gw >= 7) R(g, gx + 5, y0 - 1, 2, 1, P.blue);
      }
      // ป้ายไอคอน 3x3 และโคมไฟ (แสงกะพริบวาดแยกทุกเฟรม)
      drawSprite(g, SIGNS[s.kind], P.sign[s.kind], x + w - 4, ty - bodyH + 1);
      R(g, x + w - 5, ty - bodyH, 1, 1, P.pole);
      R(g, x + w - 5, ty - bodyH + 1, 1, bodyH >= 8 ? 2 : 1, P.lantern);
    }
    clipY = FAR;
    if (ap < 0.5) return;
    const dy = -Math.round((1 - ease((ap - 0.5) / 0.5)) * 8);
    const top = ty - sh + dy;
    const rf = ROOFS[s.kind];
    const snowy = 'snowy' in rf;
    for (let ry = 0; ry < roofH; ry++) {
      const y = top + ry;
      if (snowy) {
        const sr = roofH - 2;
        if (ry < sr) R(g, ry === 0 ? x : x - 1, y, ry === 0 ? w : w + 2, 1, P.snow);
        else if (ry === sr) R(g, x - 1, y, w + 2, 1, P[rf.snowy]);
        else for (let cx = -1; cx <= w; cx += 2) R(g, x + cx, y, 1, 1, P[rf.snowy]);
      } else {
        const [c1, c2] = rf.stripe;
        if (ry === 0) R(g, x, y, w, 1, P.snow);
        else
          for (let cx = -1; cx <= w; cx++) {
            const st = ((cx + 1) >> 1) & 1;
            if (ry === roofH - 1 && (cx + 1) & 1) continue;
            R(g, x + cx, y, 1, 1, P[st ? c2 : c1]);
          }
      }
    }
    if (s.kind === 4) {
      R(g, x + 2, top - 2, 2, 2, P.brick);
      R(g, x + 2, top - 3, 2, 1, P.snow);
    } else if (s.kind === 0) R(g, x + 3, top - 2, 1, 2, P.iron);
  }

  function paintProp(g: CanvasRenderingContext2D, j: number, ap: number): void {
    const m = M as Model;
    const P = pal as Pal;
    const pr = m.props[j];
    if (pr.x < 0) return;
    const ty = m.ty + 1;
    const x = pr.x;
    clipY = ty - Math.max(1, Math.round(5 * ease(ap)));
    if (j === 0) {
      R(g, x, ty - 3, 3, 3, P.brown);
      R(g, x, ty - 2, 3, 1, P.brownDark);
      R(g, x, ty - 3, 3, 1, P.dough);
      R(g, x + 1, ty - 5, 2, 2, P.brownDark);
      R(g, x + 1, ty - 5, 2, 1, P.dough);
    } else if (j === 1) {
      R(g, x, ty - 4, 3, 4, P.brownDark);
      R(g, x, ty - 3, 3, 1, P.iron);
      R(g, x, ty - 1, 3, 1, P.iron);
      R(g, x + 1, ty - 4, 1, 1, P.brown);
    } else {
      R(g, x, ty - 2, 3, 2, P.red);
      R(g, x + 1, ty - 2, 1, 2, P.gold);
      R(g, x + 1, ty - 4, 2, 2, P.blue);
      R(g, x + 1, ty - 3, 2, 1, P.white);
    }
    clipY = FAR;
  }

  function paintPine(g: CanvasRenderingContext2D, i: number, ap: number): void {
    const m = M as Model;
    const P = pal as Pal;
    const pn = m.pines[i];
    if (!pn.ok) return;
    const ty = m.ty;
    const x = pn.x;
    clipY = ty - Math.ceil(11 * ease(ap));
    R(g, x, ty - 1, 1, 1, P.pole);
    for (let r = 0; r < 10; r++) {
      const hf = PINE_HALF[r];
      R(g, x - hf, ty - 11 + r, hf * 2 + 1, 1, r % 3 === 2 || r === 9 ? P.pineDark : P.pine);
    }
    for (let r = 0; r < 10; r += 3) {
      const hf = PINE_HALF[r];
      R(g, x - (hf > 0 ? 1 : 0), ty - 11 + r, hf > 0 ? 3 : 1, 1, P.snow);
    }
    clipY = FAR;
  }

  // ---------- ภาพนิ่ง: หน้าชิงช้า ----------
  function paintFront(g: CanvasRenderingContext2D): void {
    const m = M as Model;
    const P = pal as Pal;
    const lv = view('marketLights');
    const bv = view('bunting');
    const sv = view('stalls');
    const pv = view('props');
    const nv = view('litPines');
    // เสา: ต้องใช้ถึงสายไฟ (count ช่วง = count+1 ต้น) หรือธง
    let need = lv.count > 0 ? lv.count + 1 : 0;
    for (let b = 0; b < bv.count && b < 3; b++) need = Math.max(need, (b >> 1) + 2);
    for (let s = 0; s < 2; s++) {
      for (let k = 0; k < need && k < m.poleX[s].length; k++) {
        const ls = k === 0 ? 0 : k - 1;
        const a = ls < lv.count ? prog(lv, ls) : 1;
        const hh = Math.round((m.ty - m.poleTop + 1) * ease(a / 0.4));
        if (hh <= 0) continue;
        R(g, m.poleX[s][k], m.ty + 1 - hh, 1, hh, P.pole);
        if (hh > 3) R(g, m.poleX[s][k], m.ty + 1 - hh, 1, 1, P.ironDark);
      }
    }
    for (let k = 0; k < lv.count && k < 4; k++) {
      const a = prog(lv, k);
      for (let s = 0; s < 2; s++) {
        const sp = m.spans[k * 2 + s];
        if (!sp) continue;
        const n = Math.floor(sp.wx.length * clamp01((a - 0.3) / 0.3));
        g.fillStyle = P.ironDark;
        for (let q = 0; q < n; q++) g.fillRect(sp.wx[q], sp.wy[q], 1, 1);
      }
    }
    for (let b = 0; b < bv.count && b < 3; b++) {
      const bu = m.bunting[b];
      if (!bu) continue;
      const a = clamp01((prog(bv, b) - 0.1) / 0.9);
      const n = Math.floor(bu.wx.length * a);
      g.fillStyle = P.ironDark;
      for (let q = 0; q < n; q++) g.fillRect(bu.wx[q], bu.wy[q], 1, 1);
      const np = Math.ceil(bu.px.length * a);
      for (let q = 0; q < np; q++) {
        const c = P.pennant[bu.pc[q]];
        R(g, bu.px[q] - 1, bu.py[q] + 1, 3, 1, c);
        R(g, bu.px[q], bu.py[q] + 2, 1, 1, c);
      }
    }
    for (let i = 0; i < nStalls; i++) paintStall(g, i, prog(sv, i));
    for (let j = 0; j < pv.count && j < 3; j++) paintProp(g, j, prog(pv, j));
    for (let i = 0; i < nv.count && i < 4; i++) paintPine(g, i, prog(nv, i));
  }

  function rebuildCache(): void {
    const m = M as Model;
    backC ??= document.createElement('canvas');
    frontC ??= document.createElement('canvas');
    const bctx = backC.getContext('2d');
    const fctx = frontC.getContext('2d');
    if (!bctx || !fctx) return;
    marketStats.rebuilds++;
    backC.width = frontC.width = m.W;
    backC.height = frontC.height = m.cacheH;
    bctx.translate(0, -m.yTop);
    fctx.translate(0, -m.yTop);
    paintBack(bctx, 1);
    paintFront(fctx);
  }

  // ---------- ส่วนที่ขยับ ----------
  function dynFerris(): void {
    const m = M as Model;
    const P = pal as Pal;
    const f = m.L.ferris;
    const fv = view('ferris');
    if (!f || !fv.active || prog(fv, 0) < 0.98) return;
    const rot = still ? 0.08 : (t / 60000) % 1;
    const a0 = rot * TAU;
    ctx.fillStyle = P.iron;
    for (let k = 0; k < 8; k++) {
      const cs = Math.cos(a0 + (k * TAU) / 8);
      const sn = Math.sin(a0 + (k * TAU) / 8);
      for (let q = 2; q < f.r; q++) ctx.fillRect(Math.round(f.x + cs * q), Math.round(f.y + sn * q), 1, 1);
    }
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k * TAU) / 8 - Math.PI / 2;
      const px = Math.round(f.x + Math.cos(a) * f.r);
      const py = Math.round(f.y + Math.sin(a) * f.r);
      // กระเช้าห้อยตรงเสมอ
      R(ctx, px, py, 1, 1, P.ironDark);
      R(ctx, px - 1, py + 1, 3, 1, P.redDark);
      R(ctx, px - 1, py + 2, 3, 2, P.cab[k]);
      if (glow > 0.05) {
        ctx.globalAlpha = glow;
        R(ctx, px, py + 2, 1, 1, PALETTE.windowGlow);
        ctx.globalAlpha = 1;
      }
    }
    R(ctx, f.x - 1, f.y - 1, 3, 3, P.gold);
    R(ctx, f.x, f.y, 1, 1, P.goldDark);
    if (glow > 0.05) {
      // ไฟบนขอบวง วิ่งไล่ตามเวลา
      for (let k = 0; k < m.rimLight; k++) {
        const a = a0 + (k * TAU) / m.rimLight - Math.PI / 2;
        const tw = still ? 1 : 0.5 + 0.5 * Math.sin(t / 220 + k * 0.9);
        ctx.globalAlpha = glow * (0.45 + 0.55 * tw);
        R(ctx, Math.round(f.x + Math.cos(a) * f.r), Math.round(f.y + Math.sin(a) * f.r), 1, 1, PALETTE.lights[k % 5]);
      }
      ctx.globalAlpha = 1;
    }
  }

  function dynBulbs(): void {
    const m = M as Model;
    const P = pal as Pal;
    const lv = view('marketLights');
    const inten = 0.55 + 0.45 * lv.intensity;
    for (let k = 0; k < lv.count && k < 4; k++) {
      const a = prog(lv, k);
      for (let s = 0; s < 2; s++) {
        const sp = m.spans[k * 2 + s];
        if (!sp) continue;
        const nb = sp.bx.length;
        for (let j = 0; j < nb; j++) {
          if (a < 1 && (a - 0.5) * 2 < (j + 1) / nb) continue; // ไล่จุดไฟทีละดวง
          const x = sp.bx[j];
          const y = sp.by[j];
          const c = sp.bc[j];
          const blink = still ? 1 : 0.6 + 0.4 * Math.sin(t / sp.brate[j] + sp.bph[j]);
          R(ctx, x, y, 1, 1, P.bulbDim[c]);
          const gl = glow > 0.02 ? glow * blink * inten : 0;
          if (gl > 0.02) {
            ctx.globalAlpha = gl * 0.3;
            R(ctx, x - 1, y - 1, 3, 3, PALETTE.lights[c]);
            ctx.globalAlpha = Math.min(1, gl);
            R(ctx, x, y, 1, 1, PALETTE.lights[c]);
            ctx.globalAlpha = 1;
          } else if (dq < 0.5) {
            ctx.globalAlpha = 0.5;
            R(ctx, x, y, 1, 1, PALETTE.lights[c]); // กลางวัน: หลอดสีจาง ๆ
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  function dynStalls(): void {
    const m = M as Model;
    const P = pal as Pal;
    const sv = view('stalls');
    const st = view('steam');
    const w = m.L.stallW;
    const sh = m.L.stallH;
    const roofH = Math.max(3, Math.round(sh * 0.32));
    const bodyH = sh - roofH;
    for (let i = 0; i < nStalls; i++) {
      if (prog(sv, i) < 1) continue;
      const x = m.stalls[i].x;
      if (glow > 0.05) {
        const fl = still ? 1 : 0.8 + 0.2 * Math.sin(t / 260 + i * 2.3);
        ctx.globalAlpha = 0.3 * glow * fl;
        R(ctx, x + w - 6, m.ty - bodyH, 3, bodyH >= 8 ? 4 : 3, PALETTE.windowGlow);
        ctx.globalAlpha = 1;
      }
      const k = m.stalls[i].kind;
      if (st.active && !still && (k === 0 || k === 4)) {
        const inten = 0.25 + 0.75 * st.intensity;
        const by = m.ty - sh - 3;
        ctx.fillStyle = P.smoke;
        for (let q = 0; q < 3; q++) {
          const ph = (t / 2200 + q / 3 + i * 0.19) % 1;
          ctx.globalAlpha = (1 - ph) * 0.55 * inten;
          ctx.fillRect(x + 3 + Math.round(Math.sin(ph * 5 + q + i)), by - Math.round(ph * 9), ph > 0.5 ? 2 : 1, 1);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function dynPines(): void {
    const m = M as Model;
    const nv = view('litPines');
    for (let i = 0; i < nv.count && i < 4; i++) {
      const pn = m.pines[i];
      if (!pn.ok || prog(nv, i) < 1) continue;
      for (let q = 0; q < 5; q++) {
        const c = (i + q) % 5;
        const blink = still ? 1 : 0.5 + 0.5 * Math.sin(t / 600 + q * 2 + i);
        const x = pn.x + PINE_LIGHTS[q * 2];
        const y = m.ty - 11 + PINE_LIGHTS[q * 2 + 1];
        R(ctx, x, y, 1, 1, (pal as Pal).bulbDim[c]);
        ctx.globalAlpha = (0.35 + 0.65 * dq) * blink;
        R(ctx, x, y, 1, 1, PALETTE.lights[c]);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ตัวคนเดินตลาด: สูง 7 (เด็ก 5) กว้าง 3; x = กลางตัว, fy = แถวเท้า
  function drawPerson(pp: Person, x: number, fy: number, moving: boolean, fx: number, i: number): void {
    const P = pal as Pal;
    const frame = moving ? ((t / 140 + i) | 0) & 1 : 0;
    const hgt = pp.kid ? 5 : 7;
    const y0 = fy - hgt + 1 - (moving && frame ? 1 : 0);
    const hat = P.hats[pp.hat];
    let y = y0;
    if (!pp.kid) {
      if (pp.bobble) R(ctx, x, y, 1, 1, P.white);
      y++;
    }
    R(ctx, x - 1, y, 3, 1, hat);
    R(ctx, x - 1, y + 1, 3, 1, P.skins[pp.skin]);
    const coat = P.coats[pp.coat];
    const rows = pp.kid ? 2 : 3;
    R(ctx, x - 1, y + 2, 3, rows, coat);
    if (pp.scarf >= 0) R(ctx, x - 1, y + 2, 3, 1, P.scarves[pp.scarf]);
    const ly = y + 2 + rows;
    if (moving && frame) R(ctx, x, ly, 1, 1, P.ironDark);
    else {
      R(ctx, x - 1, ly, 1, 1, P.ironDark);
      R(ctx, x + 1, ly, 1, 1, P.ironDark);
    }
    if (pp.carry === 1) R(ctx, x + fx * 2, y + 3, 1, 1, P.white);
    else if (pp.carry === 2) R(ctx, x + fx * 2, y + 3, 1, 2, P.cab[pp.bag]);
  }

  function dynPeople(): void {
    const m = M as Model;
    const pv = view('people');
    const n = Math.min(pv.count, W < 200 ? 4 : 12);
    const fy = m.ty + 2;
    for (let i = 0; i < n; i++) {
      const pp = m.people[i];
      const dist = pp.b - pp.a;
      if (still) {
        dwX = pp.a + dist * pp.rest;
        dwMoving = false;
        dwFx = 1;
      } else {
        const u = (t / pp.per + pp.off) % 2;
        const tri = u < 1 ? u : 2 - u;
        let sm = clamp01((tri - 0.14) / 0.72);
        sm = sm * sm * (3 - 2 * sm);
        dwX = pp.a + dist * sm;
        dwMoving = tri > 0.14 && tri < 0.86;
        dwFx = u < 1 === dist > 0 ? 1 : -1;
      }
      const ap = prog(pv, i);
      if (ap < 1) {
        const edge = pp.side ? W + 3 : -4;
        dwX = edge + (dwX - edge) * ease(ap);
        dwMoving = true;
        dwFx = pp.side ? -1 : 1;
      }
      drawPerson(pp, Math.round(dwX), fy, dwMoving, dwFx, i);
    }
  }

  function dynCarolers(p: SceneParams): void {
    const m = M as Model;
    const cv = view('carolers');
    if (!cv.active || W < 200) return;
    const P = pal as Pal;
    const ap = prog(cv, 0);
    const fy = p.groundY + 1;
    for (let j = 0; j < 3; j++) {
      const bx = m.carolers[j].x;
      const x = Math.round(W + 4 + j * 5 + (bx - (W + 4 + j * 5)) * ease(ap));
      const sway = still || ap < 1 ? 0 : Math.round(Math.sin(t / 700 + j * 1.9) * 0.6 + 0.2);
      const bob = ap < 1 && ((t / 140 + j) | 0) & 1 ? 1 : 0;
      const y0 = fy - 8 - bob;
      R(ctx, x + sway, y0, 3, 1, P.hats[(j + 1) % 6]);
      R(ctx, x + sway, y0 + 1, 3, 1, P.skins[j % 4]);
      R(ctx, x, y0 + 2, 3, 1, P.scarves[j % 4]);
      R(ctx, x, y0 + 3, 3, 3, P.coats[(j + 2) % 7]);
      R(ctx, x, y0 + 6, 1, 2, P.ironDark);
      R(ctx, x + 2, y0 + 6, 1, 2, P.ironDark);
      R(ctx, x + (j & 1 ? 2 : -1), y0 + 3, 2, 3, P.white); // แผ่นเนื้อเพลง
      if (!still && ap >= 1) {
        const ph = (t / 3200 + j * 0.37) % 1; // โน้ตเพลงลอยขึ้น
        ctx.globalAlpha = (1 - ph) * 0.8;
        R(ctx, x + 1 + Math.round(Math.sin(ph * 6 + j)), y0 - 2 - Math.round(ph * 8), 1, 1, PALETTE.gold);
        ctx.globalAlpha = 1;
      }
    }
  }

  function dynSparkles(): void {
    const m = M as Model;
    const sv = view('sparkles');
    const per = W < 200 ? 1 : 2;
    for (let i = 0; i < sv.count && i < 8; i++) {
      const ap = prog(sv, i);
      for (let j = 0; j < per; j++) {
        const n = i * 2 + j;
        const sp = m.sparks[n];
        const tw = still ? 0.7 : 0.5 + 0.5 * Math.sin(t / 500 + n * 2.1);
        const y = sp.y - (still ? 0 : Math.floor(((t / 5000 + sp.ph) % 1) * 6));
        const al = tw * (0.35 + 0.65 * dq) * ap;
        ctx.globalAlpha = al;
        R(ctx, sp.x, y, 1, 1, n % 3 ? PALETTE.starGlow : PALETTE.gold);
        if (tw > 0.85) {
          ctx.globalAlpha = al * 0.5;
          R(ctx, sp.x - 1, y, 3, 1, PALETTE.starGlow);
          R(ctx, sp.x, y - 1, 1, 3, PALETTE.starGlow);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function dynFireworks(): void {
    const m = M as Model;
    const fv = view('marketFireworks');
    if (!fv.active || still) return;
    const fade = prog(fv, 0) < 1 ? prog(fv, 0) : 1;
    const base = (0.35 + 0.65 * dq) * 0.75 * fade;
    for (let n = 0; n < m.bursts.length; n++) {
      const b = m.bursts[n];
      const u = ((t + b.ph) % b.per) / b.per;
      if (u > 0.45) continue; // ที่เหลือของรอบเป็นช่วงเงียบ
      const col = PALETTE.lights[b.col];
      if (u < 0.1) {
        const e = ease(u / 0.1);
        const y = Math.round(m.ty - m.L.stallH - 6 + (b.cy - (m.ty - m.L.stallH - 6)) * e);
        ctx.globalAlpha = base;
        R(ctx, b.cx, y, 1, 1, PALETTE.white);
        ctx.globalAlpha = base * 0.5;
        R(ctx, b.cx, y + 1, 1, 2, PALETTE.starGlow);
        continue;
      }
      const k = (u - 0.1) / 0.35;
      const r = b.r * ease(k);
      const gy = 3 * k * k;
      ctx.globalAlpha = base * (1 - k) * (1 - k * 0.3);
      for (let q = 0; q < 10; q++) {
        const x = Math.round(b.cx + b.cs[q] * r);
        const y = Math.round(b.cy + b.sn[q] * r + gy);
        R(ctx, x, y, 1, 1, q & 1 ? col : PALETTE.gold);
        if (k < 0.5) R(ctx, Math.round(b.cx + b.cs[q] * r * 0.6), Math.round(b.cy + b.sn[q] * r * 0.6 + gy * 0.5), 1, 1, PALETTE.starGlow);
      }
      if (k < 0.15) {
        ctx.globalAlpha = base * 0.6;
        R(ctx, b.cx - 1, b.cy - 1, 3, 3, PALETTE.starGlow);
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    render(p: SceneParams, views: DetailViews) {
      V = views;
      const gv = view('marketGround');
      if (!gv.active) return; // วัน 1-2: ไม่วาดอะไรเลย
      // แบบจำลองคำนวณใหม่เมื่อผัง/ขนาดจอเปลี่ยน
      mk[0] = p.width;
      mk[1] = p.centerX;
      mk[2] = p.groundY;
      mk[3] = p.treeMax;
      mk[4] = Math.round(p.scale * 1000);
      mk[5] = p.seed;
      let moved = !modelSet;
      for (let i = 0; i < 6; i++) if (mk[i] !== mkPrev[i]) moved = true;
      if (moved) {
        for (let i = 0; i < 6; i++) mkPrev[i] = mk[i];
        modelSet = true;
        const L = getMarketLayout(p.width, p.centerX, p.groundY, p.treeMax, p.scale);
        M = L ? buildModel(p, L) : null;
        cacheOk = false;
      }
      if (!M) return;
      const m = M;
      ctx = p.ctx;
      W = p.width;
      t = p.timeMs;
      still = p.reducedMotion;
      dq = Math.round(p.daylight.darkness * 20) / 20;
      const lq = Math.round(view('marketLights').intensity * 10) / 10;
      if (!pal || dq !== palDq || lq !== palLq || p.daylight.skyBottom !== palSky) {
        palDq = dq;
        palLq = lq;
        palSky = p.daylight.skyBottom;
        glow = dq * (0.4 + 0.6 * lq);
        pal = buildPal(dq, glow, palSky);
      }
      const lv = view('marketLights');
      const bv = view('bunting');
      const pv = view('props');
      const nv = view('litPines');
      const fv = view('ferris');
      nStalls = Math.min(view('stalls').count, m.L.slots.length);
      gAnim = gv.appearT !== null && gv.prevCount === 0;
      const anim =
        gv.appearT !== null || lv.appearT !== null || view('stalls').appearT !== null || bv.appearT !== null || pv.appearT !== null || fv.appearT !== null || nv.appearT !== null;
      const rise = gAnim ? ease((gv.appearT as number) / 0.6) : 1;

      // ภาพนิ่ง: วาดตรง (ขณะมี animation) หรือ blit จากแคช
      if (anim) {
        paintBack(ctx, rise);
        if (rise < 1) return;
        dynFerris();
        paintFront(ctx);
      } else {
        ck[0] = W; ck[1] = p.height; ck[2] = p.centerX; ck[3] = p.groundY; ck[4] = p.treeMax; ck[5] = Math.round(p.scale * 1000);
        ck[6] = p.seed; ck[7] = Math.round(dq * 20); ck[8] = Math.round(lq * 10); ck[9] = nStalls; ck[10] = lv.count; ck[11] = bv.count;
        ck[12] = pv.count; ck[13] = nv.count; ck[14] = fv.active ? 1 : 0; ck[15] = m.L.terrace;
        let same = cacheOk && ckSky === palSky;
        for (let i = 0; same && i < 16; i++) if (ck[i] !== ckPrev[i]) same = false;
        if (!same) {
          for (let i = 0; i < 16; i++) ckPrev[i] = ck[i];
          ckSky = palSky;
          rebuildCache();
          cacheOk = true;
        }
        if (backC && frontC) ctx.drawImage(backC, 0, m.yTop);
        dynFerris();
        if (backC && frontC) ctx.drawImage(frontC, 0, m.yTop);
      }
      dynStalls();
      dynBulbs();
      dynPines();
      dynPeople();
      dynCarolers(p);
      dynSparkles();
      dynFireworks();
      ctx.globalAlpha = 1;
    },
  };
}
