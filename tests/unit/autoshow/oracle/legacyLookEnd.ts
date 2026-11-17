// Reference oracle: genLook third part (2599-2614) from index.html (index.base.html 2571-2615), formatted by Prettier.
// Changes: types only; the locals of the one original function are handed between three files, and the
// PFN[x], PFN.x and FXT[t] lookups became the throwing pfn(x) and fxt(t).
import { SEC_NAMES } from './legacyGenLook';
import { COL, fxt, pfn, pickR } from './legacyLookups';
import type { LegacyCue, LegacyEnv, LegacyLocals, LegacyStyle } from './legacyTypes';

export function genLookEnd(env: LegacyEnv, S: LegacyStyle, sec: string, g: LegacyLocals): LegacyCue {
  const { auto, AG } = env;
  const { vals, fx, set, L, n1, c1, c2, big } = g;
  const order = [AG.t2, AG.back, AG.floor, AG.angB, AG.towB];
  let active = big ? [AG.ring, ...order] : sec === 'build' ? [AG.ring, AG.floor, AG.t2] : [AG.ring, pickR(order)];
  if (auto.energy < 0.45) active = active.slice(0, 1);
  if (S.calm) active = [AG.ring, AG.back];
  active.forEach((ids, gi) => {
    const pn =
        ids === AG.ring
          ? pickR(
              S.calm
                ? ['ringDown', 'ringCrown', 'ringCone']
                : sec === 'drop'
                  ? ['ringSun', 'ringTwist']
                  : ['ringCone', 'ringSun', 'ringTwist', 'ringCrown', 'ringDown'],
            )
          : ids === AG.angB
            ? pickR(['wingFan', 'converge', 'ringCrown', ...S.pos])
            : pickR(S.pos),
      col = S.mono ? COL(pickR(['White', 'White', n1])) : gi % 2 ? c2 : c1;
    set(ids, (f, k, n) => ({ ...pfn(pn)(f, k, n), ...col, dim: L(S.calm ? 50 : 95), zoom: 2, gobo: 0 }));
    const rate = pickR(S.rate || [1]) * (sec === 'drop' || sec === 'build' ? 2 : 1);
    if (S.fxPos.length && Math.random() < (S.calm ? 0.7 : 0.85)) {
      const t = pickR(S.fxPos);
      fx.push({
        type: t,
        rate,
        size: fxt(t).size * (S.calm ? 0.5 : sec === 'drop' ? 1.2 : 1),
        spread: pickR([0, 180, 360, 720]),
        ids: [...ids],
      });
    }
    if (S.fxDim.length && (sec === 'build' || sec === 'drop' || Math.random() < 0.45))
      fx.push({
        type: sec === 'build' ? 'dimChase' : pickR(S.fxDim),
        rate,
        size: L(100),
        spread: pickR([360, 720]),
        ids: [...ids],
      });
    if (S.fxCol && Math.random() < 0.4)
      fx.push({ type: pickR(S.fxCol), rate: 0.5, size: 100, spread: 360, ids: [...ids] });
  });
  if (sec === 'drop' && S.strobe && auto.strobes) {
    set(AG.strobe, { dim: 100, strobe: pickR([75, 85, 92]) });
    set(AG.t3, { strobe: 35 });
  }
  if (auto.screen)
    set([2001], {
      ...(S.mono ? COL('White') : c1),
      dim: L(S.calm ? 28 : 80),
      gobo: pickR(S.screen),
      grot: S.calm ? 5 : pickR([20, 40, 70]),
    });
  else set([2001], { dim: 0 });
  return { num: 1, name: `${S.name} · ${SEC_NAMES[sec] || sec}`, fade: S.fade, vals, fx, sec };
}
