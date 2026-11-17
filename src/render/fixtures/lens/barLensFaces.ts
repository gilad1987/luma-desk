import type { CanvasPainter } from '../../shared';

/** Lens faces of the wide units, white on black: WTF! on 256 x 128, Tetra2 on 256 x 32. */
export const BAR_LENS_FACES = {
  // Robe WTF!: two panels of tiny white strobe cups, with the warm amber blinder strip across the middle
  wtf: (x) => {
    x.fillStyle = 'rgba(255,255,255,.92)';
    for (const [y0, y1] of [
      [6, 52],
      [76, 122],
    ] as const)
      for (let y = y0 + 3; y < y1; y += 5.5)
        for (let i = 0, cx = 5; cx < 252; cx += 5.5, i++) {
          x.beginPath();
          x.arc(cx + (Math.round(y) % 2 ? 2.7 : 0), y, 2.1, 0, 7);
          x.fill();
        }
    x.fillStyle = '#ffae3c';
    x.fillRect(8, 59, 240, 10);
    x.fillStyle = '#ffe2a8';
    for (let cx = 10; cx < 246; cx += 4) x.fillRect(cx, 61, 2, 6);
  },
  // Robe Tetra2: 18 rounded cells in one row, in two groups of 9
  tetra2: (x) => {
    for (let i = 0; i < 18; i++) {
      const cx = 10.5 + i * 13.3 + (i >= 9 ? 3 : 0),
        g = x.createRadialGradient(cx, 14, 0, cx, 16, 12);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.6, 'rgba(255,255,255,.85)');
      g.addColorStop(1, 'rgba(255,255,255,.35)');
      x.fillStyle = g;
      x.beginPath();
      if (typeof x.roundRect === 'function') x.roundRect(cx - 5.6, 4, 11.2, 24, 4);
      else x.rect(cx - 5.6, 4, 11.2, 24);
      x.fill();
    }
  },
} as const satisfies Record<string, CanvasPainter>;
