import type { WebGLRenderer } from 'three';

type RenderInfo = WebGLRenderer['info'];
type RenderCounts = Omit<RenderInfo['render'], 'frame'>;

/** What one drawn frame cost: the renderer's counts summed over every pass of the frame, and GPU memory. */
export interface RenderStats extends RenderCounts {
  programs: number;
  geometries: number;
  textures: number;
}

/** The renderer info fields the stats read; `autoReset` is switched off so the counts span a whole frame. */
export type FrameStatsInfo = Pick<RenderInfo, 'memory' | 'render' | 'programs' | 'autoReset'>;

/** The renderer parts the stats use: its info, and its context to wait for the GPU at the end of a frame. */
export interface FrameStatsRenderer {
  readonly info: FrameStatsInfo;
  getContext(): WebGLRenderingContext | WebGL2RenderingContext;
}

/** How many frame durations are kept: enough for a long measurement, small enough to cost nothing. */
const KEEP = 600;
const MARK = 'desk-frame';

/** Real time in ms. `?test` freezes `performance.now`, but a native mark still reads the real clock. */
function realNow(): number {
  const { startTime } = performance.mark(MARK);
  performance.clearMarks(MARK);
  return startTime;
}

const PIXEL = new Uint8Array(4);

/**
 * Blocks until the GPU drew the frame: a pixel read must return the drawn colour, while Chrome's `finish()` returns
 * at once. It reads only the canvas, whose RGBA8 format always allows the read, so it never raises a GL error.
 */
function waitForGpu(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
  if (gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null) return;
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PIXEL);
}

const countsOf = ({ calls, triangles, points, lines }: RenderCounts): RenderCounts => ({
  calls,
  triangles,
  points,
  lines,
});

/**
 * Times every requestAnimationFrame callback that draws, and keeps the renderer counts of the last one. A callback
 * that draws nothing (a camera tween, a layout refit) is not a frame and is skipped. Only `?test` installs it, so a
 * normal page pays nothing. The counts accumulate (`autoReset` off) because the glow pass renders several times per
 * frame and each render would reset them; a frame's counts are the difference across its callback. The time ends
 * after the GPU finished, so it holds the GPU work too, not only the CPU time to send the draw calls.
 */
export function installFrameStats(renderer: FrameStatsRenderer): {
  renderStats: () => RenderStats;
  frameTimes: (n: number) => number[];
} {
  const { info } = renderer;
  info.autoReset = false;
  const times: number[] = [];
  let last = countsOf({ calls: 0, triangles: 0, points: 0, lines: 0 });
  const request = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) =>
    request((t) => {
      const before = countsOf(info.render);
      const start = realNow();
      callback(t);
      if (info.render.calls === before.calls) return;
      waitForGpu(renderer.getContext());
      times.push(realNow() - start);
      if (times.length > KEEP) times.shift();
      const after = info.render;
      last = {
        calls: after.calls - before.calls,
        triangles: after.triangles - before.triangles,
        points: after.points - before.points,
        lines: after.lines - before.lines,
      };
    });
  return {
    renderStats: () => ({
      ...last,
      programs: info.programs?.length ?? 0,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    }),
    frameTimes: (n) => times.slice(-n),
  };
}
