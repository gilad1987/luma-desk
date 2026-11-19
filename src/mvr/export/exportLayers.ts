import type { MvrLayer } from '../../domain/stage/mvr';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { SCENERY_PARTS, type SceneryPart } from '../../domain/stage/types';
import { layerKeys } from '../scene/layerKeys';
import { stableUuid } from './stableUuid';

/** One `<Layer>` the export writes. */
export interface ExportLayer {
  /** The desk's key of the layer; fixtures and objects find their layer by it. */
  readonly uuid: string;
  readonly name: string;
  /** The uuid written when it differs from the key: the file's own (shared by two layers) or a made one. */
  readonly fileUuid?: string;
}

/** The layers of one export and where each kind of element goes. */
export interface LayerPlan {
  /** In file order: the layers of an imported design first, then one per scenery part, then `Fixtures`. */
  readonly all: readonly ExportLayer[];
  /** The layer uuid of a scenery part. */
  readonly partLayer: (part: SceneryPart) => string;
  /** The layer uuid of the fixture with desk id `id`: its imported layer when that still exists, else `Fixtures`. */
  readonly layerOf: (id: number) => string;
  /** By the key now, the key the next import gives the layer as written, so the luma data names the same layers. */
  readonly keyAfter: ReadonlyMap<string, string>;
}

/**
 * The uuid a kept layer is written with: its key, or the file's uuid when that differs (two layers shared it). A
 * layer the file gave no uuid gets a made one, as MVR needs a uuid on every layer; it is made from the file and the
 * layer's place, so two exports of one design write the same text.
 */
function writtenUuid(layer: MvrLayer, index: number, design: StageDesign): string | undefined {
  if (layer.fileUuid === undefined) return undefined;
  if (layer.fileUuid !== '') return layer.fileUuid;
  return stableUuid(`layer|${design.source.fileHash ?? design.source.name}|${index}`);
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
  const kept = (design.mvr?.layers ?? []).map((layer, index): ExportLayer => {
    const fileUuid = writtenUuid(layer, index, design);
    return { uuid: layer.uuid, name: layer.name, ...(fileUuid === undefined ? {} : { fileUuid }) };
  });
  const keptIds = new Set(kept.map((layer) => layer.uuid));
  const partLayer = (part: SceneryPart): string => stableUuid(`layer|${part}`);
  const own: ExportLayer[] = SCENERY_PARTS.map((part) => ({ uuid: partLayer(part), name: PART_NAMES[part] }));
  const fixtures: ExportLayer = { uuid: stableUuid('layer|fixtures'), name: 'Fixtures' };
  const all = [...kept, ...[...own, fixtures].filter((layer) => !keptIds.has(layer.uuid))];
  const layerOf = (id: number): string => {
    const layer = design.mvr?.fixtures[String(id)]?.layer;
    return layer !== undefined && keptIds.has(layer) ? layer : fixtures.uuid;
  };
  const after = layerKeys(all.map((layer) => layer.fileUuid ?? layer.uuid));
  const keyAfter = new Map(all.map((layer, index) => [layer.uuid, after[index] ?? layer.uuid]));
  return { all, partLayer, layerOf, keyAfter };
}
