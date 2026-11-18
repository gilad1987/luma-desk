import type { Aabb } from '../math/Aabb';
import type { MvrWarning } from '../MvrWarning';
import { isHallLayer } from './isHallLayer';
import type { LayerBox } from './layerBoxes';

/**
 * A layer of drapes only, without rig: the closure drapes around a stage hang at its sides and in front of it and
 * hide the stage from every view but the one from the back, so they start hidden like the hall.
 */
const isDrapeLayer = (layer: LayerBox): boolean => layer.drapes && !layer.rig;

/** The layers the design hides at the start (`hidden`), and the venue hall alone, which the fit leaves out (`hall`). */
export interface HallLayers {
  readonly hidden: string[];
  readonly hall: string[];
}

/**
 * The uuids of the layers that are the venue hall (`isHallLayer` against the stage core) or stage drapes
 * (`isDrapeLayer`), which the design hides at the start; the data and the export keep them. One summary line names
 * them, so the user knows why part of the file is not drawn and where to turn it on. Drapes stay in the box that sets
 * the fit offset: a stored show re-imports its file to draw the scenery, and its fixtures keep the offset they were
 * fitted with, so a change of offset would draw the scenery shifted from the rig.
 */
export function hallLayers(layers: readonly LayerBox[], core: Aabb, warn: (warning: MvrWarning) => void): HallLayers {
  const hall = layers.filter((layer) => isHallLayer(layer, core));
  const hidden = layers.filter((layer) => isHallLayer(layer, core) || isDrapeLayer(layer));
  if (hidden.length > 0) {
    const names = hidden.map((layer) => layer.name || layer.layer).join(', ');
    const message =
      'Layers hidden at the start as the venue hall or stage drapes (turn them on in the layer list): ' + `${names}.`;
    warn({ code: 'hidden-layers', message });
  }
  return { hidden: hidden.map((layer) => layer.layer), hall: hall.map((layer) => layer.layer) };
}
