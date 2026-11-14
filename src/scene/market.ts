// แบบร่างชั้น "ตลาดคริสต์มาส" (agent "market" จะเขียนของจริงแทน คง signature และการจัดวางนี้)
// ตลาดอยู่บนเนินหิมะไกล ๆ สองข้างต้นไม้ วาดหลังกระท่อม/ต้นสน/มนุษย์หิมะเดิม ไม่ย้ายของเดิม
import { mixColor } from '../core/draw';
import { hashRand } from '../core/rng';
import { PALETTE } from '../palette';
import type { DetailRenderer, DetailViews, SceneParams } from '../types';

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
  return { terrace, innerX, footX, stallW, stallH, slots: slots.slice(0, width < 200 ? 3 : 6), ferris };
}

const ROOFS: [string, string][] = [
  [PALETTE.red, PALETTE.white],
  ['#2a7d4a', PALETTE.white],
  [PALETTE.snow, PALETTE.snowShade],
  [PALETTE.gold, PALETTE.white],
  ['#1f6f8b', PALETTE.white],
  [PALETTE.red, PALETTE.gold],
];
const COATS = ['#3b4a7a', '#7a3b3b', '#3b6a4f', '#5a4a7a', '#7a5a3b'];
const HATS = [PALETTE.red, PALETTE.gold, '#4dc3ff', PALETTE.white, '#5fe36a'];

