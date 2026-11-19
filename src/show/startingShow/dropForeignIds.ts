import type { Cue } from '../../engine/CueList';
import type { Executor } from '../../engine/Executor';
import type { GroupLibrary, GroupPool } from '../../engine/GroupLibrary';
import type { PresetLibrary } from '../../engine/PresetLibrary';
import { PRESET_TYPE_IDS, type Preset, type PresetPools } from '../../engine/presetTypes';

/** The parts of a live show that store fixture ids. */
export interface ShowIdParts {
  readonly execs: readonly Pick<Executor, 'cues' | 'invalidate'>[];
  readonly groupLibrary: Pick<GroupLibrary, 'all' | 'replace'>;
  readonly presetLibrary: Pick<PresetLibrary, 'all' | 'replace'>;
}

/** The entries of `record` whose numeric key is in `keep`. */
function keepKeys<T>(record: Readonly<Record<string, T>>, keep: ReadonlySet<number>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => keep.has(Number(id))));
}

/** Saved shows are not validated, so a cue may lack its values or its phaser list; both read as empty, as in Tracking. */
const keepCue = (cue: Cue, keep: ReadonlySet<number>): Cue => ({
  ...cue,
  vals: keepKeys(cue.vals ?? {}, keep),
  fx: (cue.fx || []).map((fx) => ({ ...fx, ids: fx.ids.filter((id) => keep.has(id)) })),
});

/** The groups with only kept ids; a group left without ids is dropped, as storing an empty selection drops it. */
function keepGroups(pool: GroupPool, keep: ReadonlySet<number>): GroupPool {
  const out: GroupPool = {};
  for (const [slot, group] of Object.entries(pool)) {
    const ids = group.ids.filter((id) => keep.has(id));
    if (ids.length > 0) out[Number(slot)] = { ...group, ids };
  }
  return out;
}

const keepPreset = (preset: Preset, keep: ReadonlySet<number>): Preset =>
  preset.kind === 'fix' ? { ...preset, fix: keepKeys(preset.fix, keep) } : preset;

function keepPresets(pools: PresetPools, keep: ReadonlySet<number>): PresetPools {
  const out = { ...pools };
  for (const type of PRESET_TYPE_IDS) {
    out[type] = Object.fromEntries(Object.entries(pools[type]).map(([n, p]) => [n, keepPreset(p, keep)]));
  }
  return out;
}

/**
 * Drops every stored value and id outside `keep` from the cues of all executors, the groups and the fixture presets,
 * so the operator's show keeps what it wrote for fixtures that are still the same and drives no other fixture.
 */
export function dropForeignIds(parts: ShowIdParts, keep: ReadonlySet<number>): void {
  for (const exec of parts.execs) {
    exec.cues = exec.cues.map((cue) => keepCue(cue, keep));
    exec.invalidate();
  }
  parts.groupLibrary.replace(keepGroups(parts.groupLibrary.all, keep));
  parts.presetLibrary.replace(keepPresets(parts.presetLibrary.all, keep));
}
