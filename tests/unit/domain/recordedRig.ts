import recorded from './rig-expected.json';

/**
 * The original rig build, recorded by running index.html at 48a3b63 (lines 687-826) with three r160 on every fixture:
 * build order, positions, rigged pan/tilt, pixel strips, two aimAt targets and one dirFrom result per fixture.
 */
export const RECORDED_RIG = recorded;

/**
 * A value as the recording stored it. JSON keeps every double to the last bit but writes -0 as 0; the original code
 * made the same -0 the new code makes, so tests pass the actual value through the same step before they compare.
 */
export function asRecorded(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}
