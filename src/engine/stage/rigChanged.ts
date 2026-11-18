import type { StageDesign } from '../../domain/stage/StageDesign';

/**
 * Why the rig was replaced. Listeners read it from the `RigSource`, not from the event, because their reaction depends
 * on it: a `preview` is not committed (missing-fixture warnings stay), a `showLoad` brings its own groups, and only
 * `builder` and `import` change the saved show. `import` is for the MVR import.
 */
export type RigChangeCause = 'boot' | 'preview' | 'builder' | 'showLoad' | 'import';

/**
 * The `rigChanged` payload (contract G5): only the new design. Rig, frame and cause live on the `RigSource`, so the
 * event cannot carry a second, possibly stale copy of them.
 */
export interface RigChanged {
  readonly design: StageDesign;
}
