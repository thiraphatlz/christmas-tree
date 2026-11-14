// ตัวเรนเดอร์ฉาก: game loop, integer scaling, นาฬิกาจำลอง ใช้ร่วมกันทั้งหน้าหลักและหน้า debug (ไม่มี DOM UI ในไฟล์นี้)
import { AudioManager } from './audio/AudioManager';
import {
  SCENE_MIN_WIDTH,
  SCENE_TARGET_HEIGHT,
  SEED,
  TREE_HEIGHT_FRAC_FULL,
  TREE_MAX_WIDTH_FRAC,
  TREE_REF_HEIGHT,
} from './config';
import { fractionalHour, getDay, getProgress, parseSimulatedNow } from './core/date';
import { getDaylight } from './core/daylight';
import { getTreeShape } from './core/growth';
import { createGrowthAnim } from './core/growthAnim';
import { createBackground } from './scene/background';
import { createCelebration } from './scene/celebration';
import { createDecor } from './scene/decor';
import { createFairyLights } from './scene/fairylights';
import { createGifts } from './scene/gifts';
import { createGroundDecor } from './scene/ground';
import { createLights } from './scene/lights';
import { createSanta } from './scene/santa';
import { createSky } from './scene/sky';
import { createSnow } from './scene/snow';
import { createTree } from './scene/tree';
import type { AppController, AppState, DaylightMode, SceneParams } from './types';

/** ความกว้างต้น / ความสูงต้น (baseHalfWidth = 0.38 * height) */
const TREE_ASPECT = 0.76;
/** ที่ว่างเหนือยอดต้นสำหรับดาว (px) */
const STAR_ROOM = 9;
/** ครึ่งความกว้างของ layout ของขวัญในหน่วยอ้างอิง (ดู layoutGifts) */
const GIFT_HALF_SPAN = 58;

export function createApp(canvas: HTMLCanvasElement): AppController {
  const ctx = canvas.getContext('2d')!;
  const query = new URLSearchParams(location.search);

  // ---------- นาฬิกาจำลอง (?date= ?time=) ----------
  let simOffset = parseSimulatedNow(location.search, new Date()).getTime() - Date.now();
  const getNow = () => new Date(Date.now() + simOffset);

  let daylightMode: DaylightMode = 'auto';
  const daylightFor = (now: Date) =>
    getDaylight(daylightMode === 'day' ? 12 : daylightMode === 'night' ? 0 : fractionalHour(now));

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- integer scaling ----------
  // สเกลเป็นจำนวนเต็มของ device pixel เพื่อให้ pixel art คมที่สุด แล้วให้ canvas คลุมเต็มพื้นที่ของ parent
  function resize(): void {
    const box = canvas.parentElement === document.body ? null : canvas.parentElement;
    const boxW = box ? box.clientWidth : window.innerWidth;
    const boxH = box ? box.clientHeight : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const devW = Math.max(1, Math.round(boxW * dpr));
    const devH = Math.max(1, Math.round(boxH * dpr));
    const scale = Math.max(1, Math.floor(Math.min(devH / SCENE_TARGET_HEIGHT, devW / SCENE_MIN_WIDTH)));
    canvas.width = Math.ceil(devW / scale);
    canvas.height = Math.ceil(devH / scale);
    const cssW = (canvas.width * scale) / dpr;
    const cssH = (canvas.height * scale) / dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${(boxW - cssW) / 2}px`;
    canvas.style.top = `${(boxH - cssH) / 2}px`;
  }
  window.addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);
  resize();

  // ---------- layers (ลำดับวาดจากหลังไปหน้า) ----------
  const sky = createSky();
  const background = createBackground();
  const snow = createSnow();
  const santa = createSanta(AudioManager);
  const gifts = createGifts();
  const tree = createTree();
  const lights = createLights();
  const decor = createDecor();
  const ground = createGroundDecor();
  const fairy = createFairyLights();
  const celebration = createCelebration();
  const layers = [sky, background, snow.far, celebration, santa, gifts.behind, tree, lights, decor, ground, gifts.front, fairy, snow.near];
  const growth = createGrowthAnim();

  // ---------- state ----------
  const subscribers: ((state: AppState) => void)[] = [];
  function getState(): AppState {
    const now = getNow();
    return { now, day: getDay(now), progress: getProgress(now), daylightMode, daylight: daylightFor(now) };
  }
  const notify = () => {
    const state = getState();
    for (const cb of subscribers) cb(state);
  };

  if (query.get('santa') === 'now') santa.trigger();

  // ---------- game loop ----------
  let last = performance.now();
  let timeMs = 0;
  let lastSecond = -1;

  function frame(t: number): void {
    const dt = Math.min(100, Math.max(0, t - last));
    last = t;
    timeMs += dt;

    const now = getNow();
    const day = getDay(now);
    const { width, height } = canvas;
    const groundY = height - Math.max(12, Math.round(height * 0.08));
    const treeMax = Math.max(
      20,
      Math.floor(Math.min(height * TREE_HEIGHT_FRAC_FULL, (width * TREE_MAX_WIDTH_FRAC) / TREE_ASPECT, groundY - STAR_ROOM)),
    );
    const scale = treeMax / TREE_REF_HEIGHT;
    const reducedMotion = motionQuery.matches;
    const { tree: shape, growT } = growth(day, getTreeShape(day, treeMax), timeMs, reducedMotion);

    const params: SceneParams = {
      ctx,
      width,
      height,
      centerX: Math.floor(width / 2),
      groundY,
      now,
      timeMs,
      dt,
      day,
      progress: getProgress(now),
      tree: shape,
      treeMax,
      scale,
      giftScale: Math.min(scale, (width * 0.96) / (GIFT_HALF_SPAN * 2)),
      growT,
      daylight: daylightFor(now),
      reducedMotion,
      seed: SEED,
    };

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    for (const layer of layers) layer.render(params);

    const second = Math.floor(now.getTime() / 1000);
    if (second !== lastSecond) {
      lastSecond = second;
      notify();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    canvas,
    getState,
    setDaylightMode(mode) {
      daylightMode = mode;
      notify();
    },
    setSimulatedNow(date) {
      simOffset = date.getTime() - Date.now();
      notify();
    },
    triggerSanta: () => santa.trigger(),
    subscribe(cb) {
      subscribers.push(cb);
      cb(getState());
    },
  };
}
