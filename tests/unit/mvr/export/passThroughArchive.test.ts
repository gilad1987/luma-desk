// @vitest-environment jsdom
/** The archive side of a pass-through export: compression kept, unsafe names reported, a damaged original falls back. */
import { strToU8, unzipSync, zipSync, type UnzipFileInfo } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passScene, passUuid as u } from '../../../shared/index.ts';

const MESH = strToU8('mesh bytes '.repeat(50));
const methods = (bytes: Uint8Array): Record<string, number> => {
  const found: Record<string, number> = {};
  unzipSync(bytes, { filter: (entry: UnzipFileInfo) => ((found[entry.name] = entry.compression), false) });
  return found;
};
const original = zipSync({
  'GeneralSceneDescription.xml': strToU8(passScene(fx(u(1), 1, { addresses: '<Address>1</Address>' }))),
  'stored.3ds': [MESH, { level: 0 }],
  'packed.3ds': [MESH, { level: 6 }],
  'textures/wood.png': [MESH, { level: 0 }],
  '../evil.txt': strToU8('outside'),
});

describe('pass-through archive', () => {
  it('keeps stored and deflated entries as they were and reports an unsafe name', async () => {
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const { bytes, summary } = exportMvr(design, { original });
    expect(methods(bytes)).toMatchObject({ 'stored.3ds': 0, 'packed.3ds': 8, 'textures/wood.png': 0 });
    expect(Object.keys(unzipSync(bytes))).not.toContain('../evil.txt');
    expect(summary.report.losses.some((note) => note.text.includes('"../evil.txt"'))).toBe(true);
  });

  it('falls back to the plain writer and says why when the original is damaged', async () => {
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const { summary } = exportMvr(design, { original: strToU8('not a zip') });
    expect(summary.kept).toBeUndefined();
    expect(summary.report.losses.some((note) => note.text.startsWith('The original file could not be used'))).toBe(
      true,
    );
  });

  it('lists the loss when a desk-built stage of an MVR file is exported', async () => {
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const { summary } = exportMvr({ ...design, source: { ...design.source, kind: 'builder' } }, { original });
    expect(summary.report.losses.some((note) => note.text.startsWith('Stage changes made on the desk'))).toBe(true);
  });
});
