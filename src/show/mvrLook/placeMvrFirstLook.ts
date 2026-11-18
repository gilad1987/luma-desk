import { isSameData } from '../../domain/stage/sameData';
import type { EngineBus } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { RigSource } from '../../engine/stage/RigSource';
import { buildDemoShowFile } from '../demo/demoShowFile';
import { buildMvrFirstLook, MVR_FIRST_LOOK_NAME } from './mvrFirstLook';

/**
 * Where the first look went: on the executor at `execIndex` (0 is executor 1), nowhere because every executor holds
 * the operator's cues, or nowhere because the rig has no fixture the look uses.
 */
export type FirstLookPlacement =
  | { readonly kind: 'placed'; readonly execIndex: number }
  | { readonly kind: 'noFreeExecutor' }
  | { readonly kind: 'noLook' };

/** What placing the look needs: the stage just imported, the executors and the bus that triggers the save. */
export interface FirstLookDeps {
  /** The stage just applied; its demo song on executor 1 is the starting show the import built. */
  readonly source: RigSource;
  readonly execs: readonly Executor[];
  readonly bus: Pick<EngineBus, 'emit'>;
}

/**
 * True when executor 1 holds nothing the operator made: no cues, an earlier MVR first look, or the demo song exactly
 * as the demo of `source` loads it, which is what the starting show of an import leaves there.
 */
function isExecOneReplaceable(exec: Executor, source: RigSource): boolean {
  if (exec.cues.length === 0) return true;
  if (exec.name === MVR_FIRST_LOOK_NAME && exec.cues.length === 1) return true;
  const song = buildDemoShowFile(source.rig, source).execs?.[0];
  return song?.cues !== undefined && exec.name === song.name && isSameData(exec.cues, song.cues);
}

/** The executor index for the look: 0 when executor 1 is replaceable, else the first empty executor, else -1. */
function chooseExecIndex(execs: readonly Executor[], source: RigSource): number {
  const first = execs[0];
  if (first !== undefined && isExecOneReplaceable(first, source)) return 0;
  return execs.findIndex((e) => e.cues.length === 0);
}

/**
 * Puts the MVR first look on an executor and starts it at full with no fade, then asks for a save, so a reload keeps
 * the cue and does not build it again. It never overwrites the operator's cues: executor 1 is used only when
 * `isExecOneReplaceable`, otherwise the first empty executor; with none free the show stays as it is. The caller
 * reports the placement to the operator and repaints.
 */
export function placeMvrFirstLook(deps: FirstLookDeps): FirstLookPlacement {
  const cue = buildMvrFirstLook(deps.source);
  if (cue === null) return { kind: 'noLook' };
  const execIndex = chooseExecIndex(deps.execs, deps.source);
  const exec = deps.execs[execIndex];
  if (exec === undefined) return { kind: 'noFreeExecutor' };
  exec.name = MVR_FIRST_LOOK_NAME;
  exec.cues = [cue];
  exec.resetTracking();
  exec.level = 1;
  exec.goto(0, 0);
  deps.bus.emit('showChanged', undefined);
  deps.bus.emit('stateDirty', undefined);
  return { kind: 'placed', execIndex };
}
