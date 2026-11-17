import { PRESET_FNS } from '../../engine/presetFunctions';
import type { PresetFnName } from '../../engine/presetFunctions';
import { PHASER_TYPES } from '../../engine/shared';
import { colorByName } from '../../engine/colorByName';
import type { LookDraft } from './LookDraft';

/**
 * Clears the rig, then lays the base of a look: truss washes, towers, pars, audience washes, floor washes, footlight
 * bars, follow spots and profiles. Picks inside a callback run once per fixture, so their draws follow fixture order.
 */
export function addWashes(look: LookDraft): void {
  const { style: S, section: sec, groups: AG, big, c1, c2 } = look;
  const L = (x: number) => look.level(x);
  look.set(look.lightIds(), { dim: 0, strobe: 0, gobo: 0, grot: 0 });
  const wPos = S.orch
    ? look.pick<PresetFnName>(['orch', 'band', 'center'])
    : S.calm
      ? look.pick<PresetFnName>(['center', 'band', 'singer'])
      : look.pick<PresetFnName>(['center', 'band', 'cross', 'down', 'orch']);
  look.set(AG.t3, (f, k, n) => ({
    ...PRESET_FNS[wPos](f, k, n),
    ...(k % 2 ? c2 : c1),
    dim: L(S.calm ? 62 : 78),
    zoom: S.calm ? 34 : 24,
  }));
  look.set(AG.tow, (f, k, n) => ({
    ...PRESET_FNS[S.orch || look.chance(0.4) ? 'orch' : 'band'](f, k, n),
    ...c2,
    dim: L(S.calm ? 50 : 66),
    zoom: 28,
  }));
  look.set(AG.pars, { ...c2, dim: L(85) });
  look.set(AG.audW, (f, k, n) => ({
    ...PRESET_FNS.crowd(f, k, n),
    ...(big ? colorByName('White') : c2),
    dim: L(big ? 95 : S.calm ? 25 : 45),
    zoom: 50,
    strobe: sec === 'drop' && S.strobe && look.options.strobes ? 50 : 0,
  }));
  look.set(AG.towW, (f, k, n) => ({
    ...PRESET_FNS[S.calm || S.orch ? 'band' : look.pick<PresetFnName>(['band', 'audience', 'center'])](f, k, n),
    ...(k % 2 ? c1 : c2),
    dim: L(S.calm ? 40 : 60),
    zoom: 30,
  }));
  look.set(AG.fwash, (f, k, n) => ({
    ...PRESET_FNS[sec === 'verse' || S.calm ? 'down' : 'vOut'](f, k, n),
    ...c1,
    dim: L(sec === 'verse' || S.calm ? 35 : 62),
    zoom: 20,
  }));
  // footlight bars: a tight colour curtain straight up on big sections, otherwise a soft wash back onto the band
  look.set(AG.bars, (f, k) => ({
    tilt: big ? 6 : -32,
    ...(big && k % 2 ? c2 : c1),
    dim: L(big ? 90 : 45),
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
    dim: L(big ? 85 : 55),
    zoom: big ? 7 : 11,
    gobo: 0,
  }));
  look.set(AG.prof, (f, k) => ({ ...(k % 2 ? c1 : c2), dim: L(S.calm ? 55 : 35) }));
}
