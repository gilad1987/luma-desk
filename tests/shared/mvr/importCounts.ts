import type { MvrImport } from '../../../src/mvr/index.ts';

/** The numbers a local sample run logs per file, so a reader can compare runs and spot a changed import. */
export interface ImportCounts {
  readonly fixtures: number;
  readonly patched: number;
  readonly unpatched: number;
  readonly missingGdtf: number;
  readonly placements: number;
  readonly objects: number;
  readonly layers: number;
  readonly warnings: Readonly<Record<string, number>>;
}

/** Counts one import; warnings are tallied by code, because their number per file says little on its own. */
export function importCounts(result: MvrImport): ImportCounts {
  const { summary } = result;
  const warnings: Record<string, number> = {};
  for (const { code } of result.warnings) warnings[code] = (warnings[code] ?? 0) + 1;
  return {
    fixtures: summary.fixtureCount,
    patched: summary.fixtureCount - summary.unpatchedCount,
    unpatched: summary.unpatchedCount,
    missingGdtf: summary.missingGdtfCount,
    placements: summary.placementCount,
    objects: summary.objectCount,
    layers: summary.layerCount,
    warnings,
  };
}
