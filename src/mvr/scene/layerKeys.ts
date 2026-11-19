import type { MvrWarning } from '../MvrWarning';
import { attr } from '../xml/elements';
import type { MvrLayerInfo } from './MvrScene';

/**
 * One key per layer, unique in the file, in document order. The desk hides, marks and groups layers by this key, so
 * two `<Layer>`s with the same uuid, or with none, must not share one: a click on one row would hide both. The first
 * layer with a uuid keeps it as its key, so a show saved with plain uuids still finds that layer, as before. A later
 * layer with the same uuid gets `uuid#index`, and a layer with no uuid `#index`, where `index` is its place in the
 * file; the same file read again gives the same keys, so hidden and marked layers saved by key come back. A key that
 * is already a uuid of the file gets one more `#` until it is free.
 */
export function layerKeys(uuids: readonly string[]): string[] {
  const taken = new Set(uuids);
  const kept = new Set<string>();
  return uuids.map((uuid, index) => {
    if (uuid !== '' && !kept.has(uuid)) {
      kept.add(uuid);
      return uuid;
    }
    let key = `${uuid}#${index}`;
    while (taken.has(key)) key += '#';
    taken.add(key);
    return key;
  });
}

/**
 * The one warning for the layers that share a uuid or have none, or `undefined` when every layer has its own. It is
 * one line for all of them, as the user can do nothing per layer: the list still shows each one by its name.
 */
export function sharedLayerWarning(uuids: readonly string[]): MvrWarning | undefined {
  // counted in one pass, as a hostile file may hold very many layers
  const counts = new Map<string, number>();
  for (const uuid of uuids) counts.set(uuid, (counts.get(uuid) ?? 0) + 1);
  const shared = uuids.filter((uuid) => uuid === '' || (counts.get(uuid) ?? 0) > 1).length;
  if (shared === 0) return undefined;
  const message = `${shared} layers share a uuid or have none; the desk tells them apart by their order.`;
  return { code: 'shared-layer-uuid', message };
}

/** The `<Layer>` elements as layer infos in file order, keyed by `layerKeys`; a shared or missing uuid warns once. */
export function layerInfos(elements: readonly Element[], warnings: MvrWarning[]): MvrLayerInfo[] {
  const fileUuids = elements.map((layer) => attr(layer, 'uuid') ?? '');
  const shared = sharedLayerWarning(fileUuids);
  if (shared) warnings.push(shared);
  const keys = layerKeys(fileUuids);
  return elements.map((layer, index) => {
    const uuid = keys[index] ?? '';
    const fileUuid = fileUuids[index] ?? '';
    return { uuid, name: attr(layer, 'name') ?? '', ...(fileUuid === uuid ? {} : { fileUuid }) };
  });
}
