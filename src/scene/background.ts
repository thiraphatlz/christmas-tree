import { mixColor, pixel, rect } from '../core/draw';
import { hashRand, randInt } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

interface Pine {
  x: number; // กึ่งกลาง
  h: number;
}

interface Cols {
  snow: string; shade: string; hat: string; scarf: string; scarfD: string; carrot: string;
  twig: string; iron: string; pane: string;
}
const COAL = '#1a1a22';

// ลูกหิมะวงรี: ครึ่งความกว้างต่อแถวจาก sqrt, ขอบขวาไล่เงา
function ball(ctx: CanvasRenderingContext2D, c: Cols, cx: number, top: number, h: number, wd: number): void {
  for (let i = 0; i < h; i++) {
    const t = (2 * i + 1) / h - 1;
    const hw = Math.max(1, Math.round(((wd - 1) / 2) * Math.sqrt(1 - 0.75 * t * t)));
    rect(ctx, cx - hw, top + i, 2 * hw + 1, 1, c.snow);
    if (hw >= 2) {
      const sh = hw >= 3 ? 2 : 1;
      rect(ctx, cx + hw - sh + 1, top + i, sh, 1, c.shade);
    }
  }
}

function drawSnowman(ctx: CanvasRenderingContext2D, c: Cols, sx: number, y0: number, sw: number, sh: number): void {
  const odd = (v: number) => (v % 2 ? v : v + 1);
  const hB = Math.round(sh * 0.38);
  const hM = Math.round(sh * 0.3);
  const hH = Math.round(sh * 0.28);
  const hatH = sh - hB - hM - hH + 3;
  const bw = sw % 2 ? sw : sw - 1;
  const mw = Math.min(bw, odd(Math.round(bw * 0.72)));
  const hw = Math.min(mw, odd(Math.round(bw * 0.52)));
  const cx = sx + (sw >> 1);
  const bTop = y0 - hB;
  const mTop = bTop - hM + 1;
  const hTop = mTop - hH + 1;
  ball(ctx, c, cx, bTop, hB, bw);
  ball(ctx, c, cx, mTop, hM, mw);
  ball(ctx, c, cx, hTop, hH, hw);
  const big = sh >= 18;
  // แขนกิ่งไม้ (วาดก่อนผ้าพันคอ)
  const mh = mw >> 1;
  const ay = mTop + (big ? 3 : 2);
  rect(ctx, cx - mh - 2, ay, 3, 1, c.twig);
  pixel(ctx, cx - mh - 2, ay - 1, c.twig);
  rect(ctx, cx + mh, ay, 3, 1, c.twig);
  pixel(ctx, cx + mh + 2, ay - 1, c.twig);
  // ผ้าพันคอ + ชายห้อย
  rect(ctx, cx - mh, mTop, mw, 2, c.scarf);
  for (let dx = -mh; dx <= mh; dx += 2) pixel(ctx, cx + dx, mTop + 1, c.scarfD);
  const tl = big ? 3 : 2;
  rect(ctx, cx + 1, mTop + 2, 2, tl, c.scarf);
  rect(ctx, cx + 1, mTop + 1 + tl, 2, 1, c.scarfD);
  // หมวกดำเรียบ
  rect(ctx, cx - (hw >> 1) - 1, hTop, hw + 2, 1, c.hat);
  rect(ctx, cx - ((hw - 2) >> 1), hTop - (hatH - 1), hw - 2, hatH - 1, c.hat);
  // หน้า: ตาถ่าน จมูกแครอท
  const ey = hTop + (hH >= 6 ? 2 : 1);
  const ex = hw >= 7 ? 2 : 1;
  pixel(ctx, cx - ex, ey, COAL);
  pixel(ctx, cx + ex, ey, COAL);
  pixel(ctx, cx, ey + 1, c.carrot);
  if (hH >= 6) {
    pixel(ctx, cx + 1, ey + 1, c.carrot);
    pixel(ctx, cx - 2, ey + 2, COAL);
    pixel(ctx, cx, ey + 2, COAL);
    pixel(ctx, cx + 2, ey + 2, COAL);
  }
  // กระดุมถ่าน
  pixel(ctx, cx, bTop + 2, COAL);
  if (hB >= 8) pixel(ctx, cx, bTop + 4, COAL);
}

