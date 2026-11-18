import type { Aabb } from '../math/Aabb';
import type { MvrWarning } from '../MvrWarning';
import { isHallLayer } from './isHallLayer';
import type { LayerBox } from './layerBoxes';

/**
 * The uuids of the layers that are the venue hall (`isHallLayer` against the stage core), which the design hides at
 * the start. One summary line names them, so the user knows why part of the file is not drawn and where to turn it on.
 */
export function hallLayers(layers: readonly LayerBox[], core: Aabb, warn: (warning: MvrWarning) => void): string[] {
  const hall = layers.filter((layer) => isHallLayer(layer, core));
  if (hall.length > 0) {
    const names = hall.map((layer) => layer.name || layer.layer).join(', ');
    const message = `Layers hidden at the start as the venue hall (turn them on in the layer list): ${names}.`;
    warn({ code: 'hidden-layers', message });
  }
  return hall.map((layer) => layer.layer);
}
