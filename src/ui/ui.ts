// UI ทั้งหมดบน canvas: แผงข้อมูล ปุ่ม โหมดเต็มตา (immersive) คีย์ลัด และแผง debug
import { AudioManager } from '../audio/AudioManager';
import { IDLE_HIDE_MS } from '../config';
import type { AppController, AppState, DaylightMode, UI } from '../types';
import { DAYLIGHT_LABEL, infoText } from './info';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const setText = (node: HTMLElement, text: string) => {
  if (node.textContent !== text) node.textContent = text;
};

const NEXT_MODE: Record<DaylightMode, DaylightMode> = { auto: 'day', day: 'night', night: 'auto' };

export function initUI(app: AppController): UI {
  const root = document.documentElement;
  const infoTitle = el('info-title');
  const infoCount = el('info-count');
  const daylightButtons = document.querySelectorAll<HTMLButtonElement>('.js-daylight');
  const btnMute = el<HTMLButtonElement>('btn-mute');
  const btnFullscreen = el<HTMLButtonElement>('btn-fullscreen');
  const btnExit = el<HTMLButtonElement>('btn-exit');

  // ---------- เสียง ----------
  // สร้างระบบเสียงได้หลังผู้ใช้กดครั้งแรกเท่านั้น (ข้อจำกัด autoplay)
  const initAudio = () => AudioManager.init();
  window.addEventListener('pointerdown', initAudio, { once: true });
  window.addEventListener('keydown', initAudio, { once: true });

  function renderMute(): void {
    const muted = AudioManager.isMuted();
    btnMute.setAttribute('aria-pressed', String(muted));
    setText(btnMute, muted ? 'เสียง: ปิด' : 'เสียง: เปิด');
  }
  function toggleMute(): void {
    AudioManager.init(); // มาจากการกดของผู้ใช้เสมอ
    AudioManager.setMuted(!AudioManager.isMuted());
    renderMute();
  }
  btnMute.addEventListener('click', toggleMute);
  renderMute();

  // ---------- กลางวัน/กลางคืน ----------
  for (const b of daylightButtons) {
    b.addEventListener('click', () => app.setDaylightMode(NEXT_MODE[app.getState().daylightMode]));
  }

  // ---------- โหมดเต็มตา ----------
  // immersive = Fullscreen API หรือ ซ่อนเมนู (clean view) หรือ ตรวจพบ F11
  let clean = false;
  let f11 = false;
  let f11Dismissed = false; // ผู้ใช้กด "แสดงเมนู" ระหว่าง F11 จนกว่าหน้าต่างจะหดกลับ
  let idleTimer = 0;
  const displayFullscreen = matchMedia('(display-mode: fullscreen)');
  const isApiFullscreen = () => document.fullscreenElement !== null;

  // Fullscreen API มองไม่เห็น F11 จึงเทียบขนาดหน้าต่างกับจอ (เผื่อคลาดเคลื่อน 2px)
  // ponytail: ถ้าซูมหน้าเว็บไม่ใช่ 100% ขนาดจะไม่ตรง จึงใช้ display-mode ช่วยอีกทาง
  const detectF11 = () =>
    displayFullscreen.matches ||
    (Math.abs(window.innerWidth - screen.width) <= 2 && Math.abs(window.innerHeight - screen.height) <= 2);

  // โชว์ปุ่มลอยและเคอร์เซอร์ชั่วคราว แล้วซ่อนเมื่อเมาส์นิ่งครบ IDLE_HIDE_MS
  function wake(): void {
    if (!root.classList.contains('immersive')) return;
    root.classList.add('pointer-active');
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => root.classList.remove('pointer-active'), IDLE_HIDE_MS);
  }

  function applyImmersive(): void {
    const api = isApiFullscreen();
    const immersive = api || clean || (f11 && !f11Dismissed);
    const was = root.classList.contains('immersive');
    root.classList.toggle('immersive', immersive);
    // F11 ออกด้วยโค้ดไม่ได้ ปุ่มจึงทำได้แค่เรียกเมนูกลับมา
    setText(btnExit, api ? 'ออกจากเต็มจอ' : clean ? 'แสดงเมนู' : 'แสดงเมนู (ออกเต็มจอกด F11)');
    if (immersive && !was) wake();
    if (!immersive) {
      clearTimeout(idleTimer);
      root.classList.remove('pointer-active');
    }
  }

  function refreshF11(): void {
    f11 = detectF11();
    if (!f11) f11Dismissed = false;
    applyImmersive();
  }

  function toggleFullscreen(): void {
    if (isApiFullscreen()) void document.exitFullscreen().catch(() => {});
    else void root.requestFullscreen?.().catch(() => {});
  }

  function toggleClean(): void {
    clean = !clean;
    applyImmersive();
  }

  // ออกจากโหมดเต็มตาทุกแบบที่กำลังเปิดอยู่
  function exitImmersive(): void {
    if (isApiFullscreen()) void document.exitFullscreen().catch(() => {});
    clean = false;
    if (f11) f11Dismissed = true;
    applyImmersive();
  }

  btnFullscreen.hidden = !root.requestFullscreen; // เช่น Safari บน iPhone ไม่มี Fullscreen API
  btnFullscreen.addEventListener('click', toggleFullscreen);
  el('btn-clean').addEventListener('click', toggleClean);
  btnExit.addEventListener('click', exitImmersive);

  window.addEventListener('resize', refreshF11);
  displayFullscreen.addEventListener('change', refreshF11);
  window.addEventListener('pointermove', wake);
  window.addEventListener('pointerdown', wake);

  // ---------- กันจอดับระหว่าง Fullscreen API ----------
  let wakeLock: WakeLockSentinel | null = null;
  async function syncWakeLock(): Promise<void> {
    try {
      if (isApiFullscreen() && document.visibilityState === 'visible') {
        if ('wakeLock' in navigator && (!wakeLock || wakeLock.released)) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } else {
        await wakeLock?.release();
        wakeLock = null;
      }
    } catch {
      // ไม่ได้รับอนุญาตหรือแบตต่ำ ปล่อยผ่าน
    }
  }
  document.addEventListener('visibilitychange', () => void syncWakeLock());
  document.addEventListener('fullscreenchange', () => {
    refreshF11();
    void syncWakeLock();
  });

  // ---------- คีย์ลัด ----------
  // ใช้ e.code เพื่อให้ทำงานแม้แป้นพิมพ์อยู่ในภาษาไทย
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') wake(); // ให้ Tab ไปถึงปุ่มลอยได้
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target;
    if (
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement ||
      (t instanceof HTMLInputElement && t.type !== 'range') ||
      (t instanceof HTMLElement && t.isContentEditable)
    ) {
      return;
    }
    if (e.code === 'KeyF') toggleFullscreen();
    else if (e.code === 'KeyH') toggleClean();
    else if (e.code === 'KeyM') toggleMute();
    else if (e.code === 'Escape' && root.classList.contains('immersive')) exitImmersive();
  });

  // ---------- แผง debug ----------
  const initial = app.getState();
  if (initial.debug) initDebug(app, initial.now);

  refreshF11();

  return {
    update(state: AppState) {
      const { title, count } = infoText(state.day, state.now);
      setText(infoTitle, title);
      setText(infoCount, count);
      const mode = DAYLIGHT_LABEL[state.daylightMode];
      for (const b of daylightButtons) {
        setText(b, `แสง: ${mode}`);
        b.setAttribute('aria-label', `โหมดแสง: ${mode} (กดเพื่อเปลี่ยน)`);
      }
    },
  };
}

