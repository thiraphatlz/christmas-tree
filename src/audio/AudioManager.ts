// ตัวจัดการเสียง (โครงเปล่า ยังไม่มีไฟล์เสียงจริง เจ้าของโปรเจกต์จะเลือกเสียงภายหลัง)
// มีแค่สองเสียง: เพลงพื้นหลังแบบวนซ้ำ และ "โฮ่ โฮ่ โฮ่" ของซานต้า ไม่มีเสียงอื่น
import { MUTE_STORAGE_KEY } from '../config';
import type { IAudioManager, SoundId } from '../types';

// ค่าเริ่มต้นคือปิดเสียง จะเปิดก็ต่อเมื่อผู้ใช้เคยเลือกเปิดไว้
let muted = true;
try {
  muted = localStorage.getItem(MUTE_STORAGE_KEY) !== '0';
} catch {
  // localStorage ใช้ไม่ได้ (โหมดส่วนตัว ฯลฯ) ใช้ค่าเริ่มต้น
}

let initialised = false;

export const AudioManager: IAudioManager = {
  init() {
    if (initialised) return;
    initialised = true;
    // TODO: สร้าง AudioContext / โหลดไฟล์เสียงที่นี่ที่เดียว (ต้องเรียกหลังผู้ใช้กดครั้งแรก)
    this.playBackground();
  },

  setMuted(value: boolean) {
    muted = value;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0');
    } catch {
      // บันทึกไม่ได้ก็ไม่เป็นไร
    }
    if (value) this.stopBackground();
    else this.playBackground();
  },

  isMuted: () => muted,

  playBackground() {
    if (muted || !initialised) return;
    // TODO: เริ่มเล่นเสียงบรรยากาศพื้นหลังแบบวนซ้ำ (loop) ที่นี่
  },

  stopBackground() {
    if (!initialised) return;
    // TODO: หยุดเสียงบรรยากาศพื้นหลังที่นี่
  },

  play(id: SoundId) {
    if (muted || !initialised) return;
    // TODO: เล่นตัวอย่างเสียง "โฮ่ โฮ่ โฮ่" ของซานต้าที่นี่ (id มีแค่ 'santaHoHoHo')
    void id;
  },
};
