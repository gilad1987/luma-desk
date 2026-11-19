import type { BufferGeometry } from 'three';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives, ProfilePoint } from '../ModelPrimitives';
import { FORTE_BARREL_PROFILE, FORTE_BEZEL_PROFILE } from '../models/forteHead';

/**
 * The Robe FORTE head (`models/forteHead.ts`) is the reference shape of the family: its barrel radius at the tilt
 * axis and the y of its rear cap and lens face, which the product's `barrel` numbers replace.
 */
const FORTE = { r: 0.335, rear: 0.45, front: -0.78 } as const;

/** Rib ring thickness over the barrel and height, as the FORTE's. */
const RIB = { outset: 0.01, height: 0.014 } as const;

/** The MegaPointe side grille as a fraction of its barrel: y over the rear span, width and height over the radius. */
const VENT = { y: 0.06 / 0.38, width: 0.3 / 0.41, height: 0.26 / 0.41, depth: 0.02, inset: 0.005 } as const;

/** A FORTE y mapped onto the product's span: rear points scale by `rear`, front points by `front`. */
const scaleY = (y: number, { rear, front }: MoverBody['barrel']): number =>
  y >= 0 ? (y / FORTE.rear) * rear : (y / FORTE.front) * front;

/** The barrel lathe: the FORTE profile with its radii scaled by `barrel.r` and its length by `rear` and `front`. */
export function barrelProfile(body: MoverBody): readonly ProfilePoint[] {
  const k = body.barrel.r / FORTE.r;
  return FORTE_BARREL_PROFILE.map(([r, y]) => [r * k, scaleY(y, body.barrel)]);
}

/**
 * The bezel lathe at `barrel.front`: the inner lip is the lens radius, so the lens disc sits inside it, and the plate
 * and step scale with the barrel, so the step always stands out over the barrel whatever the lens size.
 */
export function bezelProfile(body: MoverBody): readonly ProfilePoint[] {
  const k = body.barrel.r / FORTE.r;
  const s = body.barrel.front / FORTE.front;
  return FORTE_BEZEL_PROFILE.map(([r, y], i) => [
    i === 0 ? body.lens.r : r * k,
    body.barrel.front + (y - FORTE.front) * s,
  ]);
}

/** The cooling rib rings at the given y, a thin cylinder just over the barrel each. */
export function ribRings({ cylinder }: ModelPrimitives, body: MoverBody): readonly BufferGeometry[] {
  return (body.ribs ?? []).map((y) => cylinder([0, y, 0], body.barrel.r + RIB.outset, RIB.height));
}

/** The two side grilles, MegaPointe style, let into the barrel sides at the tilt axis and scaled to the barrel. */
export function sideVents({ box }: ModelPrimitives, body: MoverBody): BufferGeometry {
  const { r, rear } = body.barrel;
  const z = r - VENT.inset;
  const y = VENT.y * rear;
  const size = [VENT.width * r, VENT.height * r, VENT.depth] as const;
  return merge([box([0, y, z], size), box([0, y, -z], size)]);
}
