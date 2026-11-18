/**
 * When the Fixture Sheet builds its rows. A build reads the row elements once (`querySelectorAll`), so the test counts
 * those reads; the cell values are owned by the sheetCells tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRig } from '../../../../../src/domain/rig';
import type { SheetDeps } from '../../../../../src/ui/panels/sheet/SheetPanel';
import { SheetPanel } from '../../../../../src/ui/panels/sheet/SheetPanel';
import { asReal, FakeDom, FakeElement, FakeHost } from '../../../../shared/dom';

const fixtures = buildRig().fixtures.slice(0, 3);

/** A row with enough cells for `SheetRow.show`; its swatch is a part the fake creates on first query. */
const fakeRow = (): FakeElement =>
  Object.assign(new FakeElement(), { cells: Array.from({ length: 12 }, () => new FakeElement()) });

function setup(tab: 'sheet' | 'pools' = 'sheet') {
  const dom = new FakeDom();
  const table = dom.add('sheet', new FakeHost());
  table.found.set(
    'tr[data-id]',
    fixtures.map(() => fakeRow()),
  );
  const builds = vi.spyOn(table, 'querySelectorAll');
  const deps = { fixtures, programmer: { vals: {} }, selection: { has: () => false }, sideTab: () => tab };
  const sheet = new SheetPanel(asReal<HTMLElement>(new FakeHost()), asReal<SheetDeps>(deps));
  return { sheet, builds };
}

describe('SheetPanel rows', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the rows once while the fixture count stays the same', () => {
    const { sheet, builds } = setup();
    sheet.render();
    sheet.render();
    expect(builds).toHaveBeenCalledOnce();
  });

  it('rebuild() builds them again at once when the sheet shows: a new rig can keep the count', () => {
    const { sheet, builds } = setup();
    sheet.render();
    sheet.rebuild();
    expect(builds).toHaveBeenCalledTimes(2);
  });

  it('rebuild() while another pane shows waits for the next render', () => {
    const { sheet, builds } = setup('pools');
    sheet.render();
    sheet.rebuild();
    expect(builds).toHaveBeenCalledOnce();
    sheet.render();
    expect(builds).toHaveBeenCalledTimes(2);
  });
});
