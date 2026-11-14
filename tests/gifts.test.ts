import { describe, expect, it } from 'vitest';
import { GIFT_START_DAY, SEED } from '../src/config';
import { giftCount } from '../src/core/growth';
import { layoutGifts } from '../src/scene/gifts';

const hex = /^#[0-9a-f]{6}$/i;

describe('layoutGifts', () => {
  it('length equals giftCount for days 0 to 25', () => {
    for (let day = 0; day <= 25; day++) expect(layoutGifts(day, SEED)).toHaveLength(giftCount(day));
    expect(layoutGifts(GIFT_START_DAY - 1, SEED)).toEqual([]);
  });

  it('existing boxes never move or change when the day increases', () => {
    for (let day = GIFT_START_DAY; day < 25; day++) {
      const cur = layoutGifts(day, SEED);
      expect(layoutGifts(day + 1, SEED).slice(0, cur.length)).toEqual(cur);
    }
  });

  it('is deterministic and seed-dependent', () => {
    expect(layoutGifts(25, SEED)).toEqual(layoutGifts(25, SEED));
    expect(layoutGifts(25, SEED)).not.toEqual(layoutGifts(25, SEED + 1));
  });

  it('every gift is well formed', () => {
    layoutGifts(25, SEED).forEach((g, i) => {
      expect(g.index).toBe(i);
      expect(g.appearDay).toBe(GIFT_START_DAY + i);
      expect(Number.isInteger(g.w) && g.w > 0).toBe(true);
      expect(Number.isInteger(g.h) && g.h > 0).toBe(true);
      expect(Number.isInteger(g.x)).toBe(true);
      expect(g.x).toBeGreaterThanOrEqual(-58);
      expect(g.x + g.w).toBeLessThanOrEqual(58);
      expect(g.color).toMatch(hex);
      expect(g.ribbonColor).toMatch(hex);
      expect(g.ribbonColor.toLowerCase()).not.toBe(g.color.toLowerCase());
      expect(['cross', 'vertical', 'bow']).toContain(g.ribbonStyle);
      expect(typeof g.behindTree).toBe('boolean');
    });
  });

  it('has variety and later gifts are not smaller on average', () => {
    const gs = layoutGifts(25, SEED);
    expect(new Set(gs.map((g) => g.color)).size).toBeGreaterThan(1);
    expect(new Set(gs.map((g) => `${g.w}x${g.h}`)).size).toBeGreaterThan(1);
    const mean = (a: typeof gs) => a.reduce((s, g) => s + g.w * g.h, 0) / a.length;
    expect(mean(gs.slice(-5))).toBeGreaterThanOrEqual(mean(gs.slice(0, 5)));
  });
});
