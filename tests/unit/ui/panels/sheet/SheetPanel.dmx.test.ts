import { afterEach, describe, expect, it, vi } from 'vitest';
import { TYPES } from '../../../../../src/domain/fixtureTypes';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign';
import { SheetPanel } from '../../../../../src/ui/panels/sheet/SheetPanel';
import type { SheetFixture } from '../../../../../src/ui/panels/sheet/SheetFixture';
import { engineParts } from '../../../../shared';
import { asReal, FakeDom, FakeElement, FakeHost } from '../../../../shared/dom';
import { countTextWrites, dmxDesign } from './sheetFakes';

const fixture = (id: number): SheetFixture => ({ id, T: TYPES.spot, base: {}, out: {}, has: () => false });

/**
 * A sheet of the fixtures in `ids` (7 and 8 by default), read at each access as the stage's rig is, whose two fake
 * rows have the ten cells of a built row.
 */
function mount(stageDesign: () => StageDesign, ids: readonly number[] = [7, 8]) {
  const dom = new FakeDom();
  const table = dom.add('sheet', new FakeHost());
  const rows = [7, 8].map(() => {
    const cells = Array.from({ length: 10 }, () => new FakeElement('td'));
    return Object.assign(new FakeElement('tr'), { cells });
  });
  table.found.set('tr[data-id]', rows);
  const { programmer, selection } = engineParts();
  const sideTab = () => 'sheet' as const;
  const panel = new SheetPanel(asReal(new FakeHost()), {
    get fixtures() {
      return ids.map(fixture);
    },
    programmer,
    selection,
    sideTab,
    stageDesign,
  });
  const dmxCells = (): string[][] => rows.map((r) => [r.cells[8]?.textContent ?? '', r.cells[9]?.textContent ?? '']);
  return { panel, table, rows, dmxCells };
}

describe('SheetPanel DMX columns', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the rows with the Universe.Address and Mode headers', () => {
    const { panel, table } = mount(() => dmxDesign([]));
    panel.render();
    expect(table.innerHTML).toContain('<th>Zoom</th><th>Universe.Address</th><th>Mode</th></tr>');
  });

  it('shows the desk type mode for an unpatched fixture and dashes for one the design does not know', () => {
    const { panel, dmxCells } = mount(() => dmxDesign([{ id: 7 }]));
    panel.render();
    expect(dmxCells()).toEqual([
      ['—', TYPES.spot.gdtfMode],
      ['—', '—'],
    ]);
  });

  it('follows the current design on each repaint, without rebuilding the rows', () => {
    let design = dmxDesign([{ id: 7 }, { id: 8 }]);
    const { panel, table, dmxCells } = mount(() => design);
    panel.render();
    table.innerHTML = 'built once';
    design = dmxDesign([
      { id: 7, patch: { universe: 2, address: 1, mode: 'Basic' }, gdtfMode: 'Basic' },
      { id: 8, gdtfMode: 'Extended' },
    ]);
    panel.slow();
    expect(dmxCells()).toEqual([
      ['2.1', 'Basic'],
      ['—', 'Extended'],
    ]);
    expect(table.innerHTML).toBe('built once');
  });

  it('rebuild() lists the new rig and fills its DMX cells from the design current at that moment', () => {
    const ids = [7, 8];
    let design = dmxDesign([{ id: 7 }, { id: 8 }]);
    const { panel, table, dmxCells } = mount(() => design, ids);
    panel.render();
    ids.splice(0, 2, 101, 102);
    const patch = { universe: 3, address: 10, mode: 'Basic' };
    design = dmxDesign([{ id: 101, patch, gdtfMode: 'Basic' }, { id: 102 }]);
    panel.rebuild();
    expect(table.innerHTML).toContain('<tr data-id="101">');
    expect(dmxCells()[0]).toEqual(['3.10', 'Basic']);
  });

  it('writes a DMX cell only when its text changes', () => {
    let design = dmxDesign([{ id: 7, gdtfMode: 'Basic' }, { id: 8 }]);
    const { panel, rows } = mount(() => design);
    const writes = rows.flatMap((r) => [8, 9].map((n) => countTextWrites(r.cells[n] ?? new FakeElement('td'))));
    panel.render();
    panel.render();
    expect(writes.map((w) => w.count)).toEqual([1, 1, 1, 1]);
    design = dmxDesign([{ id: 7, patch: { universe: 1, address: 5, mode: 'Basic' }, gdtfMode: 'Basic' }, { id: 8 }]);
    panel.render();
    expect(writes.map((w) => w.count)).toEqual([2, 1, 1, 1]);
  });
});
