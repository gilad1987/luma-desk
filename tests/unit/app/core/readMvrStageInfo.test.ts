import { describe, expect, it } from 'vitest';
import { readMvrStageInfo } from '../../../../src/app/testHook/readMvrStageInfo';
import { EventBus } from '../../../../src/core';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { EngineEvents } from '../../../../src/engine/events';
import { StageService } from '../../../../src/engine/stage/StageService';

/** The built-in design as an MVR import: the first fixture patched, the source an `.mvr` file. */
function mvrDesign(): StageDesign {
  const [first, ...rest] = BUILT_IN_DESIGN.fixtures;
  if (!first) throw new Error('the built-in design has no fixtures');
  const patched = { ...first, patch: { universe: 2, address: 1, mode: 'Std' } };
  return { ...BUILT_IN_DESIGN, source: { kind: 'mvr', name: 'Rig.mvr' }, fixtures: [patched, ...rest] };
}

const service = (): StageService =>
  new StageService(new EventBus<EngineEvents>(), { builtIn: BUILT_IN_DESIGN, tooManyFixtures: String });

describe('readMvrStageInfo', () => {
  it('names no file for the built-in template and lists every fixture unpatched, in rig order', () => {
    const stage = service();
    const info = readMvrStageInfo(stage);
    expect(info.kind).toBe('template');
    expect('fileName' in info).toBe(false);
    expect(info.fixtureCount).toBe(stage.rig.fixtures.length);
    expect(info.patches.map(({ id }) => id)).toEqual(BUILT_IN_DESIGN.fixtures.map(({ id }) => id));
    expect(info.patches.every(({ patch }) => patch === null)).toBe(true);
  });

  it('follows an apply: the MVR file name and the patch of each fixture', () => {
    const stage = service();
    stage.apply(mvrDesign(), 'import');
    const info = readMvrStageInfo(stage);
    expect(info).toMatchObject({ kind: 'mvr', fileName: 'Rig.mvr' });
    expect(info.patches.slice(0, 2).map(({ patch }) => patch)).toEqual([
      { universe: 2, address: 1, mode: 'Std' },
      null,
    ]);
  });
});
