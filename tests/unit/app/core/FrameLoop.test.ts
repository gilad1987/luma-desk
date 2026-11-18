import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordedLoop } from './FrameLoopSetup';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FrameLoop', () => {
  it('asks for the next frame first, then steps in the legacy order', () => {
    const { loop, trace, frames, crowd } = recordedLoop();
    loop.start();
    expect(trace).toEqual(['raf']);
    frames[0]?.(1016);
    expect(trace.slice(1)).toEqual([
      'raf',
      'songPlayer.sync',
      'autoShow.tick',
      'pool.stepFades',
      'merger.compute',
      'visualSync.update',
      'props.update',
      'sceneLights.update',
      'keyLights.update',
      'stageRenderer.renderFrame',
      'fps.frame',
      'ui.tick',
    ]);
    expect(crowd.uJump.value).toBe(1);
  });

  it('measures dt from boot time and caps it at 0.1 s', () => {
    const { loop, frames, dts } = recordedLoop();
    loop.start();
    frames[0]?.(1016);
    frames[1]?.(9000);
    expect(dts[0]).toBeCloseTo(0.016);
    expect(dts[1]).toBe(0.1);
  });

  it('hands requestAnimationFrame the same callback every frame, so no frame creates one', () => {
    const { loop, frames } = recordedLoop();
    loop.start();
    frames[0]?.(1016);
    frames[1]?.(1032);
    expect(frames).toHaveLength(3);
    expect(frames[1]).toBe(frames[0]);
    expect(frames[2]).toBe(frames[0]);
  });

  it('moves the crowd and the band while they are shown', () => {
    const { loop, frames, crowd, performers } = recordedLoop();
    loop.start();
    frames[0]?.(1016);
    expect(crowd.uJump.value).toBe(1);
    expect(performers[0]?.body.position.y).toBe(5);
  });

  it('skips the per-frame work of a hidden crowd and a hidden band', () => {
    const { loop, frames, crowd, performers } = recordedLoop(new Set(['crowd', 'band']));
    loop.start();
    frames[0]?.(1016);
    expect(crowd.uJump.value).toBe(0);
    expect(performers[0]?.body.position.y).toBe(0);
  });
});
