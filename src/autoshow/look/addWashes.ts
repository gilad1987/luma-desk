import { PRESET_FNS } from '../../engine/presetFunctions';
import type { PresetFnName } from '../../engine/presetFunctions';
import { colorByName } from '../../engine/colorByName';
import type { AutoStyle } from '../AutoStyle';
import { addStageFront } from './addStageFront';
import type { LookDraft } from './LookDraft';

/** The truss-3 wash positions a style draws from: orchestral, calm, or every other style. */
const ORCH_WASH: readonly PresetFnName[] = ['orch', 'band', 'center'];
const CALM_WASH: readonly PresetFnName[] = ['center', 'band', 'singer'];
const WASH: readonly PresetFnName[] = ['center', 'band', 'cross', 'down', 'orch'];

/**
 * Clears the rig, then lays the base of a look: truss washes, towers, pars, audience washes, floor washes, then the
 * stage front. Picks inside a callback run once per fixture, so their draws follow fixture order; the groups are set
 * in this order for the same reason.
 */
export function addWashes(look: LookDraft): void {
  look.set(look.lightIds(), { dim: 0, strobe: 0, gobo: 0, grot: 0 });
  setTrussWashes(look);
  setTowers(look);
  look.set(look.groups.pars, { ...look.c2, dim: look.level(85) });
  setAudienceWashes(look);
  setTowerWashes(look);
  setFloorWashes(look);
  addStageFront(look);
}

function trussWashPositions(style: AutoStyle): readonly PresetFnName[] {
  if (style.orch) return ORCH_WASH;
  return style.calm ? CALM_WASH : WASH;
}

function setTrussWashes(look: LookDraft): void {
  const S = look.style;
  const wPos = look.pick(trussWashPositions(S));
  look.set(look.groups.t3, (f, k, n) => ({
    ...PRESET_FNS[wPos](f, k, n),
    ...(k % 2 ? look.c2 : look.c1),
    dim: look.level(S.calm ? 62 : 78),
    zoom: S.calm ? 34 : 24,
  }));
}

function setTowers(look: LookDraft): void {
  const S = look.style;
  look.set(look.groups.tow, (f, k, n) => ({
    ...PRESET_FNS[S.orch || look.chance(0.4) ? 'orch' : 'band'](f, k, n),
    ...look.c2,
    dim: look.level(S.calm ? 50 : 66),
    zoom: 28,
  }));
}

/** Audience washes: full white on big sections, low for calm styles, otherwise half. */
function audienceLevel(look: LookDraft): number {
  if (look.big) return 95;
  return look.style.calm ? 25 : 45;
}

function setAudienceWashes(look: LookDraft): void {
  const S = look.style;
  look.set(look.groups.audW, (f, k, n) => ({
    ...PRESET_FNS.crowd(f, k, n),
    ...(look.big ? colorByName('White') : look.c2),
    dim: look.level(audienceLevel(look)),
    zoom: 50,
    strobe: look.section === 'drop' && S.strobe && look.options.strobes ? 50 : 0,
  }));
}

function setTowerWashes(look: LookDraft): void {
  const S = look.style;
  look.set(look.groups.towW, (f, k, n) => ({
    ...PRESET_FNS[S.calm || S.orch ? 'band' : look.pick<PresetFnName>(['band', 'audience', 'center'])](f, k, n),
    ...(k % 2 ? look.c1 : look.c2),
    dim: look.level(S.calm ? 40 : 60),
    zoom: 30,
  }));
}

function setFloorWashes(look: LookDraft): void {
  const soft = look.section === 'verse' || look.style.calm;
  look.set(look.groups.fwash, (f, k, n) => ({
    ...PRESET_FNS[soft ? 'down' : 'vOut'](f, k, n),
    ...look.c1,
    dim: look.level(soft ? 35 : 62),
    zoom: 20,
  }));
}
