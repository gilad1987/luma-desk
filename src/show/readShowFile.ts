import type { Cue } from '../engine/CueList';
import type { GroupPool } from '../engine/GroupLibrary';
import type { Preset } from '../engine/presetTypes';
import { isRecord } from './isRecord';
import type { SavedExecInput, ShowFileInput } from './ShowFile';

/**
 * Narrows parsed show JSON (saved show, pasted or opened file) to what the loader reads, field by field. A field of
 * the wrong type counts as missing, so the loader's defaults apply; the original stored such values as they were.
 * JSON `null` throws before anything changes, as reading a field of it always did. Only the containers are checked:
 * the groups, presets and cues inside are taken as saved, as every desk version did, because checking them would turn
 * shows that load today into bad files.
 */
export function readShowFile(data: unknown): ShowFileInput {
  if (data === null || data === undefined) throw new TypeError(`Show file must be a JSON object, got ${String(data)}`);
  const file = isRecord(data) ? data : {};
  const { bpm, haze } = file;
  return {
    groups: readGroups(file['groups']),
    presets: readPresets(file['presets']),
    execs: Array.isArray(file['execs']) ? file['execs'].map(readExec) : undefined,
    bpm: typeof bpm === 'number' ? bpm : undefined,
    haze: typeof haze === 'number' ? haze : undefined,
  };
}

function readGroups(value: unknown): GroupPool | undefined {
  if (!value) return undefined;
  // the earlier port spread a truthy non-object into no groups, so only the newer default groups fill the pool
  if (!isRecord(value)) return {};
  return value as GroupPool; // entries taken as saved (see readShowFile)
}

function readPresets(value: unknown): Record<string, Record<string, Preset>> | undefined {
  if (!isRecord(value)) return undefined;
  const pools = Object.entries(value).map(([type, slots]) => [type, isRecord(slots) ? slots : {}] as const);
  return Object.fromEntries(pools) as Record<string, Record<string, Preset>>; // entries taken as saved
}

function readExec(value: unknown): SavedExecInput {
  if (!isRecord(value)) return {};
  const { name, cues, level } = value;
  return {
    name: typeof name === 'string' ? name : undefined,
    cues: Array.isArray(cues) ? (cues as Cue[]) : undefined, // cues taken as saved
    level: typeof level === 'number' ? level : undefined,
  };
}
