import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { saveRendererState } from '../../../../src/render/still/rendererState';
import { StillController } from '../../../../src/render/still/StillController';
import { changeEverything, FakeRenderer, snapshot } from './fakeRenderer';
import { FakeFrames } from './fakeFrames';
import { FakeStillWork, runAll } from './fakeStillWork';

/** A fake work whose every sample changes all the renderer and camera state, as a real step may. */
class MessyWork extends FakeStillWork {
  private readonly mess: () => void;
  constructor(frames: FakeFrames, mess: () => void) {
    super(2, 3, frames);
    this.mess = mess;
  }
  override renderSample(tile: number, sample: number): boolean {
    this.mess();
    return super.renderSample(tile, sample);
  }
}

function setupMessy() {
  const frames = new FakeFrames();
  const renderer = new FakeRenderer();
  const camera = new PerspectiveCamera(40, 4 / 3, 0.1, 100);
  camera.position.set(0, 1, 5);
  const work = new MessyWork(frames, () => changeEverything(renderer, camera));
  const saveState = (): (() => void) => saveRendererState(renderer, camera);
  const { schedule, unschedule, now } = frames;
  const controller = new StillController({ work, saveState, schedule, unschedule, now, budgetMs: 3 });
  return { frames, work, controller, before: snapshot(renderer, camera), after: () => snapshot(renderer, camera) };
}

describe('saveRendererState under a still controller', () => {
  it('gives back the state after a full run', async () => {
    const { frames, controller, before, after } = setupMessy();
    const result = controller.start();
    await runAll(frames);
    expect((await result).state).toBe('done');
    expect(after()).toEqual(before);
  });

  it('gives back the state after a cancel between frames', async () => {
    const { frames, controller, before, after } = setupMessy();
    const result = controller.start();
    frames.runFrame();
    controller.cancel();
    expect((await result).state).toBe('cancelled');
    expect(after()).toEqual(before);
  });

  it('gives back the state after a failed step', async () => {
    const { frames, work, controller, before, after } = setupMessy();
    work.failAt = 'sample 0.1';
    const result = controller.start();
    await runAll(frames);
    expect((await result).state).toBe('failed');
    expect(after()).toEqual(before);
  });
});
