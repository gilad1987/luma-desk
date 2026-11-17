// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr/index.ts';
import { importCounts, readSample, SAMPLES_DIR, sampleFiles } from '../../../shared/index.ts';

/**
 * Local-only checks against real MVR files, which are third-party or private and so never committed. Set
 * `MVR_SAMPLES_DIR` to a folder of `.mvr` files; files are recognised by name and checked against the numbers the
 * plan verified by hand (mvr-v2 sections 10.2 and 10.3). Every other file, such as the official gdtf.eu samples,
 * has to import without an error, and its counts are logged.
 */
const FILES = sampleFiles();

/**
 * The file name, inside `MVR_SAMPLES_DIR`, of the private reference show. It comes from the environment so that no
 * committed file names the show; without it, the show (if present) is only imported and logged.
 */
const REFERENCE = process.env['MVR_REFERENCE_SHOW'];

/** Distinct owning objects per placement kind, for example `Truss` or `VideoScreen`. */
function objectsOfKind(result: MvrImport, kind: string): number {
  return new Set(result.geometry.placements.filter((p) => p.kind === kind).map((p) => p.uuid)).size;
}

const countCodes = (result: MvrImport, code: string): number => result.warnings.filter((w) => w.code === code).length;

/**
 * The private reference show (plan section 10.3). Two plan numbers are corrected by an independent Python walk:
 * 1479 placements (the plan's 1508 also counted the 29 `Geometry3D` inside Symdefs as their own placements), and only
 * 24 of the 48 `Speaker` elements (and no `SpeakerBumper`) carry `Geometries`, so only those own placements.
 */
function checkReference(result: MvrImport): void {
  const { summary, design } = result;
  expect(summary).toMatchObject({ fixtureCount: 248, unpatchedCount: 195, missingGdtfCount: 30, placementCount: 1479 });
  expect(summary.layerCount).toBe(32);
  expect(countCodes(result, 'missing-gdtf')).toBe(2);
  expect(new Set(result.geometry.placements.map((p) => p.file)).size).toBe(547);
  expect([objectsOfKind(result, 'Truss'), objectsOfKind(result, 'VideoScreen')]).toEqual([25, 2]);
  expect([objectsOfKind(result, 'Speaker'), objectsOfKind(result, 'SpeakerBumper')]).toEqual([24, 0]);
  expect(design.fixtures[0]?.id).toBe(6001);
  // The show's layers are named in Hebrew; the check keeps that case covered without writing a real name here.
  expect(design.mvr?.layers.some((layer) => /[\u0590-\u05FF]/.test(layer.name))).toBe(true);
}

/** Public samples (plan section 10.2), when the user has copied them in. */
const CHECKS: readonly (readonly [string, (result: MvrImport) => void])[] = [
  [
    'basic_fixture',
    (r) => expect([r.summary.fixtureCount, countCodes(r, 'multi-break'), r.summary.noGeometry]).toEqual([1, 1, true]),
  ],
  ['scene_objects', (r) => expect([r.summary.fixtureCount, objectsOfKind(r, 'SceneObject')]).toEqual([72, 28])],
  [
    'capture_demo_show',
    (r) => {
      expect([r.summary.fixtureCount, objectsOfKind(r, 'Truss')]).toEqual([76, 13]);
      expect(r.design.fixtures[0]?.patch).toMatchObject({ universe: 2, address: 1 });
    },
  ],
];

describe.skipIf(SAMPLES_DIR === undefined)('local MVR samples', () => {
  // Without it an empty folder would end in "No test found in suite" instead of naming the real problem.
  it('finds .mvr files in MVR_SAMPLES_DIR', () => {
    expect(FILES, `no .mvr file in ${SAMPLES_DIR ?? ''}`).not.toEqual([]);
  });

  it.runIf(REFERENCE !== undefined)('finds MVR_REFERENCE_SHOW in MVR_SAMPLES_DIR', () => {
    expect(FILES).toContain(REFERENCE);
  });

  it.each(FILES)(
    'imports %s',
    async (file) => {
      const start = performance.now();
      const result = await importMvr(readSample(file), { name: file });
      const ms = Math.round(performance.now() - start);
      console.info(file, `${ms} ms`, importCounts(result));
      const kinds = new Set(result.geometry.placements.map((p) => p.kind));
      console.info(
        file,
        'objects per kind:',
        Object.fromEntries([...kinds].map((kind) => [kind, objectsOfKind(result, kind)])),
      );
      const check = file === REFERENCE ? checkReference : CHECKS.find(([prefix]) => file.startsWith(prefix))?.[1];
      check?.(result);
    },
    120_000,
  );
});
