import { describe, expect, it } from 'vitest';
import { performanceClock } from '../../../../../src/core';
import { Executor } from '../../../../../src/engine/Executor';
import { autoHudText, executorHudText } from '../../../../../src/ui/panels/executors/cueHudText';
import { executorCardText } from '../../../../../src/ui/panels/executors/executorCardText';

const exec = (name: string, cueCount: number, cur: number, on: boolean): Executor => {
  const e = new Executor(false, performanceClock);
  e.name = name;
  e.cur = cur;
  e.on = on;
  for (let n = 1; n <= cueCount; n++) e.cues.push({ num: n, name: `Look ${n}`, fade: n / 2, vals: {}, fx: [] });
  return e;
};

describe('executorCardText (the card part of updateExecUI)', () => {
  it('names an empty executor and a named one', () => {
    expect(executorCardText(exec('', 0, -1, false), 2)).toEqual({ name: 'empty', cue: '', next: '' });
    expect(executorCardText(exec('Band', 0, -1, false), 2).name).toBe('Band');
  });

  it('shows the cue count when off and the next cue only while on', () => {
    expect(executorCardText(exec('', 3, -1, false), 0)).toEqual({ name: 'Seq 1', cue: '3 cues', next: '' });
    expect(executorCardText(exec('', 3, 2, true), 0)).toEqual({ name: 'Seq 1', cue: '3 Look 3', next: '› 1 Look 1' });
  });
});

describe('executorHudText', () => {
  it('reports no cues, off, and a running cue with two spaces before the fade (Q31)', () => {
    expect(executorHudText(exec('', 0, -1, false), 0)).toEqual({
      exec: 'Exec 1 · empty',
      cueHtml: 'No cues',
      next: '',
    });
    expect(executorHudText(exec('A', 1, -1, false), 4)).toEqual({
      exec: 'Exec 5 · A',
      cueHtml: 'Off — press GO',
      next: '',
    });
    expect(executorHudText(exec('A', 2, 0, true), 0)).toEqual({
      exec: 'Exec 1 · A',
      cueHtml: '<span>1</span> Look 1',
      next: 'Next: 2 Look 2  (fade 1s)',
    });
  });
});

describe('autoHudText', () => {
  it('shows style, section name and the look length', () => {
    const auto = { on: true, style: { name: 'EDM Festival' }, section: 'build' as const, barsPerLook: () => 8 };
    expect(autoHudText(auto, 128, 8)).toEqual({
      exec: 'AUTO SHOW · EDM Festival',
      cueHtml: '<span>●</span> Build-up',
      next: '128 BPM · new look every 8 bars',
    });
    expect(autoHudText({ ...auto, section: '' }, 120, 4).cueHtml).toBe('<span>●</span> ');
  });
});
