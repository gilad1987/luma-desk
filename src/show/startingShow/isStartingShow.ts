import { isSameData } from '../../domain/stage/sameData';
import type { Cue } from '../../engine/CueList';
import type { RigSource } from '../../engine/stage/RigSource';
import { buildDemoShowFile } from '../demo/demoShowFile';
import { buildMvrFirstLook, MVR_FIRST_LOOK_NAME } from '../mvrLook/mvrFirstLook';

/** One executor as far as the rule reads it: its name and its cues. */
export interface ExecCues {
  readonly name: string;
  readonly cues: readonly Cue[];
}

const sameExec = (exec: ExecCues, name: string, cues: readonly Cue[]): boolean =>
  exec.name === name && isSameData(exec.cues, cues);

/**
 * True when the executors hold nothing the operator made, so a rig change may replace them: every executor is empty,
 * or every executor equals the demo show built for `source`, the stage the show was built for (executor 1 may also
 * hold the MVR first look of that stage). The desk has no dirty flag, and a flag would not survive a reload of an
 * older save; comparing with a fresh build of the same pure demo does, and one changed cue value fails it. Names and
 * cues are compared, not fader levels: a fader move plays the show, it does not edit it.
 */
export function isStartingShow(execs: readonly ExecCues[], source: RigSource): boolean {
  if (execs.every((exec) => exec.cues.length === 0)) return true;
  const demo = buildDemoShowFile(source.rig, source).execs ?? [];
  const look = buildMvrFirstLook(source);
  return execs.every((exec, i) => {
    if (i === 0 && look !== null && sameExec(exec, MVR_FIRST_LOOK_NAME, [look])) return true;
    const want = demo[i];
    return sameExec(exec, want?.name ?? '', want?.cues ?? []);
  });
}
