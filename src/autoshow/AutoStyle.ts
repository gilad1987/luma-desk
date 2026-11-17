import type { PresetFnName } from '../engine/presetFunctions';
import type { PhaserType } from '../engine/shared';
import type { Section } from './sections';

/**
 * One musical style of the auto-show: the palette, positions, effects and pacing its generated looks draw from. The
 * optional flags change how a look is built (see `LookGenerator`); a missing flag means "off".
 */
export interface AutoStyle {
  /** The name on the style button and in the HUD; its first word names a saved look. */
  readonly name: string;
  /** Crossfade time in seconds from one look to the next. */
  readonly fade: number;
  /** Bars per look when the operator leaves "bars" on auto. */
  readonly bars: number;
  /** Colour pairs by preset colour name; each look picks one pair. */
  readonly pal: readonly (readonly [first: string, second: string])[];
  /** Position presets for the moving groups. */
  readonly pos: readonly PresetFnName[];
  /** Position phasers; empty means looks never move by effect. */
  readonly fxPos: readonly PhaserType[];
  /** Dimmer phasers; empty means none. */
  readonly fxDim: readonly PhaserType[];
  /** Colour phasers; only styles that have them may add one. */
  readonly fxCol?: readonly PhaserType[];
  /** Phaser rates in cycles per bar; a style without rates uses 1. */
  readonly rate?: readonly number[];
  /** Gobo slots for the spots; a style without gobos uses a per-group default set. */
  readonly gobos?: readonly number[];
  /** Whether drops may fire the strobes. */
  readonly strobe: boolean;
  /** Whether big sections may flash the blinders on a look change. */
  readonly blinders: boolean;
  /** White instead of the palette on spots and the screen. */
  readonly mono?: boolean;
  /** Slow, soft looks: fewer groups, lower levels, no wide picks. */
  readonly calm?: boolean;
  /** Aims at the orchestra instead of the band. */
  readonly orch?: boolean;
  /** Screen content slots to pick from. */
  readonly screen: readonly number[];
  /** The section cycle; look `i` uses section `i % length`. */
  readonly sections: readonly Section[];
}
