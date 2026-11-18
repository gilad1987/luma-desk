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

describe('exportStageMvr', () => {
  it('downloads the stage as <source name>.mvr and toasts the fixture count', async () => {
    const toast = vi.fn();
    const download = vi.fn();
    await exportStageMvr(imported, { toast, download });
    expect(download).toHaveBeenCalledOnce();
    expect(download.mock.calls[0]?.[1]).toBe('Rig.mvr');
    expect(toast).toHaveBeenCalledWith(he.mvr.exported(theatre.fixtures.length));
  });
});
