/**
 * How far each measured number lies from the expected one, with 0 for every number within `tolerance`. A spec
 * asserts `toEqual` on an array of zeros, so a failure shows which number is off and by how much, not only `false`.
 */
export function offBy(actual: readonly number[], expected: readonly number[], tolerance: number): number[] {
  if (actual.length !== expected.length) throw new Error(`offBy: ${actual.length} numbers against ${expected.length}`);
  return actual.map((value, i) => {
    const delta = value - (expected[i] ?? 0);
    return Math.abs(delta) <= tolerance ? 0 : delta;
  });
}
