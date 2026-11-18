import { afterEach, describe, expect, it, vi } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { SheetPanel } from '../../../../src/ui/panels/sheet/SheetPanel';
import type { SheetFixture } from '../../../../src/ui/panels/sheet/SheetFixture';
import { asReal, FakeDom, FakeElement, FakeHost } from '../../../shared/dom';
import { engineParts } from '../../app/uix/engineParts';
import { dmxDesign } from './sheetFakes';

const fixture = (id: number): SheetFixture => ({ id, T: TYPES.spot, base: {}, out: {}, has: () => false });

/** A sheet of fixtures 7 and 8 whose two fake rows have the ten cells of a built row. */
function mount(design: () => StageDesign) {
  const dom = new FakeDom();
  const table = dom.add('sheet', new FakeHost());
  const rows = [7, 8].map(() => {
    const cells = Array.from({ length: 10 }, () => new FakeElement('td'));
    return Object.assign(new FakeElement('tr'), { cells });
  });
  table.found.set('tr[data-id]', rows);
  const { programmer, selection } = engineParts();
  const deps = { fixtures: [fixture(7), fixture(8)], programmer, selection, sideTab: () => 'sheet' as const, design };
  const panel = new SheetPanel(asReal(new FakeHost()), deps);
  const dmxCells = (): string[][] => rows.map((r) => [r.cells[8]?.textContent ?? '', r.cells[9]?.textContent ?? '']);
  return { panel, table, dmxCells };
}

describe('SheetPanel DMX columns', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the rows with the Universe.Address and Mode headers', () => {
    const { panel, table } = mount(() => dmxDesign([]));
    panel.render();
    expect(table.innerHTML).toContain('<th>Zoom</th><th>Universe.Address</th><th>Mode</th></tr>');
  });

  it('shows dashes for fixtures the design does not patch or does not know', () => {
    const { panel, dmxCells } = mount(() => dmxDesign([{ id: 7 }]));
    panel.render();
    expect(dmxCells()).toEqual([
      ['—', '—'],
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
});
