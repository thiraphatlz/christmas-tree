// ค่าคงที่ทั้งหมดที่ปรับได้ง่าย แก้ที่นี่ที่เดียว

/** seed คงที่: ต้นไม้/ของขวัญหน้าตาเหมือนเดิมทุกครั้งที่รีเฟรช */
export const SEED = 20261225;

/** จำนวนวันที่ต้นโต (1 ถึง 25 ธ.ค.) */
export const GROW_DAYS = 25;

/** ฉาก: ความสูง logical เป้าหมาย และความกว้างขั้นต่ำ (หน่วย pixel ของ pixel art) */
export const SCENE_TARGET_HEIGHT = 180;
export const SCENE_MIN_WIDTH = 120;

/**
 * ขนาดต้นไม้เทียบความสูงจอ (ไม่รวมดาว): วันที่ 1 สูง 25% วันที่ 25 สูง 80% (รวมดาวราว 85%)
 * จอแนวตั้งจำกัดด้วยความกว้าง: ต้นกว้างไม่เกิน 90% ของจอ
 */
export const TREE_HEIGHT_FRAC_START = 0.25;
export const TREE_HEIGHT_FRAC_FULL = 0.8;
export const TREE_MAX_WIDTH_FRAC = 0.9;
/** ความสูงต้นเต็มในหน่วยอ้างอิง: layout ของขวัญและค่า default ของ getTreeShape ใช้หน่วยนี้ แล้วคูณ scale ตอนวาด */
export const TREE_REF_HEIGHT = 96;

/** ของขวัญ: วันแรกที่มีกล่อง (วันที่ 10 = progress 0.4) แล้วเพิ่มวันละกล่อง */
export const GIFT_START_DAY = 10;

/** ช่วงเวลาของวัน (ชั่วโมงท้องถิ่นแบบทศนิยม 0 ถึง 24) */
export const DAWN_START = 5;
export const DAWN_END = 7;
export const DUSK_START = 17;
export const DUSK_END = 19;

/**
 * ช่วง Easter egg ซานต้า ตามเวลาท้องถิ่น: start <= now < end
 * ค่าเริ่มต้น 24 ธ.ค. 18:00 ถึง 26 ธ.ค. 00:00 (month นับ 1 ถึง 12)
 */
export const SANTA_WINDOW = {
  start: { month: 12, day: 24, hour: 18, minute: 0 },
  end: { month: 12, day: 26, hour: 0, minute: 0 },
} as const;

/** ซานต้าโผล่ครั้งแรกภายใน 30 ถึง 120 วินาที แล้วทุก 5 ถึง 10 นาที */
export const SANTA_FIRST_DELAY_MS = { min: 30_000, max: 120_000 } as const;
export const SANTA_INTERVAL_MS = { min: 5 * 60_000, max: 10 * 60_000 } as const;

/** ซ่อนปุ่มลอยและเคอร์เซอร์หลังเมาส์นิ่ง (ms) */
export const IDLE_HIDE_MS = 3000;

/** key ใน localStorage ของสถานะ mute */
export const MUTE_STORAGE_KEY = 'christmas-tree:muted';
