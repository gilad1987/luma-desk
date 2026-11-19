import type { DmxPatch } from '../../../domain/stage/DmxPatch';
import type { MvrWarning } from '../../MvrWarning';
import { spanName, type PatchSpan } from '../patchOverlaps';

/**
 * A `patch-overlap` warning for each kept address whose channel count is not known, when the nearest desk patch after
 * it in its universe is one this export wrote: a fixture added on the desk, or one the user patched anew. Counted as
 * 1 channel the kept address overlaps nothing, which hid a real overlap: a kept fixture at 1.1 and an added one at
 * 1.5. Nobody can tell how far it reaches, so that patch is named as "may overlap"; a longer reach would cross it
 * first. A neighbour the file already had is not named: the source program put it there, the export changed neither
 * address, and the count of kept addresses of unknown size in the information covers it. Without this limit every
 * export of a healthy file with one unreadable GDTF opened the summary. A kept address of known size is left to
 * `patchOverlaps`.
 */
export function unknownReach(
  desk: ReadonlyMap<number, DmxPatch>,
  kept: readonly PatchSpan[],
  written: ReadonlySet<number>,
): MvrWarning[] {
  const patches = [...desk].map(([id, patch]) => ({ id, patch }));
  return kept.flatMap((span): MvrWarning[] => {
    if (span.known) return [];
    const { universe, address } = span.patch;
    const after = patches
      .filter(({ patch }) => patch.universe === universe && patch.address > address)
      .sort((a, b) => a.patch.address - b.patch.address);
    const next = after[0];
    if (!next || !written.has(next.id)) return [];
    const message =
      `Fixture ${next.id} at ${universe}.${next.patch.address} may overlap fixture ${spanName(span)}, which the file ` +
      `keeps at ${universe}.${address} in universe ${universe} (its channel count is not known: no GDTF file or mode).`;
    return [{ code: 'patch-overlap', message, ref: String(next.id) }];
  });
}
