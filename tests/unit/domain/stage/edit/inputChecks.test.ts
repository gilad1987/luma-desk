/**
 * Owns the input checks of the edit ops (rule P7): a size that is not a finite number > 0, or a point or delta with a
 * NaN or infinite part, throws a RangeError that names the value. Valid edits are owned by each op's test file.
 */
import { describe, expect, it } from 'vitest';
import { addRiser, setDeckSize } from '../../../../../src/domain/stage/edit/deckOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { addPresetTruss, moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { sampleDesign } from './sampleDesign.ts';

const BAD_SIZES = [0, -4, Number.NaN, Number.POSITIVE_INFINITY];
const BAD_PARTS = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

describe('edit ops refuse bad sizes', () => {
  it.each(BAD_SIZES)('refuses an LED wall width or height of %s, naming it', (v) => {
    expect(() => setLedWall(sampleDesign(), { width: v, height: 8 })).toThrow(
      new RangeError(`setLedWall: sizes must be finite and > 0, got ${v} x 8`),
    );
    expect(() => setLedWall(sampleDesign(), { width: 8, height: v })).toThrow(RangeError);
  });

  it.each(BAD_SIZES)('refuses a deck width of %s, naming it', (v) => {
    expect(() => setDeckSize(sampleDesign(), { width: v, depth: 8, height: 1 })).toThrow(`got ${v} x 8 x 1`);
  });

  it.each(BAD_SIZES)('refuses a riser size of %s, naming it', (v) => {
    expect(() => addRiser(sampleDesign(), [0, 1, 0], [2, v, 2])).toThrow(
      `addRiser: sizes must be finite and > 0, got 2 x ${v} x 2`,
    );
  });
});

describe('edit ops refuse points that are not finite', () => {
  it.each(BAD_PARTS)('refuses a riser spot, a truss move and a preset spot with %s', (v) => {
    expect(() => addRiser(sampleDesign(), [v, 1, 0], [2, 1, 2])).toThrow(
      `addRiser: at must be finite, got [${v}, 1, 0]`,
    );
    expect(() => moveTruss(sampleDesign(), 'pipe-1', [0, v, 0])).toThrow(
      `moveTruss: delta must be finite, got [0, ${v}, 0]`,
    );
    expect(() => addPresetTruss(sampleDesign(), 'tower', [0, 0, v])).toThrow(
      `position must be finite, got [0, 0, ${v}]`,
    );
  });
});
