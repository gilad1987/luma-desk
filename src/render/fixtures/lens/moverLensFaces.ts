import type { CanvasPainter } from '../../shared';
import { fillLensDisc } from './lensDisc';

const traceHex = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number): void => {
  x.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = ((k + 0.5) / 6) * Math.PI * 2;
    x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  x.closePath();
};

/** Lens faces of the Robe moving heads, painted white on black (128 px); the lens material tints them. */
export const MOVER_LENS_FACES = {
  // Robe FORTE: one large 180 mm front lens, with faint rings from the zoom optics behind it
  forte: (x) => {
    fillLensDisc(x, 64, 64, 62);
    x.strokeStyle = 'rgba(0,0,0,.28)';
    x.lineWidth = 2;
    for (const r of [16, 30, 44, 56]) {
      x.beginPath();
      x.arc(64, 64, r, 0, 7);
      x.stroke();
    }
  },
  // Robe MegaPointe: the hot spot of the short-arc lamp in a deep, dark lens
  megapointe: (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.25, '#fff');
    g.addColorStop(0.3, 'rgba(255,255,255,.35)');
    g.addColorStop(1, 'rgba(255,255,255,.08)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(64, 64, 63, 0, 7);
    x.fill();
  },
  // Robe Spiider: a centre cell and 18 hexagonal cells in two rings, black ribs between the domed lenses
  spiider: (x) => {
    const d = 25;
    for (let q = -2; q <= 2; q++)
      for (let r = -2; r <= 2; r++) {
        if (Math.abs(q + r) > 2) continue;
        const cx = 64 + d * (q + r / 2),
          cy = 64 + (d * r * Math.sqrt(3)) / 2;
        const g = x.createRadialGradient(cx - 2, cy - 3, 0, cx, cy, 14);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.5, 'rgba(255,255,255,.85)');
        g.addColorStop(1, 'rgba(255,255,255,.3)');
        x.fillStyle = g;
        traceHex(x, cx, cy, 13);
        x.fill();
      }
    x.globalCompositeOperation = 'destination-in';
    x.beginPath();
    x.arc(64, 64, 63, 0, 7);
    x.fill();
  },
} as const satisfies Record<string, CanvasPainter>;
