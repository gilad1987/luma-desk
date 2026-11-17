// @vitest-environment jsdom
/**
 * A link footprint names the GDTF spec and mode it measured. Another tool may change a `<Fixture>`'s spec or mode and
 * keep the desk's `<UserData>`; the old count must then not come back as known, or a real overlap reads as a sure fit.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, makeZip, sceneXml } from '../../../shared/index.ts';

/** A 6-channel moving-head mode: the import types it `spot`, whose own estimate is larger than 6 channels. */
const SIX = gdtfMode('Six', [
  ['Dimmer', 'Offset="1"'],
  ['Pan', 'Offset="2,3"'],
  ['Tilt', 'Offset="4,5"'],
  ['ColorAdd_R', 'Offset="6"'],
]);

const head = (n: number): string =>
  `<Fixture uuid="00000000-0000-4000-8000-00000000020${n}" name="H${n}"><GDTFSpec>Acme@Six</GDTFSpec>` +
  `<GDTFMode>Six</GDTFMode><FixtureID>${n}</FixtureID><Addresses><Address>${n * 6 - 5}</Address></Addresses></Fixture>`;

/** Two 6-channel fixtures 6 apart, with their GDTF file. */
const SOURCE = makeMvr(sceneXml(`<Layer uuid="L" name="Rig"><ChildList>${head(1)}${head(2)}</ChildList></Layer>`), {
  'Acme@Six.gdtf': makeGdtf({ geometries: '<Geometry Name="Body"><Beam Name="Beam"/></Geometry>', modes: SIX }),
});

/**
 * The desk export of `SOURCE` after another tool ran `edit` over its scene, imported again. The export holds no GDTF
 * file, so only the link footprint can give a fixture its channel count back.
 */
async function reimport(edit: (scene: string) => string): Promise<{ footprints: unknown[]; mayOverlap: boolean[] }> {
  const entries = unzipSync(exportMvr((await importMvr(SOURCE, { name: 'six.mvr' })).design).bytes);
  const scene = edit(strFromU8(entries['GeneralSceneDescription.xml'] ?? new Uint8Array()));
  const archive = makeZip({ ...entries, 'GeneralSceneDescription.xml': scene });
  const { design } = await importMvr(archive, { name: 'x.mvr' });
  const footprints = Object.values(design.mvr?.fixtures ?? {}).map((info) => info.footprint);
  const mayOverlap = exportMvr(design).summary.warnings.map((warning) => /may overlap/.test(warning.message));
  return { footprints, mayOverlap };
}

/** `reimport` after another tool wrote `mode` into every `<GDTFMode>`. */
const reimportWithMode = (mode: string): ReturnType<typeof reimport> =>
  reimport((xml) => xml.replaceAll('<GDTFMode>Six</GDTFMode>', `<GDTFMode>${mode}</GDTFMode>`));

describe('link footprint and the GDTF spec and mode it measured', () => {
  it('does not restore the footprint after another tool changed the mode, so the patch "may overlap"', async () => {
    expect(await reimportWithMode('Twelve')).toEqual({ footprints: [undefined, undefined], mayOverlap: [true] });
  });

  it('restores the footprint when the mode only gained padding spaces', async () => {
    expect(await reimportWithMode(' Six ')).toEqual({ footprints: [6, 6], mayOverlap: [] });
  });

  it('does not restore the footprint after another tool changed the spec and kept the mode', async () => {
    const respec = (xml: string): string =>
      xml.replace(/<GDTFSpec>[^<]*<\/GDTFSpec>/g, '<GDTFSpec>Acme@Other</GDTFSpec>');
    expect(await reimport(respec)).toEqual({ footprints: [undefined, undefined], mayOverlap: [true] });
  });
});
