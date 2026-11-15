import { describe, expect, it } from 'vitest';
import { DETAIL_LAYERS, getLayerStates, summarizeLayers, validateLayerDefs } from '../src/detail/layers';
import type { DetailLayerDef } from '../src/types';

const by = (day: number) => Object.fromEntries(getLayerStates(day).map((s) => [s.id, s]));
const activeCounts = (day: number) =>
  Object.fromEntries(getLayerStates(day).filter((s) => s.active).map((s) => [s.id, s.count]));
const mk = (o: Partial<DetailLayerDef> = {}): DetailLayerDef => ({ id: 'x', label: 'x', steps: [3, 5], fullDay: 10, ...o });

describe('validateLayerDefs', () => {
  it('shipped table is valid with unique ids', () => {
    expect(validateLayerDefs(DETAIL_LAYERS)).toEqual([]);
    expect(new Set(DETAIL_LAYERS.map((d) => d.id)).size).toBe(DETAIL_LAYERS.length);
  });
  it('detects each kind of problem', () => {
    expect(validateLayerDefs([mk(), mk()]).join()).toMatch(/duplicate id/);
    expect(validateLayerDefs([mk({ steps: [] })]).join()).toMatch(/empty steps/);
    expect(validateLayerDefs([mk({ steps: [5, 3] })]).join()).toMatch(/not sorted/);
    expect(validateLayerDefs([mk({ steps: [0, 3] })]).join()).toMatch(/outside/);
    expect(validateLayerDefs([mk({ steps: [3, 26], fullDay: 25 })]).join()).toMatch(/outside/);
    expect(validateLayerDefs([mk({ fullDay: 2 })]).join()).toMatch(/before first step/);
    expect(validateLayerDefs([mk({ fullDay: 26 })]).join()).toMatch(/after day/);
  });
});

describe('getLayerStates schedule', () => {
  it.each([0, 1, 2])('day %i has nothing active', (d) => {
    for (const s of getLayerStates(d)) {
      expect(s.active).toBe(false);
      expect(s.count).toBe(0);
      expect(s.intensity).toBe(0);
    }
  });
  it('day 3 activates only marketGround and marketLights', () => {
    expect(getLayerStates(3).filter((s) => s.active).map((s) => s.id).sort()).toEqual(['marketGround', 'marketLights']);
  });
  it('stall count follows the schedule and stays 6', () => {
    expect([3, 4, 5, 7, 9, 11, 14].map((d) => by(d).stalls.count)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const d of [15, 20, 25, 31]) expect(by(d).stalls.count).toBe(6);
  });
  it('people count is 2 on day 8 and 12 on day 24', () => {
    expect(by(8).people.count).toBe(2);
    expect(by(24).people.count).toBe(12);
  });
  it('Ferris wheel unlocks on day 13', () => {
    expect(by(12).ferris.active).toBe(false);
    expect(by(13).ferris.active).toBe(true);
  });
  it('day 10 snapshot', () => {
    expect(activeCounts(10)).toEqual({ marketGround: 1, marketLights: 3, stalls: 4, bunting: 2, people: 3, props: 1, steam: 1 });
  });
  it('day 18 snapshot', () => {
    expect(activeCounts(18)).toEqual({
      marketGround: 1, marketLights: 4, stalls: 6, bunting: 3, people: 7, props: 4, ferris: 1, litPines: 3, carolers: 1, steam: 1,
    });
  });
  it('day 24 has everything but fireworks', () => {
    const s = by(24);
    for (const d of DETAIL_LAYERS) expect(s[d.id].active).toBe(d.id !== 'marketFireworks');
    expect(s.sparkles.count).toBe(8);
  });
  it('day 25 is full and later days equal day 25', () => {
    for (const s of getLayerStates(25)) {
      expect(s.active).toBe(true);
      expect(s.count).toBe(s.maxCount);
      expect(s.intensity).toBe(1);
    }
    for (const d of [26, 31, 40]) expect(getLayerStates(d)).toEqual(getLayerStates(25));
  });
  it('is monotonic and consistent for every layer, days 1..25', () => {
    for (const def of DETAIL_LAYERS) {
      let pc = 0, pi = 0;
      for (let d = 1; d <= 25; d++) {
        const s = getLayerStates(d).find((x) => x.id === def.id)!;
        expect(s.count).toBeGreaterThanOrEqual(pc);
        expect(s.intensity).toBeGreaterThanOrEqual(pi);
        expect(s.intensity).toBeLessThanOrEqual(1);
        expect(s.count).toBeLessThanOrEqual(s.maxCount);
        expect(s.intensity > 0).toBe(s.active);
        pc = s.count;
        pi = s.intensity;
      }
    }
  });
  it('honours a custom table', () => {
    const r = getLayerStates(5, [mk()]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'x', active: true, count: 2, maxCount: 2 });
  });
  it('treats NaN day as day 0', () => {
    expect(getLayerStates(NaN).every((s) => !s.active)).toBe(true);
  });
});

describe('summarizeLayers', () => {
  it.each([1, 10, 25])('matches manual sums on day %i', (d) => {
    const st = getLayerStates(d);
    expect(summarizeLayers(d)).toEqual({
      active: st.filter((s) => s.active).length,
      total: DETAIL_LAYERS.length,
      items: st.reduce((a, s) => a + s.count, 0),
    });
  });
  it('day 1 is empty and day 25 is full', () => {
    expect(summarizeLayers(1)).toMatchObject({ active: 0, items: 0 });
    expect(summarizeLayers(25).active).toBe(DETAIL_LAYERS.length);
  });
});
