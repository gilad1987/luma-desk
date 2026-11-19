import type { StageDesign, StageScreen } from '../StageDesign';
import { isSameLength } from '../sameData';
import type { Vec3 } from '../types';
import { millimetres } from './millimetres';

/**
 * The LED wall moved up by `rise` metres with its side screens and its screen fixture, for a deck height change; the
 * new heights are rounded to 1 mm, as the risers are. The wall is the first screen, the one `setLedWall` and the
 * builder edit; other screens stay. No wall or no rise (float noise aside) keeps both lists.
 */
export function wallRisen(d: StageDesign, rise: number): Pick<StageDesign, 'screens' | 'fixtures'> {
  const wall = d.screens[0];
  if (!wall || isSameLength(rise, 0)) return { screens: d.screens, fixtures: d.fixtures };
  const up = (p: Vec3): Vec3 => [p[0], millimetres(p[1] + rise), p[2]];
  const sides = wall.sides?.map((s) => ({ ...s, at: up(s.at) }));
  const risen: StageScreen = {
    ...wall,
    y0: millimetres(wall.y0 + rise),
    y1: millimetres(wall.y1 + rise),
    ...(sides ? { sides } : {}),
  };
  const fixtures = d.fixtures.map((f) => (f.id === wall.fixtureId ? { ...f, position: up(f.position) } : f));
  return { screens: [risen, ...d.screens.slice(1)], fixtures };
}