export function createMarket(): DetailRenderer {
  return {
    render(p: SceneParams, v: DetailViews) {
      const ground = v.marketGround;
      if (!ground?.active) return;
      const { ctx, width: W, centerX, groundY: g, seed } = p;
      const L = getMarketLayout(W, centerX, g, p.treeMax, p.scale);
      if (!L) return;
      const dark = p.daylight.darkness;
      const still = p.reducedMotion;
      const t = p.timeMs;
      const rise = ground.appearT === null ? 1 : 1 - Math.pow(1 - ground.appearT, 3);
      const T = Math.round(L.terrace * rise);
      const ty = g - T; // y ของลานตลาด
      const night = (c: string, k = 0.5) => mixColor(c, PALETTE.skyNight[0], dark * k);
      const glowK = Math.max(0, dark) * (0.4 + 0.6 * v.marketLights.intensity);

      // ---- เนินไกล ----
      const hill = mixColor(mixColor(PALETTE.snowShade, p.daylight.skyBottom, 0.35), '#33457f', dark * 0.75);
      const crest = mixColor(mixColor(PALETTE.snow, p.daylight.skyBottom, 0.2), '#5a6fa3', dark * 0.75);
      for (let x = 0; x < W; x++) {
        const d = Math.min(x, W - 1 - x);
        let h = T;
        if (d > L.innerX) h = d >= L.footX ? 0 : T * (0.5 + 0.5 * Math.cos((Math.PI * (d - L.innerX)) / (L.footX - L.innerX)));
        h = Math.round(h + (d <= L.innerX ? Math.sin(d * 0.21 + 1) * 0.8 : 0));
        if (h <= 0) continue;
        ctx.fillStyle = hill;
        ctx.fillRect(x, g - h, 1, h);
        ctx.fillStyle = crest;
        ctx.fillRect(x, g - h, 1, 1);
      }
      if (rise < 1) return; // ระหว่างเนินกำลังขึ้น ยังไม่วาดของบนลาน

      const nStalls = Math.min(v.stalls.count, L.slots.length);
      const side = (i: number) => (L.slots[i] < centerX ? -1 : 1);

      // ---- ชิงช้าสวรรค์ (อยู่หลังร้าน) ----
      if (L.ferris && v.ferris.active) {
        const f = L.ferris;
        const a = v.ferris.appearT === null ? 1 : v.ferris.appearT;
        const iron = night('#59607a', 0.6);
        ctx.fillStyle = iron;
        const legH = Math.round((ty - f.y) * a);
        for (let i = 0; i <= legH; i++) {
          const off = Math.round((i / Math.max(1, ty - f.y)) * f.r * 0.55);
          ctx.fillRect(f.x - off, f.y + i, 1, 1);
          ctx.fillRect(f.x + off, f.y + i, 1, 1);
        }
        if (a >= 1) {
          const rot = still ? 0.3 : t / 14000;
          for (let k = 0; k < 64; k++) {
            const an = (k / 64) * Math.PI * 2;
            ctx.fillRect(Math.round(f.x + Math.cos(an) * f.r), Math.round(f.y + Math.sin(an) * f.r), 1, 1);
          }
          for (let k = 0; k < 8; k++) {
            const an = rot * Math.PI * 2 + (k / 8) * Math.PI * 2;
            ctx.fillStyle = iron;
            for (let q = 2; q < f.r; q += 2) ctx.fillRect(Math.round(f.x + Math.cos(an) * q), Math.round(f.y + Math.sin(an) * q), 1, 1);
            const gx = Math.round(f.x + Math.cos(an) * f.r);
            const gy = Math.round(f.y + Math.sin(an) * f.r);
            if (glowK > 0.05) {
              ctx.globalAlpha = 0.3 * glowK;
              ctx.fillStyle = PALETTE.lights[k % 5];
              ctx.fillRect(gx - 2, gy - 1, 5, 5);
              ctx.globalAlpha = 1;
            }
            ctx.fillStyle = night(PALETTE.lights[k % 5], 0.2);
            ctx.fillRect(gx - 1, gy, 3, 3);
            ctx.fillStyle = night(PALETTE.white, 0.3);
            ctx.fillRect(gx - 1, gy, 3, 1);
          }
          ctx.fillStyle = night(PALETTE.gold, 0.2);
          ctx.fillRect(f.x - 1, f.y - 1, 3, 3);
        }
      }

      // ---- เสาและสายไฟ ----
      const wireY = ty - L.stallH - 5;
      const spans = v.marketLights.count; // จำนวนช่วงสายไฟต่อฝั่ง (สูงสุดตามจำนวนช่อง)
      const pitch = L.stallW + 4;
      for (const dir of [-1, 1]) {
        const maxSpans = Math.min(spans, Math.ceil(L.slots.length / 2) + 1);
        for (let k = 0; k < maxSpans; k++) {
          const x0 = L.innerX + 3 - k * pitch;
          const x1 = Math.max(1, x0 - pitch);
          const px = (x: number) => (dir < 0 ? x : W - 1 - x);
          ctx.fillStyle = night(PALETTE.trunkDark, 0.4);
          ctx.fillRect(px(x0), wireY - 1, 1, ty - wireY + 1);
          if (k === maxSpans - 1) ctx.fillRect(px(x1), wireY - 1, 1, ty - wireY + 1);
          for (let x = x1 + 1; x < x0; x++) {
            const s = (x - x1) / (x0 - x1);
            const y = wireY + Math.round(2.5 * Math.sin(Math.PI * s));
            ctx.fillStyle = night(PALETTE.trunkDark, 0.4);
            ctx.fillRect(px(x), y, 1, 1);
            if ((x - x1) % 3 !== 1) continue;
            const id = k * 40 + x + (dir > 0 ? 500 : 0);
            const c = PALETTE.lights[id % 5];
            const blink = still ? 1 : 0.6 + 0.4 * Math.sin(t / (500 + hashRand(seed, id, 700) * 900) + id);
            if (glowK > 0.05) {
              ctx.globalAlpha = 0.28 * glowK * blink;
              ctx.fillStyle = c;
              ctx.fillRect(px(x) - 1, y, 3, 3);
              ctx.globalAlpha = 1;
            }
            ctx.fillStyle = mixColor(night(c, 0.5), c, glowK * blink);
            ctx.fillRect(px(x), y + 1, 1, 1);
          }
        }
      }

      // ---- สายธง ----
      for (let b = 0; b < v.bunting.count; b++) {
        const dir = b % 2 ? 1 : -1;
        const k = b >> 1;
        const x0 = L.innerX + 3 - k * pitch;
        const x1 = Math.max(1, x0 - pitch);
        for (let x = x1 + 2; x < x0 - 1; x += 3) {
          const s = (x - x1) / (x0 - x1);
          const y = wireY + 4 + Math.round(1.5 * Math.sin(Math.PI * s));
          ctx.fillStyle = night([PALETTE.red, PALETTE.gold, PALETTE.white, '#2a7d4a'][((x / 3) | 0) % 4], 0.45);
          const X = dir < 0 ? x : W - 1 - x;
          ctx.fillRect(X, y, 2, 1);
          ctx.fillRect(X, y + 1, 1, 1);
        }
      }

      // ---- ร้านค้า ----
      for (let i = 0; i < nStalls; i++) {
        const x = L.slots[i];
        const ap = i >= v.stalls.prevCount && v.stalls.appearT !== null ? v.stalls.appearT : 1;
        const h = Math.round(L.stallH * Math.min(1, ap * 1.4));
        const roofH = Math.max(3, Math.round(L.stallH * 0.36));
        const bodyH = Math.max(1, h - roofH);
        const top = ty - h;
        const [rc, rc2] = ROOFS[i % ROOFS.length];
        // แสงสาดลงหิมะตอนกลางคืน
        if (glowK > 0.05 && ap >= 1) {
          ctx.globalAlpha = 0.22 * glowK;
          ctx.fillStyle = PALETTE.windowGlow;
          ctx.fillRect(x - 2, ty, L.stallW + 4, 3);
          ctx.fillRect(x - 3, ty - bodyH - 1, L.stallW + 6, bodyH + 2);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = night(PALETTE.cabinWall, 0.45);
        ctx.fillRect(x, ty - bodyH, L.stallW, bodyH);
        if (bodyH >= 5) {
          // ช่องหน้าร้าน + เคาน์เตอร์
          ctx.fillStyle = mixColor(night(PALETTE.cabinRoof, 0.4), PALETTE.windowGlow, glowK * 0.85);
          ctx.fillRect(x + 2, ty - bodyH + 1, L.stallW - 4, bodyH - 4);
          ctx.fillStyle = night(PALETTE.cabinWallDark, 0.45);
          ctx.fillRect(x, ty - 3, L.stallW, 1);
          // ไอคอนสินค้าบนเคาน์เตอร์ (แทนตัวอักษร)
          ctx.fillStyle = night([PALETTE.white, '#b5713c', PALETTE.gold, '#2a7d4a', '#d9a066', PALETTE.red][i % 6], 0.3);
          ctx.fillRect(x + 3, ty - 5, 2, 2);
          ctx.fillRect(x + L.stallW - 5, ty - 5, 2, 2);
        }
        if (ap >= 0.7) {
          // หลังคาลายริ้ว ยื่นข้างละ 1px มีหิมะเกาะขอบบน
          for (let cx = -1; cx <= L.stallW; cx++) {
            ctx.fillStyle = night((((cx + 1) / 2) | 0) % 2 ? rc2 : rc, 0.45);
            ctx.fillRect(x + cx, top, 1, roofH);
          }
          ctx.fillStyle = night(PALETTE.snow, 0.5);
          ctx.fillRect(x - 1, top - 1, L.stallW + 2, 1);
        }
        // ไอน้ำ (ร้านเครื่องดื่มร้อนและเบเกอรี่)
        if ((i === 0 || i === 4) && v.steam.active && ap >= 1 && !still) {
          for (let s = 0; s < 3; s++) {
            const ph = (t / 1600 + s / 3) % 1;
            ctx.globalAlpha = (1 - ph) * (0.25 + 0.45 * v.steam.intensity);
            ctx.fillStyle = PALETTE.smoke;
            ctx.fillRect(x + 3 + s * 2 + Math.round(Math.sin(ph * 5 + s) * 1), top - 2 - Math.round(ph * 8), 1 + (ph > 0.5 ? 1 : 0), 1);
          }
          ctx.globalAlpha = 1;
        }
      }

      // ---- ลังและถัง ----
      for (let i = 0; i < Math.min(v.props.count, nStalls); i++) {
        const x = L.slots[i] + (side(i) < 0 ? -3 : L.stallW + 1);
        ctx.fillStyle = night(i % 2 ? '#8a5b3c' : '#6e4324', 0.45);
        ctx.fillRect(x, ty - 3, 3, 3);
        ctx.fillStyle = night(PALETTE.cabinWallDark, 0.45);
        ctx.fillRect(x, ty - 2, 3, 1);
      }

      // ---- ต้นสนประดับไฟบนลาน ----
      for (let i = 0; i < v.litPines.count; i++) {
        const dir = i % 2 ? 1 : -1;
        const d = 3 + (i >> 1) * Math.max(8, L.innerX - 10);
        if (d > L.innerX - 2) continue;
        const x = dir < 0 ? d : W - 1 - d;
        for (let r = 0; r < 9; r++) {
          const half = Math.round((r % 3) + r / 3);
          ctx.fillStyle = night(PALETTE.pine, 0.5);
          ctx.fillRect(x - half, ty - 10 + r, half * 2 + 1, 1);
        }
        ctx.fillStyle = night(PALETTE.trunkDark, 0.5);
        ctx.fillRect(x, ty - 1, 1, 1);
        for (let b = 0; b < 4; b++) {
          const blink = still ? 1 : 0.5 + 0.5 * Math.sin(t / 600 + b * 2 + i);
          ctx.fillStyle = mixColor(night(PALETTE.lights[(b + i) % 5], 0.5), PALETTE.lights[(b + i) % 5], blink * (0.4 + 0.6 * dark));
          ctx.fillRect(x - 2 + ((b * 3) % 5), ty - 8 + b * 2, 1, 1);
        }
      }

      // ---- ผู้คน (เงาตัวเล็ก สวมหมวก) ----
      const maxPeople = W < 200 ? 4 : 12;
      for (let i = 0; i < Math.min(v.people.count, maxPeople); i++) {
        const dir = i % 2 ? 1 : -1;
        const home = 4 + hashRand(seed, i, 710) * Math.max(4, L.innerX - 8);
        const walk = still ? 0 : Math.sin(t / (2600 + hashRand(seed, i, 711) * 2600) + i * 1.7) * 7;
        const enter = i >= v.people.prevCount && v.people.appearT !== null ? (1 - v.people.appearT) * -(home + 6) : 0;
        const d = Math.max(-4, Math.min(L.innerX, home + walk + enter));
        const x = Math.round(dir < 0 ? d : W - 1 - d);
        const bob = still ? 0 : Math.round(Math.abs(Math.sin(t / 220 + i)) * 0.6);
        ctx.fillStyle = night(COATS[i % COATS.length], 0.35);
        ctx.fillRect(x, ty - 4 - bob, 2, 4);
        ctx.fillStyle = night(PALETTE.santaSkin, 0.4);
        ctx.fillRect(x, ty - 6 - bob, 2, 2);
        ctx.fillStyle = night(HATS[i % HATS.length], 0.3);
        ctx.fillRect(x, ty - 7 - bob, 2, 1);
        if (i % 3 === 0) {
          ctx.fillStyle = night(PALETTE.white, 0.3); // ถ้วยร้อน/ถุงของขวัญ
          ctx.fillRect(x + (dir < 0 ? 2 : -1), ty - 3 - bob, 1, 1);
        }
      }

      // ---- คณะร้องเพลง (ยืนบนพื้นใกล้โคมถนน ฝั่งขวา) ----
      if (v.carolers.active && W >= 200) {
        const a = v.carolers.appearT ?? 1;
        const bx = W - Math.round(30 * (p.scale / 1.5)) + Math.round((1 - a) * 30);
        for (let i = 0; i < 3; i++) {
          const x = bx + i * 4;
          const sway = still ? 0 : Math.round(Math.sin(t / 700 + i) * 0.6);
          ctx.fillStyle = night(COATS[(i + 2) % COATS.length], 0.4);
          ctx.fillRect(x + sway, g - 6, 3, 6);
          ctx.fillStyle = night(PALETTE.santaSkin, 0.4);
          ctx.fillRect(x + sway, g - 8, 3, 2);
          ctx.fillStyle = night(HATS[(i + 1) % HATS.length], 0.3);
          ctx.fillRect(x + sway, g - 9, 3, 1);
          ctx.fillStyle = night(PALETTE.white, 0.2); // สมุดเพลง
          ctx.fillRect(x + sway, g - 5, 2, 1);
        }
      }

      // ---- ประกายแสงลอยเหนือตลาด ----
      for (let i = 0; i < v.sparkles.count * 2; i++) {
        const dir = i % 2 ? 1 : -1;
        const d = hashRand(seed, i, 720) * L.innerX;
        const tw = still ? 0.7 : 0.5 + 0.5 * Math.sin(t / 500 + i * 2.1);
        const yy = ty - L.stallH - 8 - Math.round(hashRand(seed, i, 721) * 16) - (still ? 0 : Math.round(((t / 4000 + i * 0.37) % 1) * 5));
        ctx.globalAlpha = tw * (0.35 + 0.65 * dark);
        ctx.fillStyle = i % 3 ? PALETTE.starGlow : PALETTE.gold;
        ctx.fillRect(Math.round(dir < 0 ? d : W - 1 - d), yy, 1, 1);
      }
      ctx.globalAlpha = 1;
    },
  };
}
