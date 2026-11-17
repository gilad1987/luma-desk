import type { Fixture } from '../../../domain/Fixture';
import { BAND_PTS, RING, SCREEN, STAGE } from '../../../domain/venue';
import { padScale } from './padScale';

/** A pixel point on the pad: the last aim, drawn as a red crosshair. */
export type PadPoint = readonly [px: number, py: number];

/** Arc end angle that closes a circle (the original used 7, a little over 2π). */
const FULL_TURN = 7;
/** Audience seat columns (x) and rows (z) drawn as grey dots beside the band points. */
const SEAT_X = [-21.6, -19.5, -17.4, -15.3, -13.3, 13.3, 15.3, 17.4, 19.5, 21.6];
const SEAT_Z = [-8.7, -11.6, -14.6];
const MARKS: readonly (readonly [number, number])[] = [
  ...BAND_PTS.map(([x, z]) => [x, z] as const),
  ...SEAT_X.flatMap((x) => SEAT_Z.map((z) => [x, z] as const)),
];

/** Paints the stage map: stage, screen, ring, band and seat marks, the selected fixtures and the aim crosshair. */
export function drawFocusMap(c: HTMLCanvasElement, selected: readonly Fixture[], pt?: PadPoint): void {
  const x = c.getContext('2d');
  if (!x) throw new Error('focus pad: no 2D canvas context');
  const s = padScale(c);
  x.fillStyle = '#050506';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#16161a';
  x.fillRect(s.x(STAGE.x0), s.z(STAGE.z0), s.x(STAGE.x1) - s.x(STAGE.x0), s.z(STAGE.z1) - s.z(STAGE.z0));
  x.fillStyle = '#1f2a44';
  x.fillRect(s.x(SCREEN.x0), s.z(SCREEN.z) - 2, s.x(SCREEN.x1) - s.x(SCREEN.x0), 3);
  x.strokeStyle = '#3a3a44';
  x.beginPath();
  x.ellipse(s.x(RING.x), s.z(RING.z), (RING.R / 50) * c.width, (RING.R / 28) * c.height, 0, 0, FULL_TURN);
  x.stroke();
  x.fillStyle = '#555';
  for (const [px, pz] of MARKS) {
    x.beginPath();
    x.arc(s.x(px), s.z(pz), 3, 0, FULL_TURN);
    x.fill();
  }
  x.fillStyle = '#ffc21a88';
  for (const f of selected) x.fillRect(s.x(f.pos.x) - 1, s.z(f.pos.z) - 1, 2, 2);
  x.fillStyle = '#888';
  x.font = '9px Inter';
  x.fillText('UPSTAGE', 4, 10);
  x.fillText('AUDIENCE ↓', 4, c.height - 4);
  if (!pt) return;
  x.strokeStyle = '#ff4040';
  x.beginPath();
  x.arc(pt[0], pt[1], 6, 0, FULL_TURN);
  x.moveTo(pt[0] - 10, pt[1]);
  x.lineTo(pt[0] + 10, pt[1]);
  x.moveTo(pt[0], pt[1] - 10);
  x.lineTo(pt[0], pt[1] + 10);
  x.stroke();
}