/** สไลเดอร์วันที่ (25 พ.ย. ถึง 31 ธ.ค.) และเวลา (00:00 ถึง 23:59) ของปีจำลอง + ปุ่มเรียกซานต้า */
function initDebug(app: AppController, now: Date): void {
  const date = el<HTMLInputElement>('debug-date');
  const time = el<HTMLInputElement>('debug-time');
  const dateOut = el('debug-date-out');
  const timeOut = el('debug-time-out');
  const year = now.getFullYear();
  const dayFormat = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });
  // ค่า 0 = 25 พ.ย. (Date ปัดวันที่เกินเดือนไปเดือนถัดไปให้เอง)
  const selected = () => new Date(year, 10, 25 + +date.value, 0, +time.value);

  function show(): void {
    const d = selected();
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    dateOut.textContent = dayFormat.format(d);
    timeOut.textContent = hhmm;
    date.setAttribute('aria-valuetext', dateOut.textContent);
    time.setAttribute('aria-valuetext', hhmm);
  }
  function apply(): void {
    show();
    app.setSimulatedNow(selected());
  }

  // ตั้งค่าเริ่มจากเวลาจำลองปัจจุบัน (นอกช่วงจะถูกสไลเดอร์ปัดเข้าขอบเอง)
  const dayIndex = Math.round((new Date(year, now.getMonth(), now.getDate()).getTime() - new Date(year, 10, 25).getTime()) / 86_400_000);
  date.value = String(dayIndex);
  time.value = String(now.getHours() * 60 + now.getMinutes());
  show();

  date.addEventListener('input', apply);
  time.addEventListener('input', apply);
  el('debug-santa').addEventListener('click', () => app.triggerSanta());
  el('debug').hidden = false;
}
