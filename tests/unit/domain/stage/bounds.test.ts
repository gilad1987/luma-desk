/**
 * Owns `boundsOf` (G7): the deck alone, the built-in rings, fixtures and every truss kind, including a rotated truss,
 * must all fall inside the box the camera fits to.
 */
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../src/domain/stage/bounds.ts';
import type { StageTruss } from '../../../../src/domain/stage/trussTypes.ts';
import { RING } from '../../../../src/domain/venue.ts';
import { VENUE_DESIGN } from './venueDesign.ts';

const smallDeck = { x0: -1, x1: 1, z0: -1, z1: 1, height: 1 };
const bare = { ...VENUE_DESIGN, deck: smallDeck, screens: [], trusses: [] };
const truss = (params: StageTruss['params'], rotation?: StageTruss['transform']['rotation']): StageTruss => ({
  id: params.kind,
  name: params.kind,
  role: 'mid',
  transform: rotation ? { position: [0, 10, 0], rotation } : { position: [0, 10, 0] },
  params,
});

describe('boundsOf', () => {
  it('is the deck box for a design with nothing on the deck', () => {
    expect(boundsOf(bare)).toEqual({ min: [-1, 0, -1], max: [1, 1, 1] });
  });

  it('covers the built-in deck and the inner ring height', () => {
    expect(boundsOf(VENUE_DESIGN)).toEqual({ min: [-23, 0, -21], max: [23, RING.y2, 0.6] });
  });

  it('joins fixture positions', () => {
    const fixture = { id: 1, type: 'par', role: 'floor', trussId: null, position: [5, 2, -7], mount: 'floor' } as const;
    expect(boundsOf({ ...bare, fixtures: [fixture] })).toEqual({ min: [-1, 0, -7], max: [5, 2, 1] });
  });

  it('joins the end points of each truss kind', () => {
    const cases: [StageTruss, { min: number[]; max: number[] }][] = [
      [truss({ kind: 'straight', a: [-4, 0, 0], b: [4, 2, 0], section: 0.5 }), { min: [-4, 0, -1], max: [4, 12, 1] }],
      [truss({ kind: 'circle', radius: 3, section: 0.5 }), { min: [-3, 0, -3], max: [3, 10, 3] }],
      [truss({ kind: 'goalpost', width: 8, height: 6, section: 0.4 }), { min: [-4, 0, -1], max: [4, 16, 1] }],
      [truss({ kind: 'roof', size: [6, 0.4, 2] }), { min: [-3, 0, -1], max: [3, 10.2, 1] }],
    ];
    for (const [t, expected] of cases) expect(boundsOf({ ...bare, trusses: [t] })).toEqual(expected);
  });

  it('turns a truss by its rotation before it joins the end points', () => {
    const quarterTurnY = [0, Math.SQRT1_2, 0, Math.SQRT1_2] as const;
    const box = boundsOf({
      ...bare,
      trusses: [truss({ kind: 'straight', a: [-4, 0, 0], b: [4, 0, 0], section: 0.5 }, quarterTurnY)],
    });
    expect(box.min[2]).toBeCloseTo(-4, 12);
    expect(box.max[2]).toBeCloseTo(4, 12);
    expect(box.max[0]).toBeCloseTo(1, 12);
  });
});
