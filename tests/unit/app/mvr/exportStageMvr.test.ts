// @vitest-environment jsdom
/**
 * Owns the Export MVR step: the download takes the stage source name with one `.mvr`, and the toast names the
 * fixture count. The download is a recorder; the mesh and MVR writers are real.
 */
import { describe, expect, it, vi } from 'vitest';
import { exportStageMvr } from '../../../../src/app/mvr/exportStageMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';

const theatre = createTemplate('theatre');
const imported: StageDesign = { ...theatre, source: { kind: 'mvr', name: 'Rig.mvr' } };
/** Every fixture patched in its own universe: nothing to estimate, nothing overlaps. */
const patched: StageDesign = {
  ...theatre,
  fixtures: theatre.fixtures.map((fixture, index) => ({
    ...fixture,
    patch: { universe: index + 1, address: 1, mode: '' },
  })),
};

describe('exportStageMvr', () => {
  it('downloads the stage as <source name>.mvr and toasts the fixture count', async () => {
    const toast = vi.fn();
    const download = vi.fn();
    await exportStageMvr(imported, { toast, download });
    expect(download).toHaveBeenCalledOnce();
    expect(download.mock.calls[0]?.[1]).toBe('Rig.mvr');
    expect(toast).toHaveBeenCalledWith(he.mvr.exported(theatre.fixtures.length));
  });

  /** A modal that puts the markup into the page, as the real one does, and records that it opened. */
  const dialog = () => {
    const open = vi.fn((html: string) => void (document.body.innerHTML = html));
    return { open, modal: () => ({ open, close: vi.fn() }) };
  };

  it('keeps the summary a toast when the export has only information (M-5)', async () => {
    const { open, modal } = dialog();
    await exportStageMvr(patched, { toast: vi.fn(), download: vi.fn(), modal });
    expect(open).not.toHaveBeenCalled();
  });

  it('opens the summary by itself when the export lost something (M-5)', async () => {
    const { open, modal } = dialog();
    const facts = { fixtures: {}, layers: [], hiddenLayers: [], offset: [0, 0, 0] as const };
    await exportStageMvr({ ...imported, mvr: facts }, { toast: vi.fn(), download: vi.fn(), modal });
    expect(open).toHaveBeenCalledOnce();
    expect(document.querySelector('#mvrExportLosses li')?.textContent).toMatch(/original file is not stored/);
  });
});
