// @vitest-environment jsdom
/**
 * The toast path of an import, taken when another dialog holds the modal: no layer list opens there, so the toast
 * names the layers that start hidden and points at the "Layers" button.
 */
import { expect, it } from 'vitest';
import { layerListParts } from '../../../../src/app/mvr/mvrLayerList';
import { presentMvrSummary, type SummaryParts } from '../../../../src/app/mvr/presentMvrSummary';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import type { MvrGeometry, MvrImport } from '../../../../src/mvr';
import type { ImportSummaryView } from '../../../../src/ui/panels/mvr/importSummaryView';
import { fakeMvrFlowDeps } from '../../../shared';

const layers = [
  { uuid: 'L1', name: 'Rig' },
  { uuid: 'L9', name: 'Layer Z' },
];
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  surfaces: [],
  layers: [],
  hallLayers: [],
};
const none = 'No stage geometry in file';
const view: ImportSummaryView = { counts: [], offset: '', geometry: none, warnings: ['w'], bodies: [] };

/** An import result with these hidden layers; only the fields the summary reads are set. */
function resultWith(hiddenLayers: readonly string[]): MvrImport {
  const design = {
    ...createTemplate('theatre'),
    source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h' },
    mvr: { fixtures: {}, layers, hiddenLayers, offset: [0, 0, 0] },
  };
  return { design, geometry, summary: { fixtureCount: 3 } } as unknown as MvrImport;
}

/** The summary parts of the toast path tests; only the list, `kept` and `stored` are read there. */
const partsWith = (kept: boolean, stored: boolean): SummaryParts => {
  const list = layerListParts(geometry, () => undefined);
  return { view, ledWalls: undefined, list, kept, stored };
};

it('names the hidden layers in the toast path and opens no dialog', () => {
  const flow = fakeMvrFlowDeps();
  flow.modal.isOpen.mockReturnValue(true);
  presentMvrSummary(resultWith(['L9']), partsWith(false, true), flow.deps);
  expect(flow.toasts).toEqual([`${he.mvr.imported('Rig.mvr', 3, 1)}. ${he.mvr.layersHidden('Layer Z')}`]);
  expect(flow.modal.open).not.toHaveBeenCalled();
});

it('adds no layer line when the import hides nothing', () => {
  const flow = fakeMvrFlowDeps();
  flow.modal.isOpen.mockReturnValue(true);
  presentMvrSummary(resultWith([]), partsWith(false, true), flow.deps);
  expect(flow.toasts).toEqual([he.mvr.imported('Rig.mvr', 3, 1)]);
});

it('puts every message of the toast path in one toast, as each toast replaces the one before', () => {
  const flow = fakeMvrFlowDeps();
  flow.modal.isOpen.mockReturnValue(true);
  presentMvrSummary(resultWith(['L9']), partsWith(true, false), flow.deps);
  expect(flow.toasts).toHaveLength(1);
  const [toast] = flow.toasts;
  for (const line of [he.mvr.imported('Rig.mvr', 3, 1), he.mvr.layersHidden('Layer Z'), he.mvr.cuesKept]) {
    expect(toast).toContain(line);
  }
  expect(toast).toContain(he.mvr.notStored);
});
