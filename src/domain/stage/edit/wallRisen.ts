import type { StageDesign, StageScreen } from '../StageDesign';
import { isSameLength } from '../sameData';
import { millimetres } from './millimetres';

/**
 * The LED wall moved up by `rise` metres with its screen fixture, for a deck height change; the new heights are
 * rounded to 1 mm, as the risers are. The wall is the first screen, the one `setLedWall` and the builder edit; other
 * screens stay. Its side screens stay too: they stand off the deck (the built-in ones at x = ±33.5, 15 m up), so the
 * deck height does not carry them. No wall or no rise (float noise aside) keeps both lists.
 */
export function wallRisen(d: StageDesign, rise: number): Pick<StageDesign, 'screens' | 'fixtures'> {
  const wall = d.screens[0];
  if (!wall || isSameLength(rise, 0)) return { screens: d.screens, fixtures: d.fixtures };
  const risen: StageScreen = { ...wall, y0: millimetres(wall.y0 + rise), y1: millimetres(wall.y1 + rise) };
  const fixtures = d.fixtures.map((f) => {
    if (f.id !== wall.fixtureId) return f;
    const [x, y, z] = f.position;
    return { ...f, position: [x, millimetres(y + rise), z] as const };
  });
  return { screens: [risen, ...d.screens.slice(1)], fixtures };
}
