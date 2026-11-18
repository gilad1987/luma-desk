import { Group, Mesh, Vector3 } from 'three';
import { vi } from 'vitest';
import { FrameLoop } from '../../../../src/app/loop/FrameLoop';
import { defaultAutoSettings } from '../../../../src/autoshow/AutoSettings';
import type { SceneryPart } from '../../../../src/domain/stage/types';
import { Tempo } from '../../../../src/engine/Tempo';
import { LightFrame } from '../../../../src/render/lights/LightFrame';

/** A band member at rest height 5 that has not moved yet (its body still at y 0). */
const performer = () => ({ body: new Group(), head: new Mesh(), baseY: 5, facing: 0, phase: 0, bounce: 0, sway: 0 });

/**
 * A loop over recording fakes, a captured requestAnimationFrame queue and a frozen performance.now() of 1000. The
 * `hidden` scenery parts report hidden, so a test sees which per-frame work the loop skips.
 */
export function recordedLoop(hidden: ReadonlySet<SceneryPart> = new Set()) {
  const trace: string[] = [];
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => (trace.push('raf'), frames.push(cb)));
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  const crowd = { uBeat: { value: 0 }, uJump: { value: 0 } };
  const performers = [performer()];
  const dts: number[] = [];
  const step = (name: string) => () => void trace.push(name);
  const loop = new FrameLoop({
    venue: { crowd, performers, scenery: { isVisible: (part) => !hidden.has(part) } },
    tempo: new Tempo(),
    songPlayer: { sync: step('songPlayer.sync'), audioGraph: null },
    autoShow: { settings: defaultAutoSettings(), modulation: { pump: 1, hitUntil: 0 }, tick: step('autoShow.tick') },
    pool: { stepFades: step('pool.stepFades') },
    merger: { compute: step('merger.compute') },
    visualSync: {
      update: (_now, dt) => {
        trace.push('visualSync.update');
        dts.push(dt);
      },
    },
    camera: { position: new Vector3() },
    props: { update: step('props.update') },
    sceneLights: { update: step('sceneLights.update') },
    keyLights: { update: step('keyLights.update') },
    lightFrame: new LightFrame(),
    stageRenderer: { renderFrame: step('stageRenderer.renderFrame') },
    fps: { frame: step('fps.frame') },
    ui: { tick: step('ui.tick') },
  });
  return { loop, trace, frames, crowd, dts, performers };
}
