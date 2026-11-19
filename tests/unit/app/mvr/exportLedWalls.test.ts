// @vitest-environment jsdom
/** The wall level and the generated content are view state of the desk: an MVR export never carries them. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportStageMvr } from '../../../../src/app/mvr/exportStageMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { ledWallPercent, setLedWallPercent } from '../../../../src/render/mvr/led/ledUniforms';
import { makeMvr, sceneXml } from '../../../shared';

afterEach(() => {
  setLedWallPercent(25);
  vi.useRealTimers();
});

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
/** A file with a rig layer and a second layer, which stands for the one the far rule hides at the start. */
const SOURCE = new Uint8Array(
  makeMvr(
    sceneXml(
      `<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer><Layer uuid="L9" name="Layer Z"><ChildList></ChildList></Layer>`,
    ),
  ),
);

/** The bytes of a downloaded file. */
function bytesOf(file: unknown): Promise<number[]> {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) return reject(new Error('the download is not a Blob'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result instanceof ArrayBuffer ? [...new Uint8Array(reader.result)] : []);
    reader.readAsArrayBuffer(file);
  });
}

describe('MVR export', () => {
  it('writes the same file at every wall level: level and content are view state', async () => {
    // The archive stamps its entries with the date, so both exports get the same one.
    vi.useFakeTimers({ toFake: ['Date'] });
    const design: StageDesign = { ...createTemplate('theatre'), source: { kind: 'mvr', name: 'Rig.mvr' } };
    const files: unknown[] = [];
    const deps = { toast: vi.fn(), download: (bytes: unknown) => void files.push(bytes) };
    await exportStageMvr(design, deps);
    setLedWallPercent(100);
    await exportStageMvr(design, deps);
    expect(ledWallPercent()).toBe(100);
    const [atDefault, atFull] = [await bytesOf(files[0]), await bytesOf(files[1])];
    expect(atDefault.length).toBeGreaterThan(100);
    expect(atFull).toEqual(atDefault);
  });

  it('writes the same file with and without LED marks, and keeps a hidden far layer in it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { importMvr } = await import('../../../../src/mvr');
    const first = (await importMvr(SOURCE, { name: 'Rig.mvr' })).design;
    if (!first.mvr) throw new Error('the import has MVR facts');
    // the state after the far rule hid the layer: hidden in the design, and the user marked the other as LED
    const hidden = { ...first.mvr, hiddenLayers: ['L9'] };
    const design: StageDesign = { ...first, source: { ...first.source, fileHash: 'h' }, mvr: hidden };
    const marked: StageDesign = { ...design, mvr: { ...hidden, ledLayers: ['L1'] } };
    const files: unknown[] = [];
    const download = (bytes: unknown): void => void files.push(bytes);
    const deps = { toast: vi.fn(), download, store: { get: () => Promise.resolve(SOURCE) } };
    await exportStageMvr(design, deps);
    await exportStageMvr(marked, deps);
    const [plain, withMarks] = [await bytesOf(files[0]), await bytesOf(files[1])];
    expect(plain.length).toBeGreaterThan(100);
    expect(withMarks).toEqual(plain);
    const again = (await importMvr(new Uint8Array(plain), { name: 'Rig.mvr' })).design.mvr;
    expect(again?.layers.map((layer) => layer.name)).toEqual(['Rig', 'Layer Z']);
    expect(again?.ledLayers).toBeUndefined();
  });
});
