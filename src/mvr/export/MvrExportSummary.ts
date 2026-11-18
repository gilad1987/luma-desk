import { MAX_UNIVERSE } from '../../domain/stage/parse/parsePatch';
import type { MvrWarning } from '../MvrWarning';
import type { WrittenScene } from './writeScene';

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
  /** English sentences for the user, in a fixed order. */
  readonly notes: readonly string[];
}

/** The notes about the patch: what the export assigned, estimated or left out. */
function patchNotes({ patchPlan }: WrittenScene): string[] {
  const { autoPatched, estimated, unplaced, skipped, warnings } = patchPlan;
  return [
    ...(autoPatched > 0 ? [`${autoPatched} fixtures had no DMX patch and got addresses in fixture-id order.`] : []),
    ...(estimated > 0
      ? [`${estimated} auto-patched fixtures use an estimated channel count; check their addresses on the console.`]
      : []),
    ...(unplaced > 0
      ? [`${unplaced} fixtures had no DMX patch and no free universe up to ${MAX_UNIVERSE}; they have no address.`]
      : []),
    ...(skipped > 0 ? [`${skipped} fixtures had an invalid DMX patch and were written without an address.`] : []),
    ...warnings.map((warning) => warning.message),
  ];
}

/**
 * The summary of a written scene. The notes say what the file lacks and holds, because a console user opening it must
 * know that GDTF files come from GDTF-Share, which addresses are guesses and whether the object bodies are included.
 */
export function summarizeExport(scene: WrittenScene, geometryFiles: readonly string[]): MvrExportSummary {
  const trusses = scene.objects.filter((object) => object.tag === 'Truss').length;
  const notes = [
    `GDTF files are not included; get them from GDTF-Share: ${scene.gdtfSpecs.join(', ') || 'none needed'}.`,
    ...patchNotes(scene),
    `Geometry files included: ${geometryFiles.length}.`,
  ];
  return {
    fixtures: scene.fixtures,
    autoPatched: scene.patchPlan.autoPatched,
    trusses,
    objects: scene.objects.length - trusses,
    layers: scene.layers,
    geometryFiles,
    warnings: scene.patchPlan.warnings,
    notes,
  };
}
