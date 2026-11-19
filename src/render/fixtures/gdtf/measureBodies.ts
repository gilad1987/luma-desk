import { Matrix4, Vector3 } from 'three';
import type { FixtureVisual } from '../FixtureVisual';
import { bodyBox } from './bodyBox';

const ONE = new Vector3(1, 1, 1);

/** The size of one drawn fixture body in metres, in the fixture's own frame: width (X), depth (Z), height (Y). */
export interface BodyMeasure {
  readonly id: number;
  readonly size: readonly [number, number, number];
}

/**
 * Measures every light body as it is drawn, in its rest pose, so a test can compare it with the GDTF size. The
 * joints and the pivot are put at rest; the next frame update turns them again.
 */
export function measureBodies(visuals: readonly FixtureVisual[]): BodyMeasure[] {
  return visuals.flatMap((v) => {
    if (v.kind !== 'light') return [];
    v.pivot.quaternion.identity();
    if (v.joints) {
      v.joints.yoke.rotation.y = 0;
      v.joints.tiltG.rotation.x = 0;
    }
    const toBody = new Matrix4().compose(v.g.position, v.g.quaternion, ONE).invert();
    const size = bodyBox(v.g, toBody).getSize(new Vector3());
    return [{ id: v.fixture.id, size: [size.x, size.z, size.y] as const }];
  });
}
