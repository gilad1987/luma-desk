import recorded from '../../golden/rig-build.json';

/**
 * The original rig build: build order, positions, rigged pan/tilt, pixel strips, two aimAt targets and one dirFrom
 * result per fixture. `node scripts/recordRigGolden.ts` recorded it by running index.html at 48a3b63 (lines 686-828)
 * with three r160; JSON keeps every double to the last bit but writes -0 as 0, so tests compare through
 * `jsonRoundTrip`.
 */
export const RECORDED_RIG = recorded;
