import { describe, expect, it } from 'vitest';
import { detectBpm } from '../../../src/audio/BpmDetector';
import { clickTrack } from './clickTrack';
import { detectBpm as legacyDetectBpm } from './oracle/legacyDetectBpm';

// 70 s tracks start the window at 10 s (len - 60 s); 90 s tracks at 20 s; 12 s tracks analyse all of it
const TRACKS = [
  { bpm: 120, seconds: 70, firstBeat: 0.1 },
  { bpm: 128, seconds: 90, firstBeat: 0.37 },
  { bpm: 93, seconds: 70, firstBeat: 0.05 },
  { bpm: 97.5, seconds: 70, firstBeat: 0.2 },
  { bpm: 140, seconds: 12, firstBeat: 0 },
];

describe('detectBpm', () => {
  it.each(TRACKS)('matches the original bit for bit on a $bpm BPM click track ($seconds s)', (t) => {
    const track = clickTrack(t.bpm, t.seconds, t.firstBeat);
    const result = detectBpm(track),
      expected = legacyDetectBpm(track);
    expect(Object.is(result.bpm, expected.bpm)).toBe(true);
    expect(Object.is(result.off, expected.off)).toBe(true);
  });

  it('finds 120 BPM on a 120 BPM click track', () => {
    expect(detectBpm(clickTrack(120, 70)).bpm).toBe(120);
  });

  it('rounds the BPM but keeps the offset on the unrounded tempo (quirk E1)', () => {
    // a 97.5 BPM track is found on the 97.5 step, reported as 98, with the offset on the 97.5 grid
    const result = detectBpm(clickTrack(97.5, 70, 0.2));
    expect(result).toEqual({ bpm: 98, off: 0.20028606314320463 });
    const fps = 44100 / 512,
      start = 10;
    const offsetOnGrid = (bpm: number) =>
      Array.from({ length: Math.ceil((fps * 60) / bpm) }, (_, bo) => (start + bo / fps) % (60 / bpm));
    expect(offsetOnGrid(97.5)).toContain(result.off);
    expect(offsetOnGrid(98)).not.toContain(result.off);
  });
});
