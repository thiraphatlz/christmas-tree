// สัญญากลาง: ทุกโมดูลใช้ types ในไฟล์นี้ร่วมกัน ห้ามแก้โดยไม่แจ้ง main agent

// ---------- กลางวัน/กลางคืน ----------
export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';
export type DaylightMode = 'auto' | 'day' | 'night';

export interface DaylightState {
  phase: DayPhase;
  /** 0 = กลางวันเต็มที่, 1 = กลางคืนเต็มที่ (ไล่ระดับช่วงรุ่งเช้า/พลบค่ำ) */
  darkness: number;
  /** สีท้องฟ้าด้านบนและด้านล่าง รูปแบบ '#rrggbb' */
  skyTop: string;
  skyBottom: string;
}

// ---------- รูปทรงต้นไม้ (pure, จาก core/growth.ts) ----------
/** ชั้นใบหนึ่งชั้นเป็นสี่เหลี่ยมคางหมู พิกัดเทียบโคนต้น: x=0 คือแกนลำต้น, y=0 คือพื้น, y ติดลบ = ขึ้นบน */
export interface TreeTier {
  topY: number;
  bottomY: number;
  /** ครึ่งความกว้างที่ขอบบน/ขอบล่างของชั้น */
  topHalf: number;
  bottomHalf: number;
}

export interface TreeShape {
  day: number;
  /** ความสูงรวมจากพื้นถึงยอด (ไม่รวมดาว), 0 = ยังเป็นเมล็ด */
  height: number;
  trunkHeight: number;
  trunkHalf: number;
  /** เรียงจากชั้นล่างสุด (index 0) ขึ้นบน */
  tiers: TreeTier[];
  /** ครึ่งความกว้างของชั้นล่างสุด */
  baseHalfWidth: number;
  hasStar: boolean;
}

// ---------- ของขวัญ ----------
export type RibbonStyle = 'cross' | 'vertical' | 'bow';

export interface Gift {
  /** ลำดับกล่อง 0..n-1 กล่อง index เดิมต้องได้ค่าเดิมเสมอไม่ว่า day จะเป็นเท่าไร */
  index: number;
  /** วันที่กล่องนี้ปรากฏ */
  appearDay: number;
  /** ตำแหน่งขอบซ้ายเทียบแกนลำต้น (x=0) และกล่องวางบนพื้น (ฐานอยู่ที่ y=0) */
  x: number;
  w: number;
  h: number;
  color: string;
  ribbonColor: string;
  ribbonStyle: RibbonStyle;
  /** true = วาดหลังลำต้น/ก่อนต้นไม้, false = วาดหน้าต้นไม้ */
  behindTree: boolean;
}

// ---------- ฉาก ----------
/** พารามิเตอร์ที่ main ส่งให้ทุก layer ทุกเฟรม หน่วยเป็น logical pixel */
export interface SceneParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** x ของแกนลำต้น (กึ่งกลางจอ) */
  centerX: number;
  /** y ของพื้นที่โคนต้น */
  groundY: number;
  /** วันเวลาจำลอง (จาก ?date= ?time= หรือสไลเดอร์ debug) หรือเวลาจริง */
  now: Date;
  /** นาฬิกาแอนิเมชัน ms เดินเฉพาะตอนแท็บมองเห็น ใช้กับการกะพริบ/เคลื่อนไหว */
  timeMs: number;
  /** ms ตั้งแต่เฟรมก่อน (ถูกจำกัดไม่เกิน 100) */
  dt: number;
  /** 0 = ก่อน 1 ธ.ค., 1..25 */
  day: number;
  /** day / 25 */
  progress: number;
  /** รูปทรงต้นของเฟรมนี้ (ถูกย่อ/ยืดแล้วระหว่างเอฟเฟกต์โต) ทุก layer วาดตาม shape นี้ */
  tree: TreeShape;
  /** ความสูงต้นเต็ม (วันที่ 25, ไม่รวมดาว) ของจอนี้ หน่วย logical px */
  treeMax: number;
  /** treeMax / TREE_REF_HEIGHT: ตัวคูณขนาดของตกแต่งให้สัมพันธ์กับต้น (จอ 180px ได้ราว 1.5) */
  scale: number;
  /** ตัวคูณของ layoutGifts (หน่วยอ้างอิง) = scale แต่ถูกจำกัดให้กล่องทั้งหมดไม่ล้นจอแคบ */
  giftScale: number;
  /** 0..1 ระหว่างเอฟเฟกต์ต้นโตขึ้นขั้นใหม่, null = ไม่ได้เล่น */
  growT: number | null;
  daylight: DaylightState;
  reducedMotion: boolean;
  seed: number;
}

