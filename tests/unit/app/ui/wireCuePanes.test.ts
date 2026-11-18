/**
 * The app wiring of the Fixture Sheet to the stage: on `rigChanged` the rows are built again from the new rig. The
 * row build itself is owned by tests/unit/ui/panels/sheet/SheetPanel.test.ts; the Sequence pane has no part in a stage
 * change, so it mounts on bare DOM fakes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireCuePanes, type CuePanesDeps } from '../../../../src/app/ui/wireCuePanes';
import { EventBus } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import type { EngineEvents } from '../../../../src/engine/events';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { asReal, FakeButton, FakeDom, FakeElement, FakeHost } from '../../../shared/dom';

const allFixtures = buildRig().fixtures;
/** Two rigs of the same size and different ids: only a rebuild, not the count check, shows the second one. */
const [firstRig, secondRig] = [allFixtures.slice(0, 3), allFixtures.slice(3, 6)];

/** A row with enough cells for `SheetRow.show`. */
const fakeRow = (): FakeElement =>
  Object.assign(new FakeElement(), { cells: Array.from({ length: 12 }, () => new FakeElement()) });

function setup() {
  const dom = new FakeDom();
  // the Sequence pane mounts first; it only needs its elements to exist
  vi.stubGlobal('HTMLSelectElement', FakeElement);
  for (const id of ['seqSel', 'seqTable']) dom.add(id);
  for (const id of ['seqGo', 'seqBack', 'seqDel']) dom.add(id, new FakeButton());
  const table = dom.add('sheet', new FakeHost());
  table.found.set('tr[data-id]', [fakeRow(), fakeRow(), fakeRow()]);
  const bus = new EventBus<EngineEvents>();
  const stage = { rig: { fixtures: firstRig } };
  const deps = {
    side: new FakeHost(),
    bus,
    programmer: { vals: {} },
    selection: { has: () => false },
    sideTabs: { current: 'sheet' },
    stage,
  };
  const { sheet } = wireCuePanes(asReal<CuePanesDeps>(deps));
  const rowIds = (): string[] => [...table.innerHTML.matchAll(/data-id="(\d+)"/g)].map((m) => m[1] ?? '');
  return { bus, stage, sheet, rowIds };
}

describe('wireCuePanes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rebuilds the sheet rows to the new rig ids on rigChanged', () => {
    const { bus, stage, sheet, rowIds } = setup();
    sheet.render();
    const before = rowIds();
    stage.rig = { fixtures: secondRig };
    bus.emit('rigChanged', { design: BUILT_IN_DESIGN });
    expect([before, rowIds()]).toEqual([firstRig.map((f) => String(f.id)), secondRig.map((f) => String(f.id))]);
  });
});
