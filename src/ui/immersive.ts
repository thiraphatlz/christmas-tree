// การกระทำที่มองไม่เห็น: เต็มจอ ซ่อนเคอร์เซอร์ ปลดล็อกเสียง (ไม่สร้าง DOM เลย)
import { AudioManager } from '../audio/AudioManager';
import { IDLE_HIDE_MS } from '../config';

/** สลับเต็มจอของ element (ตรวจ API ก่อน กลืน error) */
export function toggleFullscreen(el: HTMLElement = document.documentElement): void {
  if (!document.fullscreenEnabled) return;
  const p = document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
  p.catch(() => {});
}

const plain = (e: KeyboardEvent) => !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey;

/** ปุ่ม F สลับเต็มจอ */
export function initFullscreenKey(el?: HTMLElement): void {
  window.addEventListener('keydown', (e) => {
    if (plain(e) && e.code === 'KeyF') toggleFullscreen(el);
  });
}

/** ดับเบิลคลิก/แตะสองครั้งบน canvas สลับเต็มจอ */
export function initDoubleClickFullscreen(canvas: HTMLElement): void {
  canvas.addEventListener('dblclick', () => toggleFullscreen());
}

/** ซ่อนเคอร์เซอร์เมื่อเมาส์นิ่ง (class .cursor-hidden ใน style.css) */
export function initCursorHide(): void {
  const root = document.documentElement;
  let timer = 0;
  const idle = () => root.classList.add('cursor-hidden');
  const wake = () => {
    root.classList.remove('cursor-hidden');
    clearTimeout(timer);
    timer = window.setTimeout(idle, IDLE_HIDE_MS);
  };
  window.addEventListener('pointermove', wake);
  wake();
}

/** ปลดล็อกเสียงเมื่อมีการกดครั้งแรก และปุ่ม M สลับปิดเสียง */
export function initAudioUnlock(): void {
  const unlock = () => AudioManager.init();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('keydown', (e) => {
    if (plain(e) && e.code === 'KeyM') AudioManager.setMuted(!AudioManager.isMuted());
  });
}

/** กันจอดับระหว่างเต็มจอ (ถ้าเบราว์เซอร์รองรับ) */
export function initWakeLock(): void {
  if (!('wakeLock' in navigator)) return;
  let lock: WakeLockSentinel | null = null;
  const sync = async () => {
    try {
      if (document.fullscreenElement && document.visibilityState === 'visible') {
        if (!lock || lock.released) lock = await navigator.wakeLock.request('screen');
      } else if (lock) {
        await lock.release();
        lock = null;
      }
    } catch {
      // ขอไม่ได้ก็ข้าม
    }
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('visibilitychange', sync);
}
