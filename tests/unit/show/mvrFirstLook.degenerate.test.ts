/** The first look on rigs with missing data: no deck, no moving light, only bars, one fixture. */
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../src/domain/Fixture';
import { Rig } from '../../../src/domain/rig/Rig';
import type { StageFrame } from '../../../src/domain/stage/StageFrame';
import type { Cue } from '../../../src/engine/CueList';
import { lookGroupsOf } from '../../../src/show/mvrLook/lookGroups';
import { KEY_WHITE, paletteOf } from '../../../src/show/mvrLook/lookPalette';
import { buildMvrFirstLook } from '../../../src/show/mvrLook/mvrFirstLook';
import { AREA, concertRig, DECK, frameWith, fx, isAllFinite, NO_DECK, row, valsOf } from './lookRig';

function look(fixtures: readonly Fixture[], deck: StageFrame['deck'] = DECK): Cue {
  const cue = buildMvrFirstLook({ rig: new Rig(fixtures), frame: frameWith(deck) });
  if (cue === null) throw new Error('the rig gives no first look');
  return cue;
}

describe('the first look on a rig with missing data', () => {
  it('uses the fixture cloud and a floor at 0 when the file has no deck', () => {
    const rig = concertRig(40);
    const cue = look(rig.fixtures, NO_DECK);
    expect(isAllFinite(cue)).toBe(true);
    expect(rig.fixtures.filter((f) => (valsOf(cue, f).dim ?? 0) > 0).length).toBeGreaterThan(20);
  });

  it('glows a rig of LED bars only, in the accent colour, with no position', () => {
    const bars = row(1, 'bar', 8, [5, -3]);
    const cue = look(bars);
    for (const f of bars) expect(valsOf(cue, f)).toEqual({ dim: 12, ...paletteOf(8).accent });
  });

  it('keys the band at full with a single spot and fans a single beam', () => {
    expect(valsOf(look([fx(1, 'spot', [2, 7, 0])]), { id: 1 })).toMatchObject({ dim: 100, ...KEY_WHITE });
    expect(valsOf(look([fx(1, 'beam', [2, 7, 0])]), { id: 1 })).toMatchObject({ dim: 100, zoom: 1.5 });
    for (const one of [fx(1, 'spot', [2, 7, 0]), fx(1, 'beam', [2, 7, 0])]) expect(isAllFinite(look([one]))).toBe(true);
  });

  it('splits a rig of one spot row: the first and third unit from each end key, the units between them fan', () => {
    const spots = row(10, 'spot', 6, [9, -2]);
    const groups = lookGroupsOf(AREA, spots);
    expect([groups.key.map((f) => f.id), groups.fans.map((f) => f.id)]).toEqual([
      [10, 12, 13, 15],
      [11, 14],
    ]);
    const pair = lookGroupsOf(AREA, row(10, 'spot', 2, [9, -2]));
    expect([pair.key.length, pair.fans.length]).toEqual([2, 0]);
    expect(valsOf(look(spots), { id: 11 })).toMatchObject({ zoom: 7, ...paletteOf(6).accent });
  });

  it('tones a rig of pars only in the primary colour', () => {
    const pars = row(1, 'par', 6, [7, -2]);
    for (const f of pars) expect(valsOf(look(pars), f)).toEqual({ dim: 25, ...paletteOf(6).primary });
  });

  it('gives no cue for strobes and screens only', () => {
    const rig = new Rig([fx(1, 'strobe', [0, 8, 0]), fx(2, 'screen', [0, 4, -5])]);
    expect(buildMvrFirstLook({ rig, frame: frameWith(DECK) })).toBeNull();
  });
});
