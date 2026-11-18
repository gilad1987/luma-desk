/** One lookup rule: does an archive file name match a fixture's `GDTFSpec`? */
type SpecMatcher = (name: string, spec: string) => boolean;

/** The file chosen for a `GDTFSpec`, and the other files that matched by the same rule. */
export interface GdtfMatch {
  readonly file: string;
  /** Other equally good files; when not empty the choice is a guess, so the caller warns `ambiguous-gdtf`. */
  readonly ties: readonly string[];
}

const EXTENSION = '.gdtf';

function sameText(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** The spec as written and with the extension, as writers may leave it out. */
function candidates(spec: string): readonly string[] {
  return [spec, `${spec}${EXTENSION}`];
}

/** The name part after the first `@`, which Vectorworks puts between manufacturer and fixture name. */
function afterAt(name: string): string {
  return name.slice(name.indexOf('@') + 1);
}

/** Strictest rule first, so a looser rule never wins over an exact file of the same name. */
const MATCHERS: readonly SpecMatcher[] = [
  (name, spec) => name === spec,
  (name, spec) => name === `${spec}${EXTENSION}`,
  (name, spec) => candidates(spec).some((candidate) => sameText(name, candidate)),
  (name, spec) => candidates(spec).some((candidate) => sameText(afterAt(name), candidate)),
  (name, spec) => candidates(afterAt(spec)).some((candidate) => sameText(name, candidate)),
];

/** The first matcher, strict to loose, that matches any file; ties are the other files it matched. */
function matchSpec(names: readonly string[], spec: string): GdtfMatch | undefined {
  if (spec === '') return undefined;
  for (const matches of MATCHERS) {
    const [file, ...ties] = names.filter((name) => matches(name, spec)).sort();
    if (file !== undefined) return { file, ties };
  }
  return undefined;
}

/**
 * The archive file for a fixture's `GDTFSpec`, or `undefined` when no file matches. Writers do not agree on the spec
 * text: some leave out `.gdtf`, some change case, Vectorworks writes `COLORado PXL Bar 16` for the file
 * `Chauvet Professional@COLORado PXL Bar 16.gdtf`, and others write `Manufacturer@Model` for the file `Model.gdtf`.
 * The rules run from strict to loose; an empty spec matches nothing. When several files match by the same rule, the
 * first in code-unit order wins, so the choice does not depend on the writer's archive order, and the rest are
 * returned as `ties`. The scene reader keeps the spec's spaces, so the trimmed spec is tried last for writers that
 * indent the text. Pure, so the caller decides how to warn.
 */
export function findGdtfMatch(names: readonly string[], spec: string): GdtfMatch | undefined {
  return matchSpec(names, spec) ?? matchSpec(names, spec.trim());
}
