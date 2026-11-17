import { PRESET_FNS } from '../../engine/presetFunctions';
import type { PresetFnName } from '../../engine/presetFunctions';
import { colorByName } from '../../engine/colorByName';
import type { LookDraft } from './LookDraft';

/**
 * Adds the gobo-carrying spots: front-of-house, truss 4, ring washes and the angled-truss spots. Calm and small
 * sections keep the FOH spots on the singer; big ones swing them out over the crowd.
 */
export function addGoboSpots(look: LookDraft): void {
  const { style: S, groups: AG, big, c1, c2 } = look;
  const L = (x: number) => look.level(x);
  const gob = look.pick(S.gobos || [1, 2, 3, 4, 5, 7]);
  if (S.calm || !big)
    look.set(AG.foh, (f, k, n) => ({
      ...PRESET_FNS[S.orch && k % 2 ? 'orch' : 'singer'](f, k, n),
      ...colorByName('Warm'),
      dim: L(72),
      // a calm style without its own gobos keeps the FOH spots open
      gobo: S.calm ? (S.gobos ? gob : 0) : gob,
      zoom: S.calm ? 11 : 13,
      grot: S.calm ? 0 : 8,
    }));
  else
    look.set(AG.foh, (f, k, n) => ({
      ...PRESET_FNS[look.pick<PresetFnName>(['audience', 'cross', 'fanAud'])](f, k, n),
      ...colorByName('White'),
      dim: L(82),
      gobo: gob,
      zoom: 14,
      grot: look.pick([-30, 20, 40]),
    }));
  look.set(AG.t4, (f, k, n) => ({
    ...PRESET_FNS[S.orch ? 'orch' : look.pick<PresetFnName>(['cross', 'band', 'down', 'orch'])](f, k, n),
    ...(S.mono ? colorByName('White') : c1),
    dim: L(S.calm ? 48 : 62),
    gobo: look.pick(S.gobos || [1, 2, 3, 7]),
    zoom: 16,
    grot: look.pick([-12, 12, 0]),
  }));
  look.set(AG.rwash, (f, k, n) => ({
    ...PRESET_FNS[S.calm ? 'ringCone' : look.pick<PresetFnName>(['center', 'ringCone', 'band'])](f, k, n),
    ...(k % 2 ? c1 : c2),
    dim: L(S.calm ? 45 : 70),
    zoom: 26,
  }));
  if (!S.calm || S.orch)
    look.set(AG.angS, (f, k, n) => ({
      ...PRESET_FNS[S.orch ? 'orch' : look.pick<PresetFnName>(['cross', 'band', 'audience'])](f, k, n),
      ...(S.mono ? colorByName('White') : c2),
      dim: L(S.calm ? 45 : 70),
      gobo: look.pick(S.gobos || [1, 3, 5, 7]),
      zoom: 14,
      grot: look.pick([-20, 20, 35]),
    }));
}
