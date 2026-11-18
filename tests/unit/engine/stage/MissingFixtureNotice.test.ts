/**
 * Owns the MissingFixtureNotice rules: which ids count as missing, the singular and plural text, one warning per
 * executor and cue, and the reset on a committed rig change. Odd keys, fx-only ids and every cause are in
 * `qa/MissingFixtureNotice.edges.test.ts`; that the output merge skips the ids is owned by the playback tests.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { Cue } from '../../../../src/engine/CueList';
import type { EngineEvents } from '../../../../src/engine/events';
import { MissingFixtureNotice } from '../../../../src/engine/stage/MissingFixtureNotice';
import { StageService } from '../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../shared';

const builtIn = createTemplate('sultans-pool');

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  const service = new StageService(bus, { builtIn, tooManyFixtures: String });
  const notice = new MissingFixtureNotice(bus, service);
  const events = recordEvents(bus);
  return { service, notice, logs: () => events.filter((e) => e.startsWith('log:')) };
};

/** A cue on ids 101 and 102 (values), plus 101 again and 103 (effect), so the ids repeat across both. */
const cue = (num: number): Cue => ({
  num,
  name: '',
  fade: 0,
  vals: { 101: { dim: 1 }, 102: { dim: 1 } },
  fx: [{ type: 'circle', rate: 1, size: 1, spread: 0, ids: [101, 103] }],
});

describe('MissingFixtureNotice', () => {
  it('says nothing when the rig has every id', () => {
    const { notice, logs } = setup();
    notice.check(0, cue(1));
    expect(logs()).toEqual([]);
  });

  it('says "1 fixture is" when one id is missing', () => {
    const { service, notice, logs } = setup();
    service.apply(createTemplate('empty'), 'builder');
    notice.check(0, { ...cue(1), vals: { 101: { dim: 1 } }, fx: [] });
    expect(logs()).toEqual(['log:er:Exec 1 Cue 1: 1 fixture is not on this stage (skipped)']);
  });

  it('logs one error per cue, counting each missing id once', () => {
    const { service, notice, logs } = setup();
    service.apply(createTemplate('empty'), 'builder');
    notice.check(1, cue(3));
    notice.check(1, cue(3));
    notice.check(0, cue(3));
    expect(logs()).toEqual([
      'log:er:Exec 2 Cue 3: 3 fixtures are not on this stage (skipped)',
      'log:er:Exec 1 Cue 3: 3 fixtures are not on this stage (skipped)',
    ]);
  });

  it('reads the rig at call time and warns again after a committed rig change', () => {
    const { service, notice, logs } = setup();
    service.apply(createTemplate('empty'), 'builder');
    notice.check(0, cue(1));
    service.apply(createTemplate('empty'), 'showLoad');
    notice.check(0, cue(1));
    // the theatre rig has ids 101-106, so the same cue is complete there
    service.apply(createTemplate('theatre'), 'builder');
    notice.check(0, cue(1));
    expect(logs()).toHaveLength(2);
  });

  it('does not reset on a preview', () => {
    const { service, notice, logs } = setup();
    service.apply(createTemplate('empty'), 'builder');
    notice.check(0, cue(1));
    service.apply(createTemplate('empty'), 'preview');
    notice.check(0, cue(1));
    expect(logs()).toHaveLength(1);
  });
});
