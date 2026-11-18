/**
 * Owns the cue observer: every way an operator executor starts a cue (GO, `goto`, a fader, a flash) reaches
 * `observeCues` with the executor index, the auto executor never does, and the MissingFixtureNotice wired to it logs
 * once per cue. What the notice
 * counts is owned by `stage/MissingFixtureNotice.test.ts`; the playback itself by the parity tests.
 */
import { describe, expect, it } from 'vitest';
import { EventBus, type Clock } from '../../../../src/core';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { Cue } from '../../../../src/engine/CueList';
import type { EngineEvents } from '../../../../src/engine/events';
import { ExecutorPool } from '../../../../src/engine/ExecutorPool';
import { MissingFixtureNotice } from '../../../../src/engine/stage/MissingFixtureNotice';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const clock: Clock = { nowMs: () => 0, nowSeconds: () => 0 };
const cue = (num: number): Cue => ({ num, name: '', fade: 0, vals: { 101: { dim: 1 } }, fx: [] });

describe('ExecutorPool.observeCues', () => {
  it('reports every cue start with the executor index', () => {
    const pool = new ExecutorPool(clock, new EventBus<EngineEvents>());
    const [, second, third] = pool.execs;
    if (!second || !third) throw new Error('missing executors');
    for (const e of [second, third, pool.autoExec]) e.cues = [cue(1), cue(2)];
    const seen: string[] = [];
    pool.observeCues((i, c) => seen.push(`${i}:${c.num}`));
    pool.go(second);
    second.goto(1);
    second.off();
    pool.setLevel(second, 0.5);
    pool.flashPress(third);
    pool.autoExec.goto(1);
    expect(seen).toEqual(['1:1', '1:2', '1:1', '2:1']);
  });

  it('leaves the auto executor out: its cues come from the current rig', () => {
    const pool = new ExecutorPool(clock, new EventBus<EngineEvents>());
    pool.autoExec.cues = [cue(1), cue(2)];
    const seen: number[] = [];
    pool.observeCues((i) => seen.push(i));
    pool.autoExec.goto(1);
    pool.setLevel(pool.autoExec, 1);
    expect(seen).toEqual([]);
  });

  it('lets the MissingFixtureNotice log once per cue on a stage without the fixtures', () => {
    const bus = new EventBus<EngineEvents>();
    const service = new StageService(bus, { builtIn: createTemplate('sultans-pool'), tooManyFixtures: String });
    const notice = new MissingFixtureNotice(bus, service);
    const pool = new ExecutorPool(clock, bus);
    pool.observeCues((i, c) => notice.check(i, c));
    const [first] = pool.execs;
    if (!first) throw new Error('missing executor');
    first.cues = [cue(1), cue(2)];
    service.apply(createTemplate('empty'), 'builder');
    const events = recordEvents(bus);
    for (let go = 0; go < 4; go++) pool.go(first);
    expect(events.filter((e) => e.startsWith('log:er'))).toEqual([
      'log:er:Exec 1 Cue 1: 1 fixture is not on this stage (skipped)',
      'log:er:Exec 1 Cue 2: 1 fixture is not on this stage (skipped)',
    ]);
  });
});
