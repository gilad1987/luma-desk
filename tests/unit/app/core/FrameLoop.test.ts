import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FpsClockReadout } from '../../../../src/app/loop/FpsClockReadout';
import { FrameLoop } from '../../../../src/app/loop/FrameLoop';
import { defaultAutoSettings } from '../../../../src/autoshow/AutoSettings';
import { Tempo } from '../../../../src/engine/Tempo';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { FakeDom } from '../../../shared/dom';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A loop over recording fakes, a captured requestAnimationFrame queue and a frozen performance.now() of 1000. */
function recordedLoop() {
  const trace: string[] = [];
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (trace.push('raf'), frames.push(cb)));
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  const crowd = { uBeat: { value: 0 }, uJump: { value: 0 } };
  const dts: number[] = [];
  const step = (name: string) => () => void trace.push(name);
  const loop = new FrameLoop({
    venue: { crowd, performers: [] },
    tempo: new Tempo(),
    songPlayer: { sync: step('songPlayer.sync'), audioGraph: null },
    autoShow: { settings: defaultAutoSettings(), modulation: { pump: 1, hitUntil: 0 }, tick: step('autoShow.tick') },
    pool: { stepFades: step('pool.stepFades') },
    merger: { compute: step('merger.compute') },
    visualSync: { update: (_now, dt) => void (trace.push('visualSync.update'), dts.push(dt)) },
    camera: { position: new Vector3() },
    props: { update: step('props.update') },
    sceneLights: { update: step('sceneLights.update') },
    keyLights: { update: step('keyLights.update') },
    lightFrame: new LightFrame(),
    stageRenderer: { renderFrame: step('stageRenderer.renderFrame') },
    fps: { frame: step('fps.frame') },
    ui: { tick: step('ui.tick') },
  });
  return { loop, trace, frames, crowd, dts };
}

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
});

describe('FpsClockReadout', () => {
  it('prints the average frame rate since the last print, then the wall-clock time', () => {
    const dom = new FakeDom();
    const fps = dom.add('fps');
    const clock = dom.add('clock');
    const readout = new FpsClockReadout();
    for (let i = 0; i < 4; i++) readout.frame(0.02);
    readout.slow();
    expect(fps.textContent).toBe('50 fps');
    expect(clock.textContent).toMatch(/^\d\d:\d\d:\d\d$/);
    readout.frame(0.1);
    readout.slow();
    expect(fps.textContent).toBe('10 fps');
  });
});
