import { Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import type { CrowdSpot } from './crowdLayout';

/**
 * Places one raised arm for each chosen person, with a random lean to the left or right and a small sideways
 * offset. `raised` holds the indices into `spots`, in the order of the arm instances.
 */
export function placeRaisedArms(spots: readonly CrowdSpot[], arm: InstancedMesh, raised: readonly number[]): void {
  const m4 = new Matrix4(),
    q = new Quaternion(),
    e = new Euler();
  raised.forEach((i, k) => {
    const spot = spots[i];
    if (!spot) return;
    const [x, y, z] = spot;
    e.set((Math.random() - 0.5) * 0.5, 0, (Math.random() < 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.35));
    q.setFromEuler(e);
    m4.compose(new Vector3(x + (Math.random() - 0.5) * 0.25, y - 0.5, z), q, new Vector3(1, 1, 1));
    arm.setMatrixAt(k, m4);
  });
}
