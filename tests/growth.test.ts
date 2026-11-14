import { describe, expect, it } from 'vitest';
import {
  getTreeShape, giftCount, halfWidthAt, hasStar, lightCount, ornamentCount, ribbonCount, tierCount, treeHeight,
} from '../src/core/growth';

describe('key days', () => {
  it('day 0 is a bare seed', () => {
    const s = getTreeShape(0);
    expect(treeHeight(0)).toBe(0);
    expect(s.tiers).toHaveLength(0);
    expect(s.hasStar).toBe(false);
  });
  it('day 1 has height 6 and one tier', () => {
    expect(treeHeight(1)).toBe(6);
    expect(tierCount(1)).toBe(1);
  });
  it('day 25 has height 96, 6 tiers and a star; day 24 has no star', () => {
    expect(treeHeight(25)).toBe(96);
    expect(tierCount(25)).toBe(6);
    expect(hasStar(25)).toBe(true);
    expect(getTreeShape(25).hasStar).toBe(true);
    expect(hasStar(24)).toBe(false);
  });
});

describe('monotonic growth', () => {
  const fns = { treeHeight, tierCount, lightCount, ornamentCount, ribbonCount, giftCount };
  for (const [name, fn] of Object.entries(fns)) {
    it(`${name} never decreases`, () => {
      for (let day = 1; day <= 25; day++) expect(fn(day)).toBeGreaterThanOrEqual(fn(day - 1));
    });
  }
  it('every day adds something new', () => {
    const total = (day: number) =>
      treeHeight(day) + tierCount(day) + lightCount(day) + ornamentCount(day) + ribbonCount(day) + giftCount(day);
    for (let day = 1; day <= 25; day++) expect(total(day)).toBeGreaterThan(total(day - 1));
  });
});

describe('giftCount', () => {
  it('starts on day 10 and reaches 16 on day 25', () => {
    expect(giftCount(9)).toBe(0);
    expect(giftCount(10)).toBe(1);
    expect(giftCount(25)).toBe(16);
  });
});

describe('getTreeShape', () => {
  for (let day = 1; day <= 25; day++) {
    it(`day ${day} is well formed`, () => {
      const s = getTreeShape(day);
      expect(s.day).toBe(day);
      expect(s.tiers.length).toBe(tierCount(day));
      expect(s.tiers[s.tiers.length - 1].topY).toBe(-s.height);
      expect(s.baseHalfWidth).toBe(s.tiers[0].bottomHalf);
      s.tiers.forEach((t, i) => {
        expect(t.topY).toBeLessThan(t.bottomY);
        expect(t.bottomY).toBeLessThanOrEqual(0);
        expect(t.bottomHalf).toBeGreaterThan(0);
        if (i > 0) {
          const below = s.tiers[i - 1];
          expect(t.bottomY).toBeLessThan(below.bottomY);
          expect(t.topY).toBeLessThan(below.topY);
          expect(t.bottomHalf).toBeLessThanOrEqual(below.bottomHalf);
        }
      });
    });
  }
  it('clamps out-of-range days', () => {
    expect(getTreeShape(-3)).toEqual(getTreeShape(0));
    expect(getTreeShape(40)).toEqual(getTreeShape(25));
  });
});

describe('halfWidthAt', () => {
  const s = getTreeShape(25);
  it('is 0 above the top and below the foliage', () => {
    expect(halfWidthAt(s, -s.height - 5)).toBe(0);
    expect(halfWidthAt(s, 5)).toBe(0);
    expect(halfWidthAt(s, -(s.trunkHeight - 1))).toBe(0);
  });
  it('is positive inside the foliage', () => {
    for (const t of s.tiers) expect(halfWidthAt(s, t.bottomY - 1)).toBeGreaterThan(0);
    expect(halfWidthAt(s, -s.trunkHeight - 2)).toBeGreaterThan(0);
  });
  it('is 0 for a bare seed', () => {
    expect(halfWidthAt(getTreeShape(0), -1)).toBe(0);
  });
});
