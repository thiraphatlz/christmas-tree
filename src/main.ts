// หน้าหลัก: มีแค่ฉาก ไม่มี UI (agent "ui-debug" เพิ่มการกระทำที่มองไม่เห็น: เต็มจอ ซ่อนเคอร์เซอร์ ปลดล็อกเสียง)
import { createApp } from './app';

createApp(document.getElementById('scene') as HTMLCanvasElement);
