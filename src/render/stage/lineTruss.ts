import { BoxGeometry, type Material, type Object3D } from 'three';
import type { TrussParams } from '../../domain/stage/trussTypes';
import type { Transform } from '../../domain/stage/types';
import { addMesh } from '../shared';
import type { TrussKit } from './TrussKit';
import { worldPoint } from './worldPoint';

/** What every truss builder draws into and with; the kit and the dark material are shared by all trusses. */
export interface TrussContext {
  readonly parent: Object3D;
  readonly kit: TrussKit;
  readonly dark: Material;
}

/** The params of the two kinds drawn as one section from `a` to `b`. */
export type LineParams = Extract<TrussParams, { kind: 'straight' | 'tower' }>;

/**
 * Builds a straight or tower truss: the section from `a` to `b`, then its extra boxes in array order (base and top
 * plates, a fixture shelf, a delay tower's speaker head). The chains are the caller's: their order depends on the kind.
 */
export function buildLineTruss(ctx: TrussContext, transform: Transform, params: LineParams): void {
  const { parent, kit } = ctx;
  kit.addSection(parent, worldPoint(transform, params.a), worldPoint(transform, params.b), params.section);
  for (const part of params.parts ?? []) {
    const material = part.material === 'dark' ? ctx.dark : kit.steel;
    const box = addMesh(parent, new BoxGeometry(...part.size), material, { position: worldPoint(transform, part.at) });
    if (transform.rotation) box.quaternion.set(...transform.rotation);
  }
}
