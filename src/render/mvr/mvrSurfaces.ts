import { surfacesOf } from '../../domain/stage/surfaces';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { SurfaceBox } from '../../domain/stage/types';
import type { LayerBox, MvrGeometry } from '../../mvr/index';

/** Whether `inner` lies wholly inside the layer's box (both in the fitted world frame). */
const inside = (layer: LayerBox, inner: SurfaceBox): boolean =>
  ([0, 1, 2] as const).every((i) => inner.min[i] >= layer.box.min[i] && inner.max[i] <= layer.box.max[i]);

/**
 * Every box beams land on for an imported stage: the design's own deck, risers and screens, then the tops of the MVR
 * meshes of the shown layers. The beam renderer takes all of them in its one `setSurfaces` call per rebuild (contract
 * section 9), so the two sources are joined here and never set one after the other. A mesh top carries no layer, and
 * a layer box is the union of its meshes, so a top counts as hidden when it lies inside a hidden layer's box and in
 * no shown layer's box: a hidden hall around the stage keeps no beam surface, the stage inside it keeps its own.
 */
export function mvrSurfaces(design: StageDesign, geometry: MvrGeometry): SurfaceBox[] {
  const hidden = new Set(design.mvr?.hiddenLayers ?? []);
  const off = geometry.layers.filter((layer) => hidden.has(layer.layer));
  const on = geometry.layers.filter((layer) => !hidden.has(layer.layer));
  const shown = (top: SurfaceBox): boolean =>
    !off.some((layer) => inside(layer, top)) || on.some((layer) => inside(layer, top));
  return [...surfacesOf(design), ...geometry.surfaces.filter(shown)];
}
