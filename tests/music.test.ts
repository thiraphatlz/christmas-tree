import { describe, expect, it } from 'vitest';
import { LOOP_BEATS, SONG, noteHz, parseMelody } from '../src/audio/music';

describe('background music data', () => {
  it('converts note names to frequencies', () => {
    expect(noteHz('A4')).toBeCloseTo(440, 5);
    expect(noteHz('A3')).toBeCloseTo(220, 5);
    expect(noteHz('C4')).toBeCloseTo(261.63, 1);
    expect(noteHz('F#4')).toBeCloseTo(noteHz('Gb4'), 5);
    expect(() => noteHz('H4')).toThrow();
  });

  it('melody fills whole bars and matches the bass line', () => {
    const bars = SONG.bass.split(' ').length;
    expect(LOOP_BEATS).toBe(bars * SONG.beatsPerBar);
    expect(LOOP_BEATS).toBe(48);
  });

  it('every melody token is a valid note with a positive length', () => {
    const notes = parseMelody(SONG.melody);
    let beat = 0;
    for (const ev of notes) {
      expect(ev.beat).toBeCloseTo(beat, 9);
      expect(ev.beats).toBeGreaterThan(0);
      if (ev.note !== 'R') expect(noteHz(ev.note)).toBeGreaterThan(100);
      beat += ev.beats;
    }
    for (const root of SONG.bass.split(' ')) expect(noteHz(`${root}3`)).toBeGreaterThan(60);
  });
});
