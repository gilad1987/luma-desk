import { parseStageDesign } from '../../domain/stage/parse/parseStageDesign';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Says why the stage of an import is gone right after the import's own show step. The starting show is loaded as a
 * show file, and the loader reads the design back through the stage parser; a design the parser rejects makes the
 * loader fall back to the built-in stage. That is a failed import, not a choice of the user, so it is reported with
 * the first parser error in a toast and in the import error line. A design that parses says something else replaced
 * the stage in that step: the import then ends without a message, as it does for a stage change of the user.
 */
export function reportRejectedDesign(design: StageDesign, deps: Pick<MvrFlowDeps, 'toast'>): void {
  const parsed = parseStageDesign(design);
  if (parsed.ok) return;
  const message = he.mvr.designRejected(design.source.name, parsed.errors[0] ?? '');
  deps.toast(message);
  setMvrImportError(message);
}
