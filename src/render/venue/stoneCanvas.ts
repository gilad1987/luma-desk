import type { CanvasPainter } from '../shared';

/**
 * Paints a Jerusalem-stone wall tile (16 courses of 6 blocks, offset every other course) on a 256 px canvas. `lit`
 * picks the warm floodlit palette of the Old City walls; otherwise the darker one of the pool walls and terraces.
 * Uses `Math.random` once per block (96 calls).
 */
export function paintStone(lit: boolean): CanvasPainter {
  return (x) => {
    const g = x.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, lit ? '#e8c48c' : '#6e5d48');
    g.addColorStop(1, lit ? '#7a5a36' : '#3a3026');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++)
      for (let k = 0; k < 6; k++) {
        const ox = (r % 2) * 21,
          v = Math.random() * 0.18;
        x.fillStyle = `rgba(0,0,0,${v})`;
        x.fillRect(k * 43 + ox, r * 16, 41, 14);
      }
    x.strokeStyle = 'rgba(30,20,10,.55)';
    x.lineWidth = 2;
    for (let r = 0; r <= 16; r++) {
      x.beginPath();
      x.moveTo(0, r * 16);
      x.lineTo(256, r * 16);
      x.stroke();
    }
    for (let r = 0; r < 16; r++)
      for (let k = 0; k <= 6; k++) {
        const xx = k * 43 + (r % 2) * 21;
        x.beginPath();
        x.moveTo(xx, r * 16);
        x.lineTo(xx, r * 16 + 16);
        x.stroke();
      }
  };
}
