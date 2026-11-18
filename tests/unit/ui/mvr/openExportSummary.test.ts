// @vitest-environment jsdom
/** The export summary dialog (M-5, M-6): three groups, lines as text only, the full list behind a grouped line. */
import { describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import { exportMvr, type MvrExportSummary } from '../../../../src/mvr';
import { grouped, line } from '../../../../src/mvr/export/exportReport';
import { openExportSummary } from '../../../../src/ui/panels/mvr/openExportSummary';

type Report = MvrExportSummary['report'];
const base = exportMvr(createTemplate('theatre')).summary;
const none: Report = { losses: [], warnings: [], information: [] };

/** Opens the dialog on the page with `report`; gives the recorder of the modal's close. */
function show(report: Report): ReturnType<typeof vi.fn> {
  const close = vi.fn();
  const open = (html: string): void => void (document.body.innerHTML = html);
  openExportSummary({ open, close }, { ...base, report });
  return close;
}
const texts = (selector: string): string[] =>
  Array.from(document.querySelectorAll(selector), (el) => el.textContent ?? '');

describe('openExportSummary', () => {
  it('shows each group under its own heading, losses first', () => {
    show({ losses: [line('lost A')], warnings: [line('check B')], information: [line('kept C')] });
    expect(texts('#mvrExportGroups > h3')).toEqual([he.mvr.exportLosses, he.mvr.exportWarnings, he.mvr.exportKept]);
    expect(texts('#mvrExportLosses > li')).toEqual(['lost A']);
    expect(texts('#mvrExportWarnings > li')).toEqual(['check B']);
    expect(texts('#mvrExportNotes > li')).toEqual(['kept C']);
  });

  it('shows no heading for an empty group', () => {
    show({ ...none, information: [line('kept C')] });
    expect(texts('#mvrExportGroups > h3')).toEqual([he.mvr.exportKept]);
    expect(document.querySelector('#mvrExportLosses, #mvrExportWarnings')).toBeNull();
  });

  it('writes a name with markup as text, in a single line and behind "Show all"', () => {
    const many = [1, 2, 3, 4, 5].map((n) => `Fixture <i>Odd ${n}</i> overlaps.`);
    show({ ...none, losses: [line('The file "<b>Bad</b>.3ds" is not in this export.')], warnings: grouped('x', many) });
    expect(document.querySelector('#mvrExportGroups b, #mvrExportGroups i')).toBeNull();
    expect(texts('#mvrExportLosses > li')).toEqual(['The file "<b>Bad</b>.3ds" is not in this export.']);
    expect(texts('#mvrExportWarnings details li')[4]).toBe('Fixture <i>Odd 5</i> overlaps.');
  });

  it('groups equal kinds into one line with the count, three examples and the full list', () => {
    const many = [1, 2, 3, 4, 5].map((n) => `Overlap ${n}.`);
    const [only] = grouped('patches overlap', many);
    show({ ...none, warnings: grouped('patches overlap', many) });
    expect(only?.text).toBe('5 patches overlap. For example: Overlap 1. Overlap 2. Overlap 3. (and 2 more)');
    expect(texts('#mvrExportWarnings > li')).toHaveLength(1);
    expect(texts('#mvrExportWarnings summary')).toEqual([he.mvr.exportShowAll(5)]);
    expect(texts('#mvrExportWarnings details li')).toEqual(many);
    expect(grouped('patches overlap', ['Overlap 1.'])).toEqual([line('Overlap 1.')]);
  });

  it('closes the modal from its close button', () => {
    const close = show(none);
    document.querySelector<HTMLElement>('#mvrExportClose')?.click();
    expect(close).toHaveBeenCalledOnce();
  });
});
