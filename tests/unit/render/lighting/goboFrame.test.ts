import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { lightVertexShader } from '../../../../src/render/lighting/glsl';
import { goboSide } from '../../../../src/render/lighting/goboFrame';

const DOWN = new Vector3(0, -1, 0);

/** The world x axis turned as the cone mesh and the beam volume turn: by the shortest arc from DOWN. */
const turned = (axis: Vector3): Vector3 =>
  new Vector3(1, 0, 0).applyQuaternion(new Quaternion().setFromUnitVectors(DOWN, axis));

describe('the gobo frame of the surface light', () => {
  it('is the world x axis for a beam straight down', () => {
    const side = goboSide(0, -1, 0, new Vector3());
    expect(side.toArray()).toEqual([1, 0, 0]);
  });

  it('is the world y axis for a beam along +x', () => {
    const side = goboSide(1, 0, 0, new Vector3());
    expect(side.x).toBeCloseTo(0, 6);
    expect(side.y).toBeCloseTo(1, 6);
    expect(side.z).toBeCloseTo(0, 6);
  });

  it('is the shortest-arc turn for an oblique beam: unit, across the axis, and equal to the cone mesh frame', () => {
    const axis = new Vector3(0.3, -0.8, 0.52).normalize();
    const side = goboSide(axis.x, axis.y, axis.z, new Vector3());
    expect(side.length()).toBeCloseTo(1, 6);
    expect(side.dot(axis)).toBeCloseTo(0, 6);
    expect(side.distanceTo(turned(axis))).toBeLessThan(1e-6);
  });

  it('is the expression of the vertex shader, which is the one of the beam volume', () => {
    expect(lightVertexShader).toContain('float fromUp = 1.0 - axis.y;');
    expect(lightVertexShader).toContain(
      'normalize(vec3(1.0, 0.0, 0.0) - (axis.x / fromUp) * (axis - vec3(0.0, 1.0, 0.0)))',
    );
    expect(lightVertexShader).toContain('vec3 up = cross(axis, side);');
  });
});
