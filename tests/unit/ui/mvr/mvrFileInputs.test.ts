/**
 * Owns the MVR file inputs and buttons: the Show File row hands a pick to the import and Export MVR to the export,
 * and a pick clears its input so the same file fires again, while an empty pick imports nothing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importPickedFile } from '../../../../src/ui/panels/mvr/importPickedFile';
import { wireMvrButtons } from '../../../../src/ui/panels/mvr/wireMvrButtons';
import { asReal, FakeDom, FakeFileInput } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

const actions = () => ({ importFile: vi.fn(), loadDemoRig: vi.fn(), exportMvr: vi.fn() });
const picked = (files: readonly File[] | null): FakeFileInput => Object.assign(new FakeFileInput(), { files });

describe('importPickedFile', () => {
  it('imports the picked file and clears the input', () => {
    const file = new File([], 'Rig.mvr');
    const input = Object.assign(picked([file]), { value: 'C:\\fakepath\\Rig.mvr' });
    const mvr = actions();
    importPickedFile(asReal(input), mvr);
    expect(mvr.importFile).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('ignores an empty pick and leaves the input as it was', () => {
    const mvr = actions();
    for (const files of [null, []]) importPickedFile(asReal(picked(files)), mvr);
    expect(mvr.importFile).not.toHaveBeenCalled();
  });
});

describe('wireMvrButtons', () => {
  it('sends a pick in #fMvrFile to importFile and #fMvrExport to exportMvr', () => {
    const dom = new FakeDom();
    const file = new File([], 'Rig.mvr');
    const input = dom.add('fMvrFile', picked([file]));
    dom.add('fDemoRig');
    const exportButton = dom.add('fMvrExport');
    const mvr = actions();
    wireMvrButtons(mvr);
    input.onchange?.();
    exportButton.onclick?.({ target: exportButton });
    expect(mvr.importFile).toHaveBeenCalledWith(file);
    expect(mvr.exportMvr).toHaveBeenCalledOnce();
    expect(mvr.loadDemoRig).not.toHaveBeenCalled();
  });
});
