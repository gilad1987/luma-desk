// @vitest-environment jsdom
/**
 * A layer list open while the stage changes (another file, or the same file loaded again) is closed, and a box it
 * still holds writes nothing: its hidden and marked layers belong to the stage it was built for.
 */
import { expect, it } from 'vitest';
import { restoreStoredMvr } from '../../../../src/app/mvr/restoreStoredMvr';
import { closeStaleLayerList } from '../../../../src/app/mvr/stageBoundList';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { fakeMvrFlowDeps, makeMvr, sceneXml, type FakeMvrFlow } from '../../../shared';

const layers = [{ uuid: 'L1', name: 'Rig' }];
const saved: StageDesign = {
  ...createTemplate('theatre'),
  source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h' },
  mvr: { fixtures: {}, layers, hiddenLayers: ['L1'], offset: [0, 0, 0] },
};
const BYTES = new Uint8Array(makeMvr(sceneXml('<Layer uuid="L1" name="Rig"><ChildList></ChildList></Layer>')));
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A restored stage with its "Layers" dialog open; the fake modal writes its markup into the page. */
async function openList(): Promise<{ flow: FakeMvrFlow; dialog: HTMLElement }> {
  document.body.innerHTML = topBarMarkup;
  const dialog = document.body.appendChild(document.createElement('div'));
  const flow = fakeMvrFlowDeps(saved);
  flow.modal.open.mockImplementation((html: string) => void (dialog.innerHTML = html));
  flow.store.get.mockResolvedValue(BYTES);
  await restoreStoredMvr(flow.deps, flow.stage.design);
  document.querySelector<HTMLButtonElement>('#mvrLayersOpen')?.click();
  await tick();
  return { flow, dialog };
}

/** The same file loaded again: a show load parses a new source object with the same hash. */
const reloaded = (): StageDesign => ({ ...saved, source: { ...saved.source } });

it('closes the open list when the same file is loaded again, and its boxes write nothing', async () => {
  const { flow, dialog } = await openList();
  flow.stage.design = reloaded();
  closeStaleLayerList(flow.stage.design);
  expect(flow.modal.close).toHaveBeenCalledOnce();
  const box = dialog.querySelector<HTMLInputElement>('#mvrLayers input[type=checkbox]');
  if (box) box.checked = true;
  box?.onchange?.(new Event('change'));
  dialog.querySelector<HTMLInputElement>('.mvrLayerLed')?.click();
  await tick();
  expect(flow.sceneryHide).not.toHaveBeenCalled();
  expect([flow.stage.design.mvr?.hiddenLayers, flow.stage.design.mvr?.ledLayers]).toEqual([['L1'], undefined]);
});

it('keeps the list of the stage it was built for open after a layer change', async () => {
  const { flow } = await openList();
  closeStaleLayerList(flow.stage.design);
  expect(flow.modal.close).not.toHaveBeenCalled();
});

it('leaves another dialog open that replaced the list before the stage changed', async () => {
  const { flow, dialog } = await openList();
  dialog.innerHTML = '<p>another dialog</p>';
  flow.stage.design = { ...createTemplate('festival'), source: { kind: 'template', name: 'festival' } };
  closeStaleLayerList(flow.stage.design);
  expect(flow.modal.close).not.toHaveBeenCalled();
});
