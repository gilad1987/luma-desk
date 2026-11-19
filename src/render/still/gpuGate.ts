import type { WebGLRenderer } from 'three';

/** The WebGL2 calls the gate uses; a real `WebGL2RenderingContext` fits. */
export type FenceGl = Pick<
  WebGL2RenderingContext,
  | 'fenceSync'
  | 'clientWaitSync'
  | 'deleteSync'
  | 'isContextLost'
  | 'SYNC_GPU_COMMANDS_COMPLETE'
  | 'TIMEOUT_EXPIRED'
  | 'WAIT_FAILED'
>;

/**
 * Tells, without blocking, whether the GPU finished the last sample. WebGL calls only queue work: without a wait a
 * frame budget counts submission time and queues hundreds of samples into one frame of the live view. A 1-pixel
 * read would wait too, but it drains the whole pipeline, and in half-float mode its read type may be illegal (a GL
 * error, no wait). A fence costs nothing; WebGL updates its status only between tasks, so a poll in the frame that
 * set it reports a timeout and the next sample waits for a later frame.
 * The gate also fails the render when the context is lost (most often out of GPU memory): the targets are gone, so
 * the render could only end black. It listens on the canvas from its creation in `prepare` to `dispose`.
 */
export class GpuGate {
  private fence: WebGLSync | null = null;
  private lost = false;
  private readonly gl: FenceGl;
  private readonly canvas: EventTarget;
  private readonly onLost = (): void => void (this.lost = true);

  constructor(gl: FenceGl, canvas: EventTarget) {
    this.gl = gl;
    this.canvas = canvas;
    canvas.addEventListener('webglcontextlost', this.onLost);
  }

  /** Marks the end of the work queued so far (replacing an older mark). */
  mark(): void {
    this.clear();
    this.fence = this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  }

  /**
   * True when no mark is pending or the GPU passed it (the mark is then deleted). Throws when the context was lost
   * (the event, or a loss before the gate existed) or the wait failed.
   */
  ready(): boolean {
    if (this.lost || this.gl.isContextLost()) throw new Error('the WebGL context was lost during the still render');
    if (this.fence === null) return true;
    const status = this.gl.clientWaitSync(this.fence, 0, 0);
    if (status === this.gl.TIMEOUT_EXPIRED) return false;
    this.clear();
    if (status === this.gl.WAIT_FAILED) throw new Error('the GPU could not report the end of a sample (WAIT_FAILED)');
    return true;
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.clear();
  }

  private clear(): void {
    if (this.fence !== null) this.gl.deleteSync(this.fence);
    this.fence = null;
  }
}

/** The gate over the renderer's context; a still render needs WebGL2 (its float targets already do). */
export function gpuGateFor(renderer: WebGLRenderer): GpuGate {
  const gl = renderer.getContext();
  if (!('fenceSync' in gl)) throw new Error('a still render needs WebGL2 (fence sync)');
  return new GpuGate(gl, renderer.domElement);
}
