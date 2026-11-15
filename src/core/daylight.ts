import { DAWN_END, DAWN_START, DUSK_END, DUSK_START } from '../config';
import { PALETTE } from '../palette';
import type { DaylightState, DayPhase } from '../types';
import { mixColor } from './draw';

// ไล่สี a -> mid -> b ตาม t (0..1) โดย mid อยู่กึ่งกลางช่วง
const through = (a: string, mid: string, b: string, t: number) =>
  t < 0.5 ? mixColor(a, mid, t * 2) : mixColor(mid, b, (t - 0.5) * 2);

/** สถานะกลางวัน/กลางคืนจากชั่วโมงท้องถิ่นแบบทศนิยม (0..24) เป็น pure function */
export function getDaylight(hour: number): DaylightState {
  const h = ((hour % 24) + 24) % 24;
  const { skyNight, skyDawn, skyDay, skyDusk } = PALETTE;

  let phase: DayPhase = 'night';
  let darkness = 1;
  let from: readonly string[] = skyNight;
  let mid: readonly string[] = skyNight;
  let to: readonly string[] = skyNight;
  let t = 0;

  if (h >= DAWN_START && h < DAWN_END) {
    phase = 'dawn';
    t = (h - DAWN_START) / (DAWN_END - DAWN_START);
    darkness = 1 - t;
    mid = skyDawn;
    to = skyDay;
  } else if (h >= DAWN_END && h < DUSK_START) {
    phase = 'day';
    darkness = 0;
    from = mid = to = skyDay;
  } else if (h >= DUSK_START && h < DUSK_END) {
    phase = 'dusk';
    t = (h - DUSK_START) / (DUSK_END - DUSK_START);
    darkness = t;
    from = skyDay;
    mid = skyDusk;
  }

  return {
    phase,
    darkness,
    skyTop: through(from[0], mid[0], to[0], t),
    skyBottom: through(from[1], mid[1], to[1], t),
  };
}
