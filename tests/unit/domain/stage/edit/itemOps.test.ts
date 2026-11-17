/**
 * Owns duplicate, delete, mirror and fixture prop edits: unique ids for copies, a truss taking its fixtures with it,
 * and stage left copied onto stage right once. Truss move and mirror geometry come from trussOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  deleteFixtures,
  deleteTruss,
  duplicateFixtures,
  duplicateTruss,
  mirrorStageLeft,
  setFixtureProps,
} from '../../../../../src/domain/stage/edit/itemOps.ts';
import { sampleDesign } from './sampleDesign.ts';

const ids = (d: { fixtures: readonly { id: number }[] }): number[] => d.fixtures.map((f) => f.id);

describe('duplicate', () => {
  it('copies fixtures 1 m upstage with new unique ids on the same truss', () => {
    const d = duplicateFixtures(sampleDesign(), [101, 102]);
    expect(d.fixtures.slice(4).map((f) => [f.id, f.trussId, f.position])).toEqual([
      [401, 'pipe-1', [-2, 7, -1]],
      [402, 'pipe-1', [2, 7, -1]],
    ]);
    expect(new Set(ids(d)).size).toBe(6);
  });

  it('copies a truss with its fixtures under a new truss id', () => {
    const d = duplicateTruss(sampleDesign(), 'left-1');
    expect([d.trusses[2]?.id, d.trusses[2]?.name, d.trusses[2]?.transform]).toEqual([
      'tower-1',
      'Left tower copy',
      { position: [-4, 1, -3] },
    ]);
    expect(d.fixtures.slice(4).map((f) => [f.id, f.trussId, f.position])).toEqual([[401, 'tower-1', [-4, 3, -3]]]);
  });
});

describe('delete', () => {
  it('deletes a truss together with its fixtures only', () => {
    const d = deleteTruss(sampleDesign(), 'left-1');
    expect([d.trusses.map((t) => t.id), ids(d)]).toEqual([['pipe-1'], [101, 102, 301]]);
  });

  it('deletes a screen with its screen fixture', () => {
    const screen = { id: 'led-wall', fixtureId: 102, x0: -1, x1: 1, y0: 1, y1: 2, z: -4 };
    const d = deleteFixtures({ ...sampleDesign(), screens: [screen] }, [102]);
    expect([d.screens, ids(d)]).toEqual([[], [101, 201, 301]]);
  });
});

describe('mirrorStageLeft', () => {
  it('copies left trusses and fixtures to the right and skips spots already taken', () => {
    const d = mirrorStageLeft(sampleDesign());
    expect([d.trusses[2]?.id, d.trusses[2]?.name, d.trusses[2]?.transform, d.trusses[2]?.params]).toEqual([
      'tower-1',
      'Left tower mirror',
      { position: [4, 1, -2] },
      { kind: 'tower', a: [0, 0, 0], b: [0, 4, 0], section: 0.3 },
    ]);
    expect(d.fixtures.slice(4)).toEqual([
      {
        id: 401,
        type: 'beam',
        role: 'side',
        trussId: 'tower-1',
        position: [4, 3, -2],
        mount: 'hang',
        rotation: [0, -0.6, 0, 0.8],
      },
      { id: 402, type: 'par', role: 'floor', trussId: null, position: [3, 1, 3], mount: 'floor' },
    ]);
  });

  it('adds nothing the second time', () => {
    const once = mirrorStageLeft(sampleDesign());
    expect(mirrorStageLeft(once)).toEqual(once);
  });

  it('flips the fixed pan and the pixel strip', () => {
    const pixel = { p: [-3, 1, 3] as const, tan: [1, 0, 0] as const, len: 2 };
    const fixed = { pan: 20, tilt: 10 };
    const bar = { id: 1, type: 'bar', role: 'footlight', trussId: null, position: [-3, 1, 3], mount: 'floor' } as const;
    const d = mirrorStageLeft({ ...sampleDesign(), trusses: [], fixtures: [{ ...bar, fixed, pixel }] });
    expect([d.fixtures[1]?.fixed, d.fixtures[1]?.pixel]).toEqual([
      { pan: -20, tilt: 10 },
      { ...pixel, p: [3, 1, 3], tan: [-1, 0, 0] },
    ]);
  });
});

describe('setFixtureProps', () => {
  it('changes the named fields of one fixture and refuses a missing id', () => {
    const d = setFixtureProps(sampleDesign(), 301, { type: 'wash', position: [0, 1, 3] });
    expect([d.fixtures[3]?.type, d.fixtures[3]?.position]).toEqual(['wash', [0, 1, 3]]);
    expect(() => setFixtureProps(sampleDesign(), 999, {})).toThrow(/999/);
  });
});
