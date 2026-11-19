// @vitest-environment jsdom
/** The decision on estimated channel counts (M-5): known sizes, a warning only before another patch, no guessed address. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { planPatches } from '../../../../src/mvr/export/autoPatch.ts';
import { footprintOf } from '../../../../src/mvr/export/modeFootprints.ts';
import { exportMvr, importMvr, type MvrExport } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u, SIZED_TYPE, UNSIZED_TYPE } from '../../../shared/index.ts';

type Fixture = StageDesign['fixtures'][number];
const theatre = createTemplate('theatre');
const texts = (lines: readonly { readonly text: string }[]): string[] => lines.map((item) => item.text);
const unpatched = ({ patch: _patch, ...rest }: Fixture): Fixture => rest;
const firstOf = (design: StageDesign): Fixture => {
  const first = design.fixtures[0];
  if (!first) throw new Error('no fixture');
  return first;
};
const addressCount = (bytes: Uint8Array): number =>
  (strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()).match(/<Address[ >]/g) ?? []).length;

describe('estimated channel counts in a desk export (M-5)', () => {
  it('knows the size of a measured product and of the desk own screen, and of no product it has no file for', () => {
    const lamp = firstOf(theatre);
    expect(footprintOf({ ...lamp, type: SIZED_TYPE }, undefined)).toEqual({ channels: 39, known: true });
    expect(footprintOf({ ...lamp, type: 'screen' }, undefined).known).toBe(true);
    expect(footprintOf({ ...lamp, type: UNSIZED_TYPE }, undefined).known).toBe(false);
  });

  it('warns in one line about the estimates another patch follows, and only informs about the rest', () => {
    const plan = planPatches(theatre.fixtures, theatre.mvr);
    const { report } = exportMvr(theatre).summary;
    const lone = plan.estimated - plan.crowded.length;
    const start = `${plan.crowded.length} auto-patched fixtures use an estimated channel count before another patch`;
    expect(plan.crowded.length).toBeGreaterThan(3);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]?.text.startsWith(start)).toBe(true);
    expect(report.warnings[0]?.all).toEqual(plan.crowded);
    expect(texts(report.information).filter((text) => text.includes('no other patch follows them'))).toHaveLength(
      lone > 0 ? 1 : 0,
    );
  });

  it('only informs about an estimate that nothing follows', () => {
    const alone = { ...theatre, screens: [], fixtures: [{ ...firstOf(theatre), type: UNSIZED_TYPE }] };
    const { report } = exportMvr(alone).summary;
    expect(report.warnings).toEqual([]);
    expect(texts(report.information)).toContain(
      '1 auto-patched fixtures use an estimated channel count; no other patch follows them in their universe.',
    );
  });
});

describe('a fixture added without a patch, exported from the original file (M-5)', () => {
  const withAdded = async (type: Fixture['type']): Promise<MvrExport> => {
    const original = passFile(fx(u(1), 1, { addresses: '<Address break="0">1</Address>' }));
    const design = (await importMvr(original, { name: 'a.mvr' })).design;
    const first = firstOf(design);
    return exportMvr({ ...design, fixtures: [first, { ...unpatched(first), id: 50, type }] }, { original });
  };

  it('gets no guessed address when the desk has only an estimate of its size, and the summary says so', async () => {
    const { bytes, summary } = await withAdded(UNSIZED_TYPE);
    expect([addressCount(bytes), summary.autoPatched, summary.changes?.added]).toEqual([1, 0, 1]);
    expect(texts(summary.report.losses)).toEqual([
      '1 added fixtures have no patch; the desk does not know their channel count.',
    ]);
  });

  it('gets an address above the kept ones when the desk knows its size', async () => {
    const { bytes, summary } = await withAdded(SIZED_TYPE);
    expect([addressCount(bytes), summary.autoPatched]).toEqual([2, 1]);
    expect(summary.report.losses).toEqual([]);
  });
});
