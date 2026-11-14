import { describe, expect, it } from 'vitest';
import { hashRand, mulberry32, randInt } from '../src/core/rng';

describe('mulberry32', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });
  it('differs between seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it('stays within [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashRand', () => {
  it('is deterministic and stateless', () => {
    expect(hashRand(5, 3, 1)).toBe(hashRand(5, 3, 1));
  });
  it('stays within [0, 1)', () => {
    for (let i = 0; i < 500; i++) {
      const v = hashRand(123, i, i % 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('differs across index, channel and seed', () => {
    expect(hashRand(5, 0)).not.toBe(hashRand(5, 1));
    expect(hashRand(5, 0, 0)).not.toBe(hashRand(5, 0, 1));
    expect(hashRand(5, 0)).not.toBe(hashRand(6, 0));
  });
});

describe('randInt', () => {
  it('respects inclusive bounds', () => {
    expect(randInt(0, 3, 7)).toBe(3);
    expect(randInt(0.999999, 3, 7)).toBe(7);
    const r = mulberry32(9);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(r(), 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect(seen.size).toBe(5);
  });
  it('returns min when min equals max', () => {
    expect(randInt(0.5, 4, 4)).toBe(4);
  });
});
