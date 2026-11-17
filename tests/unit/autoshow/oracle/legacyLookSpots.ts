// Reference oracle: genLook second part (2592-2598) from index.html (index.base.html 2571-2615), formatted by Prettier.
// Changes: types only; the locals of the one original function are handed between three files, and the
// PFN[x], PFN.x and FXT[t] lookups became the throwing pfn(x) and fxt(t).
import { COL, pfn, pickR } from './legacyLookups';
import type { LegacyEnv, LegacyLocals, LegacyStyle } from './legacyTypes';

export function genLookSpots(env: LegacyEnv, S: LegacyStyle, g: LegacyLocals): void {
  const { AG } = env;
  const { set, L, c1, c2, big } = g;
  const gob = pickR(S.gobos || [1, 2, 3, 4, 5, 7]);
  if (S.calm || !big)
    set(AG.foh, (f, k, n) => ({
      ...pfn(S.orch && k % 2 ? 'orch' : 'singer')(f, k, n),
      ...COL('Warm'),
      dim: L(72),
      gobo: S.calm ? (S.gobos ? gob : 0) : gob,
      zoom: S.calm ? 11 : 13,
      grot: S.calm ? 0 : 8,
    }));
  else
    set(AG.foh, (f, k, n) => ({
      ...pfn(pickR(['audience', 'cross', 'fanAud']))(f, k, n),
      ...COL('White'),
      dim: L(82),
      gobo: gob,
      zoom: 14,
      grot: pickR([-30, 20, 40]),
    }));
  set(AG.t4, (f, k, n) => ({
    ...pfn(S.orch ? 'orch' : pickR(['cross', 'band', 'down', 'orch']))(f, k, n),
    ...(S.mono ? COL('White') : c1),
    dim: L(S.calm ? 48 : 62),
    gobo: pickR(S.gobos || [1, 2, 3, 7]),
    zoom: 16,
    grot: pickR([-12, 12, 0]),
  }));
  set(AG.rwash, (f, k, n) => ({
    ...pfn(S.calm ? 'ringCone' : pickR(['center', 'ringCone', 'band']))(f, k, n),
    ...(k % 2 ? c1 : c2),
    dim: L(S.calm ? 45 : 70),
    zoom: 26,
  }));
  if (!S.calm || S.orch)
    set(AG.angS, (f, k, n) => ({
      ...pfn(S.orch ? 'orch' : pickR(['cross', 'band', 'audience']))(f, k, n),
      ...(S.mono ? COL('White') : c2),
      dim: L(S.calm ? 45 : 70),
      gobo: pickR(S.gobos || [1, 3, 5, 7]),
      zoom: 14,
      grot: pickR([-20, 20, 35]),
    }));
}