function drawLamp(ctx: CanvasRenderingContext2D, c: Cols, x0: number, y0: number, lw: number, lh: number, glow: number): void {
  const cx = x0 + (lw >> 1);
  const T = y0 - lh;
  const paneH = Math.max(4, Math.round(lh / 6));
  const px = x0 + 1;
  const py = T + 3;
  const pw = lw - 2;
  if (glow > 0.02) {
    ctx.fillStyle = PALETTE.windowGlow;
    ctx.globalAlpha = Math.min(1, 0.1 * glow);
    ctx.fillRect(px - 4, py - 4, pw + 8, paneH + 8);
    ctx.globalAlpha = Math.min(1, 0.16 * glow);
    ctx.fillRect(px - 3, py - 3, pw + 6, paneH + 6);
    ctx.globalAlpha = Math.min(1, 0.24 * glow);
    ctx.fillRect(px - 1, py - 1, pw + 2, paneH + 2);
    ctx.globalAlpha = 1;
  }
  const postTop = T + paneH + 5;
  rect(ctx, cx, postTop, 1, y0 - 2 - postTop, c.iron);
  rect(ctx, cx - 1, y0 - 9, 3, 1, c.iron); // ปลอกเสา
  rect(ctx, x0, y0 - 1, lw, 1, c.iron); // ฐาน
  rect(ctx, cx - 1, y0 - 2, 3, 1, c.iron);
  rect(ctx, cx - 1, T + paneH + 4, 3, 1, c.iron); // ก้นโคม
  rect(ctx, x0, T + 3 + paneH, lw, 1, c.iron);
  rect(ctx, x0, T + 3, 1, paneH, c.iron); // กรอบโคม
  rect(ctx, x0 + lw - 1, T + 3, 1, paneH, c.iron);
  rect(ctx, px, py, pw, paneH, c.pane);
  rect(ctx, x0, T + 2, lw, 1, c.iron);
  rect(ctx, x0, T + 1, lw, 1, c.iron); // หลังคา + หมวกหิมะ
  rect(ctx, cx - 1, T + 1, 3, 1, c.snow);
  rect(ctx, cx - 1, T, 3, 1, c.snow);
}

