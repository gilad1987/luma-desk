import type { IntegrityCounts } from './Integrity';

/** The sentence when it counts something. */
const some = (count: number, text: string): string[] => (count > 0 ? [text] : []);

/** The missing GDTF files that this export itself named, for a re-typed fixture: the user must fetch them. */
export function freshGdtfs(found: IntegrityCounts, missing: readonly string[]): string[] {
  return missing.filter((spec) => found.retypedSpecs.includes(spec));
}

/**
 * What a console user must check after a re-type or a delete on the desk, one line per kind (audit B3, B4). The
 * export never drops user data without a word: a re-typed fixture keeps the children that name its earlier GDTF, and
 * what a delete forced out of the file (a cable to the deleted fixture, a geometry link into it) is counted here.
 */
export function integrityWarnings(found: IntegrityCounts, missing: readonly string[]): string[] {
  const { retyped, retypedKinds, connections, orphans, childPositions } = found;
  const fresh = freshGdtfs(found, missing);
  return [
    ...some(
      fresh.length,
      `GDTF files of re-typed fixtures are not in this export; get them from GDTF-Share: ${fresh.join(', ')}.`,
    ),
    ...some(
      retyped,
      `${retyped} re-typed fixtures keep data that names their earlier GDTF (${retypedKinds.join(', ')}); check ` +
        'them in the target application.',
    ),
    ...some(connections, `${connections} connections to fixtures deleted on the desk were removed.`),
    ...some(
      orphans,
      `${orphans} multipatch fixtures lost their parent, which was deleted on the desk; they keep their multipatch ` +
        'reference and have no id of their own. Check them in the target application.',
    ),
    ...some(
      childPositions,
      `${childPositions} objects moved out of a deleted fixture lost their ChildPosition, which named a geometry ` +
        'of that fixture.',
    ),
  ];
}
