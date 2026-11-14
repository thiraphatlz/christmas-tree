// หน้า debug: ตัวควบคุมทั้งหมดของฉาก (เรียกผ่าน AppController)
import { createApp } from './app';
import { AudioManager } from './audio/AudioManager';
import { GROW_DAYS } from './config';
import { hasSkirt, hasStar, giftCount, lightCount, ornamentCount, ribbonCount, tierCount, tinselCount, treeHeight } from './core/growth';
import { isSantaWindow } from './core/santaSchedule';
import { infoText } from './ui/info';
import { initAudioUnlock, initFullscreenKey, toggleFullscreen } from './ui/immersive';
import type { AppState, DaylightMode } from './types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = (n: number) => String(n).padStart(2, '0');

const stage = $('stage');
const app = createApp($<HTMLCanvasElement>('scene'));
initAudioUnlock();
initFullscreenKey(stage);

// ---------- วันเวลาจำลอง ----------
const year = app.getState().now.getFullYear();
const dateEl = $<HTMLInputElement>('date');
const timeEl = $<HTMLInputElement>('time');
const nov25 = new Date(year, 10, 25).getTime();

function applySliders(): void {
  const d = new Date(year, 10, 25 + Number(dateEl.value), 0, Number(timeEl.value));
  $('date-out').textContent = `${d.getDate()} ${d.getMonth() === 10 ? 'พ.ย.' : 'ธ.ค.'}`;
  $('time-out').textContent = `${pad(Math.floor(Number(timeEl.value) / 60))}:${pad(Number(timeEl.value) % 60)}`;
  app.setSimulatedNow(d);
}

function jump(month: number, day: number, hour = 12): void {
  dateEl.value = String(Math.round((new Date(year, month, day).getTime() - nov25) / 864e5));
  timeEl.value = String(hour * 60);
  applySliders();
}

const initial = app.getState().now;
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
dateEl.value = String(clamp(Math.round((new Date(year, initial.getMonth(), initial.getDate()).getTime() - nov25) / 864e5), 36));
timeEl.value = String(initial.getHours() * 60 + initial.getMinutes());
applySliders(); // ตั้งค่าตามสไลเดอร์ทันที ให้ป้ายตรงกับฉากแม้วันที่เดิมอยู่นอกช่วง
dateEl.addEventListener('input', applySliders);
timeEl.addEventListener('input', applySliders);

const JUMPS: [string, number, number, number?][] = [
  ['30 พ.ย.', 10, 30],
  ['1 ธ.ค.', 11, 1],
  ['10 ธ.ค.', 11, 10],
  ['20 ธ.ค.', 11, 20],
  ['24 ธ.ค. 18:00', 11, 24, 18],
  ['25 ธ.ค.', 11, 25],
];
for (const [label, m, d, h] of JUMPS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () => jump(m, d, h));
  $('jumps').append(b);
}

// ---------- กลางวัน/กลางคืน ----------
const modeBtns = document.querySelectorAll<HTMLButtonElement>('#daylight button');
for (const b of modeBtns) b.addEventListener('click', () => app.setDaylightMode(b.dataset.mode as DaylightMode));

// ---------- ปุ่มอื่น ----------
$('santa').addEventListener('click', () => app.triggerSanta());
$('fullscreen').addEventListener('click', () => toggleFullscreen(stage));
const muteBtn = $('mute');
const syncMute = () => {
  const m = AudioManager.isMuted();
  muteBtn.textContent = m ? 'เสียง: ปิด' : 'เสียง: เปิด';
  muteBtn.setAttribute('aria-pressed', String(m));
};
muteBtn.addEventListener('click', () => {
  AudioManager.init(); // คลิกเป็น gesture อยู่แล้ว
  AudioManager.setMuted(!AudioManager.isMuted());
  syncMute();
});
window.addEventListener('keydown', () => queueMicrotask(syncMute)); // ปุ่ม M เปลี่ยนสถานะ
syncMute();

// ---------- readout ----------
const rows: [string, (s: AppState) => string][] = [
  ['วันที่/เวลาจำลอง', (s) => `${s.now.getDate()}/${s.now.getMonth() + 1}/${s.now.getFullYear()} ${pad(s.now.getHours())}:${pad(s.now.getMinutes())}:${pad(s.now.getSeconds())}`],
  ['วันที่', (s) => `${s.day} จาก ${GROW_DAYS}`],
  ['ความคืบหน้า', (s) => s.progress.toFixed(2)],
  ['ช่วงเวลา', (s) => s.daylight.phase],
  ['ความมืด', (s) => s.daylight.darkness.toFixed(2)],
  ['ช่วงซานต้า', (s) => (isSantaWindow(s.now) ? 'ใช่' : 'ไม่')],
  ['ความสูงต้น (หน่วยอ้างอิง)', (s) => String(treeHeight(s.day))],
  ['ชั้นใบ', (s) => String(tierCount(s.day))],
  ['ไฟ', (s) => String(lightCount(s.day))],
  ['ลูกบอล', (s) => String(ornamentCount(s.day))],
  ['ริบบิ้น', (s) => String(ribbonCount(s.day))],
  ['ทินเซล', (s) => String(tinselCount(s.day))],
  ['ของขวัญ', (s) => String(giftCount(s.day))],
  ['ผ้ารองโคนต้น', (s) => (hasSkirt(s.day) ? 'มี' : 'ไม่มี')],
  ['ดาว', (s) => (hasStar(s.day) ? 'มี' : 'ไม่มี')],
];
const cells = rows.map(([label]) => {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  $('readout').append(dt, dd);
  return dd;
});

app.subscribe((s) => {
  rows.forEach(([, f], i) => (cells[i].textContent = f(s)));
  const info = infoText(s.day, s.now);
  $('info-title').textContent = info.title;
  $('info-count').textContent = info.count;
  for (const b of modeBtns) b.setAttribute('aria-pressed', String(b.dataset.mode === s.daylightMode));
});
