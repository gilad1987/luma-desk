import type { MvrGeometry } from '../../mvr';
import { LED_GENERATED, syncLedRow, type LedWallsControl } from '../../ui/panels/mvr/ledWallsRow';
import { showLedBar, syncLedBar } from '../../ui/panels/top/ledBar';

/** What decides the LED controls of a stage besides its geometry. */
export interface LedControlOptions {
  /** True for a fresh import: level and look start at the defaults. A restored stage keeps those of the session. */
  readonly fresh?: boolean;
  /** Uuids of the layers the user marked as LED walls; a file without LED evidence still gets the controls for them. */
  readonly marked?: readonly string[];
  /** False when the stage changed while the LED modules loaded: the controls of the other stage then stay as they are. */
  readonly current?: () => boolean;
}

/** The LED facts of the stage now drawn; kept, so the controls can be built again after the import result is freed. */
let facts = { hasWalls: false, duplicates: 0, placeholders: 0 };

/** The note for file images the desk does not show: a replaced image is reported with its count, never dropped. */
export const placeholderNote = (count: number): string =>
  `${count} screen ${count === 1 ? 'image is a CAD placeholder' : 'images are CAD placeholders'}; the desk shows generated content`;

/**
 * The LED controls of the MVR stage now drawn from `geometry`: it keeps the LED facts of the stage and returns
 * `ledControlNow`. The LED modules are part of the scenery chunk, which is loaded before a stage draws, so they are
 * fetched here and not with the boot bundle.
 */
export async function ledWallsControl(
  geometry: MvrGeometry,
  options: LedControlOptions = {},
): Promise<LedWallsControl | undefined> {
  const [plan, uniforms] = await Promise.all([
    import('../../render/mvr/led/ledPlan'),
    import('../../render/mvr/led/ledUniforms'),
  ]);
  if (options.current && !options.current()) return undefined;
  const { replacedImages } = await import('../../render/mvr/led/ledPlaceholder');
  // checked again after the last load: the facts and the LED bar are those of the stage now drawn
  if (options.current && !options.current()) return undefined;
  facts = { ...plan.ledSummary(geometry), placeholders: replacedImages() };
  if (options.fresh) uniforms.resetLedWalls();
  return ledControlNow(options.marked ?? [], options.current);
}

/**
 * The LED controls for the stage with these marked layers: it shows the top bar's LED level, or hides it for a stage
 * with no LED surface and no marked layer, and returns what the layer list shows: the level and look controls, and
 * the notes that the content is the desk's and not the file's and that duplicate panels are hidden, with their count.
 * The note stands whenever a wall or a mark exists, as a marked layer shows generated content too. Bar and list set
 * the same walls and follow each other both ways.
 */
export async function ledControlNow(
  marked: readonly string[],
  current?: () => boolean,
): Promise<LedWallsControl | undefined> {
  const uniforms = await import('../../render/mvr/led/ledUniforms');
  if (current && !current()) return undefined;
  if (!facts.hasWalls && marked.length === 0) {
    showLedBar(undefined);
    return undefined;
  }
  const set = (percent: number): void => {
    uniforms.setLedWallPercent(percent);
    syncLedBar(percent);
    syncLedRow(percent);
  };
  const notes = [LED_GENERATED];
  if (facts.duplicates > 0) notes.push(`${facts.duplicates} duplicate panels are hidden`);
  if (facts.placeholders > 0) notes.push(placeholderNote(facts.placeholders));
  const level = uniforms.ledWallPercent();
  showLedBar({ level, set });
  return { level, set, looks: uniforms.LED_LOOKS, look: uniforms.ledLook(), setLook: uniforms.setLedLook, notes };
}
