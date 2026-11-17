import type { Fixture } from '../../domain/Fixture';
import type { AttrOutput } from './resetOutput';

/** The desk-wide master controls the merge applies last. The app state owner satisfies it. */
export interface MasterState {
  /** Grand master, 0-1. */
  readonly gm: number;
  readonly blackout: boolean;
  /** Highlight: selected fixtures at full white so the operator can find them. */
  readonly highlight: boolean;
}

/** Which fixtures the operator has selected. The selection owner satisfies it. */
export interface SelectedFixtures {
  has(id: number): boolean;
}

/**
 * The final steps for fixture `f`, after phasers: a tilt-only bar never pans, highlight overrides selected fixtures,
 * and blackout or the grand master scales the dimmer last, so blackout also darkens highlighted fixtures.
 */
export function applyMasters(f: Fixture, o: AttrOutput, master: MasterState, selection: SelectedFixtures): void {
  if (f.T.tiltOnly) o.pan = 0; // a bar has no pan axis: a stray pan value would turn its beam out of its tilt plane
  if (master.highlight && selection.has(f.id)) {
    o.dim = 100;
    o.r = o.g = o.b = 100;
    o.strobe = 0;
    o.gobo = f.type === 'screen' ? 0 : 0; // kept from the original; both branches are 0
  }
  o.dim *= master.blackout ? 0 : master.gm;
}
