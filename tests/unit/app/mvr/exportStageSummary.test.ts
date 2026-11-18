// @vitest-environment jsdom
/** When the export summary opens: by itself for a loss or a warning, from the toast's button for information alone. */
import { describe, expect, it, vi } from 'vitest';
import { exportStageMvr, type MvrExportOut } from '../../../../src/app/mvr/exportStageMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';

const theatre = createTemplate('theatre');
/** Every fixture patched in its own universe: the export has nothing to estimate and nothing overlaps. */
const apart: StageDesign = {
  ...theatre,
  fixtures: theatre.fixtures.map((fixture, index) => ({
    ...fixture,
    patch: { universe: index + 1, address: 1, mode: '' },
  })),
};
const count = (selector: string): number => document.querySelectorAll(selector).length;

/** Exports `design` with a modal that puts its markup into the page, as the real one does. */
async function exported(design: StageDesign) {
  document.body.innerHTML = '';
  const open = vi.fn((html: string) => void (document.body.innerHTML = html));
  const toast = vi.fn<MvrExportOut['toast']>();
  await exportStageMvr(design, { toast, download: vi.fn(), modal: () => ({ open, close: vi.fn() }) });
  return { open, toast };
}

describe('the export summary dialog and the toast', () => {
  it('stays closed for information alone, and the toast carries a Details button that opens it (N4)', async () => {
    const { open, toast } = await exported(apart);
    const action = toast.mock.calls[0]?.[1];
    expect(open).not.toHaveBeenCalled();
    expect(action?.label).toBe(he.mvr.exportDetails);
    action?.run();
    expect(open).toHaveBeenCalledOnce();
    expect(count('#mvrExportNotes > li')).toBeGreaterThan(0);
    expect(count('#mvrExportLosses, #mvrExportWarnings')).toBe(0);
  });

  it('opens by itself for a warning alone, and the toast then needs no button (N8)', async () => {
    const fixtures = apart.fixtures.map((fixture, index) =>
      index < 2 ? { ...fixture, patch: { universe: 900, address: 1, mode: '' } } : fixture,
    );
    const { open, toast } = await exported({ ...apart, fixtures });
    expect(open).toHaveBeenCalledOnce();
    expect(toast.mock.calls[0]).toHaveLength(1);
    expect([count('#mvrExportLosses'), count('#mvrExportWarnings > li')]).toEqual([0, 1]);
  });

  it('opens by itself for the estimates of an unpatched template that another patch follows (M-5)', async () => {
    const { open } = await exported(theatre);
    expect(open).toHaveBeenCalledOnce();
    expect(document.querySelector('#mvrExportWarnings > li')?.textContent).toMatch(
      /auto-patched fixtures use an estimated channel count before another patch/,
    );
  });
});
