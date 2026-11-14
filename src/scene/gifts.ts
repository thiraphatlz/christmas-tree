// STUB: agent "gifts" เขียนของจริงแทน (คง signature เดิม)
import type { Gift, GiftLayers } from '../types';

/**
 * กล่องของขวัญทั้งหมดของวันนั้น เป็น pure function
 * ความยาว = giftCount(day) และกล่อง index เดิมต้องได้ค่าเดิมทุก field ไม่ว่า day จะเป็นเท่าไร
 */
export function layoutGifts(_day: number, _seed: number): Gift[] {
  return [];
}

export function createGifts(): GiftLayers {
  return { behind: { render() {} }, front: { render() {} } };
}
