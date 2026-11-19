import type { CanvasPainter } from '../../shared';

/** Texture pixels per cell along the bar and across it, so a cell paints about square on its flat lens. */
export const CELL_PX = 32;

/**
 * One row of `count` rounded square cells, white on black (the fixture colour tints it), each `fill` of its pitch
 * wide, with the faceted lens of each cell drawn as a darker diamond seam. For a `count * CELL_PX` x `CELL_PX` face.
 */
export function cellRow(count: number, fill: number): CanvasPainter {
  return (x, w, h) => {
    const pitch = w / count,
      side = pitch * fill,
      tall = h * 0.94;
    for (let i = 0; i < count; i++) {
      const cx = (i + 0.5) * pitch,
        cy = h / 2,
        g = x.createRadialGradient(cx, cy, 0, cx, cy, side * 0.7);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.55, 'rgba(255,255,255,.85)');
      g.addColorStop(1, 'rgba(255,255,255,.35)');
      x.fillStyle = g;
      x.beginPath();
      if (typeof x.roundRect === 'function') x.roundRect(cx - side / 2, cy - tall / 2, side, tall, side * 0.18);
      else x.rect(cx - side / 2, cy - tall / 2, side, tall);
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,.3)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx, cy - tall * 0.4);
      x.lineTo(cx + side * 0.4, cy);
      x.lineTo(cx, cy + tall * 0.4);
      x.lineTo(cx - side * 0.4, cy);
      x.closePath();
      x.stroke();
    }
  };
}
