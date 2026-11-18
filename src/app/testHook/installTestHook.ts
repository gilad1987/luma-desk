import type { AttrValues } from '../../domain/attributes';
import { jsonClone } from '../../core';
import type { Fixture } from '../../domain/Fixture';
import { PHASER_TYPES, type PhaserType } from '../../engine/shared';
import type { ShowFileV1 } from '../../show/ShowFile';
import { CommandCapture, type CapturedOutput } from './CommandCapture';
import { readDeskClock, type DeskClock } from './deskClock';
import { readDeskState, type DeskState } from './readDeskState';
import { createStageHooks } from './stageHooks';
import type { TestHookDeps } from './TestHookDeps';

/** `window.__desk.test`: the only door the Playwright suite uses into the app (see tests/shared/deskApi.ts). */
export interface DeskTestApi extends DeskClock {
  state(): DeskState;
  serialize(): ShowFileV1;
  /** Moves to an absolute time (seconds, never backwards) and returns the output of every fixture there. */
  outputAt(sec: number): ({ id: number } & AttrValues)[];
  /** Runs one command line; returns its log lines, its toast and the state after it. */
  run(line: string): CapturedOutput & { state: DeskState };
  /** Starts a programmer phaser on the selection, as the phaser buttons do. */
  applyFx(type: string): void;
}

const isPhaserType = (type: string): type is PhaserType => Object.hasOwn(PHASER_TYPES, type);

function createTestApi(clock: DeskClock, deps: TestHookDeps): DeskTestApi {
  const capture = new CommandCapture();
  const state = (): DeskState => readDeskState(deps);
  return {
    ...clock,
    state,
    serialize: () => jsonClone(deps.serializer.serialize()),
    outputAt: (sec) => {
      if (sec * 1000 > clock.now()) clock.advance(sec * 1000 - clock.now());
      const now = clock.now() / 1000;
      deps.pool.stepFades(now);
      deps.merger.compute(now, deps.autoShow.modulation);
      return deps.stage.rig.fixtures.map((f) => ({ id: f.id, ...f.out }));
    },
    run: (line) => ({ ...capture.capture(line, (raw) => deps.runner.run(raw)), state: state() }),
    applyFx: (type) => {
      if (!isPhaserType(type)) throw new Error(`unknown phaser type: ${type}`);
      deps.programmer.applyPhaser(type);
    },
  };
}

/**
 * Publishes `window.__desk` for the Playwright suite, only when the page runs with `?test` (decision 23, every
 * build). It keeps exactly what the specs read: `setView`, `fixtures`, the stage hooks, `renderMemory` (the
 * renderer's live geometry and texture counts, for the leak check) and `test`. `fixtures` is a
 * getter, so it is always the current rig's. Call it at the end of boot, after the command line has built `#cmdFb`.
 */
export function installTestHook(deps: TestHookDeps): void {
  const clock = readDeskClock();
  if (!clock) return;
  const desk = {
    setView: deps.setView,
    get fixtures(): readonly Fixture[] {
      return deps.stage.rig.fixtures;
    },
    ...createStageHooks(deps.stage),
    renderMemory: () => {
      const { geometries, textures } = deps.renderer.info.memory;
      return { geometries, textures };
    },
    test: createTestApi(clock, deps),
  };
  Object.assign(window, { __desk: desk });
}