export interface SceneLayer {
  render(p: SceneParams): void;
}

export interface SnowLayers {
  /** หิมะชั้นไกล วาดหลังต้นไม้ */
  far: SceneLayer;
  /** หิมะชั้นใกล้ วาดหน้าทุกอย่าง */
  near: SceneLayer;
}

export interface GiftLayers {
  /** กล่องที่ behindTree = true วาดก่อนต้นไม้ */
  behind: SceneLayer;
  /** กล่องที่เหลือ วาดหลังต้นไม้และไฟ */
  front: SceneLayer;
}

export interface SantaLayer extends SceneLayer {
  /** ให้ซานต้าโผล่ทันที (?santa=now และปุ่ม debug) ไม่สนช่วงเวลา */
  trigger(): void;
}

// ---------- ชั้นรายละเอียด (Detail Layers) ที่ปลดล็อกตามวัน ----------
/** นิยามของชั้นหนึ่งชั้นใน src/detail/layers.ts */
export interface DetailLayerDef {
  id: string;
  /** ชื่อภาษาไทยสำหรับหน้า debug */
  label: string;
  /** วันที่ชิ้นที่ 1, 2, 3, ... ของชั้นนี้ปรากฏ (เรียงจากน้อยไปมาก) วันแรก = วันปลดล็อก จำนวนสูงสุด = ความยาว */
  steps: readonly number[];
  /** วันที่ความเข้ม (แสง ความหนาแน่น) ถึง 1 */
  fullDay: number;
}

/** สถานะของชั้นในวันหนึ่ง คำนวณแบบ pure จาก day */
export interface DetailLayerState {
  id: string;
  label: string;
  unlockDay: number;
  active: boolean;
  /** จำนวนชิ้นที่ปรากฏแล้ว (ชิ้น index 0..count-1) */
  count: number;
  maxCount: number;
  /** 0 = ยังไม่ปลดล็อก แล้วไล่ขึ้นถึง 1 ในวัน fullDay */
  intensity: number;
}

/** สถานะที่ตัววาดได้รับ: เพิ่มข้อมูล animation ตอนชิ้นใหม่ปรากฏ */
export interface DetailLayerView extends DetailLayerState {
  /** จำนวนชิ้นก่อนการเพิ่มครั้งล่าสุด (ชิ้น index >= prevCount คือชิ้นที่กำลังปรากฏ) */
  prevCount: number;
  /** 0..1 ระหว่าง animation ปรากฏของชิ้นใหม่, null = ไม่ได้เล่น */
  appearT: number | null;
}

export type DetailViews = Record<string, DetailLayerView>;

/** ตัววาดของกลุ่มชั้นรายละเอียด (เช่น ตลาดคริสต์มาส) รับสถานะของทุกชั้นแล้ววาดเฉพาะที่ตัวเองดูแล */
export interface DetailRenderer {
  render(p: SceneParams, views: DetailViews): void;
}

// ---------- เสียง ----------
export type SoundId = 'santaHoHoHo';

export interface IAudioManager {
  /** เรียกหลังผู้ใช้กดครั้งแรกเท่านั้น (ข้อจำกัด autoplay) เรียกซ้ำได้ */
  init(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  playBackground(): void;
  stopBackground(): void;
  play(id: SoundId): void;
}

// ---------- UI ----------
export interface AppState {
  now: Date;
  day: number;
  progress: number;
  daylightMode: DaylightMode;
  daylight: DaylightState;
}

/** ตัวเรนเดอร์ฉาก (src/app.ts) ใช้ร่วมกันทั้งหน้าหลักและหน้า debug */
export interface AppController {
  readonly canvas: HTMLCanvasElement;
  getState(): AppState;
  /** หน้าหลักใช้ 'auto' เสมอ หน้า debug สลับได้ */
  setDaylightMode(mode: DaylightMode): void;
  /** ตั้งวันเวลาจำลอง (หน้า debug) */
  setSimulatedNow(date: Date): void;
  /** ให้ซานต้าโผล่ทันที (หน้า debug) */
  triggerSanta(): void;
  /** ขนาดฉากของเฟรมล่าสุด (logical px) และเวลาวาดเฉลี่ยต่อเฟรม (ms); null ก่อนเฟรมแรก */
  getScene(): { width: number; height: number; centerX: number; groundY: number; treeMax: number; scale: number; frameMs: number } | null;
  /** เรียก cb ทันที แล้วประมาณวินาทีละครั้ง และทุกครั้งที่ state เปลี่ยน */
  subscribe(cb: (state: AppState) => void): void;
}
