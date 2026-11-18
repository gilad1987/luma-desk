import type { DmxPatch } from '../../domain/stage/DmxPatch';
import type { MvrWarning } from '../MvrWarning';

/** One fixture's patch and how many channels it takes from its address on. */
export interface PatchSpan {
  readonly id: number;
  readonly patch: DmxPatch;
  readonly channels: number;
  /** False when `channels` is an estimate, so an overlap it finds may not be real. */
  readonly known: boolean;
}

/** The last channel a span takes. */
const lastChannel = (span: PatchSpan): number => span.patch.address + span.channels - 1;

/** The warning for `span`, which starts inside the channels of `reach`. */
function overlap(span: PatchSpan, reach: PatchSpan): MvrWarning {
  const where = `${span.patch.universe}.${span.patch.address}`;
  const verb = span.known && reach.known ? 'overlaps' : 'may overlap';
  const why = span.known && reach.known ? '' : ' (a channel count is estimated; check the GDTF mode)';
  const message = `Fixture ${span.id} at ${where} ${verb} the channels of fixture ${reach.id}${why}.`;
  return { code: 'patch-overlap', message, ref: String(span.id) };
}

/**
 * A `patch-overlap` warning for every fixture whose channels start inside the channels of an earlier fixture in the
 * same universe (contract Amendment 3). The export keeps both patches, because they are the user's; a console would
 * drive both fixtures from the same channels, so the user must see it. When either channel count is an estimate the
 * warning says "may overlap" instead of staying silent: the desk layout is the best count a desk fixture has, and a
 * real overlap must not be hidden, but the user must know the count can be wrong.
 */
export function patchOverlaps(spans: readonly PatchSpan[]): MvrWarning[] {
  const sorted = [...spans].sort((a, b) => a.patch.universe - b.patch.universe || a.patch.address - b.patch.address);
  const warnings: MvrWarning[] = [];
  let reach: PatchSpan | undefined;
  for (const span of sorted) {
    const sameUniverse = reach?.patch.universe === span.patch.universe;
    if (reach && sameUniverse && span.patch.address <= lastChannel(reach)) warnings.push(overlap(span, reach));
    if (!reach || !sameUniverse || lastChannel(span) > lastChannel(reach)) reach = span;
  }
  return warnings;
}
