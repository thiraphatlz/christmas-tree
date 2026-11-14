// STUB: agent "effects" เขียนของจริงแทน (คง signature เดิม)
import { PALETTE } from '../palette';
import type { DaylightState } from '../types';

/** สถานะกลางวัน/กลางคืนจากชั่วโมงท้องถิ่นแบบทศนิยม (0..24) เป็น pure function */
export function getDaylight(hour: number): DaylightState {
  const night = hour < 6 || hour >= 18;
  const [skyTop, skyBottom] = night ? PALETTE.skyNight : PALETTE.skyDay;
  return { phase: night ? 'night' : 'day', darkness: night ? 1 : 0, skyTop, skyBottom };
}
