/** The key of one `<Fixture>` element: its uuid and which element with that uuid it is, as `uuid#occurrence`. */
export function fixtureKey(uuid: string, occurrence: number): string {
  return `${uuid}#${occurrence}`;
}

/**
 * For each item, how many earlier items share its uuid. Broken files repeat a uuid; the import makes one desk fixture
 * of each element, and the export pairs them again by this count, as both keep file order.
 */
export function occurrences<T extends { readonly uuid: string }>(items: readonly T[]): Map<T, number> {
  const seen = new Map<string, number>();
  const counted = new Map<T, number>();
  for (const item of items) {
    const count = seen.get(item.uuid) ?? 0;
    counted.set(item, count);
    seen.set(item.uuid, count + 1);
  }
  return counted;
}
