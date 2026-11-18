import { colorByName } from '../../engine/colorByName';
import type { LookDraft } from './LookDraft';

/**
 * Finishes a look: strobes and a truss-3 strobe on drops (when the style and the operator allow them), then the LED
 * screens in the look's colour, or black when the operator keeps the auto-show off the screen. The screen values are
 * drawn also on a stage without a screen (they then set nothing), so every look consumes the same random draws.
 */
export function addStrobesAndScreen(look: LookDraft): void {
  const { style: S, section: sec, groups: AG, options } = look;
  if (sec === 'drop' && S.strobe && options.strobes) {
    look.set(AG.strobe, { dim: 100, strobe: look.pick([75, 85, 92]) });
    look.set(AG.t3, { strobe: 35 });
  }
  if (options.screen)
    look.set(AG.screen, {
      ...(S.mono ? colorByName('White') : look.c1),
      dim: look.level(S.calm ? 28 : 80),
      gobo: look.pick(S.screen),
      grot: S.calm ? 5 : look.pick([20, 40, 70]),
    });
  else look.set(AG.screen, { dim: 0 });
}
