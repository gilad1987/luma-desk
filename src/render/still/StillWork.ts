/** The phases of one still render, in order; the last three end it. */
export type StillState =
  'idle' | 'preparing' | 'rendering' | 'resolving' | 'encoding' | 'done' | 'cancelled' | 'failed';

/** How one still render ended. */
export type StillResult<O> =
  | { readonly state: 'done'; readonly output: O }
  | { readonly state: 'cancelled' }
  | { readonly state: 'failed'; readonly reason: string };

/** What the controller reports after every frame it worked in. */
export interface StillProgress {
  readonly state: StillState;
  /** 0 at the start, 1 when the image is done. An adaptive tile that stops early counts as complete. */
  readonly fraction: number;
  /** The tile and the sample within it that come next (0-based). */
  readonly tile: number;
  readonly tiles: number;
  readonly sample: number;
  /** The estimated time left in ms, from the measured time per sample; null before the first sample. */
  readonly etaMs: number | null;
}

/**
 * The GPU side of a still render, cut into small synchronous steps that the controller runs under a frame budget.
 * Every step may change renderer state freely: the controller saves it before and restores it after each frame.
 */
export interface StillWork<O> {
  readonly tiles: number;
  /** The most samples one tile takes. */
  readonly maxSamples: number;
  /**
   * Polled before every step, without blocking: false while the GPU still works on the last sample, which ends the
   * frame and tries the step again in the next one. Throws to fail the render (a failed GPU wait).
   */
  ready(): boolean;
  /** Creates the targets and freezes the look (`StillSource.beginFrame`). */
  prepare(): void;
  /** Draws and accumulates sample `sample` of tile `tile`; true when the tile has converged early. */
  renderSample(tile: number, sample: number): boolean;
  /** Writes the mean of the tile's `samples` samples into the full-size HDR image. */
  finishTile(tile: number, samples: number): void;
  /** Runs the post chain once over the whole HDR image. */
  resolve(): void;
  /** Reads back one strip of the final image; true when every strip is read. */
  readStrip(): boolean;
  /** Encodes the read image; runs off the frame budget (the browser encodes asynchronously). */
  encode(): Promise<O>;
  /** Frees every target; safe to call in any phase and more than once. */
  dispose(): void;
}

/** What a `StillController` runs and how it schedules frames; the defaults are the browser's. */
export interface StillControllerDeps<O> {
  readonly work: StillWork<O>;
  /** Saves the renderer and camera state and returns its restore (see `saveRendererState`). */
  readonly saveState: () => () => void;
  readonly schedule?: (step: () => void) => number;
  readonly unschedule?: (id: number) => void;
  readonly now?: () => number;
  readonly budgetMs?: number;
  readonly onProgress?: (progress: StillProgress) => void;
}
