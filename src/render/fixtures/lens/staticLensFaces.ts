import type { CanvasPainter } from '../../shared';
import { fillLensDisc } from './lensDisc';

/** Lens faces of the round static units, painted white on black (128 px); the lens material tints them. */
export const STATIC_LENS_FACES = {
  // Robe ParFect 150: 7 multichip cells
  parfect: (x) => {
    const pts: [number, number][] = [[0, 0]];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      pts.push([Math.cos(a) * 34, Math.sin(a) * 34]);
    }
    for (const [px, py] of pts) fillLensDisc(x, 64 + px, 64 + py, 16);
  },
  // Chauvet STRIKE 4: one warm cup (the model maps it on each of its 4 cups): faceted reflector behind a wire grid
  strike4: (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.7, 'rgba(255,244,214,.9)');
    g.addColorStop(1, 'rgba(255,226,170,.45)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(64, 64, 62, 0, 7);
    x.fill();
    x.strokeStyle = 'rgba(0,0,0,.2)';
    x.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      x.beginPath();
      x.moveTo(64, 64);
      x.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62);
      x.stroke();
    }
    x.strokeStyle = 'rgba(0,0,0,.6)';
    x.lineWidth = 1.5;
    for (let i = 8; i < 128; i += 10) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 128);
      x.moveTo(0, i);
      x.lineTo(128, i);
      x.stroke();
    }
    x.globalCompositeOperation = 'destination-in';
    x.beginPath();
    x.arc(64, 64, 62, 0, 7);
    x.fill();
  },
  // ETC Source Four: one hard-edged lens
  s4: (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 60);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.85, 'rgba(255,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,.4)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(64, 64, 60, 0, 7);
    x.fill();
  },
} as const satisfies Record<string, CanvasPainter>;
