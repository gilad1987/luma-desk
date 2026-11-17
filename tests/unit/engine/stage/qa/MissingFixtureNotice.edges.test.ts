/**
 * QA4: MissingFixtureNotice at its edges (empty cue, odd keys, repeats, two executors, reset by cause, fx-only ids).
 * The basic warn/reset rules are owned by `../MissingFixtureNotice.test.ts`; the output merge that skips the ids is not
 * covered here.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { Cue, FixtureValues } from '../../../../../src/engine/CueList';
import type { EngineEvents } from '../../../../../src/engine/events';
import { MissingFixtureNotice } from '../../../../../src/engine/stage/MissingFixtureNotice';
import { StageService } from '../../../../../src/engine/stage/StageService';
import { recordEvents } from '../../state/recordEvents';

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, createTemplate('sultans-pool'), undefined, { tooManyFixtures: String });
  const notice = new MissingFixtureNotice(bus, service);
  const events = recordEvents(bus);
  return { service, notice, logs: () => events.filter((e) => e.startsWith('log:')) };
};

const cueOf = (num: number, vals: FixtureValues, fxIds: number[] = []): Cue => ({
  num,
  name: '',
  fade: 0,
  vals,
  fx: fxIds.length > 0 ? [{ type: 'circle', rate: 1, size: 1, spread: 0, ids: fxIds }] : [],
});

const warn = (exec: number, num: number, n: number): string =>
  `log:er:Exec ${exec} Cue ${num}: ${n} fixtures are not on this stage (skipped)`;

describe('MissingFixtureNotice edges (QA4)', () => {
  it('says nothing for an empty cue, even on the empty stage', () => {
    const { service, notice, logs } = setup();
    service.apply(createTemplate('empty'), 'builder');
    notice.check(0, cueOf(1, {}));
    expect(logs()).toEqual([]);
  });

  it('counts a non-numeric vals key as one missing fixture, as Number of it is NaN', () => {
    const { notice, logs } = setup();
    notice.check(0, cueOf(1, { abc: { dim: 1 }, 101: { dim: 1 } }));
    expect(logs()).toEqual([warn(1, 1, 1)]);
  });

  it('warns once for the same cue checked twice, and once per executor for one cue number', () => {
    const { service, notice, logs } = setup();
    service.apply(createTemplate('theatre'), 'builder');
    const cue = cueOf(2.5, { 90001: { dim: 1 } });
    notice.check(0, cue);
    notice.check(0, cue);
    notice.check(3, cue);
    expect(logs()).toEqual([warn(1, 2.5, 1), warn(4, 2.5, 1)]);
  });

  it('counts ids named only by an effect', () => {
    const { service, notice, logs } = setup();
    const theatre = createTemplate('theatre');
    service.apply(theatre, 'builder');
    const onStage = theatre.fixtures[0]?.id ?? -1;
    notice.check(0, cueOf(1, { [onStage]: { dim: 1 } }, [onStage, 90001, 90002]));
    expect(logs()).toEqual([warn(1, 1, 2)]);
  });

  it('warns again after a builder, import or show load apply, but not after a preview', () => {
    const { service, notice, logs } = setup();
    const theatre = createTemplate('theatre');
    const cue = cueOf(1, { 90001: { dim: 1 } });
    notice.check(0, cue);
    for (const cause of ['preview', 'builder', 'preview', 'import', 'showLoad'] as const) {
      service.apply(theatre, cause);
      notice.check(0, cue);
    }
    expect(logs()).toHaveLength(4);
  });
});
