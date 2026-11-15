// ตัวจัดการเสียง: มีแค่สองเสียง คือเพลงพื้นหลังแบบวนซ้ำ และ "โฮ่ โฮ่ โฮ่" ของซานต้า ไม่มีเสียงอื่น
// เพลงพื้นหลังสังเคราะห์ด้วยโค้ด (src/audio/music.ts) เสียงซานต้าเป็นไฟล์ที่เจ้าของโปรเจกต์วางเอง
import { MUTE_STORAGE_KEY } from '../config';
import type { IAudioManager, SoundId } from '../types';
import { scheduleLoop } from './music';

/** ไฟล์เสียงซานต้า: วางที่ public/audio/santa-hohoho.mp3 (ถ้าไม่มีไฟล์ จะเงียบ) */
const SANTA_URL = '/audio/santa-hohoho.mp3';
const MUSIC_VOLUME = 0.25;
const SANTA_VOLUME = 0.12;

// ค่าเริ่มต้นคือปิดเสียง จะเปิดก็ต่อเมื่อผู้ใช้เคยเลือกเปิดไว้
let muted = true;
try {
  muted = localStorage.getItem(MUTE_STORAGE_KEY) !== '0';
} catch {
  // localStorage ใช้ไม่ได้ (โหมดส่วนตัว ฯลฯ) ใช้ค่าเริ่มต้น
}

let initialised = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** bus ของเพลงรอบที่กำลังเล่น (null = ไม่ได้เล่น) */
let bus: GainNode | null = null;
let timer = 0;
let santa: HTMLAudioElement | null = null;

export const AudioManager: IAudioManager = {
  init() {
    if (initialised) return;
    initialised = true;
    // สร้างระบบเสียงที่นี่ที่เดียว (ต้องเรียกหลังผู้ใช้กดครั้งแรก ตามข้อจำกัด autoplay)
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = MUSIC_VOLUME;
      master.connect(ctx.destination);
      santa = new Audio(SANTA_URL);
      santa.preload = 'auto';
      santa.volume = SANTA_VOLUME;
      // แท็บถูกซ่อน: พักเสียงไว้ กลับมาแล้วเล่นต่อ
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) void ctx.suspend();
        else if (!muted) void ctx.resume();
      });
    } catch {
      ctx = null; // เบราว์เซอร์ไม่รองรับ Web Audio: ทำงานต่อแบบเงียบ
    }
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
    if (muted || !initialised || !ctx || !master || bus) return;
    const audio = ctx;
    void audio.resume();
    const out = audio.createGain();
    out.connect(master);
    bus = out;
    let next = audio.currentTime + 0.15;
    // จองล่วงหน้าทีละรอบ แล้วตั้งเวลาจองรอบถัดไปก่อนรอบนี้จบ 2 วินาที
    const pump = () => {
      if (bus !== out) return;
      next += scheduleLoop(audio, out, next);
      timer = window.setTimeout(pump, Math.max(100, (next - audio.currentTime - 2) * 1000));
    };
    pump();
  },

  stopBackground() {
    if (!initialised || !ctx || !bus) return;
    window.clearTimeout(timer);
    const out = bus;
    bus = null;
    out.gain.setTargetAtTime(0, ctx.currentTime, 0.05); // จางออกสั้น ๆ ไม่ให้มีเสียงคลิก
    window.setTimeout(() => out.disconnect(), 400);
  },

  play(id: SoundId) {
    if (muted || !initialised || !santa) return;
    if (id !== 'santaHoHoHo') return;
    santa.currentTime = 0;
    void santa.play().catch(() => {}); // ไม่มีไฟล์หรือถูกบล็อก: เงียบ
  },
};
