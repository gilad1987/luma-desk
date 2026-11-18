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
/** A warning line; `hidden` is set only on the lines past the cap. */
type Line = FakeElement & { hidden?: boolean };

function open(warningLines: readonly string[] = view.warnings) {
  const dom = new FakeDom();
  dom.add('mvrSummaryClose', new FakeButton());
  const warnings = dom.add('mvrWarnings');
  const host = dom.add('mvrLayers');
  const modal = { open: vi.fn(), close: vi.fn() };
  const onHidden = vi.fn();
  openMvrSummary(modal, { view: { ...view, warnings: warningLines }, layers, hiddenLayers: ['b'] }, onHidden);
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

  it('shows 8 warning lines and no toggle when there are 8', () => {
    const { warnings } = open(Array.from({ length: 8 }, (_, i) => `w${i}`));
    expect((warnings.children as Line[]).map((line) => [line.textContent, line.hidden ?? false])).toEqual(
      Array.from({ length: 8 }, (_, i) => [`w${i}`, false]),
    );
  });

  it('hides the warning lines past 8 behind a "Show all (N)" toggle that shows them all', () => {
    const { warnings } = open(Array.from({ length: 10 }, (_, i) => `w${i}`));
    const lines = (): Line[] => warnings.children;
    const toggle = lines()[10]?.children[0];
    expect(lines().map((line) => line.hidden ?? false)).toEqual([...Array<boolean>(8).fill(false), true, true, false]);
    expect(toggle?.textContent).toBe('Show all (10)');
    toggle?.onclick?.({ target: toggle });
    expect(lines().map((line) => [line.textContent, line.hidden ?? false])).toEqual(
      Array.from({ length: 10 }, (_, i) => [`w${i}`, false]),
    );
    const firstRevealed = lines()[8] as Line & { tabIndex?: number };
    expect(firstRevealed.tabIndex).toBe(-1);
    expect(firstRevealed.focus).toHaveBeenCalledOnce();
  });

  it('offers the show choice only when the import kept cues', () => {
    const { modal } = open();
    expect(String(modal.open.mock.calls[0]?.[0])).not.toContain('mvrShowChoice');
  });

  it('closes the modal from #mvrSummaryClose', () => {
    const { dom, modal } = open();
    dom.get('mvrSummaryClose').onclick?.({ target: null });
    expect(modal.close).toHaveBeenCalledOnce();
  });
});
