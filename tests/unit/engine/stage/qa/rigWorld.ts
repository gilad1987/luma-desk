/**
 * QA6: the engine of the Stage Builder wired as plan §3.2 orders it, for the rig-switch tests in this folder: one real
 * StageService, Selection (with the source), StageGroups over a GroupLibrary, PresetLibrary (with the source), the
 * MissingFixtureNotice fed by `ExecutorPool.observeCues`, and a Programmer that reads the rig at call time and aims
 * the computed presets through the PresetLibrary.
 */
import { EventBus, type Clock } from '../../../../../src/core';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign';
import { createTemplate, type TemplateId } from '../../../../../src/domain/stage/templates';
import { AppState } from '../../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../../src/engine/events';
import { ExecutorPool } from '../../../../../src/engine/ExecutorPool';
import { GroupLibrary } from '../../../../../src/engine/GroupLibrary';
import { PresetLibrary } from '../../../../../src/engine/PresetLibrary';
import { Programmer } from '../../../../../src/engine/Programmer';
import { Selection } from '../../../../../src/engine/Selection';
import { defaultPoolOf } from '../../../../../src/engine/stage/defaultPool';
import { MissingFixtureNotice } from '../../../../../src/engine/stage/MissingFixtureNotice';
import type { RigChangeCause } from '../../../../../src/engine/stage/rigChanged';
import { StageGroups } from '../../../../../src/engine/stage/StageGroups';
import { StageService } from '../../../../../src/engine/stage/StageService';
import { recordEvents } from '../../../../shared';

const clock: Clock = { nowMs: () => 0, nowSeconds: () => 0 };

/** A committed or preview cause; `boot` is the constructor's own. */
export type ApplyCause = Exclude<RigChangeCause, 'boot'>;

/** Builds the wired engine on the built-in stage, with the pool holding its default groups. */
export function rigWorld() {
  const bus = new EventBus<EngineEvents>();
  const builtIn: StageDesign = createTemplate('sultans-pool');
  const service = new StageService(bus, { builtIn, tooManyFixtures: (n) => `too many ${n}` });
  const selection = new Selection(service.rig, bus, service);
  const groups = new GroupLibrary(bus);
  groups.replace(defaultPoolOf(service));
  new StageGroups(bus, service, groups);
  const presets = new PresetLibrary(bus, service);
  const notice = new MissingFixtureNotice(bus, service);
  const pool = new ExecutorPool(clock, bus);
  pool.observeCues((i, cue) => notice.check(i, cue));
  const state = new AppState(bus);
  const programmer = new Programmer({
    get rig() {
      return service.rig;
    },
    selection,
    presets,
    pool,
    state,
    clock,
    bus,
    source: service,
  });
  const lines = recordEvents(bus);
  /** Applies a template; `sultans-pool` means the built-in design object itself, so `isBuiltIn` turns true. */
  const to = (id: TemplateId, cause: ApplyCause = 'builder'): void =>
    service.apply(id === 'sultans-pool' ? builtIn : createTemplate(id), cause);
  const count = (line: string): number => lines.filter((l) => l === line).length;
  return { bus, service, selection, groups, presets, pool, programmer, lines, to, count };
}
