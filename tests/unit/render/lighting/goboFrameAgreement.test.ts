import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { beamVertexShader } from '../../../../src/render/beams/glsl';
import { lightVertexShader } from '../../../../src/render/lighting/glsl';
import { goboSide } from '../../../../src/render/lighting/goboFrame';

const NUMBER = String.raw`(-?[\d.]+(?:e-?\d+)?)`;
const VEC3 = String.raw`vec3\(${NUMBER}, ${NUMBER}, ${NUMBER}\)`;
/** The gobo frame of a vertex shader: the fallback straight up, and the turned x axis for every other axis. */
const FRAME = new RegExp(
  String.raw`float fromUp = 1\.0 - axis\.y;\s*vec3 side = fromUp < ${NUMBER}\s*\? ${VEC3}\s*` +
    String.raw`: normalize\(${VEC3} - \(axis\.x / fromUp\) \* \(axis - ${VEC3}\)\);\s*vec3 up = cross\(axis, side\);`,
);

/**
 * Runs the frame of a shader for one axis, with the numbers the shader text holds: `side`, the x axis of the gobo.
 * A shader whose frame has another form does not match, and the test says so.
 */
function shaderSide(shader: string, axis: Vector3): Vector3 {
  const found = FRAME.exec(shader);
  if (!found) throw new Error('the shader has no gobo frame of the known form');
  const [limit = 0, ...n] = found.slice(1).map(Number);
  const vec = (at: number): Vector3 => new Vector3(n[at], n[at + 1], n[at + 2]);
  const fromUp = 1 - axis.y;
  if (fromUp < limit) return vec(0);
  return vec(3)
    .sub(
      axis
        .clone()
        .sub(vec(6))
        .multiplyScalar(axis.x / fromUp),
    )
    .normalize();
}

const DOWN = new Vector3(0, -1, 0);
/** The world x axis turned as the cone mesh, the body and the pool turn: by the shortest arc from straight down. */
const meshSide = (axis: Vector3): Vector3 =>
  new Vector3(1, 0, 0).applyQuaternion(new Quaternion().setFromUnitVectors(DOWN, axis));

const AXES: readonly (readonly [name: string, axis: Vector3])[] = [
  ['straight down', new Vector3(0, -1, 0)],
  ['+x', new Vector3(1, 0, 0)],
  ['oblique', new Vector3(0.3, -0.8, 0.52).normalize()],
  ['oblique, upward', new Vector3(-0.45, 0.6, -0.66).normalize()],
  ['straight up', new Vector3(0, 1, 0)],
];

describe('the gobo frame of the shaft and of the light on the surfaces', () => {
  it.each(AXES)(
    'is one frame for a beam %s: the shaft, the surface light, its pinned copy and the cone mesh',
    (_, axis) => {
      const shaft = shaderSide(beamVertexShader, axis);
      const surface = shaderSide(lightVertexShader, axis);
      const pinned = goboSide(axis.x, axis.y, axis.z, new Vector3());
      expect(shaft.distanceTo(surface)).toBe(0);
      expect(shaft.distanceTo(pinned)).toBeLessThan(1e-9);
      expect(shaft.distanceTo(meshSide(axis))).toBeLessThan(1e-6);
      expect(shaft.length()).toBeCloseTo(1, 9);
      expect(shaft.dot(axis)).toBeCloseTo(0, 9);
    },
  );

  it('turns the gobo by the same angle in both: cos and sin of the rotation of the row', () => {
    for (const shader of [beamVertexShader, lightVertexShader]) {
      expect(shader).toContain('vGobo = vec4(iGobo.x, cos(iGobo.y), sin(iGobo.y),');
      expect(shader).toContain('vSide = side;');
    }
  });
});
