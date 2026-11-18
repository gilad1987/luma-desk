import { clamp } from '../../core';
import type { StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { executorAt } from './executorAt';
import { findCue } from './findCue';
import { log } from './log';

/** Selects the executor that playback commands act on; out-of-range numbers clamp to the first or last executor. */
export function runSelectExec({ exec }: StatementOf<'selectExec'>, { pool, state, bus }: CommandDeps): void {
  state.selectExec(clamp(exec, 0, pool.execs.length - 1));
  log(bus, `Exec ${state.selExec + 1} selected`, 'ok');
}

/** Go or Go Back on the given executor, or on the selected one; an unknown number fails (quirk C2, orig:1921). */
export function runGo({ direction, exec }: StatementOf<'go'>, { pool, state }: CommandDeps): void {
  pool.go(executorAt(pool, exec ?? state.selExec, 'reading', 'cues'), direction);
}

/** Jumps the selected executor to a cue number, raising a stopped executor's fader so the cue is seen. */
export function runGotoCue({ cue }: StatementOf<'gotoCue'>, { pool, state, bus }: CommandDeps): void {
  const executor = executorAt(pool, state.selExec, 'reading', 'cues');
  const index = findCue(executor, cue);
  if (!executor.on && executor.level === 0) executor.level = 1;
  executor.goto(index);
  log(bus, `Goto Cue ${cue}`, 'ok');
}

/** Pauses the selected executor's running fade. */
export function runPause(_: StatementOf<'pause'>, { pool, state }: CommandDeps): void {
  executorAt(pool, state.selExec, 'reading', 'pause').pause();
}

/** Turns an executor off; `on` is cleared first because that is the write that failed for an unknown executor. */
export function runOff({ exec }: StatementOf<'off'>, { pool, state, bus }: CommandDeps): void {
  const index = exec ?? state.selExec;
  const executor = executorAt(pool, index, 'setting', 'on');
  executor.on = false; // quirk C8 (orig:1925)
  executor.off();
  log(bus, `Exec ${index + 1} Off`, 'ok');
}
