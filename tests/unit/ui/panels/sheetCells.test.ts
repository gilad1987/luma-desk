import { describe, expect, it } from 'vitest';
import type { AttrName } from '../../../../src/domain/attributes';
import { TYPES } from '../../../../src/domain/fixtureTypes';
import { sheetRowView, sheetTable } from '../../../../src/ui/panels/sheet/sheetCells';
import { NO_DMX } from '../../../../src/ui/panels/sheet/sheetDmx';
import type { SheetFixture } from '../../../../src/ui/panels/sheet/SheetFixture';

const base = { dim: 0, pan: 12.6, tilt: -3.4, r: 50, g: 10, b: 100, gobo: 2.2, grot: 0, zoom: 7, strobe: 0 };
const fixture = (attrs: readonly AttrName[]): SheetFixture => ({
  id: 201,
  T: { ...TYPES.spot, name: 'Spot' },
  base,
  out: { dim: 49.5 },
  has: (a) => attrs.includes(a),
});

describe('sheet cells (same values as the original renderSheet)', () => {
  it('builds the header and empty value cells per fixture, the DMX columns last', () => {
    expect(sheetTable([fixture([])])).toBe(
      '<tr><th>ID</th><th>Type</th><th>Dim</th><th>Pan</th><th>Tilt</th><th>Col</th><th>Gobo</th><th>Zoom</th>' +
        '<th>Universe.Address</th><th>Mode</th></tr>' +
        '<tr data-id="201"><td>201</td><td style="font-family:Inter">Spot</td>' +
        '<td></td><td></td><td></td><td><span class="cs"></span></td><td></td><td></td>' +
        '<td></td><td dir="auto"></td></tr>',
    );
  });

  it('rounds, marks programmer values and paints the unrounded swatch', () => {
    const dmx = { address: '2.1', mode: 'Basic' };
    const view = sheetRowView(fixture(['pan', 'tilt', 'r', 'gobo', 'zoom']), true, { pan: 1, r: 0 }, dmx);
    expect(view).toEqual({
      rowClass: 'sel',
      cells: [
        [2, '50', ''],
        [3, '13', 'p'],
        [4, '-3', ''],
        [6, '2', ''],
        [7, '7.0', ''],
      ],
      colorClass: 'p',
      swatch: `rgb(${50 * 2.55},${10 * 2.55},${100 * 2.55})`,
      dmx,
    });
  });

  it('leaves missing attributes blank and the swatch grey', () => {
    const view = sheetRowView(fixture([]), false, {}, NO_DMX);
    expect(view.cells.map(([, text]) => text)).toEqual(['50', '', '', '', '']);
    expect([view.rowClass, view.swatch]).toEqual(['', '#333']);
  });

  it('shows NaN for a value not output yet, as the old Math.round(undefined) did', () => {
    const view = sheetRowView({ ...fixture(['pan', 'zoom', 'r']), base: {}, out: {} }, false, {}, NO_DMX);
    expect(view.cells.map(([, text]) => text)).toEqual(['NaN', 'NaN', '', '', 'NaN']);
    expect(view.swatch).toBe('rgb(NaN,NaN,NaN)');
  });

  it('shows NaN for tilt and gobo not output yet, and still marks them when the programmer holds them', () => {
    const fx = { ...fixture(['tilt', 'gobo']), base: {}, out: {} };
    const view = sheetRowView(fx, true, { tilt: 0, gobo: 3 }, NO_DMX);
    expect(view.cells).toEqual([
      [2, 'NaN', ''],
      [3, '', ''],
      [4, 'NaN', 'p'],
      [6, 'NaN', 'p'],
      [7, '', ''],
    ]);
    expect([view.rowClass, view.swatch]).toEqual(['sel', '#333']);
  });
});
