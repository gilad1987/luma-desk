import type { DesignResult } from '../design/toStageDesign';
import type { LumaStageData } from '../luma/lumaData';
import { unpatchedBreaksOf } from '../luma/unpatchedBreaks';
import type { MvrFixtureRecord } from '../scene/MvrScene';
import type { LumaApplied } from './applyLumaData';
import { keepUnpatched } from './keepUnpatched';
import { withLumaData } from './withLumaData';

/**
 * The design step's result as the desk's own data in the file changes it: the stage parts come back (`withLumaData`)
 * and the fixtures the desk wrote unpatched lose the patch the other breaks gave them (`keepUnpatched`). A file
 * without luma data has no such fixtures, so its result passes through.
 */
export function lumaDesign(
  result: DesignResult,
  luma: LumaStageData | undefined,
  doc: Document,
  records: readonly MvrFixtureRecord[],
): LumaApplied {
  const applied = withLumaData(result, luma);
  if (!luma) return applied;
  return { ...applied, design: keepUnpatched(applied.design, unpatchedBreaksOf(doc), records) };
}
