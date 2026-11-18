import type { Rig } from '../../domain/rig';
import type { RigSource } from '../../engine/stage/RigSource';

/**
 * `deps` plus a `rig` getter on the stage. Programmer, OutputMerger, CommandRunner, ShowSerializer and DemoShow read
 * `deps.rig` on every call, so a live getter lets them follow a stage change with no event of their own. The getter is
 * declared after the spread of `deps`, so it stays a getter; spreading the result would freeze today's rig.
 */
export function withLiveRig<T extends object>(stage: Pick<RigSource, 'rig'>, deps: T): T & { readonly rig: Rig } {
  return {
    ...deps,
    get rig(): Rig {
      return stage.rig;
    },
  };
}
