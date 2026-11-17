import { describe, expect, it } from 'vitest';
import { rng } from '../../../../src/core';
import { Tempo } from '../../../../src/engine/Tempo';
import { tapOracle, type TapState } from './oracle/selectionOracle';

describe('Tempo', () => {
  it('starts at 120 BPM with the downbeat at 0', () => {
    const tempo = new Tempo();
    expect([tempo.bpm, tempo.beatOrigin]).toEqual([120, 0]);
  });

  it('setBpm and setBeatOrigin store the value as given', () => {
    const tempo = new Tempo();
    tempo.setBpm(124);
    tempo.setBeatOrigin(12.5);
    expect([tempo.bpm, tempo.beatOrigin]).toEqual([124, 12.5]);
  });

  it('matches the original tap handler over 400 random tap sequences', () => {
    const random = rng(7);
    for (let run = 0; run < 400; run++) {
      const tempo = new Tempo();
      const oracle: TapState = { taps: [], bpm: 120, beatOrigin: 0 };
      let t = random() * 1e6;
      for (let i = 0; i < 12; i++) {
        // gaps from 0 (double tap at one instant) past the 2500 ms window; some fractional, as performance.now() is
        const pick = random();
        t += pick < 0.1 ? 0 : pick < 0.2 ? 2500 + random() * 500 : pick < 0.25 ? 2500 : random() * 1200;
        tempo.tap(t);
        tapOracle(oracle, t);
        expect([tempo.bpm, tempo.beatOrigin]).toEqual([oracle.bpm, oracle.beatOrigin]);
      }
    }
  });

  it('clamps the tapped tempo to 40..220 BPM and keeps it after a lone tap', () => {
    const tempo = new Tempo();
    tempo.tap(1000);
    tempo.tap(1100);
    expect(tempo.bpm).toBe(220);
    tempo.tap(3000);
    expect(tempo.bpm).toBe(60);
    tempo.tap(10000);
    expect([tempo.bpm, tempo.beatOrigin]).toEqual([60, 10]);
  });
});
