/**
 * Owns the body orientation of an imported fixture: it is the orientation of the MVR matrix for every pose (hanging,
 * standing, side-mounted, any angle). Only a fixture the desk itself exported without a rotation gets its rest pose
 * back, per fixture, by the `ownRotation` flag of its luma link; an export older than the flag reads as before.
 */
import { Matrix4, Quaternion } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import type { ResolvedFixture } from '../../../src/mvr/design/DesignInput.ts';
import { toStageDesign } from '../../../src/mvr/design/toStageDesign.ts';
import { applyLumaData } from '../../../src/mvr/import/applyLumaData.ts';
import type { FixtureLink, LumaStageData } from '../../../src/mvr/luma/lumaData.ts';
import { toThree } from '../../../src/mvr/math/axes.ts';
import { makeFixtureRecord, makeScene } from '../../shared/index.ts';

/** MVR rotations, as the three rows of u, v and w: the pose GDTF draws, turned over, on its side, and tilted. */
const POSES = {
  hanging: '{1,0,0}{0,1,0}{0,0,1}',
  standing: '{1,0,0}{0,-1,0}{0,0,-1}',
  side: '{1,0,0}{0,0,1}{0,-1,0}',
  // a turn of 0.3 rad about Z, then of 0.5 rad about X
  tilted: '{0.955336,0.295520,0}{-0.259343,0.838387,0.479426}{0.141680,-0.458013,0.877583}',
};

const fixtures = Object.entries(POSES).map(([uuid, rotation]): ResolvedFixture => ({
  record: makeFixtureRecord({ uuid, matrix: `${rotation}{1000,2000,3000}`, layer: 'l1' }),
  type: 'spot',
  gdtfName: uuid,
  mode: 'Std',
}));
const scene = makeScene({ layers: [{ uuid: 'l1', name: 'Rig' }] });
const { design } = toStageDesign({ name: 'Poses.mvr', scene, fixtures, meshBoxes: new Map() });

/** Degrees between the stored body orientation (none: the hanging pose) and the orientation of the file's matrix. */
function errors(of: StageDesign): number[] {
  return of.fixtures.map((fixture, index) => {
    const matrix = fixtures[index]?.record.matrix;
    if (!matrix) throw new Error('no record');
    const file = new Quaternion().setFromRotationMatrix(new Matrix4().fromArray(toThree(matrix)));
    const body = new Quaternion(...(fixture.rotation ?? [0, 0, 0, 1]));
    return +((body.angleTo(file) * 180) / Math.PI).toFixed(3);
  });
}

/** The design after the luma data step, with a link per fixture; `own` lists the ids whose link has the flag. */
function relinked(own: readonly number[]): StageDesign {
  const links = design.fixtures.map(({ id, type, role, trussId, mount }): FixtureLink => {
    const link = { id, type, role, trussId, mount };
    return own.includes(id) ? { ...link, ownRotation: true } : link;
  });
  const { venue, scenery, deck, screens, risers, trusses } = design;
  const luma: LumaStageData = { venue, scenery, deck, screens, risers, trusses, offset: [0, 0, 0], links };
  return applyLumaData(design, luma).design;
}

describe('body orientation of an imported fixture', () => {
  it('is the MVR matrix orientation for a hanging, a standing, a side-mounted and a tilted fixture', () => {
    expect(errors(design)).toEqual([0, 0, 0, 0]);
    expect(design.fixtures.map((fixture) => [fixture.mount, fixture.rotation !== undefined])).toEqual([
      ['hang', false],
      ['floor', true],
      ['hang', true],
      ['hang', true],
    ]);
  });

  it('keeps the orientation of every fixture whose luma link says it had a rotation', () => {
    const after = relinked(design.fixtures.map((fixture) => fixture.id));
    expect(errors(after)).toEqual([0, 0, 0, 0]);
  });

  it('reads a link without the flag as before: the floor rest pose is the desk floor pose, without a rotation', () => {
    const after = relinked([]);
    expect(after.fixtures.map((fixture) => fixture.rotation !== undefined)).toEqual([false, false, true, true]);
  });
});
