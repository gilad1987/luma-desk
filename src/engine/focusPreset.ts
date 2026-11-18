import { aimAt } from '../domain/aim';
import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
import type { StageDesign } from '../domain/stage/StageDesign';

/**
 * The pan and tilt that aim `fixture` at the `<FocusPoint>` its MVR file gave it, for the position preset **Focus**
 * (plan §6): a lighting designer's MVR already says where each unit points, so the desk can recall that look at once.
 * `aimAt` honours the fixture's `rotation`, so a unit hung at an angle still hits its point.
 *
 * Null when the design has no focus for this fixture (no MVR data, or the file gave none): the preset then skips the
 * fixture and leaves its values alone, as aiming at a made-up point would be worse than no change.
 */
export function focusValues(design: StageDesign, fixture: Fixture): AttrValues | null {
  const focus = design.mvr?.fixtures[String(fixture.id)]?.focus;
  if (!focus) return null;
  const [x, y, z] = focus;
  const { pan, tilt } = aimAt(fixture, x, y, z);
  return { pan, tilt };
}
