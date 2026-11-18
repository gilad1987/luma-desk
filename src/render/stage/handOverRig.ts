import type { Fixture } from '../../domain/Fixture';
import { screenSlotsOf, withWalls, type BuiltScreen } from './ScreenBuilder';
import type { StageFixtureHost } from './StageSceneDeps';

/**
 * Hands the fixtures with a built wall to the visuals and the overlay, after each stage build: a screen fixture
 * without a wall gets no visual and no label.
 */
export function handOverRig(
  host: StageFixtureHost,
  screens: readonly BuiltScreen[],
  fixtures: readonly Fixture[],
): void {
  const slots = screenSlotsOf(screens, host.screenLight),
    shown = withWalls(fixtures, slots);
  host.visuals.rebuild(shown, slots);
  host.overlay.setFixtures(shown);
}
