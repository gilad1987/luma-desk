/**
 * Owns where `addFixturesOnTruss` and `addFloorRow` put new fixtures: even spacing, the hang drop below the truss,
 * circle angle steps from +z with a yaw to the centre, the truss rotation (G2) and the lane shift. Rendering the result is owned by the render tests.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss, addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import type { StageTruss } from '../../../../../src/domain/stage/trussTypes.ts';
import { rounded, sampleDesign } from './sampleDesign.ts';

const ring: StageTruss = {
  id: 'ring-1',
  name: 'Ring',
  role: 'ring',
  transform: { position: [0, 8, 0] },
  params: { kind: 'circle', radius: 4, section: 0.4 },
};
const bare = (...trusses: StageTruss[]): StageDesign => ({ ...sampleDesign(), trusses, fixtures: [] });
const positions = (d: StageDesign): number[][] => d.fixtures.map((f) => rounded(f.position));

describe('addFixturesOnTruss', () => {
  it('spreads fixtures evenly along a straight truss, 0.45 m below it, and gives them the truss role', () => {
    const d = addFixturesOnTruss(bare(...sampleDesign().trusses), { trussId: 'pipe-1', type: 'spot', count: 4 });
    expect(positions(d)).toEqual([
      [-3.75, 6.55, 0],
      [-1.25, 6.55, 0],
      [1.25, 6.55, 0],
      [3.75, 6.55, 0],
    ]);
    expect(d.fixtures.map((f) => [f.id, f.role, f.trussId, f.mount, 'rotation' in f])).toEqual(
      [1, 2, 3, 4].map((id) => [id, 'mid', 'pipe-1', 'hang', false]),
    );
  });

  it('steps a circle by 2π/count from +z toward +x and turns each body to the centre', () => {
    const d = addFixturesOnTruss(bare(ring), { trussId: 'ring-1', type: 'beam', count: 4 });
    expect(positions(d)).toEqual([
      [0, 7.55, 4],
      [4, 7.55, 0],
      [0, 7.55, -4],
      [-4, 7.55, 0],
    ]);
    const facing = d.fixtures.map((f) => {
      const forward = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...(f.rotation ?? [0, 0, 0, 1])));
      return rounded(forward.toArray());
    });
    expect(facing).toEqual([
      [0, 0, -1],
      [-1, 0, 0],
      [0, 0, 1],
      [1, 0, 0],
    ]);
  });

  it('passes the truss rotation on to every fixture (G2)', () => {
    const yaw: [number, number, number, number] = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    const turned: StageTruss = { ...ring, id: 'bar-1', transform: { position: [0, 5, 0], rotation: yaw } };
    const straight: StageTruss = { ...turned, params: { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 } };
    const d = addFixturesOnTruss(bare(straight), { trussId: 'bar-1', type: 'wash', count: 2 });
    expect(positions(d)).toEqual([
      [0, 4.55, 2.5],
      [0, 4.55, -2.5],
    ]);
    expect(d.fixtures.map((f) => rounded(f.rotation ?? []))).toEqual([rounded(yaw), rounded(yaw)]);
  });

  it('moves a batch one 0.4 m lane upstage per batch already on the same spots', () => {
    const batch = { trussId: 'pipe-1', type: 'wash', count: 2 } as const;
    const once = addFixturesOnTruss(bare(...sampleDesign().trusses), batch);
    const d = addFixturesOnTruss(addFixturesOnTruss(once, batch), batch);
    expect(d.fixtures.map((f) => rounded(f.position)[2])).toEqual([0, 0, -0.4, -0.4, -0.8, -0.8]);
  });

  it('moves a circle batch one lane out', () => {
    const batch = { trussId: 'ring-1', type: 'wash', count: 2 } as const;
    const d = addFixturesOnTruss(addFixturesOnTruss(bare(ring), batch), batch);
    expect(positions(d).slice(2)).toEqual([
      [0, 7.55, 4.4],
      [0, 7.55, -4.4],
    ]);
  });

  it('refuses a missing truss and a count below 1', () => {
    expect(() => addFixturesOnTruss(sampleDesign(), { trussId: 'nope', type: 'spot', count: 1 })).toThrow(/nope/);
    expect(() => addFixturesOnTruss(sampleDesign(), { trussId: 'pipe-1', type: 'spot', count: 0 })).toThrow(/got 0/);
  });
});

describe('addFloorRow', () => {
  it('spreads a floor row evenly, ids from the next block, bars as footlights', () => {
    const d = addFloorRow(sampleDesign(), { type: 'bar', count: 2, from: [-4, 1, 3], to: [4, 1, 3] });
    expect(d.fixtures.slice(4)).toEqual([
      { id: 401, type: 'bar', role: 'footlight', trussId: null, mount: 'floor', position: [-2, 1, 3] },
      { id: 402, type: 'bar', role: 'footlight', trussId: null, mount: 'floor', position: [2, 1, 3] },
    ]);
  });
});