/** ของฉากหลังบนพื้นหิมะ: กระท่อมหน้าต่างสว่าง ต้นสนเล็ก (วาดหลังท้องฟ้า ก่อนหิมะและต้นไม้) */
export function createBackground(): SceneLayer {
  // cache โครงของฉาก (ขึ้นกับ seed/ขนาดจอ) และสีที่ผสมตามความมืด
  let key = '';
  let pines: Pine[] = [];
  let cabinX = -1; // -1 = ไม่วาดกระท่อม
  let kDark = -1;
  let cWall = '';
  let cWallDark = '';
  let cRoof = '';
  let cSnow = '';
  let cPine = '';
  let cPineDark = '';
  let cSmoke = '';
  let cTrunk = '';
  let snowX = -1; // -1 = ไม่วาดมนุษย์หิมะ
  let lampX = -1; // -1 = ไม่วาดโคมไฟ
  const col: Cols = { snow: '', shade: '', hat: '', scarf: '', scarfD: '', carrot: '', twig: '', iron: '', pane: '' };

  return {
    render(p) {
      const { ctx, width, groundY, centerX, treeMax, scale, seed } = p;
      const dark = p.daylight.darkness;
      const u = scale / 1.5;
      const W = Math.max(14, Math.round(34 * u));
      const H = Math.max(11, Math.round(26 * u));
      const zoneL = Math.round(centerX - (0.42 * treeMax + 6));
      const zoneR = Math.round(centerX + (0.42 * treeMax + 6));

      // มนุษย์หิมะ/โคมไฟ: ขนาดตาม scale (เล็กลงเมื่อ scale < 1.25)
      const bigSnow = u >= 0.83;
      const sw = bigSnow ? Math.max(12, Math.round(14 * u)) : 9;
      const sh = bigSnow ? Math.max(17, Math.round(20 * u)) : 13;
      const lw = 5;
      const lh = Math.max(22, Math.round(30 * u));

      const k = `${seed}|${width}|${centerX}|${treeMax}|${W}|${sw}|${lh}`;
      if (k !== key) {
        key = k;
        // กระท่อม: ต้องอยู่ซ้ายเขตต้นไม้ทั้งหลัง ไม่งั้นข้าม
        const cx = Math.max(2, Math.round(zoneL * 0.5 - W / 2));
        cabinX = cx + W + 2 <= zoneL ? cx : -1;
        // มนุษย์หิมะ + โคมไฟ: ขวาเขตต้นไม้ โคมอยู่ริมขวาสุด จอแคบวาดเฉพาะที่พอดี
        snowX = -1;
        lampX = -1;
        if (width >= 200) {
          const fs = zoneR + 2;
          const lampPos = width - 9 - lw; // เว้นขอบขวาให้ฮาโลไม่ถูกตัด
          let lampOn = lampPos >= fs;
          let sHi = lampPos - 4 - sw;
          let snowOn = lampOn && sHi >= fs;
          if (!snowOn) {
            sHi = width - 3 - sw;
            snowOn = sHi >= fs;
            if (snowOn) lampOn = false;
          }
          if (snowOn) snowX = fs + Math.floor(hashRand(seed, 90, 1) * (sHi - fs + 1));
          if (lampOn) lampX = lampPos;
        }
        // ต้นสน: จอแคบไม่วาด
        pines = [];
        if (width >= 200) {
          const n = Math.max(2, Math.min(5, Math.round(width / 80)));
          for (let i = 0; i < n; i++) {
            const h = randInt(hashRand(seed, i, 51), 10, 22);
            const half = Math.ceil(h * 0.28);
            const left = i % 2 === 0;
            const lo = left ? 2 + half : zoneR + half;
            const hi = left ? zoneL - half - 1 : width - 2 - half;
            if (hi <= lo) continue;
            for (let t = 0; t < 6; t++) {
              const x = lo + Math.floor(hashRand(seed, i, 52 + t) * (hi - lo + 1));
              // ไม่ทับกระท่อม และไม่ทับต้นสนที่วางไปแล้ว
              if (cabinX >= 0 && left && x + half >= cabinX - 1 && x - half <= cabinX + W + 1) continue;
              // ไม่ทับมนุษย์หิมะ/โคมไฟ (ฝั่งขวา)
              if (!left && snowX >= 0 && x + half >= snowX - 2 && x - half <= snowX + sw + 1) continue;
              if (!left && lampX >= 0 && x + half >= lampX - 3 && x - half <= lampX + lw + 2) continue;
              if (pines.some((q) => Math.abs(q.x - x) < half + 4)) continue;
              pines.push({ x, h });
              break;
            }
          }
        }
      }

      if (dark !== kDark) {
        kDark = dark;
        const n = PALETTE.skyNight[0];
        cWall = mixColor(PALETTE.cabinWall, n, dark * 0.45);
        cWallDark = mixColor(PALETTE.cabinWallDark, n, dark * 0.45);
        cRoof = mixColor(PALETTE.cabinRoof, n, dark * 0.4);
        cSnow = mixColor(PALETTE.snow, PALETTE.snowNight, dark * 0.85);
        cPine = mixColor(PALETTE.pine, n, dark * 0.5);
        cPineDark = mixColor(PALETTE.pineDark, n, dark * 0.5);
        cSmoke = mixColor(PALETTE.smoke, PALETTE.snowNight, dark * 0.7);
        cTrunk = mixColor(PALETTE.trunkDark, n, dark * 0.5);
        col.snow = cSnow;
        col.shade = mixColor(PALETTE.snowShade, PALETTE.snowNight, dark * 0.85);
        col.hat = mixColor('#2b2b36', n, dark * 0.4);
        col.scarf = mixColor(PALETTE.red, n, dark * 0.4);
        col.scarfD = mixColor(PALETTE.redDark, n, dark * 0.4);
        col.carrot = mixColor('#e07a3f', n, dark * 0.4);
        col.twig = cTrunk;
        col.iron = mixColor('#2e2a33', n, dark * 0.35);
        col.pane = mixColor(PALETTE.windowDay, PALETTE.windowGlow, dark);
      }

      // --- ต้นสน ---
      for (const q of pines) {
        const trunk = q.h >= 16 ? 2 : 1;
        const fh = q.h - trunk;
        const maxHalf = Math.ceil(q.h * 0.28);
        const tierH = Math.ceil(fh / 3);
        const top = groundY - q.h;
        for (let r = 0; r < fh; r++) {
          const ti = Math.floor(r / tierH);
          const fr = (r % tierH) / tierH;
          const half = Math.round(maxHalf * ((ti + 0.4 + 0.6 * fr) / 3));
          const y = top + r;
          ctx.fillStyle = cPine;
          ctx.fillRect(q.x - half, y, half * 2 + 1, 1);
          if (half > 0) {
            ctx.fillStyle = cPineDark;
            ctx.fillRect(q.x + Math.ceil(half / 3), y, half - Math.ceil(half / 3) + 1, 1);
          }
          // ปลายกิ่งขาวของแต่ละชั้น
          if (r % tierH === 0 || r === 1) {
            ctx.fillStyle = cSnow;
            ctx.fillRect(q.x - half, y, half * 2 + 1, 1);
          }
        }
        ctx.fillStyle = cTrunk;
        ctx.fillRect(q.x, groundY - trunk, 1, trunk + 1);
      }

      // --- มนุษย์หิมะ + โคมไฟ ---
      if (snowX >= 0) drawSnowman(ctx, col, snowX, groundY + 1, sw, sh);
      if (lampX >= 0) {
        const fl = p.reducedMotion ? 0 : Math.sin(p.timeMs / 230) * 0.05 + Math.sin(p.timeMs / 97) * 0.03;
        drawLamp(ctx, col, lampX, groundY + 1, lw, lh, dark * (1 + fl));
      }

      // --- กระท่อม ---
      if (cabinX < 0) return;
      const x = cabinX;
      const y0 = groundY + 1; // ฐานจมหิมะเล็กน้อย
      const wallH = Math.round(H * 0.58);
      const roofH = H - wallH;
      const roofTop = y0 - H;
      const wallTop = y0 - wallH;
      const inset = (r: number) => Math.round(((roofH - 1 - r) * (W / 2 - 2)) / Math.max(1, roofH - 1));

      // ปล่องควัน (วาดก่อนหลังคา ให้หลังคาบังโคน)
      const cw = Math.max(3, Math.round(4 * u));
      const chx = x + Math.round(W * 0.66);
      let r0 = 0;
      while (r0 < roofH - 1 && inset(r0) > chx - x - 1) r0++;
      const chTop = roofTop + r0 - Math.max(2, Math.round(3 * u));
      ctx.fillStyle = cWallDark;
      ctx.fillRect(chx, chTop, cw, roofTop + roofH - chTop);
      ctx.fillStyle = cSnow;
      ctx.fillRect(chx, chTop, cw, 1);

      // ผนังไม้ซุง
      ctx.fillStyle = cWall;
      ctx.fillRect(x + 2, wallTop, W - 4, wallH);
      ctx.fillStyle = cWallDark;
      for (let r = 2; r < wallH; r += 3) ctx.fillRect(x + 2, wallTop + r, W - 4, 1);
      ctx.fillRect(x + 2, wallTop, 1, wallH); // ขอบมุม
      ctx.fillRect(x + W - 3, wallTop, 1, wallH);

      // หลังคา + หิมะบนหลังคา
      for (let r = 0; r < roofH; r++) {
        const i = inset(r);
        ctx.fillStyle = cRoof;
        ctx.fillRect(x + i, roofTop + r, W - 2 * i, 1);
        if (r < Math.ceil(roofH * 0.6)) {
          ctx.fillStyle = cSnow;
          ctx.fillRect(x + i + 1, roofTop + r, Math.max(1, W - 2 * i - 2), 1);
        }
      }
      ctx.fillStyle = cSnow; // หิมะห้อยชายคา
      for (let dx = 2; dx < W - 2; dx += 4) ctx.fillRect(x + dx, roofTop + roofH, 2, 1);

      // ประตู + พวงหรีด
      const dw = Math.max(4, Math.round(5 * u));
      const dh = Math.max(7, Math.round(10 * u));
      const dx0 = x + Math.round((W - dw) / 2);
      ctx.fillStyle = cRoof;
      ctx.fillRect(dx0, y0 - dh, dw, dh);
      ctx.fillStyle = cWallDark;
      ctx.fillRect(dx0, y0 - dh, dw, 1);
      ctx.fillStyle = PALETTE.goldDark;
      ctx.fillRect(dx0 + dw - 2, y0 - Math.round(dh / 2), 1, 1);
      const wx = dx0 + Math.floor(dw / 2) - 1;
      ctx.fillStyle = PALETTE.leaf;
      ctx.fillRect(wx, y0 - dh + 2, 3, 3);
      ctx.fillStyle = cRoof;
      ctx.fillRect(wx + 1, y0 - dh + 3, 1, 1);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(wx, y0 - dh + 2, 1, 1);

      // หน้าต่าง 2 บาน: กลางวันสีอ่อน กลางคืนเรืองแสง + ฮาโลอุ่น
      const ws = Math.max(3, Math.round(5 * u));
      const wy = wallTop + Math.max(1, Math.round((wallH - dh > 0 ? 3 : 2) * u * 0.7));
      const winColor = mixColor(PALETTE.windowDay, PALETTE.windowGlow, dark);
      const wxs = [x + 4, x + W - 4 - ws];
      for (const w0 of wxs) {
        if (dark > 0.05) {
          ctx.fillStyle = PALETTE.windowGlow;
          ctx.globalAlpha = 0.14 * dark;
          ctx.fillRect(w0 - 3, wy - 3, ws + 6, ws + 6);
          ctx.globalAlpha = 0.22 * dark;
          ctx.fillRect(w0 - 2, wy - 2, ws + 4, ws + 4);
          ctx.globalAlpha = 0.3 * dark;
          ctx.fillRect(w0 - 1, wy - 1, ws + 2, ws + 2);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = cRoof; // กรอบ
        ctx.fillRect(w0 - 1, wy - 1, ws + 2, ws + 2);
        ctx.fillStyle = winColor;
        ctx.fillRect(w0, wy, ws, ws);
        ctx.fillStyle = cWallDark; // ลูกกรงกากบาท
        ctx.fillRect(w0 + (ws >> 1), wy, 1, ws);
        ctx.fillRect(w0, wy + (ws >> 1), ws, 1);
      }

      // ควันลอยขึ้นช้า ๆ 4 ก้อน (นิ่งเมื่อ reduced motion)
      const rise = Math.round(18 * u);
      ctx.fillStyle = cSmoke;
      for (let j = 0; j < 4; j++) {
        const f = p.reducedMotion ? j / 4 : (p.timeMs / 9000 + j / 4) % 1;
        const sx = chx + (cw >> 1) + Math.round(Math.sin(f * 5 + j * 1.7) * 2 + f * 5);
        const sy = chTop - 2 - Math.round(f * rise);
        const sz = f > 0.45 ? 3 : 2;
        ctx.globalAlpha = 0.75 * (1 - f);
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.globalAlpha = 1;
    },
  };
}
