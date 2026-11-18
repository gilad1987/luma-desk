import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import { storedMvrOf } from '../../ui/panels/mvr/storedMvrOf';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { sameMvrFile } from './sameMvrFile';

/**
 * The boot step for a saved MVR stage. The show holds only the design; the scenery and its mesh bytes come only from
 * the file, so the stored bytes are imported again. The scenery is drawn from the current design, which holds the
 * user's hidden layers. Without the stored bytes the rig still loads from the design, a toast says so and the prompt
 * asks for the file. No summary opens at boot; mesh files three.js cannot draw are named in one toast. The scenery
 * chunk loads before the file is read, like the parser chunk in an import. `queued` is the stage when the restore was
 * queued. A stage of another file (before the restore runs or during an await) stops it before it shows the prompt
 * or the scenery, so two queued restores do not both draw the latest stage. A stage of the same file (a builder edit,
 * a show load) keeps it going: the stage follower queues nothing for that change, so this restore draws its scenery.
 */
export async function restoreStoredMvr(deps: MvrFlowDeps, queued: StageDesign): Promise<void> {
  const { stage, store, scenery, prompt, toast } = deps;
  const stored = await storedMvrOf(queued, store);
  if (!sameMvrFile(queued.source, stage.design.source)) return;
  if (stored.kind === 'missing') {
    prompt.show(stored.fileName);
    toast(he.mvr.missingToast(stored.fileName));
  }
  if (stored.kind !== 'found') return;
  await scenery.load();
  const { importMvr } = await import('../../mvr');
  const { geometry, meshes, meshResources } = await importMvr(stored.bytes, { name: queued.source.name });
  const { design } = stage;
  if (!sameMvrFile(queued.source, design.source)) return;
  const failures = await scenery.show({ design, geometry, meshes, meshResources });
  if (failures.length > 0) toast(he.mvr.meshFailed(failures.map(({ file }) => file).join(', ')));
}
