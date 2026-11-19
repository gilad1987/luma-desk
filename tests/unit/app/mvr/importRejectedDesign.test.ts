// @vitest-environment jsdom
/**
 * The import's show step loads the starting show as a show file, and the loader falls back to the built-in stage when
 * the imported design does not parse back. The import reports that as a failed import with the first parser error; a
 * stage that changed in the show step for another reason ends the import without a message and draws nothing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importPickedMvr } from '../../../../src/app/mvr/importPickedMvr';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign';
import { he } from '../../../../src/i18n/he';
import { fakeMvrFlowDeps, makeMvr, sceneXml, type FakeMvrFlow } from '../../../shared';
import { FakeDom } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Spot</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>';
const file = (): File =>
  new File(
    [new Uint8Array(makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`)))],
    'Rig.mvr',
  );

/** The show step as the show loader runs it: back to the built-in stage, after `spoil` changed the imported design. */
function showStepFallsBack(flow: FakeMvrFlow, spoil: (design: object) => void): void {
  flow.firstLook.mockImplementationOnce(() => {
    spoil(flow.stage.design);
    flow.stage.design = flow.deps.stage.builtIn;
    return 'built';
  });
}

describe('importPickedMvr, a design the show loader rejected', () => {
  it('toasts the first parser error, writes the error line and draws nothing', async () => {
    const dom = new FakeDom();
    dom.add('mvrImportError');
    const flow = fakeMvrFlowDeps();
    let reason = '';
    // A version the parser does not know stands in for any value of the imported design that it rejects.
    showStepFallsBack(flow, (design) => {
      Object.assign(design, { v: 99 });
      const parsed = parseStageDesign(design);
      reason = parsed.ok ? '' : (parsed.errors[0] ?? '');
    });
    await importPickedMvr(file(), flow.deps);
    expect(reason).not.toBe('');
    expect(flow.toasts).toEqual([he.mvr.designRejected('Rig.mvr', reason)]);
    expect(dom.get('mvrImportError').textContent).toBe(flow.toasts[0]);
    expect(flow.scenery.show).not.toHaveBeenCalled();
    expect(flow.modal.open).not.toHaveBeenCalled();
  });

  it('ends without a message when the stage changed in the show step and the design parses', async () => {
    new FakeDom().add('mvrImportError');
    const flow = fakeMvrFlowDeps();
    showStepFallsBack(flow, () => undefined);
    await importPickedMvr(file(), flow.deps);
    expect(flow.toasts).toEqual([]);
    expect(flow.scenery.show).not.toHaveBeenCalled();
  });
});
