import type { Camera, Scene } from 'three';
import { LIVE_LAYOUT, type AtlasLayout } from './atlasLayout';

export interface ShadowConfig {
  readonly layout: AtlasLayout;
  /** The most tiles drawn in one frame, and the most of them that are secondary tiles. */
  readonly maxDraws: number;
  readonly maxSecondary: number;
  /** After this many ms of one update no further tile is started; the first tile is always drawn. */
  readonly maxMs: number;
  /** Metres a sample is moved toward the light before the compare. */
  readonly bias: number;
  readonly maxLights: number;
  /** The most cones tested for casters in one frame (five rays each). */
  readonly maxTests: number;
  /** Frames a light past the hero tiles must keep its row before it gets a tile (see `LightPicker`). */
  readonly restFrames: number;
  /** A light whose row changed twice within `moveWindow` frames must keep its row `movingRestFrames` frames. */
  readonly moveWindow: number;
  readonly movingRestFrames: number;
}

export const SHADOW_DEFAULTS: ShadowConfig = {
  layout: LIVE_LAYOUT,
  maxDraws: 12,
  maxSecondary: 4,
  maxMs: 4,
  bias: 0.03,
  maxLights: 1024,
  maxTests: 64,
  restFrames: 2,
  // an 8-bit pan steps about once in 40 frames: two steps are inside the window, and one rest is shorter than a step
  moveWindow: 90,
  movingRestFrames: 15,
};

/** What a caller may set on a `ShadowAtlas`; `now` is the clock of the time cap, in ms. */
export interface ShadowOptions {
  readonly config?: ShadowConfig;
  readonly now?: () => number;
}

/** The casters as the atlas uses them (`CasterScene`); narrow so a test can pass a plain scene. */
export interface ShadowCasters {
  readonly scene: Scene;
  /** The uniform of the depth material that scales view depth to the atlas depth; set per tile. */
  readonly invRange: { value: number };
  /** Raised whenever the casters a light sees may have changed; never 0. */
  readonly epoch: number;
  sync(): void;
  /** Called before each tile draw with the tile camera: shows only the casters that tile can see. */
  cull(camera: Camera): void;
}
