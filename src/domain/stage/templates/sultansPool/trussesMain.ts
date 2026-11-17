import { DECK, ROOF, TOWX, TOWZ, TR } from '../../../venue';
import type { StageTruss } from '../../trussTypes';
import type { FixtureRole, Transform, Vec3 } from '../../types';

/**
 * The Sultan's Pool trusses keep their world points in `params`, written with the legacy expressions, so the
 * transform is the identity and every float matches the old scene exactly.
 */
export const AT_ORIGIN: Transform = { position: [0, 0, 0] };

const TR_NAMES: Readonly<Record<keyof typeof TR, string>> = {
  front: 'Front truss',
  t2: 'Truss 2',
  t3: 'Truss 3',
  t4: 'Truss 4',
  back: 'Back truss',
};
const TR_ROLES: Readonly<Record<keyof typeof TR, FixtureRole>> = {
  front: 'front',
  t2: 'mid',
  t3: 'mid',
  t4: 'mid',
  back: 'back',
};
const TR_CHAIN_X = [-16, -5.5, 5.5, 16] as const;
const SIDES = [-1, 1] as const;

function trRows(): StageTruss[] {
  return (Object.keys(TR) as (keyof typeof TR)[]).map((k) => ({
    id: k,
    name: TR_NAMES[k],
    role: TR_ROLES[k],
    transform: AT_ORIGIN,
    params: {
      kind: 'straight',
      a: [-TOWX, TR[k].y, TR[k].z],
      b: [TOWX, TR[k].y, TR[k].z],
      section: 0.52,
      chains: TR_CHAIN_X.map((x): Vec3 => [x, TR[k].y, TR[k].z]),
    },
  }));
}

/** The id and name of the i-th member of a numbered set, counting from 1. */
const named = (prefix: string, label: string, i: number) => ({ id: `${prefix}-${i + 1}`, name: `${label} ${i + 1}` });

/** A roof steel member (section .78): posts are towers with the side role, roof beams are straight with the mid role. */
function steel(head: { id: string; name: string }, kind: 'straight' | 'tower', a: Vec3, b: Vec3): StageTruss {
  const role: FixtureRole = kind === 'tower' ? 'side' : 'mid';
  return { ...head, role, transform: AT_ORIGIN, params: { kind, a, b, section: 0.78 } };
}

function roofSteel(): StageTruss[] {
  const posts = SIDES.flatMap((s) => TOWZ.map((z): Vec3 => [s * TOWX, 0, z]));
  const roofZ = [TOWZ[0], TOWZ[1], -8] as const;
  return [
    ...posts.map((p, i) => steel(named('post', 'Roof post', i), 'tower', p, [p[0], ROOF, p[2]])),
    ...SIDES.map((s, i) => steel(named('mid-post', 'Mid post', i), 'tower', [s * TOWX, 0, -8], [s * TOWX, ROOF, -8])),
    ...SIDES.map((s, i) =>
      steel(named('roof-side', 'Roof side', i), 'straight', [s * TOWX, ROOF, TOWZ[0]], [s * TOWX, ROOF, TOWZ[1]]),
    ),
    ...roofZ.map((z, i) => steel(named('roof-cross', 'Roof cross', i), 'straight', [-TOWX, ROOF, z], [TOWX, ROOF, z])),
  ];
}

/** The six side ladders, left side first, upstage last: the order the side washes and profiles are numbered in. */
function ladders(): StageTruss[] {
  return SIDES.flatMap((sx) => [-3, -9, -15].map((z) => ({ sx, z }))).map(({ sx, z }, i) => ({
    id: `ladder-${i + 1}`,
    name: `Side ladder ${i + 1}`,
    role: 'side',
    transform: AT_ORIGIN,
    params: { kind: 'tower', a: [sx * 23.6 + sx * 0.4, DECK, z], b: [sx * 23.6 + sx * 0.4, 19.5, z], section: 0.4 },
  }));
}

const ROOF_TRUSS: StageTruss = {
  id: 'roof',
  name: 'Roof',
  role: 'mid',
  transform: { position: [0, ROOF + 0.7, -7.9] },
  params: { kind: 'roof', size: [54, 0.3, 27] },
};

/**
 * The trusses that frame the stage, in the legacy creation order (TR rows, roof posts, mid posts, roof sides, roof
 * cross beams, side ladders, roof), because the array order is the render order.
 */
export function mainTrusses(): StageTruss[] {
  return [...trRows(), ...roofSteel(), ...ladders(), ROOF_TRUSS];
}
