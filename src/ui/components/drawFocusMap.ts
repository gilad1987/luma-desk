import type { Fixture } from '../../domain/Fixture';
import { onDeck } from '../../domain/stage/deckFit';
import type { StageFrame } from '../../domain/stage/StageFrame';
import { padScale, type PadScale } from './padScale';

/** A pixel point on the pad: the last aim, drawn as a red crosshair. */
export type PadPoint = readonly [px: number, py: number];

/** The parts of the current stage the map draws: deck, first LED wall, ring truss, band marks and the deck fit. */
export type FocusMapFrame = Pick<StageFrame, 'deck' | 'screen' | 'ring' | 'bandPoints' | 'fit'>;

/** Arc end angle that closes a circle (the original used 7, a little over 2π). */
const FULL_TURN = 7;
/** Audience seat columns (x) and rows (z) of the built-in deck, drawn as grey dots beside the band points. */
const SEAT_X = [-21.6, -19.5, -17.4, -15.3, -13.3, 13.3, 15.3, 17.4, 19.5, 21.6];
const SEAT_Z = [-8.7, -11.6, -14.6];
const SEATS = SEAT_X.flatMap((x) => SEAT_Z.map((z) => [x, z] as const));

/**
 * The grey marks: the band points, then the seats, which belong with the band, so they hide with it and move with
 * the deck fit like the band points do. The built-in frame gives the legacy marks in the legacy order.
 */
function marksOf(frame: FocusMapFrame): (readonly [number, number])[] {
  if (frame.bandPoints.length === 0) return [];
  return [...frame.bandPoints.map(([x, z]) => [x, z] as const), ...SEATS.map(([x, z]) => onDeck(frame.fit, x, z))];
}

/**
 * Paints the stage of `frame`: deck, LED wall, ring and marks. A stage without a wall or a ring draws none, so the
 * map shows only what the current stage has; the built-in frame paints the legacy map call for call.
 */
function drawStage(x: CanvasRenderingContext2D, s: PadScale, frame: FocusMapFrame, c: HTMLCanvasElement): void {
  const { deck, screen, ring } = frame;
  x.fillStyle = '#16161a';
  x.fillRect(s.x(deck.x0), s.z(deck.z0), s.x(deck.x1) - s.x(deck.x0), s.z(deck.z1) - s.z(deck.z0));
  if (screen) {
    x.fillStyle = '#1f2a44';
    x.fillRect(s.x(screen.x0), s.z(screen.z) - 2, s.x(screen.x1) - s.x(screen.x0), 3);
  }
  if (ring) {
    x.strokeStyle = '#3a3a44';
    x.beginPath();
    x.ellipse(s.x(ring.x), s.z(ring.z), (ring.R / 50) * c.width, (ring.R / 28) * c.height, 0, 0, FULL_TURN);
    x.stroke();
  }
  x.fillStyle = '#555';
  for (const [px, pz] of marksOf(frame)) {
    x.beginPath();
    x.arc(s.x(px), s.z(pz), 3, 0, FULL_TURN);
    x.fill();
  }
}

/** Paints the stage map of `frame`, the selected fixtures and the aim crosshair. */
export function drawFocusMap(
  c: HTMLCanvasElement,
  frame: FocusMapFrame,
  selected: readonly Fixture[],
  pt?: PadPoint,
): void {
  const x = c.getContext('2d');
  if (!x) throw new Error('focus pad: no 2D canvas context');
  const s = padScale(c);
  x.fillStyle = '#050506';
  x.fillRect(0, 0, c.width, c.height);
  drawStage(x, s, frame, c);
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
