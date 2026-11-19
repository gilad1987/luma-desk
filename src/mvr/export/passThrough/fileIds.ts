import { fixtureIdNumber, positive } from '../../design/assignIds';
import { childText } from '../../xml/elements';

/**
 * A positive safe integer id, or `undefined`, read as the import reads it (`positive`): FixtureIDNumeric first, then
 * FixtureID only when it is digits only (`fixtureIdNumber`), so `1.0` or `0x1` is a label here too.
 */
export function numericId(element: Element): number | undefined {
  const numeric = childText(element, 'FixtureIDNumeric');
  const fromNumeric = numeric?.trim() ? positive(Number(numeric)) : undefined;
  return fromNumeric ?? positive(fixtureIdNumber(childText(element, 'FixtureID') ?? ''));
}

/** File ids that are usable: positive and held by one fixture only (a shared id made the desk assign one, D1). */
export function usableIds(elements: readonly Element[]): Map<Element, number> {
  const counts = new Map<number, number>();
  for (const id of elements.map(numericId)) if (id !== undefined) counts.set(id, (counts.get(id) ?? 0) + 1);
  const usable = new Map<Element, number>();
  for (const element of elements) {
    const id = numericId(element);
    if (id !== undefined && counts.get(id) === 1) usable.set(element, id);
  }
  return usable;
}
