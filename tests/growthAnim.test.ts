import { describe, expect, it } from 'vitest';
import { createGrowthAnim, GROW_POP_MS, scaleShape } from '../src/core/growthAnim';
import { getTreeShape } from '../src/core/growth';

describe('scaleShape', () => {
  const s = getTreeShape(25, 144);
  it('scale 1 keeps height and tier rows', () => {
    const r = scaleShape(s, 1, 1);
    expect(r.height).toBe(s.height);
    expect(r.tiers.map((t) => [t.topY, t.bottomY])).toEqual(s.tiers.map((t) => [t.topY, t.bottomY]));
  });
  it('scale 0.5 halves height and widths, keeps top and bottom anchors', () => {
    const r = scaleShape(s, 0.5, 0.5);
    expect(r.height).toBe(Math.round(s.height / 2));
    expect(r.baseHalfWidth).toBeCloseTo(s.baseHalfWidth / 2);
    expect(r.tiers[0].bottomHalf).toBeCloseTo(s.tiers[0].bottomHalf / 2);
    expect(r.tiers[r.tiers.length - 1].topY).toBe(-r.height);
    expect(r.tiers[0].bottomY).toBe(-r.trunkHeight);
  });
});

describe('createGrowthAnim', () => {
  const T = 5000;
  it('first call never animates', () => {
    const s = getTreeShape(5, 144);
    const r = createGrowthAnim()(5, s, T, false);
    expect(r.growT).toBeNull();
    expect(r.tree).toEqual(s);
  });
  it('same day stays idle', () => {
    const a = createGrowthAnim();
    const s = getTreeShape(5, 144);
    a(5, s, T, false);
    expect(a(5, s, T + 100, false).growT).toBeNull();
  });
  it('day increase plays for GROW_POP_MS then ends', () => {
    const a = createGrowthAnim();
    a(5, getTreeShape(5, 144), T, false);
    const s = getTreeShape(6, 144);
    expect(a(6, s, T + 1000, false).growT).toBe(0);
    const mid = a(6, s, T + 1000 + GROW_POP_MS / 2, false).growT!;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    const end = a(6, s, T + 1000 + GROW_POP_MS, false);
    expect(end.growT).toBeNull();
    expect(end.tree).toBe(s);
  });
  it('tree starts below target and reaches it by the end', () => {
    const a = createGrowthAnim();
    a(1, getTreeShape(1, 144), T, false);
    const s = getTreeShape(25, 144);
    expect(a(25, s, T + 10, false).tree.height).toBeLessThan(s.height);
    expect(a(25, s, T + 10 + GROW_POP_MS - 1, false).tree.height).toBe(s.height);
  });
  it('reducedMotion keeps the shape but reports growT', () => {
    const a = createGrowthAnim();
    a(1, getTreeShape(1, 144), T, true);
    const s = getTreeShape(25, 144);
    for (const dt of [10, 300, 1000]) {
      const r = a(25, s, T + dt, true);
      expect(r.tree).toBe(s);
      expect(r.growT).not.toBeNull();
    }
  });
  it('day decrease cancels the animation', () => {
    const a = createGrowthAnim();
    a(5, getTreeShape(5, 144), T, false);
    a(6, getTreeShape(6, 144), T + 10, false);
    expect(a(5, getTreeShape(5, 144), T + 20, false).growT).toBeNull();
  });
  it('a zero-height shape never reports growT', () => {
    const a = createGrowthAnim();
    expect(a(0, getTreeShape(0, 144), T, false).growT).toBeNull();
    expect(a(0, getTreeShape(0, 144), T + 10, false).growT).toBeNull();
  });
});
