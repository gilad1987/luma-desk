/** A song section the auto-show writes a look for. It decides energy, which groups move and whether blinders hit. */
export type Section = 'groove' | 'verse' | 'chorus' | 'hook' | 'build' | 'drop' | 'intro';

/**
 * The display name of each section. `intro` has a name although no style uses it (known quirk E5); it stays because
 * removing it would change nothing visible and the data is kept as it was.
 */
export const SECTION_NAMES: Readonly<Record<Section, string>> = {
  groove: 'Groove',
  verse: 'Verse',
  chorus: 'Chorus',
  hook: 'Hook',
  build: 'Build-up',
  drop: 'Drop',
  intro: 'Intro',
};

const namesByLabel: Readonly<Partial<Record<string, string>>> = SECTION_NAMES;

/**
 * The display name for a section label that may be missing or unknown, such as the `sec` field of a stored cue. The
 * panel shows nothing in that case, so callers fall back to `''` or to the label itself.
 */
export function sectionName(label: string | undefined): string | undefined {
  return label === undefined ? undefined : namesByLabel[label];
}
