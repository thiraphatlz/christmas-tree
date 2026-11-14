import { drawSprite, pixel, rect } from '../core/draw';
import { hashRand, randInt } from '../core/rng';
import { isSantaWindow, nextSantaDelayMs } from '../core/santaSchedule';
import { PALETTE } from '../palette';
import type { IAudioManager, SantaLayer, SceneParams } from '../types';

const LEGEND = {
  r: PALETTE.santaRed,
  s: PALETTE.santaSkin,
  w: PALETTE.white,
  k: PALETTE.sleigh,
  y: PALETTE.gold,
  o: PALETTE.goldDark,
  g: PALETTE.leafMid,
  b: PALETTE.reindeer,
  d: PALETTE.reindeerDark,
  a: PALETTE.seed,
  n: PALETTE.trunkDark,
};

// สไปรต์หันขวาทั้งหมด (บินไปซ้ายใช้ flipX) ทุกแถวต้องยาวเท่ากัน
// เลื่อน + ซานต้า + ถุงของขวัญ: 16 x 12
const SLEIGH = [
  '....w...........',
  '.....rrr........',
  '....wwww........',
  '.....sss........',
  '.....www........',
  '.gg.rrwrr......k',
  'kgggrrrrrs....kk',
  'kkkkkkkkkkkkkkk.',
  'kyyyyyyyyyyyyk..',
  '.kkkkkkkkkkkk...',
  '..o......o......',
  'yyyyyyyyyyyyyyy.',
];

// กวางเรนเดียร์ทั่วไป (จมูกสีน้ำตาลเข้ม): 11 x 9, ขา 2 เฟรม
const DEER_BODY = [
  '........a.a',
  '.........a.',
  '........bb.',
  'w.......bbn',
  'bbbbbbbbbb.',
  'bbbbbbbbb..',
  '.dddddddd..',
];
const DEER_LEGS = [
  ['.bd....db..', 'b.d....d.b.'], // เหยียดขา
  ['..bd..db...', '...b..b....'], // หุบขา
];
const DEER = DEER_LEGS.map((legs) => [...DEER_BODY, ...legs]);

const SLEIGH_W = 16;
const DEER_W = 11;
const DEER_X = [19, 32, 45]; // ตำแหน่งกวางแต่ละตัวในขบวน
const DEER_Y = 2; // ให้หลังกวางตรงกับสายลากที่ y+6
const TEAM_W = 56;
const TRAIL = 16; // ระยะประกายตามหลัง

const FLIGHT_MS = 10_000;
const CALM_FADE_MS = 600;
const CALM_MS = CALM_FADE_MS * 2 + 3000;
const GALLOP_MS = 150;

interface Flight {
  t: number;
  dir: 1 | -1;
  /** มาจากตารางเวลา (ไม่ใช่ trigger) */
  scheduled: boolean;
  /** โหมดนิ่งสำหรับ reduced motion กำหนดตอนเฟรมแรก */
  calm: boolean | null;
}

/** ซานต้านั่งเลื่อนบินผ่านฟ้า จับเวลาเองจาก p.dt และเช็กช่วงเวลาจาก p.now */
export function createSanta(audio: IAudioManager): SantaLayer {
  // state machine: flight === null คือ idle, ไม่งั้นคือ flying
  let flight: Flight | null = null;
  /** ms ถึงรอบถัดไป, null = ยังไม่ได้ตั้ง (อยู่นอกช่วงเวลา) */
  let timer: number | null = null;
  let dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

  function start(scheduled: boolean): void {
    if (flight) return;
    dir = dir === 1 ? -1 : 1; // สลับทิศทุกรอบ
    flight = { t: 0, dir, scheduled, calm: null };
    audio.play('santaHoHoHo');
  }

  function drawTeam(p: SceneParams, x: number, y: number, flip: boolean, gallop: number | null): void {
    const { ctx } = p;
    const at = (ox: number, w: number) => (flip ? x + TEAM_W - ox - w : x + ox);
    rect(ctx, at(SLEIGH_W, 37), y + 6, 37, 1, PALETTE.goldDark); // สายลาก
    drawSprite(ctx, SLEIGH, LEGEND, at(0, SLEIGH_W), y, flip);
    DEER_X.forEach((ox, i) => {
      const f = gallop === null ? 0 : (gallop + i) % 2;
      drawSprite(ctx, DEER[f], LEGEND, at(ox, DEER_W), y + DEER_Y - f, flip);
    });
  }

  function drawFlight(p: SceneParams, f: Flight): void {
    const { ctx } = p;
    if (f.calm) {
      // โหมดนิ่ง: ค่อย ๆ ปรากฏ ค้าง แล้วจางหาย
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t / CALM_FADE_MS, (CALM_MS - f.t) / CALM_FADE_MS));
      drawTeam(p, p.centerX - TEAM_W / 2, Math.round(p.groundY * 0.14), f.dir < 0, null);
      ctx.globalAlpha = 1;
      return;
    }
    const u = f.t / FLIGHT_MS;
    const span = p.width + TEAM_W + TRAIL;
    const x = Math.round(f.dir > 0 ? -TEAM_W + u * span : p.width - u * span);
    // โค้งขึ้นกลางจอ: ขอบบนขบวนอยู่ราว 28% ถึง 14% ของฟ้า
    const y = Math.round(p.groundY * (0.28 - 0.14 * Math.sin(Math.PI * u)));
    drawTeam(p, x, y, f.dir < 0, Math.floor(f.t / GALLOP_MS));

    // ประกายตามหลังเลื่อน
    const tick = Math.floor(f.t / 120);
    for (let i = 0; i < 5; i++) {
      if (hashRand(tick, i) < 0.35) continue;
      const back = 2 + i * 3 + randInt(hashRand(tick, i, 1), 0, 1);
      const sx = f.dir > 0 ? x - back : x + TEAM_W - 1 + back;
      const sy = y + 4 + randInt(hashRand(tick, i, 2), 0, 6);
      pixel(ctx, sx, sy, i % 2 ? PALETTE.gold : PALETTE.starGlow);
    }
  }

  return {
    render(p) {
      // ตัวจับเวลาเดินเฉพาะตอน idle และแท็บมองเห็น จึงไม่มีรอบค้างสะสม
      if (!flight && !document.hidden) {
        if (isSantaWindow(p.now)) {
          if (timer === null) timer = nextSantaDelayMs(Math.random, true);
          timer -= p.dt;
          if (timer <= 0) start(true);
        } else {
          timer = null;
        }
      }
      if (!flight) return;

      if (flight.calm === null) flight.calm = p.reducedMotion;
      drawFlight(p, flight);
      flight.t += p.dt;
      if (flight.t >= (flight.calm ? CALM_MS : FLIGHT_MS)) {
        // รอบที่มาจาก trigger ไม่แตะตารางเวลาปกติ
        if (flight.scheduled) timer = nextSantaDelayMs(Math.random, false);
        flight = null;
      }
    },
    trigger() {
      start(false);
    },
  };
}
