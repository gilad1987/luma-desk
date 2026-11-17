import { jsonClone } from '../../core';
import { cueAt, findCueIndex, insertCueSorted, nextCueNumber, type Cue } from '../CueList';
import type { Programmer } from '../Programmer';
import { compactFx, PHASER_TYPES, stripFx } from '../shared';
import type { ProgrammerDeps } from './ProgrammerDeps';

/** How a store is recorded. `merge` (sequence click) adds to an existing cue instead of replacing its contents. */
/** Which cue a store writes: executor `exec` (0-based), cue `num`, or after the last cue when `num` is null. */
export interface CueTarget {
  readonly exec: number;
  readonly num: number | null;
}

export interface StoreCueOptions {
  readonly name?: string;
  readonly fade?: number;
  readonly merge?: boolean;
}

/** The fade time of a new cue when the store gives none. */
const DEFAULT_FADE = 2;

/** The cue numbered `num`, emptied unless merging, or a new one inserted in number order. */
function targetCue(cues: Cue[], num: number, opts: StoreCueOptions): Cue {
  const at = findCueIndex(cues, num);
  if (at >= 0) {
    const cue = cueAt(cues, at);
    if (!opts.merge) {
      cue.vals = {};
      cue.fx = [];
    }
    return cue;
  }
  // `||`, not `??`: an empty name gets the default too
  const created: Cue = { num, name: opts.name || `Cue ${num}`, fade: opts.fade ?? DEFAULT_FADE, vals: {}, fx: [] };
  insertCueSorted(cues, created);
  return created;
}

/**
 * Records the programmer into cue `num` of executor `exec` (0-based), or after the last cue when `num` is null. Stored
 * values overwrite per attribute; a stored phaser takes its fixtures out of the cue's phasers on the same feature. The
 * executor's playback is refreshed at once, so the operator sees the stored state if the cue is live.
 */
export function storeCue(
  p: Programmer,
  { pool, bus }: ProgrammerDeps,
  { exec, num }: CueTarget,
  opts: StoreCueOptions,
): void {
  if (!p.hasContent()) {
    bus.emit('message', { kind: 'log', text: 'Store: programmer is empty', level: 'er' });
    return;
  }
  const e = pool.execs[exec];
  if (!e) throw new RangeError(`No executor at index ${exec}`);
  const n = num ?? nextCueNumber(e.cues);
  const cue = targetCue(e.cues, n, opts);
  for (const [id, v] of Object.entries(p.vals)) cue.vals[id] = Object.assign(cue.vals[id] ?? {}, jsonClone(v));
  for (const inst of p.fxList) {
    stripFx(cue.fx, inst.ids, PHASER_TYPES[inst.type].feat);
    cue.fx = compactFx(cue.fx);
    cue.fx.push(jsonClone(inst));
  }
  // a new cue already has this fade; the repeat sets it on an existing cue (both kept, as in the original)
  if (opts.fade != null) cue.fade = opts.fade;
  if (!e.name) e.name = `Seq ${exec + 1}`;
  e.invalidate();
  bus.emit('message', { kind: 'log', text: `Stored Cue ${n} in Exec ${exec + 1} (${e.name})`, level: 'ok' });
  bus.emit('message', { kind: 'toast', text: `Cue ${n} stored → Exec ${exec + 1}` });
  bus.emit('stateDirty', undefined);
  bus.emit('showChanged', undefined);
  bus.emit('cueStored', { exec, num: n });
}
