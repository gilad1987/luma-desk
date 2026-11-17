import type { StageDesign } from '../../domain/stage/StageDesign';
import { SCENERY_PARTS, type SceneryPart } from '../../domain/stage/types';
import { stableUuid } from './stableUuid';

/** One `<Layer>` the export writes. */
export interface ExportLayer {
  readonly uuid: string;
  readonly name: string;
}

/** The layers of one export and where each kind of element goes. */
export interface LayerPlan {
  /** In file order: the layers of an imported design first, then one per scenery part, then `Fixtures`. */
  readonly all: readonly ExportLayer[];
  /** The layer uuid of a scenery part. */
  readonly partLayer: (part: SceneryPart) => string;
  /** The layer uuid of the fixture with desk id `id`: its imported layer when that still exists, else `Fixtures`. */
  readonly layerOf: (id: number) => string;
}

const PART_NAMES: Readonly<Record<SceneryPart, string>> = {
  deck: 'Deck',
  trusses: 'Trusses',
  band: 'Band',
  ledWall: 'LED wall',
  crowd: 'Crowd',
};

/**
 * Plans the layers: one per scenery part, so a console can hide the deck or the trusses as a whole, and one for the
 * fixtures. These uuids are keyed by the part only, not by the design, so a design imported from a desk export and
 * exported again finds its layers already there and does not add a second set. The layers of an imported design keep
 * their uuids and names (Hebrew included), and its fixtures stay in them.
 */
export function planLayers(design: StageDesign): LayerPlan {
  const kept = (design.mvr?.layers ?? []).map(({ uuid, name }) => ({ uuid, name }));
  const keptIds = new Set(kept.map((layer) => layer.uuid));
  const partLayer = (part: SceneryPart): string => stableUuid(`layer|${part}`);
  const own: ExportLayer[] = SCENERY_PARTS.map((part) => ({ uuid: partLayer(part), name: PART_NAMES[part] }));
  const fixtures: ExportLayer = { uuid: stableUuid('layer|fixtures'), name: 'Fixtures' };
  const all = [...kept, ...[...own, fixtures].filter((layer) => !keptIds.has(layer.uuid))];
  const layerOf = (id: number): string => {
    const layer = design.mvr?.fixtures[String(id)]?.layer;
    return layer !== undefined && keptIds.has(layer) ? layer : fixtures.uuid;
  };
  return { all, partLayer, layerOf };
}
