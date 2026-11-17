import { parseStageDesign } from '../domain/stage/parse/parseStageDesign';
import type { StageDesign } from '../domain/stage/StageDesign';
import { isRecord } from './isRecord';

/**
 * The stage of the stored show text, read once at boot before the services exist, so `StageService` starts on it as
 * `initial` and the scene is built once. Missing text, bad JSON, no `stage` key or a `stage` that does not parse all
 * give `undefined`: the desk boots on the built-in stage, and the later show load reports a bad stage.
 */
export function savedStageOf(text: string | null): StageDesign | undefined {
  if (text === null) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  const stage = isRecord(data) ? data['stage'] : undefined;
  if (stage === undefined) return undefined;
  const result = parseStageDesign(stage);
  return result.ok ? result.design : undefined;
}
