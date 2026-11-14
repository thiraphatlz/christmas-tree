import { describe, expect, it, vi } from 'vitest';
import { DETAIL_LAYERS } from '../src/detail/layers';
import { createDetailLayers, DETAIL_APPEAR_MS } from '../src/scene/detail';
import type { DetailRenderer, DetailViews, SceneParams } from '../src/types';

const A = DETAIL_APPEAR_MS;
function setup() {
  const seen: DetailViews[] = [];
  const r: DetailRenderer = { render: (_p, v) => void seen.push(v) };
  const second = { n: 0, render() { this.n++; } };
  const layer = createDetailLayers([r, second]);
  const frame = (day: number, timeMs: number, reducedMotion = false) => {
    layer.render({ day, timeMs, reducedMotion } as unknown as SceneParams);
    return seen[seen.length - 1];
  };
  return { frame, seen, second };
}

describe('createDetailLayers', () => {
  it('first frame never animates, even mid-month', () => {
    const v = setup().frame(10, 1000);
    for (const s of Object.values(v)) {
      expect(s.appearT).toBeNull();
      expect(s.prevCount).toBe(s.count);
    }
  });
  it('calls every renderer once per frame with all layer ids', () => {
    const { frame, seen, second } = setup();
    frame(5, 0);
    frame(5, 16);
    expect(seen).toHaveLength(2);
    expect(second.n).toBe(2);
    for (const v of seen) expect(Object.keys(v).sort()).toEqual(DETAIL_LAYERS.map((d) => d.id).sort());
  });
  it('increase runs appearT 0..1 with prevCount before the increase', () => {
    const { frame } = setup();
    frame(4, 0);
    expect(frame(5, 1000).stalls).toMatchObject({ count: 2, prevCount: 1, appearT: 0 });
    expect(frame(5, 1000 + A / 2).stalls.appearT).toBeCloseTo(0.5);
    expect(frame(5, 1000 + A).stalls).toMatchObject({ prevCount: 2, appearT: null });
    expect(frame(5, 1000 + A + 10).stalls.appearT).toBeNull();
  });
  it('unchanged layers stay idle while another layer animates', () => {
    const { frame } = setup();
    frame(4, 0);
    expect(frame(5, 100).marketGround.appearT).toBeNull();
  });
  it('second increase mid-animation restarts from the shown count', () => {
    const { frame } = setup();
    frame(4, 0);
    frame(5, 1000);
    expect(frame(7, 1000 + A / 2).stalls).toMatchObject({ count: 3, prevCount: 2, appearT: 0 });
    expect(frame(7, 1000 + A / 2 + A / 4).stalls.appearT).toBeCloseTo(0.25);
  });
  it('a decrease cancels the animation', () => {
    const { frame } = setup();
    frame(4, 0);
    frame(5, 1000);
    expect(frame(4, 1100).stalls).toMatchObject({ count: 1, prevCount: 1, appearT: null });
    expect(frame(4, 1200).stalls.appearT).toBeNull();
  });
  it('reduced motion reports appearT null and prevCount === count', () => {
    const { frame } = setup();
    frame(4, 0, true);
    for (const s of Object.values(frame(5, 100, true))) {
      expect(s.appearT).toBeNull();
      expect(s.prevCount).toBe(s.count);
    }
  });
  it('layers added or removed between frames do not throw', async () => {
    vi.resetModules();
    const real = await import('../src/detail/layers');
    let defs = real.DETAIL_LAYERS.slice(0, 3);
    vi.doMock('../src/detail/layers', () => ({ ...real, getLayerStates: (d: number) => real.getLayerStates(d, defs) }));
    const { createDetailLayers: make } = await import('../src/scene/detail');
    const seen: DetailViews[] = [];
    const layer = make([{ render: (_p, v) => void seen.push(v) }]);
    const f = (day: number, t: number) => layer.render({ day, timeMs: t, reducedMotion: false } as unknown as SceneParams);
    f(5, 0);
    defs = real.DETAIL_LAYERS.slice(1, 6);
    f(5, 10);
    defs = real.DETAIL_LAYERS.slice(0, 2);
    f(6, 20);
    expect(Object.keys(seen[1])).toEqual(real.DETAIL_LAYERS.slice(1, 6).map((d) => d.id));
    expect(Object.keys(seen[2])).toEqual(['marketGround', 'marketLights']);
    expect(seen[1].bunting.appearT).toBeNull(); // ชั้นที่เพิ่มทีหลังไม่เล่น animation
    vi.doUnmock('../src/detail/layers');
  });
});
