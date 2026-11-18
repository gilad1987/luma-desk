// @vitest-environment jsdom
/**
 * Every template exported and read back by the import's own scene walk: same fixtures, ids, patches and world
 * positions, and the same bytes on a second export. Type mapping and design building are the importer's steps and
 * are tested there; this file owns the file the exporter writes.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { mountShift } from '../../../../src/mvr/design/mountShift.ts';
import { planPatches } from '../../../../src/mvr/export/autoPatch.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { pointToThree } from '../../../../src/mvr/math/axes.ts';
import { transformPoint } from '../../../../src/mvr/math/Mat4.ts';
import { patchFromAddresses } from '../../../../src/mvr/patch/address.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';

const SCENE_FILE = 'GeneralSceneDescription.xml';

/** The archive entries of an export, and its scene read by the import's walk. */
function readExport(bytes: Uint8Array): { files: string[]; scene: ReturnType<typeof walkScene> } {
  const entries = unzipSync(bytes);
  return {
    files: Object.keys(entries),
    scene: walkScene(parseXml(strFromU8(entries[SCENE_FILE] ?? new Uint8Array()))),
  };
}

describe.each(TEMPLATE_IDS)('exportMvr of the %s template', (id) => {
  const design = createTemplate(id);
  const { bytes, summary } = exportMvr(design);
  const { files, scene } = readExport(bytes);

  it('holds only the scene file and reads back every fixture with its desk id, in design order', () => {
    const ids = scene.fixtures.map((fixture) => fixture.fixtureIdNumeric);
    expect([files, ids, scene.warnings]).toEqual([[SCENE_FILE], design.fixtures.map((fixture) => fixture.id), []]);
  });

  // The MVR matrix holds the mounting point; the desk position is the model origin (tilt axis), one mount height off.
  it('places every fixture within 1 mm of its design position, read back from its mounting point', () => {
    const worst = scene.fixtures.reduce((max, fixture, index) => {
      const own = design.fixtures[index];
      const mounting = pointToThree(transformPoint(fixture.matrix, [0, 0, 0]));
      const position = own ? mountShift({ ...own, position: mounting }, 'toBody') : [NaN, NaN, NaN];
      const expected = own?.position ?? [NaN, NaN, NaN];
      return Math.max(max, ...position.map((value, axis) => Math.abs(value - (expected[axis] ?? NaN))));
    }, 0);
    expect(worst).toBeLessThan(0.001);
  });

  it('patches every fixture as planned, on break 0', () => {
    const { patches } = planPatches(design.fixtures, design.mvr);
    const read = scene.fixtures.map((fixture) => patchFromAddresses(fixture.addresses, fixture.uuid).patch);
    const planned = design.fixtures.map((fixture) => {
      const patch = patches.get(fixture.id);
      return patch && { universe: patch.universe, address: patch.address };
    });
    expect(read).toStrictEqual(planned);
  });

  it('counts what it wrote and writes the same bytes again', () => {
    const trusses = scene.placements.filter((placement) => placement.kind === 'Truss').length;
    expect([summary.fixtures, summary.autoPatched, summary.trusses, summary.layers]).toEqual([
      design.fixtures.length,
      design.fixtures.length,
      trusses,
      6,
    ]);
    expect(exportMvr(createTemplate(id)).bytes).toStrictEqual(bytes);
  });
});

describe('exportMvr meshes and notes', () => {
  it('adds the given mesh files, lists them in the summary and counts them in the notes', () => {
    const mesh = new Uint8Array([1, 2, 3]);
    const { bytes, summary } = exportMvr(createTemplate('theatre'), {
      meshes: new Map([['luma_truss_front.glb', mesh]]),
    });
    expect([unzipSync(bytes)['luma_truss_front.glb'], summary.notes.at(-1)]).toStrictEqual([
      mesh,
      'Geometry files included: 1.',
    ]);
  });

  it('tells the user that GDTF files come from GDTF-Share and that no geometry is included', () => {
    const { geometryFiles, notes } = exportMvr(createTemplate('theatre')).summary;
    expect([notes[0]?.startsWith('GDTF files are not included; get them from GDTF-Share: '), notes.at(-1)]).toEqual([
      true,
      'Geometry files included: 0.',
    ]);
    expect(geometryFiles).toEqual([]);
  });
});
