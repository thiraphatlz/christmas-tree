// ตัวกลางของชั้นรายละเอียด: คำนวณสถานะจากวัน ติดตาม animation ตอนชิ้นใหม่ปรากฏ แล้วส่งให้ตัววาดแต่ละกลุ่ม
import { getLayerStates } from '../detail/layers';
import type { DetailRenderer, DetailViews, SceneLayer } from '../types';

/** ความยาว animation ตอนชิ้นใหม่ของชั้นปรากฏ (ms) */
export const DETAIL_APPEAR_MS = 1600;

interface Track {
  prev: number; // จำนวนชิ้นของเฟรมก่อน
  from: number; // จำนวนชิ้นก่อนการเพิ่มครั้งล่าสุด
  start: number | null; // เวลาเริ่ม animation (null = ไม่เล่น)
}

export function createDetailLayers(renderers: readonly DetailRenderer[]): SceneLayer {
  const tracks = new Map<string, Track>();
  let first = true;

  return {
    render(p) {
      const views: DetailViews = {};
      const states = getLayerStates(p.day);
      for (const s of states) {
        let tr = tracks.get(s.id);
        if (!tr) {
          // ชั้นใหม่ (เฟรมแรกหรือเพิ่มเข้าตารางทีหลัง): ไม่เล่น animation
          tr = { prev: s.count, from: s.count, start: null };
          tracks.set(s.id, tr);
        } else if (!first && s.count > tr.prev) {
          tr.from = tr.prev; // เพิ่มซ้อนระหว่างเล่น: เริ่มใหม่จากจำนวนที่แสดงอยู่ตอนนี้
          tr.start = p.timeMs;
        } else if (s.count < tr.prev) {
          tr.start = null; // ย้อนวัน: ยกเลิก
        }
        tr.prev = s.count;
        const t = tr.start === null ? 1 : (p.timeMs - tr.start) / DETAIL_APPEAR_MS;
        const playing = !p.reducedMotion && t >= 0 && t < 1;
        if (!playing && t >= 1) tr.start = null;
        views[s.id] = { ...s, prevCount: playing ? tr.from : s.count, appearT: playing ? t : null };
      }
      first = false;
      if (tracks.size > states.length) for (const id of tracks.keys()) if (!(id in views)) tracks.delete(id); // ชั้นที่ถูกถอดออก
      for (const r of renderers) r.render(p, views);
    },
  };
}
