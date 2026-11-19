// @vitest-environment jsdom
/**
 * The "Layers" dialog waits for the LED controls before it opens. A stage change in that wait wins: the list of the
 * old file does not open, so its layer boxes cannot write into the new stage. A dialog that took the modal in that
 * wait keeps it.
 */
import { expect, it } from 'vitest';
import { offerLayerList } from '../../../../src/app/mvr/mvrLayerList';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import type { MvrGeometry } from '../../../../src/mvr';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { fakeMvrFlowDeps, type FakeMvrFlow } from '../../../shared';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const geometry = { placements: [], proxies: [], layers: [], hallLayers: [] } as unknown as MvrGeometry;
const stage = (name: string, hiddenLayers: string[]): StageDesign => ({
  ...createTemplate('theatre'),
  source: { kind: 'mvr', name: `${name}.mvr`, fileHash: name },
  mvr: { fixtures: {}, layers: [{ uuid: `${name}-layer`, name }], hiddenLayers, offset: [0, 0, 0] },
});
const B = stage('B', ['B-hidden']);

/** Stage A offers "Layers" and the button is clicked; the LED controls load until `release`. */
function clickedDuringLoad(): { flow: FakeMvrFlow; dialog: HTMLElement; release: () => void } {
  document.body.innerHTML = topBarMarkup;
  const dialog = document.body.appendChild(document.createElement('div'));
  const flow = fakeMvrFlowDeps(stage('A', []));
  flow.modal.open.mockImplementation((html: string) => void (dialog.innerHTML = html));
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const loads = { proxies: () => Promise.reject(new Error('x')), ledNow: () => gate.then(() => undefined) };
  offerLayerList(flow.deps, geometry, loads);
  document.querySelector<HTMLButtonElement>('#mvrLayersOpen')?.click();
  return { flow, dialog, release };
}

it('opens the list when nothing changed during the load', async () => {
  const { flow, dialog, release } = clickedDuringLoad();
  release();
  await tick();
  expect(flow.modal.open).toHaveBeenCalledTimes(1);
  expect(dialog.textContent).toContain('A');
});

it('opens no list of the old stage after a stage change during the load', async () => {
  const { flow, release } = clickedDuringLoad();
  flow.stage.design = B;
  release();
  await tick();
  expect(flow.modal.open).not.toHaveBeenCalled();
  expect(flow.stage.design.mvr?.hiddenLayers).toEqual(['B-hidden']);
  expect(flow.toasts).toEqual([]);
});

it('leaves a dialog that took the modal during the load in place, and says why', async () => {
  const { flow, release } = clickedDuringLoad();
  flow.modal.isOpen.mockReturnValue(true);
  release();
  await tick();
  expect(flow.modal.open).not.toHaveBeenCalled();
  expect(flow.toasts).toEqual([he.mvr.layersBusy]);
});
