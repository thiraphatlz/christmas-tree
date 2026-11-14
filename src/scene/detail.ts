// ตัวกลางของชั้นรายละเอียด: คำนวณสถานะจากวัน ติดตาม animation ตอนชิ้นใหม่ปรากฏ แล้วส่งให้ตัววาดแต่ละกลุ่ม
import { getLayerStates } from '../detail/layers';
import type { DetailRenderer, DetailViews, SceneLayer } from '../types';

/** ความยาว animation ตอนชิ้นใหม่ของชั้นปรากฏ (ms) */
export const DETAIL_APPEAR_MS = 1600;

export function createDetailLayers(renderers: readonly DetailRenderer[]): SceneLayer {
  const prev = new Map<string, number>(); // จำนวนชิ้นของเฟรมก่อน
  const from = new Map<string, number>(); // จำนวนชิ้นก่อนการเพิ่มครั้งล่าสุด
  const start = new Map<string, number>(); // เวลาเริ่ม animation
  let first = true;

  return {
    render(p) {
      const views: DetailViews = {};
      for (const s of getLayerStates(p.day)) {
        const before = prev.get(s.id);
        if (!first && before !== undefined && s.count > before) {
          from.set(s.id, before);
          start.set(s.id, p.timeMs);
        } else if (before !== undefined && s.count < before) {
          start.delete(s.id); // ย้อนวัน: ยกเลิก
        }
        prev.set(s.id, s.count);
        const t0 = start.get(s.id);
        const t = t0 === undefined ? 1 : (p.timeMs - t0) / DETAIL_APPEAR_MS;
        const playing = t >= 0 && t < 1;
        views[s.id] = { ...s, prevCount: playing ? (from.get(s.id) ?? s.count) : s.count, appearT: playing ? t : null };
      }
      first = false;
      for (const r of renderers) r.render(p, views);
    },
  };
}
