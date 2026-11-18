/**
 * QA6: groups and selection over a whole tour of stages (built-in -> empty -> theatre -> festival -> built-in), with
 * every listener wired, plus many rapid applies. Owns what the listeners do together; each listener alone is owned by
 * `../StageGroups.test.ts`, `../../state/Selection.source.test.ts` and the regroup tests.
 */
import { describe, expect, it } from 'vitest';
import type { TemplateId } from '../../../../../src/domain/stage/templates';
import type { Group } from '../../../../../src/engine/GroupLibrary';
import { defaultPoolOf } from '../../../../../src/engine/stage/defaultPool';
import { rigWorld, type ApplyCause } from './rigWorld';

const TOUR: readonly TemplateId[] = ['empty', 'theatre', 'festival', 'sultans-pool'];

describe('rig switch in the wired engine (QA6)', () => {
  it('ends every stop of the tour on that stage defaults plus the user groups, as the same objects', () => {
    const w = rigWorld();
    const mine: Group = { name: 'Mine', ids: [101, 809] };
    const reordered: Group = { name: 'Beams Truss 2', ids: [...(w.groups.all[2]?.ids ?? [])].reverse() };
    w.groups.replace({ ...w.groups.all, 2: reordered, 48: mine });
    for (const id of TOUR) {
      w.to(id);
      expect([w.groups.all[2], w.groups.all[48]]).toStrictEqual([reordered, mine]);
      expect(w.groups.all).toStrictEqual({ ...defaultPoolOf(w.service), 2: reordered, 48: mine });
    }
    expect([w.service.isBuiltIn, w.groups.all[2] === reordered, w.groups.all[48] === mine]).toEqual([true, true, true]);
    expect(w.count('poolsChanged')).toBe(TOUR.length);
  });

  it('prunes the selection in order and never brings back an id a stage dropped', () => {
    const w = rigWorld();
    w.selection.set([809, 2001, 102, 225, 101]);
    w.to('theatre');
    const onTheatre = [...w.selection.ids];
    w.to('sultans-pool');
    const backHome = [...w.selection.ids];
    w.to('empty');
    const onEmpty = [...w.selection.ids];
    w.to('festival');
    expect([onTheatre, backHome, onEmpty, [...w.selection.ids]]).toEqual([[102, 101], [102, 101], [], []]);
    expect(w.selection.has(809)).toBe(false);
  });

  it('leaves the pool object and its slots alone on a show load and sends no poolsChanged', () => {
    const w = rigWorld();
    const before = w.groups.all;
    const copy = structuredClone(before);
    w.to('theatre', 'showLoad');
    expect([w.groups.all === before, w.count('poolsChanged')]).toEqual([true, 0]);
    expect(w.groups.all).toStrictEqual(copy);
  });

  it('regroups on a preview, as only a show load leaves the pool to its loader', () => {
    const w = rigWorld();
    w.to('theatre', 'preview');
    expect([w.groups.all, w.count('poolsChanged')]).toStrictEqual([defaultPoolOf(w.service), 1]);
  });

  it('stays consistent over 400 rapid applies of mixed causes and ends on the built-in pool', () => {
    const w = rigWorld();
    const mine: Group = { name: 'Mine', ids: [101] };
    w.groups.replace({ ...w.groups.all, 48: mine });
    w.selection.set([101, 102]);
    const causes: readonly ApplyCause[] = ['builder', 'preview', 'import'];
    for (let i = 0; i < 400; i++) w.to(TOUR[i % TOUR.length] ?? 'empty', causes[i % causes.length]);
    const rigChanged = w.lines.filter((l) => l.startsWith('rigChanged:')).length;
    const toasts = w.lines.filter((l) => l.startsWith('toast:')).length;
    expect([rigChanged, w.count('poolsChanged'), toasts, w.service.isBuiltIn]).toEqual([400, 400, 0, true]);
    expect(w.groups.all).toStrictEqual({ ...defaultPoolOf(w.service), 48: mine });
    expect([w.groups.all[48] === mine, [...w.selection.ids]]).toEqual([true, []]);
  });
});
