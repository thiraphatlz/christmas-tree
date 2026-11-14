import { describe, expect, it } from 'vitest';
import { getMarketLayout } from '../src/scene/market';

describe('getMarketLayout', () => {
  const wide = () => getMarketLayout(320, 160, 166, 144, 1.5);

  it('is pure and has no day input', () => {
    expect(wide()).toEqual(wide());
    expect(getMarketLayout.length).toBe(5);
  });
  it('wide scene: 6 slots inside canvas, alternating, no overlaps, Ferris wheel', () => {
    const L = wide()!;
    expect(L).not.toBeNull();
    expect(L.slots).toHaveLength(6);
    expect(L.ferris).not.toBeNull();
    expect(L.terrace).toBeGreaterThanOrEqual(12);
    expect(L.terrace).toBeLessThanOrEqual(24);
    L.slots.forEach((x, i) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + L.stallW).toBeLessThanOrEqual(320);
      if (i % 2 === 0) expect(x + L.stallW).toBeLessThanOrEqual(160);
      else expect(x).toBeGreaterThanOrEqual(160);
    });
    for (const side of [0, 1]) {
      const xs = L.slots.filter((_, i) => i % 2 === side).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1] + L.stallW);
    }
  });
  it('narrow scene: null or at most 3 slots, no Ferris wheel, inside canvas', () => {
    const L = getMarketLayout(130, 65, 260, 154, 1.6);
    if (!L) return;
    expect(L.slots.length).toBeLessThanOrEqual(3);
    expect(L.ferris).toBeNull();
    for (const x of L.slots) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + L.stallW).toBeLessThanOrEqual(130);
    }
  });
});
