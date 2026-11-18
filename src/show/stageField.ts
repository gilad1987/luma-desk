import { parseStageDesign, type StageParseResult } from '../domain/stage/parse/parseStageDesign';
import { isSameData } from '../domain/stage/sameData';
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
 * Applies the stage of a show before the groups load, so they come from the new rig. A show without `stage` means the
 * built-in design; a `stage` that does not parse means the built-in design plus one toast, and the rest of the show
 * still loads. It applies only when the design changes: an equal `stage` (the show the desk booted on) or a missing or
 * bad one on the built-in stage keeps the rig, because each apply rebuilds the scene and resets the caches.
 */
export function readStage(raw: unknown, deps: StageFieldDeps): void {
  const { service, builtIn, badStage, toast } = deps;
  const result = stageOf(raw);
  if (result?.ok) {
    if (!isSameData(result.design, service.design)) service.apply(result.design, 'showLoad');
    return;
  }
  if (!service.isBuiltIn) service.apply(builtIn, 'showLoad');
  if (result) toast({ kind: 'toast', text: badStage });
}

/**
 * The stage of the stored show text, read once at boot before the services exist, so `StageService` starts on it as
 * `initial`. The scene is then built once: the show load that follows reads the same `stage`, and `readStage` skips a
 * design equal to the active one. Missing text, bad JSON, no `stage` key or a `stage` that does not parse all give
 * `undefined`: the desk boots on the built-in stage, and the later show load reports a bad stage.
 */
export function savedStageOf(text: string | null): StageDesign | undefined {
  if (text === null) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  const result = stageOf(data);
  return result?.ok ? result.design : undefined;
}

/** The one reader of the `stage` key for the load and the boot paths: `undefined` when the show has no such key. */
function stageOf(raw: unknown): StageParseResult | undefined {
  const stage = isRecord(raw) ? raw['stage'] : undefined;
  return stage === undefined ? undefined : parseStageDesign(stage);
}
