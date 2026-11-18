/**
 * Owns `mirrorLeftToRight`: house-left trusses and fixtures copied onto the right once, by world geometry, with each
 * copy linked to the mirrored truss. Plain truss moves are owned by trussOps.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import { moveTruss } from '../../../../../src/domain/stage/edit/trussOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { sampleDesign } from './sampleDesign.ts';

describe('mirrorLeftToRight', () => {
  it('copies left trusses and fixtures to the right and skips spots already taken', () => {
    const d = mirrorLeftToRight(sampleDesign());
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
    const once = mirrorLeftToRight(sampleDesign());
    expect(mirrorLeftToRight(once)).toEqual(once);
  });

  it('flips the fixed pan and the pixel strip', () => {
    const pixel = { p: [-3, 1, 3] as const, tan: [1, 0, 0] as const, len: 2 };
    const fixed = { pan: 20, tilt: 10 };
    const bar = { id: 1, type: 'bar', role: 'footlight', trussId: null, position: [-3, 1, 3], mount: 'floor' } as const;
    const d = mirrorLeftToRight({ ...sampleDesign(), trusses: [], fixtures: [{ ...bar, fixed, pixel }] });
    expect([d.fixtures[1]?.fixed, d.fixtures[1]?.pixel]).toEqual([
      { pan: -20, tilt: 10 },
      { ...pixel, p: [3, 1, 3], tan: [-1, 0, 0] },
    ]);
  });
});

describe('mirrorLeftToRight on a truss drawn with world end points (QA2 B1)', () => {
  /** A house-left pipe drawn the way the templates draw trusses: identity transform, world end points. */
  const leftPipe = (): StageDesign => {
    const pipe = {
      id: 'sl-pipe',
      name: 'SL pipe',
      role: 'mid' as const,
      transform: { position: [0, 0, 0] as const },
      params: { kind: 'straight' as const, a: [-8, 6, -2] as const, b: [-2, 6, -2] as const, section: 0.3 },
    };
    const bare = { ...sampleDesign(), trusses: [pipe], fixtures: [] };
    return addFixturesOnTruss(bare, { trussId: 'sl-pipe', type: 'spot', count: 3 });
  };

  it('adds a mirror truss and links every copy to it', () => {
    const d = mirrorLeftToRight(leftPipe());
    expect(d.trusses.map((t) => t.id)).toEqual(['sl-pipe', 'straight-1']);
    const copies = d.fixtures.filter((f) => f.position[0] > 0);
    expect(copies.map((f) => f.trussId)).toEqual(['straight-1', 'straight-1', 'straight-1']);
  });

  it('leaves the copies in place when the house-left truss moves', () => {
    const d = mirrorLeftToRight(leftPipe());
    const right = (x: StageDesign) => x.fixtures.filter((f) => f.position[0] > 0).map((f) => f.position);
    expect(right(moveTruss(d, 'sl-pipe', [0, 1, 0]))).toEqual(right(d));
  });
});
