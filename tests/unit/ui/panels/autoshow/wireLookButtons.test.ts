import { describe, expect, it, vi } from 'vitest';
import { buildCueList, saveLook } from '../../../../../src/ui/panels/autoshow/wireLookButtons';
import { autoShowDeps, cue } from './autoShowFakes';

describe('Auto Show look buttons', () => {
  it('refuses to save before Auto runs', () => {
    const { deps, messages, execs } = autoShowDeps();
    saveLook(deps);
    expect(messages).toEqual([{ kind: 'toast', text: 'Start Auto first' }]);
    expect(execs[0]?.cues).toHaveLength(1);
  });

  it('saves the playing look as the next whole cue of the selected executor', () => {
    const { deps, auto, messages, execs, storage } = autoShowDeps();
    const e = execs[0],
      invalidate = e && vi.spyOn(e, 'invalidate');
    auto.on = true;
    saveLook(deps);
    expect(e?.cues.at(-1)).toEqual({ num: 3, name: 'EDM Drop', fade: 0, vals: {}, fx: [] });
    expect([e?.name, invalidate?.mock.calls.length, storage.persist.mock.calls.length]).toEqual(['Seq 1', 1, 1]);
    expect(messages).toEqual([
      { kind: 'toast', text: 'Look saved as Cue 3 in Exec 1' },
      { kind: 'log', text: 'Auto look → Exec 1 Cue 3', level: 'ok' },
    ]);
  });

  it('builds eight looks in the first empty executor after Exec 1 and selects it', () => {
    const { deps, auto, messages, execs, state } = autoShowDeps();
    const e = execs[1],
      resetTracking = e && vi.spyOn(e, 'resetTracking'),
      name = auto.style.name;
    buildCueList(deps);
    expect([e?.name, e?.cues.length, resetTracking?.mock.calls.length, state.selExec]).toEqual([name, 8, 1, 1]);
    expect(e?.cues[0]).toMatchObject({ num: 1 });
    expect(messages).toEqual([
      { kind: 'toast', text: `8-cue ${name} list built in Exec 2` },
      { kind: 'log', text: `Built ${name} cue list → Exec 2`, level: 'ok' },
    ]);
  });

  it('says so when no executor after Exec 1 is empty', () => {
    const { deps, messages, execs } = autoShowDeps();
    for (const e of execs) e.cues.push(cue(1));
    buildCueList(deps);
    expect(messages).toEqual([{ kind: 'toast', text: 'No empty executor — clear one first' }]);
  });
});
