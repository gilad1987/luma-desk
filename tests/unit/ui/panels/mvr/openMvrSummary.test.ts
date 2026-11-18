import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImportSummaryView } from '../../../../../src/ui/panels/mvr/importSummaryView';
import { openMvrSummary } from '../../../../../src/ui/panels/mvr/openMvrSummary';
import { FakeButton, FakeDom, type FakeElement } from '../../../../shared/dom';

const view: ImportSummaryView = {
  counts: [
    { key: 'fixtures', label: 'Fixtures', value: 2 },
    { key: 'unpatched', label: 'Unpatched', value: 1 },
  ],
  offset: 'Offset x 0.00 m, y 0.00 m, z 1.50 m',
  geometry: 'No stage geometry in file',
  warnings: ['<b>not markup</b>'],
};
const layers = [
  { uuid: 'a', name: 'Truss' },
  { uuid: 'b', name: 'במה' },
];

/** The checkbox and name span of each layer row, as `openMvrSummary` appends them. */
type Row = FakeElement & { dir?: string };
type Box = FakeElement & { checked?: boolean; onchange?: () => void };

function open() {
  const dom = new FakeDom();
  dom.add('mvrSummaryClose', new FakeButton());
  const warnings = dom.add('mvrWarnings');
  const host = dom.add('mvrLayers');
  const modal = { open: vi.fn(), close: vi.fn() };
  const onHidden = vi.fn();
  openMvrSummary(modal, { view, layers, hiddenLayers: ['b'] }, onHidden);
  const rows = host.children as Row[];
  const box = (i: number): Box => rows[i]?.children[0] as Box;
  return { dom, modal, onHidden, warnings, rows, box };
}

describe('openMvrSummary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the bare counts in the markup and the file text as text', () => {
    const { modal, warnings, rows } = open();
    const html = String(modal.open.mock.calls[0]?.[0]);
    expect(html).toContain('id="mvrSummary"');
    expect(html).toContain('<b data-count="fixtures">2</b>');
    expect(html).toContain('<b data-count="unpatched">1</b>');
    expect(html).not.toContain('not markup');
    expect(warnings.children.map((li) => li.textContent)).toEqual(['<b>not markup</b>']);
    expect(rows.map((row) => [row.dir, row.children[1]?.textContent])).toEqual([
      ['auto', 'Truss'],
      ['auto', 'במה'],
    ]);
  });

  it('starts hidden layers unchecked and reports the full hidden list on every change', () => {
    const { box, onHidden } = open();
    expect([box(0).checked, box(1).checked]).toEqual([true, false]);
    box(0).checked = false;
    box(0).onchange?.();
    expect(onHidden).toHaveBeenLastCalledWith(['a', 'b']);
  });

  it('closes the modal from #mvrSummaryClose', () => {
    const { dom, modal } = open();
    dom.get('mvrSummaryClose').onclick?.({ target: null });
    expect(modal.close).toHaveBeenCalledOnce();
  });
});
