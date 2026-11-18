import { MAX_UNIVERSE } from '../../domain/stage/parse/parsePatch';
import type { PatchPlan } from './autoPatch';
import { grouped, type ReportLine } from './exportReport';

type Plan<K extends keyof PatchPlan> = Pick<PatchPlan, K>;

/** The sentence for every auto-patched fixture whose footprint is a guess, for the one list of all notes. */
export function estimateNotes({ estimated }: Plan<'estimated'>): string[] {
  return estimated > 0
    ? [`${estimated} auto-patched fixtures use an estimated channel count; check their addresses on the console.`]
    : [];
}

/** The estimates with no patch after them: a count that is too small reaches nothing, so this is information. */
export function loneEstimateNotes({ estimated, crowded }: Plan<'estimated' | 'crowded'>): string[] {
  const lone = estimated - crowded.length;
  return lone > 0
    ? [`${lone} auto-patched fixtures use an estimated channel count; no other patch follows them in their universe.`]
    : [];
}

/**
 * The estimates with a patch after them, as one line with the count: a count that is too small puts the next fixture
 * on the same channels on a console, so the user must check them.
 */
export function crowdedLines({ crowded }: Plan<'crowded'>): ReportLine[] {
  const what =
    'auto-patched fixtures use an estimated channel count before another patch; check their addresses on the console';
  return grouped(what, crowded);
}

/** The sentences for fixtures the export wrote without an address: a console gets them unpatched. */
export function addressLossNotes({ unplaced, skipped, unsized }: Plan<'unplaced' | 'skipped' | 'unsized'>): string[] {
  return [
    ...(unplaced > 0
      ? [`${unplaced} fixtures had no DMX patch and no free universe up to ${MAX_UNIVERSE}; they have no address.`]
      : []),
    ...(skipped > 0 ? [`${skipped} fixtures had an invalid DMX patch and were written without an address.`] : []),
    ...(unsized > 0 ? [`${unsized} added fixtures have no patch; the desk does not know their channel count.`] : []),
  ];
}

/**
 * The sentences for what a patch plan estimated or left out. The plain export and the pass-through export share them,
 * so a fixture without an address or with a guessed footprint is silent in neither.
 */
export function planNotes(plan: Plan<'estimated' | 'unplaced' | 'skipped' | 'unsized'>): string[] {
  return [...estimateNotes(plan), ...addressLossNotes(plan)];
}
