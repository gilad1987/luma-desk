// @vitest-environment jsdom
/**
 * The "Layers" dialog does not replace another open dialog (it says why instead), puts the focus on its first control
 * and names its close button. A very large wall unrolls without a spread into `Math.min`.
 */
import { expect, it, vi } from 'vitest';
import { offerLayerList } from '../../../../src/app/mvr/mvrLayerList';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import type { MvrGeometry } from '../../../../src/mvr';
import type { PanelPose } from '../../../../src/render/mvr/led/ledPose';
import { unrollChain } from '../../../../src/render/mvr/led/ledUnroll';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { fakeMvrFlowDeps, type FakeMvrFlow } from '../../../shared';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const geometry = { placements: [], proxies: [], layers: [], hallLayers: [] } as unknown as MvrGeometry;
const design: StageDesign = {
  ...createTemplate('theatre'),
  source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h' },
  mvr: { fixtures: {}, layers: [{ uuid: 'L1', name: 'Rig' }], hiddenLayers: [], offset: [0, 0, 0] },
};

/** A page with the top bar, a stage offering "Layers", and a modal that writes into `dialog`. */
function page(): { flow: FakeMvrFlow; dialog: HTMLElement; open: () => Promise<void> } {
  document.body.innerHTML = topBarMarkup;
  const dialog = document.body.appendChild(document.createElement('div'));
  const flow = fakeMvrFlowDeps(design);
  flow.modal.open.mockImplementation((html: string) => void (dialog.innerHTML = html));
  offerLayerList(flow.deps, geometry);
  const open = async (): Promise<void> => {
    document.querySelector<HTMLButtonElement>('#mvrLayersOpen')?.click();
    await tick();
  };
  return { flow, dialog, open };
}

it('leaves another open dialog in place and says why', async () => {
  const { flow, dialog, open } = page();
  dialog.innerHTML = '<p id="other">a show save</p>';
  flow.modal.isOpen.mockReturnValue(true);
  await open();
  expect([flow.modal.open.mock.calls.length, dialog.querySelector('#other') !== null]).toEqual([0, true]);
  expect(flow.toasts).toEqual([he.mvr.layersBusy]);
});

it('focuses the first control and names the close button', async () => {
  const { flow, dialog, open } = page();
  await open();
  // the first open loads the LED module, which takes longer than one task
  await vi.waitFor(() => expect(flow.modal.open).toHaveBeenCalledOnce());
  expect(document.activeElement).toBe(dialog.querySelector('#mvrLayers input'));
  expect(dialog.querySelector('#mvrLayersClose')?.getAttribute('aria-label')).toBe('Close');
});

it('unrolls a wall of more panels than a spread can take', () => {
  const panel: PanelPose = { position: [0, 0, 0], x: [1, 0, 0], z: [0, 1, 0], normal: [0, 0, 1], pitch: 0.5 };
  const panels = Array.from({ length: 200_000 }, () => panel);
  expect(unrollChain(panels, []).length).toBe(200_000);
});
