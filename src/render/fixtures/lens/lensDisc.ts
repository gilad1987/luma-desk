/** A glowing lens cell: bright centre fading to clear at radius `r` (FORTE front lens, ParFect multichip cells). */
export function fillLensDisc(
  x: CanvasRenderingContext2D,
  [cx, cy]: readonly [x: number, y: number],
  r: number,
  inner = '#fff',
): void {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.65, 'rgba(255,255,255,.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, 7);
  x.fill();
}
