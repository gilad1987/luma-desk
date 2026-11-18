/**
 * Owns the lens face of a GDTF body: a unit with several beams gets a disc at every Beam origin and its one cone
 * starts at the centre of those origins; a body whose beam data is not trusted gets its lens on the front face of the
 * head mesh, under the beam axis the file names.
 */
import { BoxGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../../src/render/fixtures/gdtf/buildProto';

/** A GDTF position that only moves, column-major; GDTF X, Y and Z are the app X, -Z and Y. */
const at = (x: number, z: number): Float64Array => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, z, 1]);
const beam = { beamType: 'Wash', beamAngle: 20, fieldAngle: 25, beamRadius: 0.03, luminousFlux: 1000 };
const part = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: at(0, 0), role: 'fixed', children: [] },
  ...fields,
});
const cell = (x: number, z: number): GdtfNode => part('Cell', { type: 'Beam', tag: 'Beam', position: at(x, z), beam });
const model = { name: 'B', file: '', details: [], size: [1, 0.4, 0.4] as const, primitiveType: 'Undefined' };
/** A housing 1 m long whose mesh is a box 0.4 m high and deep, centred on its origin. */
const body = (cells: GdtfNode[]): GdtfNode => part('Body', { model, children: cells });
const proto = (root: GdtfNode, trust: boolean) =>
  buildProto(root, [0], () => ({ geometry: new BoxGeometry(1, 0.4, 0.4), matrix: new Matrix4() }), trust);
const round = (v: Vector3): number[] => v.toArray().map((value) => +value.toFixed(4) + 0);

describe('the lens face of a GDTF body', () => {
  it('puts a disc on every beam origin of a bar and starts its cone at the centre of them', () => {
    const bar = proto(body([-0.375, -0.125, 0.125, 0.375].map((x) => cell(x, -0.2))), true);
    // the cone starts at the centre of the four origins, on the face 0.2 m below the housing origin
    expect(round(bar?.aimAt ?? new Vector3(NaN))).toEqual([0, -0.2, 0]);
    const discs = bar?.lensDiscs;
    discs?.computeBoundingBox();
    // discs of the GDTF beam radius (0.03 m) from the first origin to the last, 2 mm in front of the face
    expect(round(discs?.boundingBox?.min ?? new Vector3(NaN))).toEqual([-0.405, -0.202, -0.03]);
    expect(round(discs?.boundingBox?.max ?? new Vector3(NaN))).toEqual([0.405, -0.202, 0.03]);
  });

  it('keeps the single lens of a body with one beam on its Beam origin', () => {
    const one = proto(body([cell(0.1, -0.15)]), true);
    expect(one?.lensDiscs).toBeUndefined();
    expect(round(new Vector3().setFromMatrixPosition(one?.lensAt ?? new Matrix4()))).toEqual([0.1, -0.15, 0]);
  });

  it('puts the lens of an untrusted body on the front face of the mesh, under the beam axis of the file', () => {
    // the file names a beam 0.1 m off-centre, inside the housing; the mesh ends 0.2 m below the origin
    const symbol = proto(body([cell(0.1, 0)]), false);
    expect(round(new Vector3().setFromMatrixPosition(symbol?.lensAt ?? new Matrix4()))).toEqual([0.1, -0.2, 0]);
    // a beam axis that misses the mesh says nothing: the lens stays under the middle of the mesh
    const stray = proto(body([cell(3, 0)]), false);
    expect(round(new Vector3().setFromMatrixPosition(stray?.lensAt ?? new Matrix4()))).toEqual([0, -0.2, 0]);
  });
});
