import type { StageDesign, StageFixture } from '../../../domain/stage/StageDesign';
import { fixtureKey, occurrences } from '../../design/fixtureKey';
import { attr } from '../../xml/elements';

/** One element with its uuid and its key among the elements it is listed with. */
export interface KeyedElement {
  readonly element: Element;
  readonly uuid: string;
  readonly key: string;
}

/** Each element with its `uuid#occurrence` key, counted in the given order, as the import counts the scene walk. */
export function keyedElements(elements: readonly Element[]): KeyedElement[] {
  const withUuid = elements.map((element) => ({ element, uuid: attr(element, 'uuid') ?? '' }));
  const counted = occurrences(withUuid);
  return withUuid.map((item) => ({ ...item, key: fixtureKey(item.uuid, counted.get(item) ?? 0) }));
}

/**
 * The pairing for a show saved before the import record: no `imported` list and no `occurrence` (an older app version
 * drops both). Elements that share a uuid cannot be told apart by it, so each first takes the desk fixture that has
 * its usable file id, the id the import gave that fixture; only what is left is paired in order. By order alone,
 * deleting the first twin on the desk handed its element to the second twin, and each later twin got its neighbour's
 * values. No element is added or removed for such a show unless the user did it.
 */
export function legacyPairs(
  items: readonly KeyedElement[],
  design: StageDesign,
  ids: ReadonlyMap<Element, number>,
): Map<string, StageFixture> {
  const left = new Map<string, StageFixture[]>();
  for (const fixture of design.fixtures) {
    const uuid = design.mvr?.fixtures[String(fixture.id)]?.uuid;
    if (uuid !== undefined) left.set(uuid, [...(left.get(uuid) ?? []), fixture]);
  }
  const desk = new Map<string, StageFixture>();
  const free: KeyedElement[] = [];
  for (const item of items) {
    const twins = left.get(item.uuid) ?? [];
    const index = twins.findIndex((fixture) => fixture.id === ids.get(item.element));
    const [own] = index < 0 ? [] : twins.splice(index, 1);
    if (own) desk.set(item.key, own);
    else free.push(item);
  }
  for (const item of free) {
    const next = left.get(item.uuid)?.shift();
    if (next) desk.set(item.key, next);
  }
  return desk;
}
