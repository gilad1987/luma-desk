import { PRESET_FNS } from '../../engine/presetFunctions';
import type { PresetFnName } from '../../engine/presetFunctions';
import { PHASER_TYPES } from '../../engine/shared';
import { colorByName } from '../../engine/colorByName';
import type { LookDraft } from './LookDraft';

/** The ring positions by mood; drops use the two widest. */
const CALM_RING: readonly PresetFnName[] = ['ringDown', 'ringCrown', 'ringCone'];
const DROP_RING: readonly PresetFnName[] = ['ringSun', 'ringTwist'];
const RING: readonly PresetFnName[] = ['ringCone', 'ringSun', 'ringTwist', 'ringCrown', 'ringDown'];

/** The moving groups that open up after the ring, in the order a big section adds them. */
function activeGroups(look: LookDraft): (readonly number[])[] {
  const { style: S, section: sec, groups: AG } = look;
  const order = [AG.t2, AG.back, AG.floor, AG.angB, AG.towB];
  let active = look.big
    ? [AG.ring, ...order]
    : sec === 'build'
      ? [AG.ring, AG.floor, AG.t2]
      : [AG.ring, look.pick(order)];
  // low energy keeps only the ring; a calm style then overrides even that cut
  if (look.options.energy < 0.45) active = active.slice(0, 1);
  if (S.calm) active = [AG.ring, AG.back];
  return active;
}

/**
 * Adds the moving groups that carry a look: each gets a position, a colour and, by chance, position, dimmer and
 * colour phasers at one shared rate. Draws per group: position, colour, rate, then each phaser's gate and picks.
 */
export function addActiveGroups(look: LookDraft): void {
  const { style: S, section: sec, groups: AG, c1, c2 } = look;
  activeGroups(look).forEach((ids, gi) => {
    const pn =
        ids === AG.ring
          ? look.pick(S.calm ? CALM_RING : sec === 'drop' ? DROP_RING : RING)
          : ids === AG.angB
            ? look.pick<PresetFnName>(['wingFan', 'converge', 'ringCrown', ...S.pos])
            : look.pick(S.pos),
      col = S.mono ? colorByName(look.pick(['White', 'White', look.firstColorName])) : gi % 2 ? c2 : c1;
    look.set(ids, (f, k, n) => ({
      ...PRESET_FNS[pn](f, k, n),
      ...col,
      dim: look.level(S.calm ? 50 : 95),
      zoom: 2,
      gobo: 0,
    }));
    const rate = look.pick(S.rate || [1]) * (sec === 'drop' || sec === 'build' ? 2 : 1);
    if (S.fxPos.length && look.chance(S.calm ? 0.7 : 0.85)) {
      const t = look.pick(S.fxPos);
      look.fx.push({
        type: t,
        rate,
        size: PHASER_TYPES[t].size * (S.calm ? 0.5 : sec === 'drop' ? 1.2 : 1),
        spread: look.pick([0, 180, 360, 720]),
        ids: [...ids],
      });
    }
    if (S.fxDim.length && (sec === 'build' || sec === 'drop' || look.chance(0.45)))
      look.fx.push({
        type: sec === 'build' ? 'dimChase' : look.pick(S.fxDim),
        rate,
        size: look.level(100),
        spread: look.pick([360, 720]),
        ids: [...ids],
      });
    if (S.fxCol && look.chance(0.4))
      look.fx.push({ type: look.pick(S.fxCol), rate: 0.5, size: 100, spread: 360, ids: [...ids] });
  });
}
