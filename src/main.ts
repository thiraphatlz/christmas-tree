// หน้าหลัก: มีแค่ฉาก ไม่มี UI การควบคุมทั้งหมดอยู่ที่ /debug.html
import { createApp } from './app';
import { initAudioUnlock, initCursorHide, initDoubleClickFullscreen, initFullscreenKey, initWakeLock } from './ui/immersive';

const app = createApp(document.getElementById('scene') as HTMLCanvasElement);
initFullscreenKey();
initDoubleClickFullscreen(app.canvas);
initCursorHide();
initAudioUnlock();
initWakeLock();
