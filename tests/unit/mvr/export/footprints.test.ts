// @vitest-environment jsdom
/**
 * Overlap checks with real footprints. A show packs fixtures by their GDTF mode's channel count (6-channel fixtures
 * 6 apart); measuring them by the desk type's larger layout reports overlaps that are not there.
 */
import { describe, expect, it } from 'vitest';
import type { MvrDesignInfo, MvrFixtureInfo } from '../../../../src/domain/stage/mvr.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { planPatches } from '../../../../src/mvr/export/autoPatch.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';

const fixture = (id: number, address: number): StageFixture => ({
  ...{ id, type: 'spot', role: 'front', trussId: null, position: [0, 0, 0], mount: 'hang' },
  patch: { universe: 1, address, mode: 'Six' },
});

const info = (uuid: string, footprint?: number): MvrFixtureInfo => ({
  ...{ uuid, layer: 'L', gdtfName: 'Acme@Six', gdtfMode: 'Six', type: 'spot' },
  ...(footprint === undefined ? {} : { footprint }),
});

const design = (fixtures: Record<string, MvrFixtureInfo>): MvrDesignInfo => ({
  ...{ fixtures, layers: [], hiddenLayers: [] },
  offset: [0, 0, 0],
});

/** A 6-channel mode whose 16-bit pan and tilt take two offsets each. */
const SIX = gdtfMode('Six', [
  ['Dimmer', 'Offset="1"'],
  ['Pan', 'Offset="2,3"'],
  ['Tilt', 'Offset="4,5"'],
  ['ColorAdd_R', 'Offset="6"'],
]);

const head = (n: number): string =>
  `<Fixture uuid="00000000-0000-4000-8000-00000000010${n}" name="H${n}"><GDTFSpec>Acme@Six</GDTFSpec>` +
  `<GDTFMode>Six</GDTFMode><FixtureID>${n}</FixtureID><Addresses><Address>${n * 6 - 5}</Address></Addresses></Fixture>`;

/** The Messy_Patch pattern: three 6-channel fixtures 6 apart, with their GDTF file. */
const SIX_FILE = makeMvr(
  sceneXml(`<Layer uuid="L" name="Rig"><ChildList>${head(1)}${head(2)}${head(3)}</ChildList></Layer>`),
  { 'Acme@Six.gdtf': makeGdtf({ geometries: '<Geometry Name="Body"><Beam Name="Beam"/></Geometry>', modes: SIX }) },
);

describe('patch overlaps with stored footprints', () => {
  it('stores the GDTF mode footprint of every imported fixture', async () => {
    const { design: imported } = await importMvr(SIX_FILE, { name: 'six.mvr' });
    const footprints = Object.values(imported.mvr?.fixtures ?? {}).map((entry) => entry.footprint);
    expect(footprints).toEqual([6, 6, 6]);
  });

  // A desk export holds no GDTF file, so only the luma data can carry the footprint to the second export.
  it('raises no overlap warning on the first or the second export generation', async () => {
    const first = await importMvr(SIX_FILE, { name: 'six.mvr' });
    const exported = exportMvr(first.design);
    const second = await importMvr(exported.bytes, { name: 'six.mvr' });
    expect([exported.summary.warnings, exportMvr(second.design).summary.warnings]).toEqual([[], []]);
    const footprints = Object.values(second.design.mvr?.fixtures ?? {}).map((entry) => entry.footprint);
    expect([footprints, second.design.fixtures.some((f) => 'footprint' in f)]).toEqual([[6, 6, 6], false]);
  });

  it('raises no warning for 6-channel fixtures 6 apart', () => {
    const plan = planPatches(
      [fixture(1, 1), fixture(2, 7), fixture(3, 13)],
      design({ 1: info('a', 6), 2: info('b', 6), 3: info('c', 6) }),
    );
    expect(plan.warnings).toEqual([]);
  });

  it('says "may overlap" when one footprint is an estimate', () => {
    const plan = planPatches([fixture(1, 1), fixture(2, 7)], design({ 1: info('a'), 2: info('b', 6) }));
    expect(plan.warnings.map((warning) => [warning.code, /may overlap/.test(warning.message)])).toEqual([
      ['patch-overlap', true],
    ]);
  });

  it('says "overlaps" when both footprints are real', () => {
    const plan = planPatches([fixture(1, 1), fixture(2, 6)], design({ 1: info('a', 6), 2: info('b', 6) }));
    expect(plan.warnings.map((warning) => /may overlap/.test(warning.message))).toEqual([false]);
  });
});
