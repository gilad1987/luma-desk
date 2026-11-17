import type { AutoStyleId } from './styles';

/** What drives the beat pump on beams and spots: nothing, the tempo grid, or the bass of the playing song. */
export type PulseSource = 'off' | 'beat' | 'audio';

/**
 * The operator's auto-show controls. Fields are mutable because the auto panel writes them directly as the controls
 * move; the auto-show reads them live on every look and frame.
 */
export interface AutoSettings {
  style: AutoStyleId;
  /** Operator energy, 0-1: scales every level of a look; below 0.45 only one moving group plays. */
  energy: number;
  /** Fader level of the auto executor, 0-1. */
  master: number;
  /** Bars per look; 0 means the style's own. */
  bars: number;
  pulse: PulseSource;
  /** Whether drops may fire the strobes. */
  strobes: boolean;
  /** Whether big sections flash the blinders on a look change. */
  hits: boolean;
  /** Whether looks drive the LED screen; off blacks it out. */
  screen: boolean;
  /** Whether starting the auto-show turns every executor off first. */
  take: boolean;
}

/** The settings a look is generated from; the generator ignores the rest. */
export type LookOptions = Pick<AutoSettings, 'energy' | 'strobes' | 'screen'>;

/** The controls as the auto panel shows them on first load. */
export function defaultAutoSettings(): AutoSettings {
  return {
    style: 'edm',
    energy: 0.85,
    master: 1,
    bars: 0,
    pulse: 'off',
    strobes: true,
    hits: true,
    screen: true,
    take: true,
  };
}
