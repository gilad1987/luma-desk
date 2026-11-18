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
  /** How the fixtures of each product get their body (`MvrImport.summary.bodyLines`), one line per product. */
  readonly bodies: readonly string[];
}

/**
 * A mesh file the import accepted but three.js could not draw. The type is structural, as render's `MeshFailure`
 * has this shape and ui does not import render.
 */
export interface MeshFileFailure {
  readonly file: string;
  readonly reason: string;
}

const metres = (value: number): string => value.toFixed(2);

/**
 * The summary of one import (plan §6, `ImportSummary`): what came in, what is missing and what the import changed.
 * `meshFailures` is what `MvrStage.show` resolved with; each failure is a warning, after those of the import.
 */
export function importSummaryView(result: MvrImport, meshFailures: readonly MeshFileFailure[]): ImportSummaryView {
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
    warnings: [
      ...result.warnings.map((warning) => warning.message),
      ...meshFailures.map(({ file, reason }) => `Mesh file ${file} could not be drawn: ${reason}`),
    ],
    bodies: summary.bodyLines.map((line) => line.message),
  };
}
