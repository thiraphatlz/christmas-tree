import { describe, expect, it } from 'vitest';
import { DAWN_END, DAWN_START, DUSK_END, DUSK_START } from '../src/config';
import { getDaylight } from '../src/core/daylight';
import { PALETTE } from '../src/palette';

const hex = /^#[0-9a-f]{6}$/i;
const steps = (a: number, b: number, n = 40) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

describe('phase', () => {
  it('follows the configured boundaries', () => {
    expect(getDaylight(0).phase).toBe('night');
    expect(getDaylight(DAWN_START - 0.01).phase).toBe('night');
    expect(getDaylight(DUSK_END).phase).toBe('night');
    expect(getDaylight(23.5).phase).toBe('night');
    expect(getDaylight(DAWN_START).phase).toBe('dawn');
    expect(getDaylight(DAWN_END - 0.01).phase).toBe('dawn');
    expect(getDaylight(DAWN_END).phase).toBe('day');
    expect(getDaylight(12).phase).toBe('day');
    expect(getDaylight(DUSK_START - 0.01).phase).toBe('day');
    expect(getDaylight(DUSK_START).phase).toBe('dusk');
    expect(getDaylight(DUSK_END - 0.01).phase).toBe('dusk');
  });
});

describe('darkness', () => {
  it('is exactly 1 at night and 0 during the day', () => {
    for (const h of [0, 3, 23.5]) expect(getDaylight(h).darkness).toBe(1);
    expect(getDaylight(12).darkness).toBe(0);
  });
  it('hits the endpoints at dawn/dusk edges', () => {
    expect(getDaylight(DAWN_START).darkness).toBe(1);
    expect(getDaylight(DAWN_END).darkness).toBe(0);
    expect(getDaylight(DUSK_START).darkness).toBe(0);
  });
  it('never increases across dawn and never decreases across dusk', () => {
    const dawn = steps(DAWN_START, DAWN_END).map((h) => getDaylight(h).darkness);
    const dusk = steps(DUSK_START, DUSK_END).map((h) => getDaylight(h).darkness);
    for (let i = 1; i < dawn.length; i++) expect(dawn[i]).toBeLessThanOrEqual(dawn[i - 1]);
    for (let i = 1; i < dusk.length; i++) expect(dusk[i]).toBeGreaterThanOrEqual(dusk[i - 1]);
  });
  it('stays within [0, 1] for every quarter hour', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const v = getDaylight(h).darkness;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('sky colours', () => {
  it('are #rrggbb at every hour', () => {
    for (let h = 0; h < 24; h += 0.5) {
      const s = getDaylight(h);
      expect(s.skyTop).toMatch(hex);
      expect(s.skyBottom).toMatch(hex);
    }
  });
  it('match the palette at midnight and noon', () => {
    const n = getDaylight(0), d = getDaylight(12);
    expect(n.skyTop.toLowerCase()).toBe(PALETTE.skyNight[0].toLowerCase());
    expect(n.skyBottom.toLowerCase()).toBe(PALETTE.skyNight[1].toLowerCase());
    expect(d.skyTop.toLowerCase()).toBe(PALETTE.skyDay[0].toLowerCase());
    expect(d.skyBottom.toLowerCase()).toBe(PALETTE.skyDay[1].toLowerCase());
  });
});

describe('wrapping', () => {
  it('wraps hours outside [0, 24)', () => {
    expect(getDaylight(24)).toEqual(getDaylight(0));
    expect(getDaylight(-1)).toEqual(getDaylight(23));
  });
});
