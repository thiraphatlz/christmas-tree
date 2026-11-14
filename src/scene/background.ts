import { mixColor } from '../core/draw';
import { hashRand, randInt } from '../core/rng';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

interface Pine {
  x: number; // กึ่งกลาง
  h: number;
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

  return {
    render(p) {
      const { ctx, width, groundY, centerX, treeMax, scale, seed } = p;
      const dark = p.daylight.darkness;
      const u = scale / 1.5;
      const W = Math.max(14, Math.round(34 * u));
      const H = Math.max(11, Math.round(26 * u));
      const zoneL = Math.round(centerX - (0.42 * treeMax + 6));
      const zoneR = Math.round(centerX + (0.42 * treeMax + 6));

      const k = `${seed}|${width}|${centerX}|${treeMax}|${W}`;
      if (k !== key) {
        key = k;
        // กระท่อม: ต้องอยู่ซ้ายเขตต้นไม้ทั้งหลัง ไม่งั้นข้าม
        const cx = Math.max(2, Math.round(zoneL * 0.5 - W / 2));
        cabinX = cx + W + 2 <= zoneL ? cx : -1;
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
