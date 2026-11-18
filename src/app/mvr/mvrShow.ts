import type { ShowBefore, StartingShow } from '../../show/startingShow/StartingShow';
import { applyFirstLook } from './applyFirstLook';

/** What an import did with the show: built the starting show, or kept the operator's cues. */
export type ShowAfterImport = 'built' | 'kept';

/** The show steps of the MVR flows; `wireMvr` builds it once. */
export interface MvrShow {
  /** Measures the show; call it while the old stage is still applied. */
  readonly before: () => ShowBefore;
  /** After an import: a starting show is rebuilt with the first look; the operator's cues are kept, minus dead ids. */
  readonly afterImport: (before: ShowBefore) => ShowAfterImport;
  /** After a return to the built-in stage: the same rule, without the MVR first look. */
  readonly afterDemoRig: (before: ShowBefore) => void;
  /** The summary's "Build a starting show for this rig": the operator chose to replace the show. */
  readonly build: () => void;
}

/**
 * The show steps of an import and of Load demo rig on top of `StartingShow`, with the first-look toasts. A kept show
 * still gets the first look on a free executor, so the new rig has one working cue whatever the operator chooses.
 */
export function mvrShow(show: StartingShow, toast: (text: string) => void): MvrShow {
  const look = (): void => applyFirstLook(() => show.placeFirstLook(), toast);
  const build = (): void => {
    show.build();
    look();
  };
  return {
    before: () => show.before(),
    afterImport: (before) => {
      if (before.starting) build();
      else {
        show.keep(before.rig);
        look();
      }
      return before.starting ? 'built' : 'kept';
    },
    afterDemoRig: (before) => (before.starting ? show.build() : show.keep(before.rig)),
    build,
  };
}
