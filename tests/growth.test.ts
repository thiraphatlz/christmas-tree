import { describe, expect, it } from 'vitest';
import {
  getTreeShape, giftCount, halfWidthAt, hasSkirt, hasStar, lightCount, ornamentCount, ribbonCount, tierCount, tinselCount,
  treeHeight,
} from '../src/core/growth';
import { TREE_HEIGHT_FRAC_FULL, TREE_HEIGHT_FRAC_START } from '../src/config';

describe('key days', () => {
  it('day 0 is a bare seed', () => {
    const s = getTreeShape(0);
    expect(treeHeight(0)).toBe(0);
    expect(s.tiers).toHaveLength(0);
    expect(s.hasStar).toBe(false);
  });
  it('day 1 starts at 25/80 of the full height and has one tier', () => {
    expect(treeHeight(1)).toBe(30);
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

describe('treeHeight with an explicit full height', () => {
  it('max 144: day 0 is 0, day 1 is 45, day 25 is 144', () => {
    expect(treeHeight(0, 144)).toBe(0);
    expect(treeHeight(1, 144)).toBe(45);
    expect(treeHeight(25, 144)).toBe(144);
  });
  for (const max of [96, 100, 144]) {
    it(`strictly increases from day 1 to 25 for max ${max}`, () => {
      for (let d = 2; d <= 25; d++) expect(treeHeight(d, max)).toBeGreaterThan(treeHeight(d - 1, max));
    });
  }
});

describe('screen sizing rule', () => {
  const H = 180;
  const max = Math.floor(H * TREE_HEIGHT_FRAC_FULL);
  it('config fractions are in range', () => {
    expect(TREE_HEIGHT_FRAC_FULL).toBeGreaterThanOrEqual(0.75);
    expect(TREE_HEIGHT_FRAC_FULL).toBeLessThanOrEqual(0.85);
    expect(TREE_HEIGHT_FRAC_START).toBeGreaterThanOrEqual(0.25);
  });
  it('day 1 is at least ~25% and day 25 is 75 to 85% of the screen', () => {
    expect(treeHeight(1, max) / H).toBeGreaterThanOrEqual(0.245);
    expect(treeHeight(25, max) / H).toBeGreaterThanOrEqual(0.75);
    expect(treeHeight(25, max) / H).toBeLessThanOrEqual(0.85);
  });
});

describe('getTreeShape with max 144', () => {
  for (let day = 1; day <= 25; day++) {
    it(`day ${day} is well formed`, () => {
      const s = getTreeShape(day, 144);
      expect(s.height).toBe(treeHeight(day, 144));
      expect(s.tiers.length).toBe(getTreeShape(day).tiers.length);
      expect(s.tiers[s.tiers.length - 1].topY).toBe(-s.height);
      s.tiers.forEach((t, i) => {
        expect(t.topY).toBeLessThan(t.bottomY);
        expect(t.bottomY).toBeLessThanOrEqual(0);
        expect(t.bottomHalf).toBeGreaterThan(0);
        expect(t.topHalf).toBeLessThanOrEqual(t.bottomHalf);
        if (i > 0) {
          const below = s.tiers[i - 1];
          expect(t.bottomY).toBeLessThan(below.bottomY);
          expect(t.topY).toBeLessThan(below.topY);
          expect(t.bottomHalf).toBeLessThanOrEqual(below.bottomHalf);
        }
      });
    });
  }
  it('baseHalfWidth grows with the day', () => {
    for (let d = 2; d <= 25; d++) {
      expect(getTreeShape(d, 144).baseHalfWidth).toBeGreaterThanOrEqual(getTreeShape(d - 1, 144).baseHalfWidth);
    }
    expect(getTreeShape(25, 144).baseHalfWidth).toBeGreaterThan(getTreeShape(1, 144).baseHalfWidth);
  });
});

describe('tinselCount and hasSkirt', () => {
  it('tinsel is 0 through day 7, 1 on day 8, 6 on day 25, never decreasing', () => {
    for (let d = 0; d <= 7; d++) expect(tinselCount(d)).toBe(0);
    expect(tinselCount(8)).toBe(1);
    expect(tinselCount(25)).toBe(6);
    for (let d = 1; d <= 25; d++) expect(tinselCount(d)).toBeGreaterThanOrEqual(tinselCount(d - 1));
  });
  it('skirt appears on day 4', () => {
    expect(hasSkirt(3)).toBe(false);
    for (let d = 4; d <= 25; d++) expect(hasSkirt(d)).toBe(true);
  });
});

describe('halfWidthAt tier row convention', () => {
  const s = getTreeShape(25, 144);
  it('is positive at bottomY - 1 of every tier', () => {
    for (const t of s.tiers) expect(halfWidthAt(s, t.bottomY - 1)).toBeGreaterThan(0);
  });
  it('is 0 at the lowest tier bottomY itself', () => {
    expect(halfWidthAt(s, s.tiers[0].bottomY)).toBe(0);
  });
});
