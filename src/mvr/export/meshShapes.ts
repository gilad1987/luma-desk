import type { StageDesign } from '../../domain/stage/StageDesign';
import { meshFileOf, type MeshShape } from './MeshShape';
import { objectSpecs } from './objectSpecs';

/**
 * The distinct mesh bodies an export of `design` names, by file. Render builds one mesh per entry and passes the
 * bytes to `exportMvr` under the same names, so every `<Geometry3D>` of the scene finds its file.
 */
export function meshShapes(design: StageDesign): ReadonlyMap<string, MeshShape> {
  return new Map(objectSpecs(design).map((spec) => [meshFileOf(spec.shape), spec.shape]));
}
