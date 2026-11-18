import { describe, expect, it } from 'vitest';
import { RestTracker } from '../../../../src/render/shadow/restTracker';
import { hashKey, rowWords } from '../../../../src/render/shadow/tileKey';
import { beamRows, setRow } from './shadowRows';

describe('RestTracker', () => {
  it('calls a row at rest once it is old enough, and a row that changes never', () => {
    const rows = beamRows(3);
    const words = rowWords(rows);
    const rest = new RestTracker(8, 2);
    const seen: number[][] = [];
    for (let frame = 0; frame < 5; frame++) {
      setRow(rows, 1, { origin: [1, 8, frame] });
      rest.observe(words, 3);
      seen.push([...rest.atRest.subarray(0, 3)]);
    }
    expect(seen).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
    ]);
  });

  it('starts again for a light that stops, and keeps a row that was dark for some frames', () => {
    const rows = beamRows(2);
    const words = rowWords(rows);
    const rest = new RestTracker(8, 2);
    for (let frame = 0; frame < 3; frame++) rest.observe(words, 2);
    setRow(rows, 0, { origin: [0, 8, 5] });
    rest.observe(words, 2);
    expect([...rest.atRest.subarray(0, 2)]).toEqual([0, 1]);
    // light 1 is dark for two frames: only light 0 is in the rows
    rest.observe(words, 1);
    rest.observe(words, 1);
    expect(rest.atRest[0]).toBe(1);
    rest.observe(words, 2);
    expect([...rest.atRest.subarray(0, 2)]).toEqual([1, 1]);
  });

  it('with no rest frames calls every row at rest at once, also when thousands of rows pass', () => {
    const rows = beamRows(1);
    const words = rowWords(rows);
    const now = new RestTracker(8, 0);
    const later = new RestTracker(8, 2);
    for (let frame = 0; frame < 6000; frame++) {
      setRow(rows, 0, { origin: [0, 8, frame] });
      now.observe(words, 1);
      later.observe(words, 1);
      expect([now.atRest[0], later.atRest[0]]).toEqual([1, 0]);
    }
  });
});

describe('hashKey', () => {
  it('spreads lights one metre apart over a small table: round coordinates differ only in high float bits', () => {
    const rows = beamRows(248);
    const words = rowWords(rows);
    const slots = new Set(Array.from({ length: 248 }, (_, light) => hashKey(words, light * 16) % 512));
    expect(slots.size).toBeGreaterThan(180);
  });
});
