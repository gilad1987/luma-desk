import type { EngineWorld } from './engineWorld';
import type { LegacyWorld } from './legacyWorld';

/** Running totals of a parity run; `mismatches` keeps the first few differences for the failure message. */
export interface Tally {
  samples: number;
  mismatchCount: number;
  mismatches: string[];
}

/**
 * Compares `fixture.out` and `fixture.base` of both worlds bit for bit (Object.is, so -0 and NaN count) and in key
 * order, fixture by fixture in rig order.
 */
export function compareFrame(now: EngineWorld, old: LegacyWorld, t: number, tally: Tally): void {
  now.rig.fixtures.forEach((f, i) => {
    const g = old.env.fixtures[i];
    if (!g || g.id !== f.id) throw new Error(`rig order differs at ${i}`);
    for (const [label, a, b] of [
      ['out', f.out, g.out],
      ['base', f.base, g.base],
    ] as const) {
      const keys = Object.keys(a);
      if (keys.join() !== Object.keys(b).join()) note(tally, `t=${t} ${f.id}.${label} keys ${keys.join()}`);
      for (const k of keys as (keyof typeof a)[]) {
        tally.samples++;
        if (!Object.is(a[k], b[k])) note(tally, `t=${t} ${f.id}.${label}.${k}: ${a[k]} vs ${b[k]}`);
      }
    }
  });
}

/** Compares the executor state both worlds keep (values, fade, cue, level, flash, LTP time) and the messages. */
export function compareExecutors(now: EngineWorld, old: LegacyWorld, t: number, tally: Tally): void {
  now.pool.all.forEach((e, i) => {
    const l = old.env.allExecs[i];
    const mine = JSON.stringify([e.cur, e.on, e.level, e.lastGo, e.flash, e.flashOnly, e.vals, e.fade]);
    const theirs = JSON.stringify([
      l?.cur,
      l?.on,
      l?.level,
      l?.lastGo,
      l?.flash,
      l?.flashOnly ?? false,
      l?.vals,
      l?.fade,
    ]);
    if (mine !== theirs) note(tally, `t=${t} exec ${i}: ${mine} vs ${theirs}`);
  });
  if (now.messages.join('\n') !== old.env.messages.join('\n')) note(tally, `t=${t} messages differ`);
}

function note(tally: Tally, text: string): void {
  tally.mismatchCount++;
  if (tally.mismatches.length < 10) tally.mismatches.push(text);
}
