import type { PresetFnName } from '../../engine/presetFunctions';
import { colorByName } from '../../engine/colorByName';
import type { LookDraft } from './LookDraft';

/**
 * Adds the gobo-carrying spots: front-of-house, truss 4, ring washes and the angled-truss spots. Calm and small
 * sections keep the FOH spots on the singer; big ones swing them out over the crowd. The groups are set in this order
 * because each draws its random picks as it is set.
 */
export function addGoboSpots(look: LookDraft): void {
  const S = look.style;
  const gob = look.pick(S.gobos || [1, 2, 3, 4, 5, 7]);
  if (S.calm || !look.big) setSingerFoh(look, gob);
  else setCrowdFoh(look, gob);
  setTrussSpots(look);
  setRingWashes(look);
  if (!S.calm || S.orch) setAngleSpots(look);
}

function setSingerFoh(look: LookDraft, gob: number): void {
  const S = look.style;
  look.set(look.groups.foh, (f, k, n) => ({
    ...look.fns[S.orch && k % 2 ? 'orch' : 'singer'](f, k, n),
    ...colorByName('Warm'),
    dim: look.level(72),
    // a calm style without its own gobos keeps the FOH spots open
    gobo: S.calm && !S.gobos ? 0 : gob,
    zoom: S.calm ? 11 : 13,
    grot: S.calm ? 0 : 8,
  }));
}

function setCrowdFoh(look: LookDraft, gob: number): void {
  look.set(look.groups.foh, (f, k, n) => ({
    ...look.fns[look.pick<PresetFnName>(['audience', 'cross', 'fanAud'])](f, k, n),
    ...colorByName('White'),
    dim: look.level(82),
    gobo: gob,
    zoom: 14,
    grot: look.pick([-30, 20, 40]),
  }));
}

function setTrussSpots(look: LookDraft): void {
  const S = look.style;
  look.set(look.groups.t4, (f, k, n) => ({
    ...look.fns[S.orch ? 'orch' : look.pick<PresetFnName>(['cross', 'band', 'down', 'orch'])](f, k, n),
    ...(S.mono ? colorByName('White') : look.c1),
    dim: look.level(S.calm ? 48 : 62),
    gobo: look.pick(S.gobos || [1, 2, 3, 7]),
    zoom: 16,
    grot: look.pick([-12, 12, 0]),
  }));
}

function setRingWashes(look: LookDraft): void {
  const S = look.style;
  look.set(look.groups.rwash, (f, k, n) => ({
    ...look.fns[S.calm ? 'ringCone' : look.pick<PresetFnName>(['center', 'ringCone', 'band'])](f, k, n),
    ...(k % 2 ? look.c1 : look.c2),
    dim: look.level(S.calm ? 45 : 70),
    zoom: 26,
  }));
}

function setAngleSpots(look: LookDraft): void {
  const S = look.style;
  look.set(look.groups.angS, (f, k, n) => ({
    ...look.fns[S.orch ? 'orch' : look.pick<PresetFnName>(['cross', 'band', 'audience'])](f, k, n),
    ...(S.mono ? colorByName('White') : look.c2),
    dim: look.level(S.calm ? 45 : 70),
    gobo: look.pick(S.gobos || [1, 3, 5, 7]),
    zoom: 14,
    grot: look.pick([-20, 20, 35]),
  }));
}
