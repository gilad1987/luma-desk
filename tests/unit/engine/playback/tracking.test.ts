import { describe, expect, it } from 'vitest';
import type { Cue } from '../../../../src/engine/CueList';
import { tracked } from '../../../../src/engine/Tracking';
import { engineWorld } from './engineWorld';

/** Cues as `JSON.parse` gives them from a hand-edited show file: saved shows are not validated on load. */
const savedCues = (json: string): Cue[] => JSON.parse(json) as Cue[];

function executorWith(cues: Cue[]) {
  const e = engineWorld().pool.execs[0];
  if (!e) throw new Error('executor 1 missing');
  e.cues = cues;
  return e;
}

describe('tracked on saved shows (the original for...in skipped what is missing)', () => {
  it('skips a cue without vals and keeps tracking the cues around it', () => {
    const e = executorWith(
      savedCues(
        '[{"num":1,"name":"A","fade":0,"vals":{"101":{"dim":50}},"fx":[]},' +
          '{"num":2,"name":"B","fade":0,"fx":[]},' +
          '{"num":3,"name":"C","fade":0,"vals":{"102":{"dim":80}}}]',
      ),
    );
    expect(tracked(e, 1)).toEqual({ vals: { 101: { dim: 50 } }, fx: {} });
    expect(tracked(e, 2).vals).toEqual({ 101: { dim: 50 }, 102: { dim: 80 } });
  });

  it('keeps a null fixture entry as an empty record and stops no phaser for it', () => {
    const e = executorWith(
      savedCues(
        '[{"num":1,"name":"A","fade":0,"vals":{"101":{"dim":50}},' +
          '"fx":[{"type":"circle","rate":1,"size":10,"spread":0,"ids":[101]}]},' +
          '{"num":2,"name":"B","fade":0,"vals":{"101":null,"102":null},"fx":[]}]',
      ),
    );
    const state = tracked(e, 1);
    expect(state.vals).toEqual({ 101: { dim: 50 }, 102: {} });
    expect(Object.keys(state.fx)).toEqual(['101|pos']);
  });
});
