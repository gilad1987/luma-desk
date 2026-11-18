import { he } from '../../i18n/he';
import { storedMvrOf } from '../../ui/panels/mvr/storedMvrOf';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * The boot step for a saved MVR stage. The show holds only the design; the scenery and its mesh bytes come only from
 * the file, so the stored bytes are imported again. The scenery is drawn from the saved design, which holds the
 * user's hidden layers. Without the stored bytes the rig still loads from the design and the prompt asks for the
 * file. No summary opens at boot; mesh files three.js cannot draw are named in one toast.
 */
export async function restoreStoredMvr({ stage, store, scenery, prompt, toast }: MvrFlowDeps): Promise<void> {
  const { design } = stage;
  const stored = await storedMvrOf(design, store);
  if (stored.kind === 'missing') prompt.show(stored.fileName);
  if (stored.kind !== 'found') return;
  const { importMvr } = await import('../../mvr');
  const { geometry, meshes, meshResources } = await importMvr(stored.bytes, { name: design.source.name });
  const failures = await scenery.show({ design, geometry, meshes, meshResources });
  if (failures.length > 0) toast(he.mvr.meshFailed(failures.map(({ file }) => file).join(', ')));
}
