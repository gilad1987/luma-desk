import { parseStageDesign } from '../domain/stage/parse/parseStageDesign';
import type { StageDesign } from '../domain/stage/StageDesign';
import type { EngineMessage } from '../engine/events';
import type { StageService } from '../engine/stage/StageService';
import { isRecord } from './isRecord';

/**
 * What the show file needs to save and load the stage (plan §3.4). Optional in `ShowSerializerDeps`, so a desk
 * without a stage service saves and loads exactly the show of today.
 */
export interface StageFieldDeps {
  readonly service: Pick<StageService, 'apply' | 'design' | 'isBuiltIn'>;
  /** The design that a show without a valid `stage` key means. */
  readonly builtIn: StageDesign;
  /** The toast text for a show whose `stage` key does not parse; injected because `show/` holds no UI language. */
  readonly badStage: string;
  /** Sends the bad-stage toast; main.ts passes the engine bus `message` emit. */
  readonly toast: (message: EngineMessage) => void;
}

/**
 * The `stage` key of a saved show: present only for a custom design, so the default show stays byte-equal to the
 * shows of older desks. The caller spreads it last, so the key comes after every v1 key.
 */
export function writeStage(deps: StageFieldDeps): { stage?: StageDesign } {
  return deps.service.isBuiltIn ? {} : { stage: deps.service.design };
}

/**
 * Applies the stage of a show before anything else loads, so the groups that follow come from the new rig. A show
 * without `stage` means the built-in design; a `stage` that does not parse falls back to the built-in design with one
 * toast, and the rest of the show still loads. It applies nothing when the built-in design is already active and the
 * show has no stage, so an old show does not rebuild the rig.
 */
export function readStage(raw: unknown, deps: StageFieldDeps): void {
  const { service, builtIn, badStage, toast } = deps;
  const stage = isRecord(raw) ? raw['stage'] : undefined;
  if (stage === undefined) {
    if (!service.isBuiltIn) service.apply(builtIn, 'showLoad');
    return;
  }
  const result = parseStageDesign(stage);
  if (result.ok) {
    service.apply(result.design, 'showLoad');
    return;
  }
  service.apply(builtIn, 'showLoad');
  toast({ kind: 'toast', text: badStage });
}
