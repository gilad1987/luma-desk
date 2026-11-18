// @vitest-environment jsdom
/**
 * Owns the picked-file flow: the scenery chunk loads before anything changes, a rejected file keeps the stage and
 * the prompt, an import hides the prompt and opens the summary only over a closed modal or the Show File dialog.
 * jsdom gives the parser its DOMParser; the page itself is the FakeDom.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importPickedMvr } from '../../../../src/app/mvr/importPickedMvr';
import { he } from '../../../../src/i18n/he';
import { fakeMvrFlowDeps, makeMvr, sceneXml } from '../../../shared';
import { FakeDom } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
const goodFile = (): File =>
  new File(
    [new Uint8Array(makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`)))],
    'Rig.mvr',
  );
const badFile = (): File => new File([new Uint8Array([1, 2, 3])], 'bad.mvr');

/** The page of the Show File dialog: the error line and the summary ids `openMvrSummary` looks up. */
function page(): FakeDom {
  const dom = new FakeDom();
  for (const id of ['mvrImportError', 'mvrSummaryClose', 'mvrWarnings', 'mvrLayers']) dom.add(id);
  return dom;
}

describe('importPickedMvr', () => {
  it('toasts a rejected file, writes the error line and keeps the stage and the prompt', async () => {
    const dom = page();
    const flow = fakeMvrFlowDeps();
    await importPickedMvr(badFile(), flow.deps);
    expect(flow.toasts).toHaveLength(1);
    expect(dom.get('mvrImportError').textContent).toBe(flow.toasts[0]);
    expect(flow.calls).toEqual(['load', 'toast']);
  });

  it('loads the scenery chunk first, so a chunk that does not load leaves the stage as it was', async () => {
    page();
    const flow = fakeMvrFlowDeps();
    flow.scenery.load.mockRejectedValueOnce(new Error('chunk failed'));
    await expect(importPickedMvr(goodFile(), flow.deps)).rejects.toThrow('chunk failed');
    expect(flow.store.put).not.toHaveBeenCalled();
    expect(flow.calls).toEqual([]);
  });

  it('applies, hides the prompt, draws the scenery, then opens the summary over a closed modal', async () => {
    page();
    const flow = fakeMvrFlowDeps();
    await importPickedMvr(goodFile(), flow.deps);
    expect(flow.calls).toEqual(['load', 'apply', 'prompt.hide', 'show', 'modal.open']);
    expect(flow.toasts).toEqual([]);
  });

  it('warns that the file was not stored when the store refused the bytes', async () => {
    page();
    const flow = fakeMvrFlowDeps();
    flow.store.put.mockResolvedValueOnce(null);
    await importPickedMvr(goodFile(), flow.deps);
    expect(flow.toasts).toEqual([he.mvr.notStored]);
  });

  it('replaces an open Show File dialog with the summary', async () => {
    page().add('fMvrFile');
    const flow = fakeMvrFlowDeps();
    flow.modal.isOpen.mockReturnValue(true);
    await importPickedMvr(goodFile(), flow.deps);
    expect(flow.modal.open).toHaveBeenCalledOnce();
  });

  it('keeps another open dialog and toasts a one-line summary instead', async () => {
    page();
    const flow = fakeMvrFlowDeps();
    flow.modal.isOpen.mockReturnValue(true);
    await importPickedMvr(goodFile(), flow.deps);
    expect(flow.modal.open).not.toHaveBeenCalled();
    // the parser reports two warnings for this one-fixture file; the toast counts them
    expect(flow.toasts).toEqual([he.mvr.imported('Rig.mvr', 1, 2)]);
  });
});
