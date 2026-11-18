// @vitest-environment jsdom
/**
 * A fixture whose GDTF gives its body a real size keeps that size and its desk position through a desk export and a
 * re-import. The desk export holds no GDTF file, so the size must travel in the luma link; without it the re-import
 * draws the desk's own size and moves the fixture by the change in mount shift. All products are invented.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportContext } from '../../../src/mvr/export/ExportContext.ts';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { fixtureXml } from '../../../src/mvr/export/fixtureXml.ts';
import { readMvrMatrix } from '../../../src/mvr/math/Mat4.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { expectRigKept, gdtfMode, makeGdtf, makeMvr, mvrMatrix, sceneXml } from '../../shared/index.ts';

const MATRIX = '{1,0,0}{0,1,0}{0,0,1}{40000,25000,8000}';
const BODY_SIZE = 0.5;
const GDTF = makeGdtf({
  models: `<Model Name="Body" Length="0.3" Width="0.3" Height="${BODY_SIZE}"/>`,
  geometries: '<Geometry Name="Body" Model="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2"'],
  ]),
});
const SCENE = sceneXml(
  `<Layer uuid="L1" name="Rig"><ChildList><Fixture uuid="U-1" name="Light 1"><Matrix>${MATRIX}</Matrix>` +
    '<GDTFSpec>Acme@Sized</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>1</FixtureID></Fixture></ChildList></Layer>',
);

/** Checks a written matrix entry by entry against the file's own, to the 6 decimals the export writes. */
function expectFileMatrix(written: Iterable<number> | undefined): void {
  const got = [...(written ?? [])];
  [...mvrMatrix(MATRIX)].forEach((value, i) => expect(got[i], `matrix entry ${i}`).toBeCloseTo(value, 6));
}

/** The world matrix of the one fixture in an exported file, read by the import's own scene walk. */
function exportedMatrix(bytes: Uint8Array): Float64Array | undefined {
  const entries = unzipSync(bytes);
  const scene = walkScene(parseXml(strFromU8(entries['GeneralSceneDescription.xml'] ?? new Uint8Array())));
  return scene.fixtures[0]?.matrix;
}

describe('MVR round trip of a fixture with a GDTF body size', () => {
  it('keeps the body size, the desk position and the file matrix through a desk export', async () => {
    const first = await importMvr(makeMvr(SCENE, { 'Acme@Sized.gdtf': GDTF }), { name: 'Sized.mvr' });
    const { bytes } = exportMvr(first.design);
    const second = await importMvr(bytes, { name: 'Sized.mvr' });
    expect(first.design.mvr?.fixtures['1']?.bodySize).toBe(BODY_SIZE);
    expect(Object.keys(unzipSync(bytes)).some((file) => file.endsWith('.gdtf'))).toBe(false);
    expect(second.design.mvr?.fixtures['1']?.bodySize).toBe(BODY_SIZE);
    expect(second.design.fixtures[0]?.position).toEqual(first.design.fixtures[0]?.position);
    expectRigKept(first.design, second.design);
    expectFileMatrix(exportedMatrix(bytes));
  });

  it('writes the file matrix for a sized fixture in fixtureXml', async () => {
    const { design } = await importMvr(makeMvr(SCENE, { 'Acme@Sized.gdtf': GDTF }), { name: 'Sized.mvr' });
    const [fixture] = design.fixtures;
    const xml = fixture ? fixtureXml(fixture, { patch: undefined, unit: 1 }, exportContext(design)) : '';
    expect(design.mvr?.fixtures['1']?.bodySize).toBe(BODY_SIZE);
    expectFileMatrix(readMvrMatrix(/<Matrix>([^<]*)<\/Matrix>/.exec(xml)?.[1]));
  });
});
