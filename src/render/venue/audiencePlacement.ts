import { Color, Quaternion, Vector3, type InstancedMesh, Matrix4 } from 'three';
import { UP } from '../../domain/venue';
import type { CrowdSpot } from './crowdLayout';

/** Per-person bounce data, read by the crowd shader as instanced attributes. */
export interface CrowdMotion {
  /** Beat phase offset per person, in radians. */
  readonly phase: Float32Array;
  /** Jump height per person; about a third of the crowd really jumps. */
  readonly bounce: Float32Array;
}

/**
 * Places every audience member: random size and facing toward the stage, a random dark clothing colour, a random
 * bounce phase and height. Bodies and heads share one matrix per person. Seven `Math.random` calls per person, plus
 * one more for a jumper.
 */
export function placeAudience(spots: readonly CrowdSpot[], body: InstancedMesh, head: InstancedMesh): CrowdMotion {
  const phase = new Float32Array(spots.length),
    bounce = new Float32Array(spots.length);
  const m4 = new Matrix4(),
    q = new Quaternion(),
    colour = new Color();
  spots.forEach(([x, y, z], i) => {
    const sc = 0.9 + Math.random() * 0.18;
    q.setFromAxisAngle(UP, Math.PI + (Math.random() - 0.5) * 0.35);
    m4.compose(new Vector3(x, y - 0.05, z), q, new Vector3(sc, sc * 0.72, sc));
    body.setMatrixAt(i, m4);
    head.setMatrixAt(i, m4);
    const hue = Math.random();
    colour.setHSL(hue, Math.random() * 0.4, 0.07 + Math.random() * 0.2);
    body.setColorAt(i, colour);
    phase[i] = Math.random() * 6.28;
    bounce[i] = Math.random() < 0.35 ? 0.03 + Math.random() * 0.04 : 0.008;
  });
  return { phase, bounce };
}
