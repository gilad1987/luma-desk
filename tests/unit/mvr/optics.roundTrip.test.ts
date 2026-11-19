// @vitest-environment jsdom
/**
 * The optics never reach an MVR export: a design with optics exports the same files as the same design without.
 * The choice for a round trip is to recompute: optics come from the GDTF files of the imported archive only. A desk
 * export holds no GDTF file, so its re-import has no optics and says so; the source file gives them again.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { exportMvr } from '../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { OPTICS_MVR } from '../../shared/index.ts';

/** Every file of the export as text, by name. */
function exported(design: StageDesign): Record<string, string> {
  const entries = Object.entries(unzipSync(exportMvr(design).bytes));
  return Object.fromEntries(entries.map(([name, bytes]) => [name, strFromU8(bytes)]));
}

const opticsOf = (design: StageDesign): unknown[] =>
  Object.values(design.mvr?.fixtures ?? {}).map((info) => info.optics);

describe('MVR round trip of fixtures with GDTF optics', () => {
  it('exports the same files with and without the optics', async () => {
    const { design } = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    const dropOptics = (key: string, value: unknown): unknown => (key === 'optics' ? undefined : value);
    const bare = JSON.parse(JSON.stringify(design, dropOptics)) as StageDesign;
    expect(opticsOf(design).filter((optics) => optics !== undefined)).toHaveLength(3);
    expect(opticsOf(bare).filter((optics) => optics !== undefined)).toHaveLength(0);
    expect(exported(design)).toEqual(exported(bare));
    expect(JSON.stringify(exported(design))).not.toContain('PhysicalFrom');
  });

  it('gives a re-imported desk export no optics, and one honest summary line per product', async () => {
    const first = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'Optics.mvr' });
    expect(opticsOf(second.design)).toEqual(Array.from({ length: 6 }, () => undefined));
    expect(second.goboImages?.size).toBe(0);
    const lines = second.summary.opticsLines ?? [];
    expect(lines.every((line) => line.reason === 'noGdtf')).toBe(true);
    expect(lines.reduce((sum, line) => sum + line.count, 0)).toBe(second.summary.fixtureCount);
    expect(second.design.fixtures).toHaveLength(first.design.fixtures.length);
  });

  it('reads the same optics again from the source file', async () => {
    const first = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    const again = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    expect(opticsOf(again.design)).toEqual(opticsOf(first.design));
  });
});
