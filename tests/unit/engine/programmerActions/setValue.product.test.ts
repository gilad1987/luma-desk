/**
 * Owns the engine side of a product's optics: an Esprite's zoom is clamped to its own 5.5-50 range, not the FORTE's
 * 7-42, its resting zoom is the spot's 16, the zoom presets read its range, and it pans as a mover. The merged record
 * is owned by fixtureTypeOf.test.ts; the clamp of a native type by the programmer parity suite.
 */
import { describe, expect, it } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import type { FixtureValues } from '../../../../src/engine/CueList.ts';
import { resetOutput } from '../../../../src/engine/output/resetOutput.ts';
import { PRESET_FNS } from '../../../../src/engine/presetFunctions.ts';
import { setValue } from '../../../../src/engine/programmerActions/setValue.ts';
import { PIPE, sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';

/** The rig of the sample design plus one Esprite, id 501. */
function espriteRig() {
  const base = sampleDesign();
  const esprite = {
    id: 501,
    type: 'spot',
    role: 'mid',
    trussId: PIPE.id,
    position: [0, 7, 0],
    mount: 'hang',
    product: 'robe-esprite',
  } as const;
  const design: StageDesign = { ...base, fixtures: [...base.fixtures, esprite] };
  return rigFromDesign(design);
}

describe('engine values of an Esprite', () => {
  it('clamps a programmer zoom to the Esprite range, not the FORTE range', () => {
    const rig = espriteRig();
    const zooms = [100, 6, 1, 45].map((value) => {
      const vals: FixtureValues = {};
      setValue(vals, rig, { id: 501, attr: 'zoom', value });
      return vals[501]?.zoom;
    });
    expect(zooms).toStrictEqual([50, 6, 5.5, 45]);
  });

  it('rests at zoom 16, reads its range in the zoom presets and pans as a mover', () => {
    const f = espriteRig().get(501);
    if (f === undefined) throw new Error('the rig has the Esprite');
    expect([
      resetOutput(f).zoom,
      PRESET_FNS.zMin(f, 0, 1),
      PRESET_FNS.zMax(f, 0, 1),
      f.has('pan'),
      f.has('tilt'),
    ]).toStrictEqual([16, { zoom: 5.5 }, { zoom: 50 }, true, true]);
  });
});
