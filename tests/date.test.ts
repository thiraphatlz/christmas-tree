import { describe, expect, it } from 'vitest';
import {
  fractionalHour, getDay, getProgress, msUntilChristmas, msUntilDec1, parseSimulatedNow, splitDuration,
} from '../src/core/date';

const d = (m: number, day: number, h = 0, min = 0, s = 0) => new Date(2026, m - 1, day, h, min, s);

describe('getDay / getProgress', () => {
  it('is 0 before Dec 1', () => {
    expect(getDay(d(11, 30, 23, 59))).toBe(0);
    expect(getProgress(d(11, 30, 23, 59))).toBe(0);
  });
  it('Dec 1 00:00 is day 1 with progress 1/25', () => {
    expect(getDay(d(12, 1))).toBe(1);
    expect(getProgress(d(12, 1))).toBeCloseTo(1 / 25, 10);
  });
  it('Dec 24 is 24, Dec 25 is 25 with progress exactly 1', () => {
    expect(getDay(d(12, 24))).toBe(24);
    expect(getDay(d(12, 25))).toBe(25);
    expect(getProgress(d(12, 25))).toBe(1);
  });
  it('stays at 25 on Dec 26 and Dec 31', () => {
    expect(getDay(d(12, 26))).toBe(25);
    expect(getDay(d(12, 31, 23, 59))).toBe(25);
  });
  it('is 0 on Jan 1', () => {
    expect(getDay(d(1, 1))).toBe(0);
  });
  it('changes exactly at local midnight', () => {
    expect(getDay(d(12, 9, 23, 59, 59))).toBe(9);
    expect(getDay(d(12, 10, 0, 0, 0))).toBe(10);
  });
  it('progress never decreases across December', () => {
    let prev = -1;
    for (let day = 1; day <= 31; day++) {
      const p = getProgress(d(12, day));
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe('countdowns', () => {
  it('msUntilDec1 is positive before and 0 on/after', () => {
    expect(msUntilDec1(d(11, 30, 23, 0))).toBe(3600_000);
    expect(msUntilDec1(d(12, 1))).toBe(0);
    expect(msUntilDec1(d(12, 15))).toBe(0);
  });
  it('msUntilChristmas is positive before and 0 on/after', () => {
    expect(msUntilChristmas(d(12, 24, 23, 0))).toBe(3600_000);
    expect(msUntilChristmas(d(12, 25))).toBe(0);
    expect(msUntilChristmas(d(12, 26))).toBe(0);
  });
});

describe('splitDuration', () => {
  it('splits into d/h/m/s', () => {
    expect(splitDuration(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });
  it('handles zero and negative', () => {
    expect(splitDuration(0)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('fractionalHour', () => {
  it('returns hours with fractions', () => {
    expect(fractionalHour(d(12, 24, 17, 30))).toBe(17.5);
    expect(fractionalHour(d(12, 24, 0, 0))).toBe(0);
    expect(fractionalHour(d(12, 24, 6, 0, 36))).toBeCloseTo(6.01, 10);
  });
});

describe('parseSimulatedNow', () => {
  const real = d(3, 5, 9, 15, 30);
  const parts = (r: Date) => [r.getFullYear(), r.getMonth(), r.getDate(), r.getHours(), r.getMinutes()];
  it('applies date and time', () => {
    const r = parseSimulatedNow('?date=2026-12-24&time=20:00', real);
    expect(r.getTime()).toBe(d(12, 24, 20, 0).getTime());
  });
  it('date only keeps the real time of day', () => {
    expect(parts(parseSimulatedNow('?date=2026-12-24', real))).toEqual([2026, 11, 24, 9, 15]);
  });
  it('time only keeps the real date', () => {
    expect(parts(parseSimulatedNow('?time=20:00', real))).toEqual([2026, 2, 5, 20, 0]);
  });
  it('ignores malformed values', () => {
    for (const q of ['?date=abc&time=xx', '?date=2026-1-2', '?time=25:00', '?time=10:99', '']) {
      expect(parseSimulatedNow(q, real).getTime()).toBe(real.getTime());
    }
  });
  it('does not mutate the real date', () => {
    const before = real.getTime();
    parseSimulatedNow('?date=2026-12-24', real);
    expect(real.getTime()).toBe(before);
  });
});
