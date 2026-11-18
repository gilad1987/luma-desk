// @vitest-environment jsdom
/**
 * The layer list after a reload: the restore opens no summary, so it puts "Layers" in the top bar. The button opens
 * the list from the design the stage has now: a hidden layer can be shown again, an LED mark can be set and taken
 * off, and the first mark brings the note that the desk generates the content.
 */
import { expect, it } from 'vitest';
import { hideLayerList } from '../../../../src/app/mvr/mvrLayerList';
import { restoreStoredMvr } from '../../../../src/app/mvr/restoreStoredMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { LED_GENERATED } from '../../../../src/ui/panels/mvr/ledWallsRow';
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

/** A restored stage on a page with the top bar; the fake modal writes its markup into the page, as the real one. */
async function restored(): Promise<{ flow: FakeMvrFlow; dialog: HTMLElement }> {
  document.body.innerHTML = topBarMarkup;
  const dialog = document.body.appendChild(document.createElement('div'));
  const flow = fakeMvrFlowDeps(saved);
  flow.modal.open.mockImplementation((html: string) => void (dialog.innerHTML = html));
  flow.store.get.mockResolvedValue(BYTES);
  await restoreStoredMvr(flow.deps, flow.stage.design);
  return { flow, dialog };
}

const boxes = (dialog: HTMLElement): HTMLInputElement[] =>
  Array.from(dialog.querySelectorAll<HTMLInputElement>('#mvrLayers input[type=checkbox]'));
const notes = (dialog: HTMLElement): (string | null)[] =>
  Array.from(dialog.querySelectorAll('.mvrLedNote')).map((note) => note.textContent);

it('opens the layer list of a restored stage from the top bar and shows a hidden layer again', async () => {
  const { flow, dialog } = await restored();
  expect(flow.modal.open).not.toHaveBeenCalled();
  const button = document.querySelector<HTMLButtonElement>('#mvrLayersOpen');
  expect(button?.closest('#mvrLayersGroup')?.previousElementSibling?.querySelector('#haze')).not.toBeNull();
  button?.click();
  await tick();
  expect(flow.modal.open).toHaveBeenCalledOnce();
  const [shown] = boxes(dialog);
  expect([shown?.checked, dialog.querySelector('.mvrLayer span')?.textContent]).toEqual([false, 'Rig']);
  if (shown) shown.checked = true;
  shown?.onchange?.(new Event('change'));
  expect(flow.sceneryHide).toHaveBeenCalledWith([]);
  expect(flow.stage.design.mvr?.hiddenLayers).toEqual([]);
});

it('marks a layer as LED with the generated-content note, and takes the mark off again', async () => {
  const { flow, dialog } = await restored();
  document.querySelector<HTMLButtonElement>('#mvrLayersOpen')?.click();
  await tick();
  expect([notes(dialog), document.getElementById('ledGroup')]).toEqual([[], null]);
  dialog.querySelector<HTMLInputElement>('.mvrLayerLed')?.click();
  await tick();
  expect(flow.stage.design.mvr?.ledLayers).toEqual(['L1']);
  expect(notes(dialog)).toEqual([LED_GENERATED]);
  expect(dialog.querySelector('#mvrLedLook')).not.toBeNull();
  expect(document.getElementById('ledGroup')?.style.display).toBe('');
  expect(dialog.querySelector<HTMLInputElement>('.mvrLayerLed')?.title).toContain(LED_GENERATED);
  dialog.querySelector<HTMLInputElement>('.mvrLayerLed')?.click();
  await tick();
  expect(flow.stage.design.mvr?.ledLayers).toEqual([]);
  expect([notes(dialog), document.getElementById('ledGroup')?.style.display]).toEqual([[], 'none']);
});

it('takes "Layers" out of the top bar when the stage is no longer an MVR file', async () => {
  await restored();
  hideLayerList();
  expect(document.getElementById('mvrLayersGroup')?.style.display).toBe('none');
});
