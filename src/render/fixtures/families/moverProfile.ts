import type { BufferGeometry } from 'three';
import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives, ProfilePoint } from '../ModelPrimitives';
import { MOVER_REFERENCES, MOVER_VENT, type MoverReference } from './moverReferences';

/** The native head the body scales (`moverReferences.ts`). */
export const referenceOf = (body: MoverBody): MoverReference => MOVER_REFERENCES[body.ref];

/** A reference y mapped onto the product's span: rear points scale by `rear`, front points by `front`. */
const scaleY = (y: number, shape: MoverBody['barrel'], { rear, front }: MoverBody['barrel']): number =>
  y >= 0 ? (y / shape.rear) * rear : (y / shape.front) * front;

/** The barrel lathe: the reference profile with its radii scaled by `barrel.r` and its length by `rear` and `front`. */
export function barrelProfile(body: MoverBody): readonly ProfilePoint[] {
  const { barrel, shape } = referenceOf(body);
  const k = body.barrel.r / shape.r;
  return barrel.map(([r, y]) => [r * k, scaleY(y, shape, body.barrel)]);
}

/**
 * The bezel lathe at `barrel.front`: the inner lip is the lens radius, so the lens disc sits inside it, and the plate
 * and step scale with the barrel, so the step always stands out over the barrel whatever the lens size.
 */
export function bezelProfile(body: MoverBody): readonly ProfilePoint[] {
  const { bezel, shape } = referenceOf(body);
  const k = body.barrel.r / shape.r;
  return bezel.map(([r, y], i) => [i === 0 ? body.lens.r : r * k, scaleY(y, shape, body.barrel)]);
}

/** The reference's inner walls (MegaPointe ring), at the lens radius and scaled in length like the bezel. */
export function wallProfiles(body: MoverBody): readonly (readonly ProfilePoint[])[] {
  const { walls, shape } = referenceOf(body);
  return walls.map((wall) => wall.map(([, y]): ProfilePoint => [body.lens.r, scaleY(y, shape, body.barrel)]));
}

/** The rib or groove rings at the given y, a thin cylinder just over the barrel each, as the reference's. */
export function ribRings({ cylinder }: ModelPrimitives, body: MoverBody): readonly BufferGeometry[] {
  const { rib, shape } = referenceOf(body);
  const r = body.barrel.r + rib.outset * (body.barrel.r / shape.r);
  return (body.ribs ?? []).map((y) => cylinder([0, y, 0], r, rib.height));
}

/** The two side grilles, MegaPointe style, let into the barrel sides at the tilt axis and scaled to the barrel. */
export function sideVents({ box }: ModelPrimitives, body: MoverBody): BufferGeometry {
  const { r, rear } = body.barrel;
  const z = r - MOVER_VENT.inset;
  const y = MOVER_VENT.y * rear;
  const size = [MOVER_VENT.width * r, MOVER_VENT.height * r, MOVER_VENT.depth] as const;
  return merge([box([0, y, z], size), box([0, y, -z], size)]);
}
