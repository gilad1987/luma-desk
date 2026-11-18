/** Paints the bass drum front head: a red ring around the LUMA name on a cream head (256 px canvas). */
export function paintDrumLogo(x: CanvasRenderingContext2D): void {
  x.fillStyle = '#ece6da';
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#9a0f22';
  x.lineWidth = 10;
  x.beginPath();
  x.arc(128, 128, 100, 0, 7);
  x.stroke();
  x.fillStyle = '#111';
  x.font = 'bold 54px Inter, sans-serif';
  x.textAlign = 'center';
  x.fillText('LUMA', 128, 146);
}
