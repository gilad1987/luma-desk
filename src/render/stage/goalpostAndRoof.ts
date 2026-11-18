import { BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import type { TrussParams } from '../../domain/stage/trussTypes';
import type { Transform } from '../../domain/stage/types';
import { addMesh } from '../shared';
import type { TrussContext } from './lineTruss';
import { worldPoint } from './worldPoint';

/**
 * Builds a goalpost: two posts standing on the base centre at ±width/2, then the beam across their tops, all with
 * the same section.
 */
export function buildGoalpost(
  ctx: TrussContext,
  transform: Transform,
  { width, height, section }: Extract<TrussParams, { kind: 'goalpost' }>,
): void {
  const at = (x: number, y: number) => worldPoint(transform, [x, y, 0]);
  for (const x of [-width / 2, width / 2]) ctx.kit.addSection(ctx.parent, at(x, 0), at(x, height), section);
  ctx.kit.addSection(ctx.parent, at(-width / 2, height), at(width / 2, height), section);
}

/** Builds a roof: one dark slab of `size`, centred on the transform position. */
export function buildRoof(
  parent: Object3D,
  transform: Transform,
  { size }: Extract<TrussParams, { kind: 'roof' }>,
): void {
  // the legacy code passed this material as an argument, so it exists before the slab geometry
  const roof = new MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const slab = addMesh(parent, new BoxGeometry(...size), roof, { position: transform.position });
  if (transform.rotation) slab.quaternion.set(...transform.rotation);
}
