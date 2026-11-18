import type { Group } from 'three';
import type { MeshPlacement, MvrGeometry } from '../../mvr/index';
import { layerGroup } from './layerGroup';
import type { MeshLibrary } from './MeshLibrary';
import type { MeshPart } from './MeshPart';

/** Called after each mesh file is parsed, so the UI can show how far a large import has come. */
export type MvrProgress = (done: number, total: number) => void;

/** Placements grouped by layer uuid, then by mesh file, in scene order. */
function byLayerAndFile(placements: readonly MeshPlacement[]): Map<string, Map<string, MeshPlacement[]>> {
  const layers = new Map<string, Map<string, MeshPlacement[]>>();
  for (const placement of placements) {
    const files = layers.get(placement.layer) ?? new Map<string, MeshPlacement[]>();
    const filePlacements = files.get(placement.file) ?? [];
    filePlacements.push(placement);
    files.set(placement.file, filePlacements);
    layers.set(placement.layer, files);
  }
  return layers;
}

/**
 * Files parsed together before the next batch waits a macrotask. 3DS parsing is synchronous, so one batch for a
 * thousand files would freeze the page with no progress drawn and hold a byte copy of every file at once.
 */
const PARSE_BATCH = 8;

/** Lets the browser paint and handle input between parse batches. */
function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Parses every distinct file once through the library, a batch at a time, and reports progress per finished file. */
async function loadParts(
  files: readonly string[],
  library: MeshLibrary,
  onProgress: MvrProgress | undefined,
): Promise<ReadonlyMap<string, readonly MeshPart[]>> {
  const parts = new Map<string, readonly MeshPart[]>();
  for (let start = 0; start < files.length; start += PARSE_BATCH) {
    if (start > 0) await nextTask();
    const batch = files.slice(start, start + PARSE_BATCH);
    await Promise.all(
      batch.map(async (file) => {
        parts.set(file, await library.parts(file));
        onProgress?.(parts.size, files.length);
      }),
    );
  }
  return parts;
}

/**
 * The MVR scenery as one group per layer uuid, so hiding a layer is one `visible` flag. Instancing and merging are
 * per layer: a file shared across two layers is instanced in each, which keeps every layer independent to hide.
 */
export async function buildLayers(
  geometry: MvrGeometry,
  library: MeshLibrary,
  onProgress?: MvrProgress,
): Promise<Map<string, Group>> {
  const layers = byLayerAndFile(geometry.placements);
  const files = [...new Set(geometry.placements.map((placement) => placement.file))];
  const parts = { byFile: await loadParts(files, library, onProgress), screen: library.screenMaterial };
  return new Map([...layers].map(([uuid, layerFiles]) => [uuid, layerGroup(layerFiles, parts, geometry.offset)]));
}
