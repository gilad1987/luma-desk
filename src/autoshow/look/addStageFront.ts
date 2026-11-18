import { colorByName } from '../../engine/colorByName';
import { PRESET_FNS } from '../../engine/presetFunctions';
import { PHASER_TYPES } from '../../engine/shared';
import type { LookDraft } from './LookDraft';

/**
 * The front of a look, set after the washes: footlight bars (with a tilt phaser on builds and drops), follow spots
 * and profiles. The bars' phaser draws its rate between the bars and the follow spots, as the original did.
 */
export function addStageFront(look: LookDraft): void {
  const { style: S, section: sec, groups: AG, big, c1, c2 } = look;
  // footlight bars: a tight colour curtain straight up on big sections, otherwise a soft wash back onto the band
  look.set(AG.bars, (f, k) => ({
    tilt: big ? 6 : -32,
    ...(big && k % 2 ? c2 : c1),
    dim: look.level(big ? 90 : 45),
    zoom: big ? 6 : 30,
  }));
  if ((sec === 'build' || sec === 'drop') && S.fxPos.length)
    look.fx.push({
      type: 'tilt',
      rate: look.pick(S.rate || [1]),
      size: PHASER_TYPES.tilt.size,
      spread: 360,
      ids: [...AG.bars],
    });
  // follow spots stay on the lead singer; profiles add a side wash
  look.set(AG.follow, (f, k, n) => ({
    ...PRESET_FNS.singer(f, k, n),
    ...colorByName('Warm'),
    dim: look.level(big ? 85 : 55),
    zoom: big ? 7 : 11,
    gobo: 0,
  }));
  look.set(AG.prof, (f, k) => ({ ...(k % 2 ? c1 : c2), dim: look.level(S.calm ? 55 : 35) }));
}
