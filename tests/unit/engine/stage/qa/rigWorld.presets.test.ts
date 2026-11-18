/**
 * QA6: computed presets across a tour of stages in the wired engine: `missingTarget` follows each stage, an unavailable
 * preset refuses by command and changes nothing, the data survives, and the presets work again on the built-in stage.
 * Which preset needs which part is owned by `../presetTargets.test.ts`; the aimed values by the presetFnsOf tests.
 */
import { describe, expect, it } from 'vitest';
import type { TemplateId } from '../../../../../src/domain/stage/templates';
import type { PresetPools } from '../../../../../src/engine/presetTypes';
import { rigWorld } from './rigWorld';

const pools = (): PresetPools => ({
  1: {},
  2: {
    1: { name: 'Cone', kind: 'fn', fn: 'ringCone' },
    2: { name: 'Screen', kind: 'fn', fn: 'screen' },
    3: { name: 'Band', kind: 'fn', fn: 'band' },
    4: { name: 'Home', kind: 'fn', fn: 'home' },
  },
  3: {},
  4: {},
  5: {},
});

const SLOTS = [1, 2, 3, 4] as const;

describe('computed presets across stages (QA6)', () => {
  it('follows each stage of the tour and keeps the preset data untouched', () => {
    const w = rigWorld();
    w.presets.replace(pools());
    const tour: readonly TemplateId[] = ['sultans-pool', 'empty', 'theatre', 'festival', 'sultans-pool'];
    const seen = tour.map((id) => {
      w.to(id);
      return SLOTS.map((s) => w.presets.missingTarget(2, s) === null);
    });
    expect(seen).toEqual([
      [true, true, true, true],
      [false, false, false, true],
      [false, false, true, true],
      [true, true, true, true],
      [true, true, true, true],
    ]);
    expect(w.presets.all).toStrictEqual(pools());
  });

  it('refuses ring, screen and band presets on the empty stage, then applies them again on the built-in one', () => {
    const w = rigWorld();
    w.presets.replace(pools());
    w.to('empty');
    for (const s of SLOTS) w.programmer.applyPreset(2, s);
    const onEmpty = w.lines.filter((l) => l.startsWith('log:') || l.startsWith('toast:'));
    const emptyContent = w.programmer.hasContent();
    w.to('sultans-pool');
    w.selection.set([201, 202]);
    w.programmer.applyPreset(2, 1);
    expect(onEmpty.slice(0, 3)).toEqual([
      'log:er:Preset 2.1 needs a ring on this stage',
      'log:er:Preset 2.2 needs a screen on this stage',
      'log:er:Preset 2.3 needs a band on this stage',
    ]);
    expect([onEmpty.length, onEmpty[3]?.startsWith('toast:'), emptyContent]).toEqual([4, true, false]);
    expect([w.lines.at(-1), w.programmer.hasContent()]).toEqual(['log:ok:Preset 2.1 "Cone"', true]);
  });

  it('refuses on the theatre even with a selection, and leaves the programmer empty', () => {
    const w = rigWorld();
    w.presets.replace(pools());
    w.to('theatre');
    w.selection.set([101, 102]);
    w.programmer.applyPreset(2, 1);
    w.programmer.applyPreset(2, 2);
    const logs = w.lines.filter((l) => l.startsWith('log:'));
    expect([logs, w.programmer.hasContent()]).toEqual([
      ['log:er:Preset 2.1 needs a ring on this stage', 'log:er:Preset 2.2 needs a screen on this stage'],
      false,
    ]);
  });
});
