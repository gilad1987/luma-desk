import { BoxGeometry, Quaternion, Vector3, type Material, type Object3D } from 'three';
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
 * Adds one section between the truss-local points `a` and `b`. A turned truss builds the section in its local space,
 * then turns and moves the section group by the whole transform: world end points alone lose a roll about the
 * section's own axis. Without a rotation the section gets the world end points, as the legacy scene did, so the
 * template trusses keep their exact floats.
 */
export function addTrussSection(
  ctx: TrussContext,
  transform: Transform,
  { a, b, section }: Pick<LineParams, 'a' | 'b' | 'section'>,
): void {
  const { rotation } = transform;
  if (!rotation) {
    ctx.kit.addSection(ctx.parent, worldPoint(transform, a), worldPoint(transform, b), section);
    return;
  }
  const group = ctx.kit.addSection(ctx.parent, a, b, section);
  const turn = new Quaternion(...rotation);
  group.position.applyQuaternion(turn).add(new Vector3(...transform.position));
  group.quaternion.premultiply(turn);
}

/**
 * Builds a straight or tower truss: the section from `a` to `b`, then its extra boxes in array order (base and top
 * plates, a fixture shelf, a delay tower's speaker head). The chains are the caller's: their order depends on the kind.
 */
export function buildLineTruss(ctx: TrussContext, transform: Transform, params: LineParams): void {
  const { parent, kit } = ctx;
  addTrussSection(ctx, transform, params);
  for (const part of params.parts ?? []) {
    const material = part.material === 'dark' ? ctx.dark : kit.steel;
    const box = addMesh(parent, new BoxGeometry(...part.size), material, { position: worldPoint(transform, part.at) });
    if (transform.rotation) box.quaternion.set(...transform.rotation);
  }
}
