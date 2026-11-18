import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import { storedMvrOf } from '../../ui/panels/mvr/storedMvrOf';
import { noteEarlierFloorPoses } from './earlierFloorPoses';
import { followLookPalette } from './ledLookPalette';
import { ledWallsControl } from './ledSummary';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { offerLayerList } from './mvrLayerList';
import { showsMvrFile } from './showsMvrFile';

/**
 * The boot step for a saved MVR stage. The show holds only the design; the scenery and its mesh bytes come only from
 * the file, so the stored bytes are imported again. The scenery is drawn from the current design, which holds the
 * user's hidden layers. Without the stored bytes the rig still loads from the design, a toast says so and the prompt
 * asks for the file. No summary opens at boot, the top bar gets "Layers" in its place; mesh files three.js cannot
 * draw are named in one toast, and one more counts the floor fixtures a stage saved earlier still draws in the old
 * pose (`earlierFloorPoses`). The LED content takes the colour pair of the rig's first look, as after an import, so
 * the walls look the same before and after a reload. The scenery
 * chunk loads before the file is read, like the parser chunk in an import. `queued` is the stage when the restore was
 * queued. A stage of another file (before the restore runs or during an await) stops it before it shows the prompt
 * or the scenery, so a restore never draws over a later stage of another file. The check is by file, not by queue
 * order: after show loads of A, then B, then A, both restores of A go on and draw A twice; the second draw replaces
 * the first, because the scenery disposes its old meshes before it draws. A stage of the same file (a builder edit,
 * a show load) keeps it going: the stage follower queues nothing for that change, so this restore draws its scenery.
 * A stage of the same file without MVR data stops it like another file: the stage follower disposed the scenery.
 */
export async function restoreStoredMvr(deps: MvrFlowDeps, queued: StageDesign): Promise<void> {
  const { stage, store, scenery, prompt, toast } = deps;
  const stored = await storedMvrOf(queued, store);
  if (!showsMvrFile(stage.design, queued.source)) return;
  if (stored.kind === 'missing') {
    prompt.show(stored.fileName);
    toast(he.mvr.missingToast(stored.fileName));
  }
  if (stored.kind !== 'found') return;
  await scenery.load();
  const { importMvr } = await import('../../mvr');
  const result = await importMvr(stored.bytes, { name: queued.source.name });
  const { geometry, meshes, meshResources } = result;
  const { design } = stage;
  if (!showsMvrFile(design, queued.source)) return;
  const bodies = deps.bodies.show(result);
  const failures = await scenery.show({ design, geometry, meshes, meshResources });
  await bodies;
  // No summary opens at boot, so the top bar's LED level and "Layers" button are the way to the walls and to the
  // hidden and marked layers of a restored stage.
  const current = (): boolean => showsMvrFile(stage.design, queued.source);
  await ledWallsControl(geometry, { marked: design.mvr?.ledLayers ?? [], current });
  if (current()) offerLayerList(deps, geometry);
  // the rig has one fixture per design fixture, which is the count the first look chose its colours by
  if (current()) followLookPalette(design.fixtures.length);
  // both notes are about this stage: after a change to another file they would name what is no longer drawn
  if (!current()) return;
  if (failures.length > 0) toast(he.mvr.meshFailed(failures.map(({ file }) => file).join(', ')));
  noteEarlierFloorPoses(design, result.design, toast);
}
