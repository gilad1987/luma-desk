import { union, type Aabb } from '../math/Aabb';
import type { MeshPlacement } from '../scene/MvrScene';
import { isDrapePlacement } from './isDrapePlacement';
import { isRigPlacement } from './isRigPlacement';
import { placementBox } from './surfaces';

/**
 * The placed meshes of one `<Layer>` as one box, so a whole layer can be judged (hall, drapes or stage) and left out.
 */
export interface LayerBox {
  /** The layer's uuid, the key of `design.mvr.hiddenLayers`. */
  readonly layer: string;
  /** The layer's name: file text, read by the hall name rule and shown in the summary line. */
  readonly name: string;
  readonly box: Aabb;
  /** The layer holds a truss, a fixture body or an LED surface (`isRigPlacement`), so it is never the hall. */
  readonly rig: boolean;
  /** Every placed mesh of the layer is a drape (`isDrapePlacement`), so the layer starts hidden (`hallLayers`). */
  readonly drapes: boolean;
}

/**
 * One box per layer around the world boxes of its placed meshes (three frame, before the fit offset), in the order
 * the layers first appear. A layer without a readable mesh has nothing to draw and gets no box.
 */
export function layerBoxes(
  placements: readonly MeshPlacement[],
  meshBoxes: ReadonlyMap<string, Aabb>,
): readonly LayerBox[] {
  const byLayer = new Map<string, LayerBox>();
  for (const placement of placements) {
    const box = placementBox(placement, meshBoxes);
    if (!box) continue;
    const seen = byLayer.get(placement.layer);
    byLayer.set(placement.layer, {
      layer: placement.layer,
      name: placement.layerName,
      box: seen ? union(seen.box, box) : box,
      rig: (seen?.rig ?? false) || isRigPlacement(placement),
      drapes: (seen?.drapes ?? true) && isDrapePlacement(placement),
    });
  }
  return [...byLayer.values()];
}
