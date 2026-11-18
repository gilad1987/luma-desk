import type { MvrImport } from '../../../mvr';

/** The counts the summary shows; each is also the `data-count` attribute the e2e tests read. */
export type SummaryCountKey = 'fixtures' | 'unpatched' | 'missingGdtf' | 'objects';

/** One count line of the import summary. */
export interface SummaryCount {
  readonly key: SummaryCountKey;
  readonly label: string;
  readonly value: number;
}

/**
 * What the import summary modal shows, as data, so the DOM panel only renders it and the wording is unit-tested.
 * Labels are English inline (plan decisions 15-16); the Hebrew help lives in the tooltips.
 */
export interface ImportSummaryView {
  readonly counts: readonly SummaryCount[];
  /** The auto-fit offset in metres, so the user knows the file was moved to fit the stage. */
  readonly offset: string;
  readonly geometry: 'Stage built from MVR' | 'No stage geometry in file';
  readonly warnings: readonly string[];
}

const metres = (value: number): string => value.toFixed(2);

/** The summary of one import (plan §6, `ImportSummary`): what came in, what is missing and what the import changed. */
export function importSummaryView(result: MvrImport): ImportSummaryView {
  const { summary } = result;
  const [x, y, z] = result.geometry.offset;
  return {
    counts: [
      { key: 'fixtures', label: 'Fixtures', value: summary.fixtureCount },
      { key: 'unpatched', label: 'Unpatched', value: summary.unpatchedCount },
      { key: 'missingGdtf', label: 'Missing GDTF', value: summary.missingGdtfCount },
      { key: 'objects', label: 'Objects', value: summary.objectCount },
    ],
    offset: `Offset x ${metres(x)} m, y ${metres(y)} m, z ${metres(z)} m`,
    geometry: summary.noGeometry ? 'No stage geometry in file' : 'Stage built from MVR',
    warnings: result.warnings.map((warning) => warning.message),
  };
}
