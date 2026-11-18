import { childText } from '../../xml/elements';

/** A positive integer id, or `undefined`; FixtureIDNumeric first, as the import reads it. */
export function numericId(element: Element): number | undefined {
  for (const text of [childText(element, 'FixtureIDNumeric'), childText(element, 'FixtureID')]) {
    const value = Number(text ?? '');
    if (text && Number.isInteger(value) && value > 0) return value;
  }
  return undefined;
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
