import type { MvrWarning } from '../MvrWarning';
import { grouped, line, type ExportReport } from './exportReport';
import { isStandInSpec } from './gdtfIdentity';
import { standInNote } from './plainLosses';
import type { FixtureChanges } from './passThrough/patchScene';
import { addressLossNotes, crowdedLines, loneEstimateNotes, planNotes } from './patchPlanNotes';
import type { WrittenScene } from './writeScene';

/** What a pass-through export carried over from the original file. */
export interface KeptCounts {
  readonly objects: number;
  readonly trusses: number;
  readonly groups: number;
  readonly symbols: number;
  readonly layers: number;
  readonly classes: number;
  readonly gdtfFiles: number;
  readonly meshFiles: number;
}

/** What one export wrote, for the summary toast and for tests. */
export interface MvrExportSummary {
  readonly fixtures: number;
  /** Fixtures without a patch that the export gave an address. */
  readonly autoPatched: number;
  readonly trusses: number;
  /** `<SceneObject>` and `<VideoScreen>` elements: deck, risers, LED walls and side screens. */
  readonly objects: number;
  readonly layers: number;
  /** Mesh files the archive holds; empty when the caller passed no meshes to `exportMvr`. */
  readonly geometryFiles: readonly string[];
  /** Problems the file keeps, such as overlapping patches; their messages are also in `notes`. */
  readonly warnings: readonly MvrWarning[];
  /** Every English sentence for the user in one list and a fixed order; `report` holds them by kind. */
  readonly notes: readonly string[];
  /**
   * The sentences in three groups: what the file does not carry, what a console user must check, and information.
   * The dialog shows these, and opens by itself only for the first two.
   */
  readonly report: ExportReport;
  /** Only for an export from the original file: what it kept and how the desk changed its fixtures. */
  readonly kept?: KeptCounts;
  readonly changes?: FixtureChanges;
}

/** The sentence for fixtures the export gave an address. */
function autoNote({ patchPlan }: WrittenScene): string[] {
  const { autoPatched } = patchPlan;
  return autoPatched > 0 ? [`${autoPatched} fixtures had no DMX patch and got addresses in fixture-id order.`] : [];
}

/**
 * The summary of a written scene. The notes say what the file lacks and holds, because a console user opening it must
 * know that GDTF files come from GDTF-Share, which addresses are guesses and whether the object bodies are included.
 */
export function summarizeExport(
  scene: WrittenScene,
  geometryFiles: readonly string[],
  losses: readonly string[] = [],
): MvrExportSummary {
  const trusses = scene.objects.filter((object) => object.tag === 'Truss').length;
  const real = scene.gdtfSpecs.filter((spec) => !isStandInSpec(spec));
  const gdtfNote = `GDTF files are not included; get them from GDTF-Share: ${real.join(', ') || 'none needed'}.`;
  const standIns = standInNote(scene.standIns, scene.gdtfSpecs);
  const plan = scene.patchPlan;
  const overlaps = plan.warnings.map((warning) => warning.message);
  const geometryNote = `Geometry files included: ${geometryFiles.length}.`;
  const planned = [...autoNote(scene), ...planNotes(plan), ...overlaps];
  const notes = [gdtfNote, ...standIns, ...planned, geometryNote, ...losses];
  // A desk show holds no GDTF files, so that sentence is in every export of one: as a loss it opened the dialog every
  // time and hid the real ones. An estimate is a warning only where another patch follows it (`PatchPlan.crowded`).
  const report = {
    losses: [...losses, ...addressLossNotes(plan)].map(line),
    warnings: [...standIns.map(line), ...crowdedLines(plan), ...grouped('patches overlap or may overlap', overlaps)],
    information: [gdtfNote, ...autoNote(scene), ...loneEstimateNotes(plan), geometryNote].map(line),
  };
  return {
    fixtures: scene.fixtures,
    autoPatched: plan.autoPatched,
    trusses,
    objects: scene.objects.length - trusses,
    layers: scene.layers,
    geometryFiles,
    warnings: plan.warnings,
    notes,
    report,
  };
}
