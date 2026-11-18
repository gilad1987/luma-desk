import type { Rig } from '../../domain/rig/Rig';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageFrame } from '../../domain/stage/StageFrame';
import type { RigChangeCause } from './rigChanged';

/**
 * The current rig and the stage it came from. Everyone who needs the rig holds one and reads `.rig` at call time, so a
 * rig change needs no re-wiring; only caches subscribe to `rigChanged`.
 */
export interface RigSource {
  readonly rig: Rig;
  readonly design: StageDesign;
  readonly frame: StageFrame;
  /** The cause of the last change; `boot` until the first `apply`. */
  readonly cause: RigChangeCause;
  /** True only on the built-in design itself; the built-in stage keeps the old 37-slot default group pool. */
  readonly isBuiltIn: boolean;
}
