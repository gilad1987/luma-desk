// Reference oracle: genLook first part (2572-2591) from index.html (index.base.html 2571-2615), formatted by Prettier.
// Changes: types only; the locals of the one original function are handed between three files, and the
// PFN[x], PFN.x and FXT[t] lookups became the throwing pfn(x) and fxt(t); set() lives in legacyLookups.
import { clamp } from '../../../../src/core';
import { COL, legacySet, pfn, fxt, pickR } from './legacyLookups';
import type { LegacyEnv, LegacyFx, LegacyLocals, LegacyStyle } from './legacyTypes';

export function genLookStart(env: LegacyEnv, S: LegacyStyle, sec: string): LegacyLocals {
  const { auto, AG, fixtures } = env;
  const vals = {},
    fx: LegacyFx[] = [];
  const set = legacySet(env, vals);
  const secE =
    ({ groove: 0.75, verse: 0.65, chorus: 1, hook: 1, build: 0.8, drop: 1 } as Record<string, number>)[sec] ?? 0.8;
  const E = clamp(auto.energy * secE, 0.05, 1.2),
    L = (x: number) => Math.round(clamp(x * E, 0, 100));
  const [n1, n2] = pickR(S.pal),
    c1 = COL(n1),
    c2 = COL(n2);
  const big = sec === 'chorus' || sec === 'hook' || sec === 'drop';
  set(
    fixtures.filter((f) => f.type !== 'screen').map((f) => f.id),
    { dim: 0, strobe: 0, gobo: 0, grot: 0 },
  );
  const wPos = S.orch
    ? pickR(['orch', 'band', 'center'])
    : S.calm
      ? pickR(['center', 'band', 'singer'])
      : pickR(['center', 'band', 'cross', 'down', 'orch']);
  set(AG.t3, (f, k, n) => ({
    ...pfn(wPos)(f, k, n),
    ...(k % 2 ? c2 : c1),
    dim: L(S.calm ? 62 : 78),
    zoom: S.calm ? 34 : 24,
  }));
  set(AG.tow, (f, k, n) => ({
    ...pfn(S.orch || Math.random() < 0.4 ? 'orch' : 'band')(f, k, n),
    ...c2,
    dim: L(S.calm ? 50 : 66),
    zoom: 28,
  }));
  set(AG.pars, { ...c2, dim: L(85) });
  set(AG.audW, (f, k, n) => ({
    ...pfn('crowd')(f, k, n),
    ...(big ? COL('White') : c2),
    dim: L(big ? 95 : S.calm ? 25 : 45),
    zoom: 50,
    strobe: sec === 'drop' && S.strobe && auto.strobes ? 50 : 0,
  }));
  set(AG.towW, (f, k, n) => ({
    ...pfn(S.calm || S.orch ? 'band' : pickR(['band', 'audience', 'center']))(f, k, n),
    ...(k % 2 ? c1 : c2),
    dim: L(S.calm ? 40 : 60),
    zoom: 30,
  }));
  set(AG.fwash, (f, k, n) => ({
    ...pfn(sec === 'verse' || S.calm ? 'down' : 'vOut')(f, k, n),
    ...c1,
    dim: L(sec === 'verse' || S.calm ? 35 : 62),
    zoom: 20,
  }));
  // footlight bars: a tight colour curtain straight up on big sections, otherwise a soft wash back onto the band
  set(AG.bars, (f, k) => ({
    tilt: big ? 6 : -32,
    ...(big && k % 2 ? c2 : c1),
    dim: L(big ? 90 : 45),
    zoom: big ? 6 : 30,
  }));
  if ((sec === 'build' || sec === 'drop') && S.fxPos.length)
    fx.push({ type: 'tilt', rate: pickR(S.rate || [1]), size: fxt('tilt').size, spread: 360, ids: [...AG.bars] });
  // follow spots stay on the lead singer; profiles add a side wash
  set(AG.follow, (f, k, n) => ({
    ...pfn('singer')(f, k, n),
    ...COL('Warm'),
    dim: L(big ? 85 : 55),
    zoom: big ? 7 : 11,
    gobo: 0,
  }));
  set(AG.prof, (f, k) => ({ ...(k % 2 ? c1 : c2), dim: L(S.calm ? 55 : 35) }));
  return { vals, fx, set, L, n1, c1, c2, big };
}
