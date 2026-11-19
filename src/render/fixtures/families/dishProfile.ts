import type { BufferGeometry } from 'three';
import type { YokedCanBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives, ProfilePoint } from '../ModelPrimitives';

/** The head of a yoked can: shell (body material), bezel trim, and the reflector wall with the grille spokes (alu). */
export interface DishGeometry {
  readonly head: BufferGeometry;
  readonly headTrim: BufferGeometry;
  readonly reflector: BufferGeometry;
}

/** Bowl depth fractions, bezel to back; the radius falls with sqrt(1 - t), so the dish is steep at the bezel. */
const BOWL_STEPS = [0.35, 0.65, 0.85, 1];
/** Front rolled lip of the bezel: how far it stands out and how deep it runs back from the front face. */
const LIP = { out: 0.008, depth: 0.06 };
const CLIPS = 8;
const SPOKES = 3;

/** The outer shell, front to rear so its faces point outward: the bezel wall, then the bowl, closed at its back. */
export function shellProfile({ rim, bowl }: YokedCanBody): ProfilePoint[] {
  const curve = BOWL_STEPS.map((t): ProfilePoint => {
    const r = bowl.r + (rim.r - bowl.r) * Math.sqrt(1 - t);
    return [r, rim.back + (bowl.y - rim.back) * t];
  });
  return [[rim.r, rim.front + LIP.depth], [rim.r, rim.back], ...curve, [0, bowl.y]];
}

/** The bezel front ring with its rolled lip, front to rear: flat from the mouth out, then round the edge. */
export function bezelProfile({ rim, mouth }: YokedCanBody): ProfilePoint[] {
  const outer = rim.r + LIP.out;
  return [
    [mouth, rim.front],
    [rim.r - 0.015, rim.front],
    [outer, rim.front + 0.015],
    [outer, rim.front + LIP.depth - 0.01],
    [rim.r, rim.front + LIP.depth],
  ];
}

/** The reflector between the painted face and the mouth, listed rear to front so its faces point inward. */
export function reflectorProfile({ rim, mouth, lens }: YokedCanBody): ProfilePoint[] {
  return [
    [lens.r, lens.y],
    [lens.r + (mouth - lens.r) * 0.6, (lens.y + rim.front) / 2],
    [mouth, rim.front],
  ];
}

/** Every head part of the body, cut once per product from its numbers. */
export function dishGeometry(prims: ModelPrimitives, body: YokedCanBody): DishGeometry {
  const { box, cylinder, lathe } = prims;
  const { rim, bowl, rear, mouth } = body;
  const clips = Array.from({ length: CLIPS }, (_, k) => {
    const a = ((k + 0.5) / CLIPS) * Math.PI * 2;
    const r = rim.r + 0.005;
    return box([Math.sin(a) * r, rim.front + 0.03, Math.cos(a) * r], [0.04, 0.035, 0.025], [0, a, 0]);
  });
  const grilleY = rim.front - 0.008;
  const spokes = Array.from({ length: SPOKES }, (_, k) => {
    const a = (k / SPOKES) * Math.PI * 2;
    return box([(Math.sin(a) * mouth) / 2, grilleY, (Math.cos(a) * mouth) / 2], [0.03, 0.012, mouth], [0, a, 0]);
  });
  return {
    head: merge([lathe(shellProfile(body)), cylinder([0, (bowl.y + rear.y) / 2, 0], rear.r, rear.y - bowl.y)]),
    headTrim: merge([lathe(bezelProfile(body)), ...clips]),
    reflector: merge([lathe(reflectorProfile(body)), ...spokes, cylinder([0, grilleY, 0], 0.05, 0.016)]),
  };
}
