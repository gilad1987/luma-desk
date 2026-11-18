import { emptyBox, pointBox, union, type Aabb, type Point3 } from '../math/Aabb';
import type { LayerBox } from './layerBoxes';
import { nearFixtures } from './nearFixtures';

/**
 * The stage of an MVR file: the box of the layers that are shown and are not the venue hall, plus the fixtures,
 * less fixtures far outside those meshes (front of house, see `nearFixtures`). The fit offset centres it and the
 * oversize warning measures it, and the camera frames it; the box of every mesh would hold the hall and the FOH
 * positions and push the real stage off the desk's stage. Pass the hidden and the hall layer uuids as `excluded`;
 * all inputs share one frame (three frame, before or after the fit), and so does the result.
 */
export function stageBox(layers: readonly LayerBox[], fixtures: readonly Point3[], excluded: readonly string[]): Aabb {
  const skip = new Set(excluded);
  const meshBox = layers
    .filter((layer) => !skip.has(layer.layer))
    .map((layer) => layer.box)
    .reduce(union, emptyBox());
  return nearFixtures(fixtures, meshBox).map(pointBox).reduce(union, meshBox);
}
