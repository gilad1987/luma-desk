/**
 * The front search is bounded: an instanced mesh whose instances agree on no front is searched once, not on every LED
 * mark, and a mesh above `MOST_FRONT_TRIANGLES` faces the audience without the per-face search.
 */
import { BufferAttribute, BufferGeometry, InstancedMesh, Matrix4, Mesh, PlaneGeometry, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ledFrontOf, MOST_FRONT_TRIANGLES } from '../../../../../src/render/mvr/led/ledFront.ts';
import { meshFront } from '../../../../../src/render/mvr/led/ledMeshFront.ts';

const toAudience = new Vector3(0, 0, 1);
const sides = { seats: undefined, middle: new Vector3(0, 0, 0) };

/** `count` triangles that all face +X, side-on to an audience at +Z. */
function sideOn(count: number): Mesh {
  const one = [0, 0, 0, 0, 1, 0, 0, 0, 1];
  const positions = new Float32Array(count * 9);
  for (let i = 0; i < count; i += 1) positions.set(one, i * 9);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return new Mesh(geometry);
}

describe('the bounded LED front search', () => {
  it('searches the faces of a mesh up to the cap', () => {
    expect(ledFrontOf(sideOn(3), { toAudience }).toArray()).toEqual([1, 0, 0]);
  });

  it('faces the audience above the cap, without the search', () => {
    expect(ledFrontOf(sideOn(MOST_FRONT_TRIANGLES + 1), { toAudience }).toArray()).toEqual([0, 0, 1]);
  });

  it('searches an instanced mesh with no agreed front once', () => {
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new InstancedMesh(geometry, undefined, 2);
    mesh.setMatrixAt(0, new Matrix4());
    mesh.setMatrixAt(1, new Matrix4().makeRotationY(Math.PI / 2));
    const reads = vi.spyOn(geometry, 'getIndex');
    expect(meshFront(mesh, sides)).toBeUndefined();
    const first = reads.mock.calls.length;
    expect(meshFront(mesh, sides)).toBeUndefined();
    expect([first > 0, reads.mock.calls.length]).toEqual([true, first]);
  });
});
