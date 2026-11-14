import { AudioManager } from './audio/AudioManager';
import { SCENE_MIN_WIDTH, SCENE_TARGET_HEIGHT, SEED } from './config';
import { fractionalHour, getDay, getProgress, parseSimulatedNow } from './core/date';
import { getDaylight } from './core/daylight';
import { getTreeShape } from './core/growth';
import { createGifts } from './scene/gifts';
import { createLights } from './scene/lights';
import { createSanta } from './scene/santa';
import { createSky } from './scene/sky';
import { createSnow } from './scene/snow';
import { createTree } from './scene/tree';
import type { AppController, AppState, DaylightMode, SceneParams } from './types';
import { initUI } from './ui/ui';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const query = new URLSearchParams(location.search);
const debug = query.get('debug') === '1';

// ---------- นาฬิกาจำลอง ----------
let simOffset = parseSimulatedNow(location.search, new Date()).getTime() - Date.now();
const getNow = () => new Date(Date.now() + simOffset);

let daylightMode: DaylightMode = 'auto';
const daylightFor = (now: Date) =>
  getDaylight(daylightMode === 'day' ? 12 : daylightMode === 'night' ? 0 : fractionalHour(now));

const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- integer scaling ----------
// สเกลเป็นจำนวนเต็มของ device pixel เพื่อให้ pixel art คมที่สุด แล้วให้ canvas คลุมเต็มหน้าต่าง
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const devW = Math.round(window.innerWidth * dpr);
  const devH = Math.round(window.innerHeight * dpr);
  const scale = Math.max(1, Math.floor(Math.min(devH / SCENE_TARGET_HEIGHT, devW / SCENE_MIN_WIDTH)));
  canvas.width = Math.ceil(devW / scale);
  canvas.height = Math.ceil(devH / scale);
  const cssW = (canvas.width * scale) / dpr;
  const cssH = (canvas.height * scale) / dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.left = `${(window.innerWidth - cssW) / 2}px`;
  canvas.style.top = `${(window.innerHeight - cssH) / 2}px`;
}
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
resize();

// ---------- layers (ลำดับวาดจากหลังไปหน้า) ----------
const sky = createSky();
const snow = createSnow();
const santa = createSanta(AudioManager);
const gifts = createGifts();
const tree = createTree();
const lights = createLights();
const layers = [sky, snow.far, santa, gifts.behind, tree, lights, gifts.front, snow.near];

// ---------- UI ----------
function getState(): AppState {
  const now = getNow();
  return { now, day: getDay(now), progress: getProgress(now), daylightMode, daylight: daylightFor(now), debug };
}

const app: AppController = {
  canvas,
  getState,
  setDaylightMode(mode) {
    daylightMode = mode;
    ui.update(getState());
  },
  setSimulatedNow(date) {
    simOffset = date.getTime() - Date.now();
    ui.update(getState());
  },
  triggerSanta: () => santa.trigger(),
};
const ui = initUI(app);
ui.update(getState());
if (query.get('santa') === 'now') santa.trigger();

// ---------- game loop ----------
let last = performance.now();
let timeMs = 0;
let lastUiSecond = -1;

function frame(t: number): void {
  const dt = Math.min(100, Math.max(0, t - last));
  last = t;
  timeMs += dt;

  const now = getNow();
  const day = getDay(now);
  const { width, height } = canvas;
  const params: SceneParams = {
    ctx,
    width,
    height,
    centerX: Math.floor(width / 2),
    groundY: height - Math.max(22, Math.round(height * 0.15)),
    now,
    timeMs,
    dt,
    day,
    progress: getProgress(now),
    tree: getTreeShape(day),
    daylight: daylightFor(now),
    reducedMotion: motionQuery.matches,
    seed: SEED,
  };

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  for (const layer of layers) layer.render(params);

  const second = Math.floor(now.getTime() / 1000);
  if (second !== lastUiSecond) {
    lastUiSecond = second;
    ui.update(getState());
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
