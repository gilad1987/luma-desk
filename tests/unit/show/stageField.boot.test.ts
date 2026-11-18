/** Owns the boot read of the stored stage: a valid `stage` key becomes the design, anything else `undefined`. */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates';
import { savedStageOf } from '../../../src/show/stageField';
import { readSavedShow } from '../../shared';

describe('savedStageOf', () => {
  it('returns the parsed design of a stored show with a valid stage', () => {
    const theatre = createTemplate('theatre');
    expect(savedStageOf(JSON.stringify({ v: 1, bpm: 120, stage: theatre }))).toEqual(theatre);
  });

  it.each([
    ['no stored show', null],
    ['bad JSON', '{"v":1,'],
    ['JSON null', 'null'],
    ['an old show without stage', readSavedShow('old-show-v1.json')],
    ['an invalid stage', JSON.stringify({ v: 1, stage: { v: 2 } })],
    ['a stage that is not an object', JSON.stringify({ v: 1, stage: 'theatre' })],
  ])('returns undefined for %s', (_name, text) => {
    expect(savedStageOf(text)).toBeUndefined();
  });
});
