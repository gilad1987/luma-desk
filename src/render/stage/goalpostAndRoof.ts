import { BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import type { TrussParams } from '../../domain/stage/trussTypes';
import type { Transform } from '../../domain/stage/types';
import { addMesh } from '../shared';
import { addTrussSection, type TrussContext } from './lineTruss';

/**
 * Builds a goalpost: two posts standing on the base centre at ±width/2, then the beam across their tops, all with
 * the same section. Each section takes the whole transform, so a goalpost turned about its posts turns them too.
 */
export function buildGoalpost(
  ctx: TrussContext,
  transform: Transform,
  { width, height, section }: Extract<TrussParams, { kind: 'goalpost' }>,
): void {
  for (const x of [-width / 2, width / 2])
    addTrussSection(ctx, transform, { a: [x, 0, 0], b: [x, height, 0], section });
  addTrussSection(ctx, transform, { a: [-width / 2, height, 0], b: [width / 2, height, 0], section });
}

/** Builds a roof: one dark slab of `size`, centred on the transform position. */
export function buildRoof(
  parent: Object3D,
  transform: Transform,
  { size }: Extract<TrussParams, { kind: 'roof' }>,
): void {
  // quirk F7 (orig:1032): the legacy code passed this material as an argument, so it exists before the slab geometry
  const roof = new MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const slab = addMesh(parent, new BoxGeometry(...size), roof, { position: transform.position });
  if (transform.rotation) slab.quaternion.set(...transform.rotation);
}
