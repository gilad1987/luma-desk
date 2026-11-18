import type { MvrWarning, MvrWarningCode } from './MvrWarning';

/** How many names a folded line shows: enough to find the cause, few enough to read. */
const EXAMPLES = 3;

/** The sentence of a folded line from the count and the shown names (`for example "a", "b", "c"`). */
type Fold = (count: number, shown: string) => string;

/**
 * The codes whose lines fold into one. Each comes from one cause that repeats per file or per fixture (a writer that
 * stores names the scene does not use, a console that numbers every fixture 0), and fifty equal lines hide every
 * other warning of the summary.
 */
const FOLDS: Partial<Record<MvrWarningCode, Fold>> = {
  'missing-mesh': (count, shown) => `${count} mesh files are not in the archive: ${shown}.`,
  'ambiguous-file': (count, shown) =>
    `${count} mesh file names match several files in the archive, so none is used: ${shown}.`,
  'duplicate-id': (count) =>
    `${count} fixtures have a fixture id that another fixture has too; the desk gave them new ids.`,
};

/**
 * The one line for `lines` of one code: the count, up to three names, and every name in `refs`. A line with no
 * `ref` keeps its own text in `refs` instead, because the folded sentence does not hold it.
 */
function folded(code: MvrWarningCode, fold: Fold, lines: readonly MvrWarning[]): MvrWarning {
  const names = lines.flatMap((line) => (line.ref === undefined ? [] : [line.ref]));
  const shown = names.slice(0, EXAMPLES).map((ref) => `"${ref}"`);
  const message = fold(lines.length, `${names.length > EXAMPLES ? 'for example ' : ''}${shown.join(', ')}`);
  return { code, message, refs: lines.map((line) => line.ref ?? line.message) };
}

/**
 * Folds the lines of each code in `FOLDS` into one line, at the place of the first, when there are two or more; one
 * such line keeps its own text. The folded line keeps every `ref` in `refs`, so nothing is hidden for good.
 */
export function foldWarnings(warnings: readonly MvrWarning[]): MvrWarning[] {
  const first = new Map<MvrWarningCode, MvrWarning>();
  const groups = new Map<MvrWarningCode, MvrWarning[]>();
  for (const warning of warnings) {
    if (FOLDS[warning.code] === undefined) continue;
    if (!first.has(warning.code)) first.set(warning.code, warning);
    // push, not a copy per warning: a file can bring thousands of lines of one code
    const group = groups.get(warning.code);
    if (group) group.push(warning);
    else groups.set(warning.code, [warning]);
  }
  return warnings.flatMap((warning) => {
    const fold = FOLDS[warning.code];
    const lines = groups.get(warning.code) ?? [];
    if (fold === undefined || lines.length < 2) return [warning];
    return first.get(warning.code) === warning ? [folded(warning.code, fold, lines)] : [];
  });
}
