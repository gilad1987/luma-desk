import type { CanvasPainter } from '../../shared';

/** Centre and usable radius of the 128 px face; the outer lenses stop short of the disc edge, as the native faces. */
const CENTRE = 64;
const EDGE = 62;

/** Share of the free room round a cell its lens takes, so a thin black rib stays between neighbours. */
const FILL = 0.46;

/** One domed round lens: bright, slightly high highlight fading to a dim rim. */
function domedLens(x: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const g = x.createRadialGradient(cx - r * 0.15, cy - r * 0.2, 0, cx, cy, r);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.5, 'rgba(255,255,255,.85)');
  g.addColorStop(1, 'rgba(255,255,255,.3)');
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, 7);
  x.fill();
}

/**
 * A multi-cell lens face, white on black like `MOVER_LENS_FACES` (128 px): one domed round lens per cell, ring by ring
 * from the centre, `counts[i]` cells on ring i, the first cell of each ring at the top. A count of 1 first is the
 * centre cell; the rings sit one pitch apart, and the outer ring's lenses reach the disc edge.
 */
export function concentricCells(counts: readonly number[]): CanvasPainter {
  const first = counts[0] === 1 ? 0 : 1;
  const pitch = EDGE / (counts.length - 1 + first + 0.5);
  return (x) => {
    counts.forEach((n, i) => {
      const ring = (i + first) * pitch;
      const room = n === 1 ? pitch : Math.min(pitch, 2 * ring * Math.sin(Math.PI / n));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 - Math.PI / 2;
        domedLens(x, CENTRE + Math.cos(a) * ring, CENTRE + Math.sin(a) * ring, room * FILL);
      }
    });
  };
}
