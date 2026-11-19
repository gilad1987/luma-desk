// @vitest-environment jsdom
/**
 * A layer list part whose module does not load says so: "Show proxies" toasts a fixed message with the detail and
 * keeps its state, and "Layers" opens the list without the LED rows when the LED controls do not load.
 */
import { expect, it, vi } from 'vitest';
import { layerListParts, offerLayerList, type LayerListLoads } from '../../../../src/app/mvr/mvrLayerList';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import type { MvrGeometry } from '../../../../src/mvr';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { fakeMvrFlowDeps } from '../../../shared';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const failing = (): Promise<never> => Promise.reject(new Error('chunk failed'));
const FAILED: LayerListLoads = { proxies: failing, ledNow: failing };
const proxy = { kind: 'truss', layer: 'L1', frame: [], pitch: 0 };
const geometry = { placements: [], proxies: [proxy], layers: [], hallLayers: [] } as unknown as MvrGeometry;

it('reports a failed "Show proxies" change and keeps the proxies shown', async () => {
  const report = vi.fn();
  const parts = layerListParts(geometry, report, failing);
  parts.showProxies?.(false);
  await tick();
  expect([parts.shown(), report.mock.calls.length]).toEqual([true, 1]);
});

it('opens "Layers" without the LED rows, with the LED failure toasted, when the LED controls do not load', async () => {
  document.body.innerHTML = topBarMarkup;
  const dialog = document.body.appendChild(document.createElement('div'));
  const design: StageDesign = {
    ...createTemplate('theatre'),
    source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h' },
    mvr: { fixtures: {}, layers: [{ uuid: 'L1', name: 'Rig' }], hiddenLayers: [], offset: [0, 0, 0] },
  };
  const flow = fakeMvrFlowDeps(design);
  flow.modal.open.mockImplementation((html: string) => void (dialog.innerHTML = html));
  const parts = offerLayerList(flow.deps, geometry, FAILED);
  document.querySelector<HTMLButtonElement>('#mvrLayersOpen')?.click();
  await tick();
  expect(flow.toasts).toEqual([he.mvr.ledLayersFailed]);
  expect([dialog.querySelectorAll('.mvrLayerLed').length, dialog.querySelector('#mvrLedLook')]).toEqual([1, null]);
  parts.showProxies?.(false);
  await tick();
  expect(flow.toasts.at(-1)).toMatch(/^A layer list control failed: the scenery module did not load/);
});
