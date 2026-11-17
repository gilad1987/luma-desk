import { PRESET_FNS } from '../../engine/presetFunctions';
import type { PresetFnName } from '../../engine/presetFunctions';
import { PHASER_TYPES } from '../../engine/shared';
import { colorByName, type NamedColor } from '../../engine/colorByName';
import type { LookDraft } from './LookDraft';

/** The ring positions by mood; drops use the two widest. */
const CALM_RING: readonly PresetFnName[] = ['ringDown', 'ringCrown', 'ringCone'];
const DROP_RING: readonly PresetFnName[] = ['ringSun', 'ringTwist'];
const RING: readonly PresetFnName[] = ['ringCone', 'ringSun', 'ringTwist', 'ringCrown', 'ringDown'];

/** The ring plus what the section opens: everything when big, a fixed trio on a build, else one drawn group. */
function sectionGroups(look: LookDraft): (readonly number[])[] {
  const AG = look.groups;
  const order = [AG.t2, AG.back, AG.floor, AG.angB, AG.towB];
  if (look.big) return [AG.ring, ...order];
  if (look.section === 'build') return [AG.ring, AG.floor, AG.t2];
  return [AG.ring, look.pick(order)];
}

/** The position of one active group: one draw from the ring, wing or style list. */
function groupPosition(look: LookDraft, ids: readonly number[]): PresetFnName {
  const { style: S, groups: AG } = look;
  if (ids === AG.ring) return look.pick(ringPositions(look));
  if (ids === AG.angB) return look.pick<PresetFnName>(['wingFan', 'converge', 'ringCrown', ...S.pos]);
  return look.pick(S.pos);
}

function ringPositions(look: LookDraft): readonly PresetFnName[] {
  if (look.style.calm) return CALM_RING;
  return look.section === 'drop' ? DROP_RING : RING;
}

/** Mono styles draw white or the first palette colour; the others alternate the two palette colours by group. */
function groupColor(look: LookDraft, index: number): NamedColor {
  if (look.style.mono) return colorByName(look.pick(['White', 'White', look.firstColorName]));
  return index % 2 ? look.c2 : look.c1;
}

/** Position phasers are halved for calm styles and widened on a drop. */
function positionFxScale(look: LookDraft): number {
  if (look.style.calm) return 0.5;
  return look.section === 'drop' ? 1.2 : 1;
}

/** The moving groups that open up after the ring, in the order a big section adds them. */
function activeGroups(look: LookDraft): (readonly number[])[] {
  const { style: S, groups: AG } = look;
  let active = sectionGroups(look);
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
  const { style: S, section: sec } = look;
  activeGroups(look).forEach((ids, gi) => {
    const pn = groupPosition(look, ids);
    const col = groupColor(look, gi);
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
        size: PHASER_TYPES[t].size * positionFxScale(look),
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
