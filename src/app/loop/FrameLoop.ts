import type { Vector3 } from 'three';
import type { SongPlayer } from '../../audio/SongPlayer';
import type { AutoShow } from '../../autoshow/AutoShow';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { OutputMerger } from '../../engine/OutputMerger';
import type { Tempo } from '../../engine/Tempo';
import type { FixtureVisualSync, Props } from '../../render/fixtures';
import type { KeyLights } from '../../render/lights/KeyLights';
import type { LightFrame } from '../../render/lights/LightFrame';
import type { SceneLights } from '../../render/lights/SceneLights';
import type { StageRenderer } from '../../render/stage/StageRenderer';
import { animateCrowd } from '../../render/venue/crowdAnimation';
import { animatePerformers } from '../../render/venue/performersAnimation';
import type { Venue } from '../../render/venue/Venue';
import type { FpsClockReadout } from './FpsClockReadout';
import type { UiTickScheduler } from './UiTickScheduler';

/** The longest step a frame simulates, in seconds: a frame after a stalled tab does not jump the fades. */
const MAX_DT = 0.1;

/** What one frame steps and draws; names follow the legacy main.ts variables. */
export interface FrameLoopDeps {
  readonly venue: Pick<Venue, 'crowd' | 'performers'>;
  readonly tempo: Tempo;
  readonly songPlayer: Pick<SongPlayer, 'sync' | 'audioGraph'>;
  readonly autoShow: Pick<AutoShow, 'settings' | 'modulation' | 'tick'>;
  readonly pool: Pick<ExecutorPool, 'stepFades'>;
  readonly merger: Pick<OutputMerger, 'compute'>;
  readonly visualSync: Pick<FixtureVisualSync, 'update'>;
  readonly camera: { readonly position: Vector3 };
  readonly props: Pick<Props, 'update'>;
  readonly sceneLights: Pick<SceneLights, 'update'>;
  readonly keyLights: Pick<KeyLights, 'update'>;
  readonly lightFrame: LightFrame;
  readonly stageRenderer: Pick<StageRenderer, 'renderFrame'>;
  readonly fps: Pick<FpsClockReadout, 'frame'>;
  readonly ui: Pick<UiTickScheduler, 'tick'>;
}

/**
 * The requestAnimationFrame loop: simulation, render, then the throttled UI. The step order is the legacy one and
 * is parity: the merger reads the fades just stepped, the visuals read the merged output, the lights read the light
 * frame the visuals just filled.
 */
export class FrameLoop {
  readonly #deps: FrameLoopDeps;
  /** Stamp of the previous frame; it starts when the loop is built, as the legacy `last` did. */
  #last = performance.now();

  constructor(deps: FrameLoopDeps) {
    this.#deps = deps;
  }

  /** Asks for the first frame; call it once, at the end of boot. */
  start(): void {
    requestAnimationFrame((t) => this.#frame(t));
  }

  #frame(t: number): void {
    // first, so an exception later in the frame does not stop the loop
    requestAnimationFrame((next) => this.#frame(next));
    const d = this.#deps;
    const dt = Math.min((t - this.#last) / 1000, MAX_DT);
    this.#last = t;
    const now = t / 1000;
    const isAudioPulse = d.autoShow.settings.pulse === 'audio' && d.songPlayer.audioGraph;
    animateCrowd(d.venue.crowd, now, d.tempo, isAudioPulse ? 0.3 + d.autoShow.modulation.pump : 1);
    d.songPlayer.sync(d.tempo);
    d.autoShow.tick(now);
    d.pool.stepFades(now);
    d.merger.compute(now, d.autoShow.modulation);
    d.visualSync.update(now, dt, d.camera.position);
    d.props.update(now);
    d.sceneLights.update(d.lightFrame);
    d.keyLights.update(d.lightFrame);
    animatePerformers(d.venue.performers, now, d.tempo);
    d.stageRenderer.renderFrame();
    d.fps.frame(dt);
    d.ui.tick(t, now);
  }
}
