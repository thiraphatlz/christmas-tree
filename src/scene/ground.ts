import { hasSkirt } from '../core/growth';
import { mixColor, rect } from '../core/draw';
import { PALETTE } from '../palette';
import type { SceneLayer } from '../types';

/** ของตกแต่งรอบโคนต้น: ผ้ารองโคนต้น (วาดหลังต้นไม้ ก่อนกล่องของขวัญแถวหน้า) */
export function createGroundDecor(): SceneLayer {
  return {
    render(p) {
      const { ctx, tree } = p;
      if (!hasSkirt(p.day) || tree.height <= 0) return;
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
