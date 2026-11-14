import { describe, expect, it } from 'vitest';
import { SANTA_FIRST_DELAY_MS, SANTA_INTERVAL_MS } from '../src/config';
import { mulberry32 } from '../src/core/rng';
import { isSantaWindow, nextSantaDelayMs } from '../src/core/santaSchedule';

const d = (m: number, day: number, h = 0, min = 0) => new Date(2026, m - 1, day, h, min);

describe('isSantaWindow', () => {
  it('matches the default Dec 24 18:00 to Dec 26 00:00 window', () => {
    expect(isSantaWindow(d(12, 24, 17, 59))).toBe(false);
    expect(isSantaWindow(d(12, 24, 18, 0))).toBe(true);
    expect(isSantaWindow(d(12, 25, 12, 0))).toBe(true);
    expect(isSantaWindow(d(12, 25, 23, 59))).toBe(true);
    expect(isSantaWindow(d(12, 26, 0, 0))).toBe(false);
  });
  it('is false outside the window', () => {
    expect(isSantaWindow(d(12, 1))).toBe(false);
    expect(isSantaWindow(d(1, 1))).toBe(false);
  });
  it('works in any year', () => {
    expect(isSantaWindow(new Date(2030, 11, 25, 1, 0))).toBe(true);
  });
  it('honours a custom window', () => {
    const w = { start: { month: 3, day: 1, hour: 8, minute: 30 }, end: { month: 3, day: 2, hour: 0, minute: 0 } };
    expect(isSantaWindow(d(3, 1, 8, 29), w)).toBe(false);
    expect(isSantaWindow(d(3, 1, 8, 30), w)).toBe(true);
    expect(isSantaWindow(d(3, 2, 0, 0), w)).toBe(false);
    expect(isSantaWindow(d(12, 25, 12, 0), w)).toBe(false);
  });
});

describe('nextSantaDelayMs', () => {
  it('config keeps the agreed ranges (30-120 s first, 5-10 min after)', () => {
    expect(SANTA_FIRST_DELAY_MS).toEqual({ min: 30_000, max: 120_000 });
    expect(SANTA_INTERVAL_MS).toEqual({ min: 300_000, max: 600_000 });
  });
  it('uses the 5 to 10 minute interval after the first appearance', () => {
    expect(nextSantaDelayMs(() => 0, false)).toBe(SANTA_INTERVAL_MS.min);
    const hi = nextSantaDelayMs(() => 0.999999, false);
    expect(hi).toBeLessThan(SANTA_INTERVAL_MS.max);
    expect(hi).toBeGreaterThan(SANTA_INTERVAL_MS.max - 1000);
  });
  it('uses the 30 to 120 second range for the first appearance', () => {
    expect(nextSantaDelayMs(() => 0, true)).toBe(SANTA_FIRST_DELAY_MS.min);
    expect(nextSantaDelayMs(() => 0.5, true)).toBe((SANTA_FIRST_DELAY_MS.min + SANTA_FIRST_DELAY_MS.max) / 2);
  });
  it('samples fall in range and vary', () => {
    for (const [first, r] of [[false, SANTA_INTERVAL_MS], [true, SANTA_FIRST_DELAY_MS]] as const) {
      const rand = mulberry32(1);
      const vals = Array.from({ length: 200 }, () => nextSantaDelayMs(rand, first));
      vals.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(r.min);
        expect(v).toBeLessThan(r.max);
      });
      expect(new Set(vals).size).toBeGreaterThan(1);
    }
  });
});
