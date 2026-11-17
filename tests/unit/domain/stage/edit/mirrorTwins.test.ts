/**
 * Owns how `mirrorLeftToRight` treats trusses that are not plainly house left: a truss across the centre line, judged
 * by its full extents for every kind, and a twin found by geometry with its ends in either order. The plain left
 * copy is owned by mirror.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import type { StageDesign, StageFixture } from '../../../../../src/domain/stage/StageDesign.ts';
import type { StageTruss } from '../../../../../src/domain/stage/trussTypes.ts';
import type { Vec3 } from '../../../../../src/domain/stage/types.ts';
import { sampleDesign } from './sampleDesign.ts';

const straight = (id: string, a: Vec3, b: Vec3): StageTruss => ({
  id,
  name: id,
  role: 'mid',
  transform: { position: [0, 0, 0] },
  params: { kind: 'straight', a, b, section: 0.3 },
});

const goalpost = (id: string, x: number): StageTruss => ({
  id,
  name: id,
  role: 'mid',
  transform: { position: [x, 0, -3] },
  params: { kind: 'goalpost', width: 10, height: 6, section: 0.4 },
});

/** One spot hung on `trussId` at `position`. */
const spot = (trussId: string, position: Vec3): StageFixture => ({
  id: 101,
  type: 'spot',
  role: 'mid',
  trussId,
  position,
  mount: 'hang',
});

const design = (trusses: StageTruss[], fixture: StageFixture): StageDesign => ({
  ...sampleDesign(),
  trusses,
  fixtures: [fixture],
});

/** The trusses and the truss link of the one copy that mirroring `d` adds. */
const mirrored = (d: StageDesign): [string[], (string | null)[]] => {
  const next = mirrorLeftToRight(d);
  return [next.trusses.map((t) => t.id), next.fixtures.slice(1).map((f) => f.trussId)];
};

describe('mirrorLeftToRight across the centre line', () => {
  it('does not mirror an asymmetric straight across the centre; the copy gets no truss link', () => {
    const d = design([straight('x-pipe', [-6, 6, 0], [4, 6, 0])], spot('x-pipe', [-3, 5.55, 0]));
    expect(mirrored(d)).toEqual([['x-pipe'], [null]]);
  });

  it('does not mirror a goalpost that spans the centre off-centre; the copy gets no truss link', () => {
    const d = design([goalpost('gp', -1)], spot('gp', [-4, 5.55, -3]));
    expect(mirrored(d)).toEqual([['gp'], [null]]);
  });

  it('keeps the link to a centred goalpost, which is its own twin', () => {
    const d = design([goalpost('gp', 0)], spot('gp', [-3, 5.55, -3]));
    expect(mirrored(d)).toEqual([['gp'], ['gp']]);
  });
});

describe('mirrorLeftToRight twins', () => {
  it('links the copy to a right truss drawn with its ends reversed, and adds no truss', () => {
    const left = straight('sl-pipe', [-8, 6, -2], [-2, 6, -2]);
    const right = straight('sr-pipe', [2, 6, -2], [8, 6, -2]);
    expect(mirrored(design([left, right], spot('sl-pipe', [-5, 5.55, -2])))).toEqual([
      ['sl-pipe', 'sr-pipe'],
      ['sr-pipe'],
    ]);
  });

  it('judges a goalpost by its posts, not its base centre: one fully left is mirrored', () => {
    const d = design([goalpost('gp', -8)], spot('gp', [-8, 5.55, -3]));
    expect(mirrored(d)).toEqual([['gp', 'goalpost-1'], ['goalpost-1']]);
  });
});
