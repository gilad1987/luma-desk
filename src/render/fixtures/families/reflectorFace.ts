import type { YokedCanBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { CanvasPainter } from '../../shared';

const C = 64;
const R = 63;
/** Facet rings and radial facets of the parabolic reflector, in pixels of the 128 px face. */
const FACET_RINGS = [22, 33, 44, 54];
const FACETS = 24;
/** Radius of the glowing centre in pixels: the onePATT half-ball dome, or a PATT 2013 tungsten bulb. */
const CENTRE_R = { dome: 18, lamp: 11 } as const satisfies Record<YokedCanBody['centre'], number>;

type Point = readonly [x: number, y: number];

const line = (x: CanvasRenderingContext2D, [x0, y0]: Point, [x1, y1]: Point): void => {
  x.beginPath();
  x.moveTo(x0, y0);
  x.lineTo(x1, y1);
  x.stroke();
};

/** The point at `r` pixels from the centre at angle `a`. */
const polar = (r: number, a: number): Point => [C + Math.cos(a) * r, C + Math.sin(a) * r];

const disc = (x: CanvasRenderingContext2D, r: number): void => {
  x.beginPath();
  x.arc(C, C, r, 0, 7);
  x.fill();
};

/** The reflector glow, brightest round the centre, cut into facet rings and radial facets. */
function paintReflector(x: CanvasRenderingContext2D): void {
  const g = x.createRadialGradient(C, C, 0, C, C, R);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.4, 'rgba(255,255,255,.7)');
  g.addColorStop(1, 'rgba(255,255,255,.35)');
  x.fillStyle = g;
  disc(x, R);
  x.strokeStyle = 'rgba(0,0,0,.2)';
  x.lineWidth = 1.5;
  for (const r of FACET_RINGS) {
    x.beginPath();
    x.arc(C, C, r, 0, 7);
    x.stroke();
  }
  for (let k = 0; k < FACETS; k++) {
    const a = (k / FACETS) * Math.PI * 2;
    line(x, polar(20, a), polar(R, a));
  }
}

/** The hot centre: a soft white half-ball, or a small bright bulb with its filament. */
function paintCentre(x: CanvasRenderingContext2D, centre: YokedCanBody['centre']): void {
  const r = CENTRE_R[centre];
  const g = x.createRadialGradient(C - r / 4, C - r / 4, 0, C, C, r);
  g.addColorStop(0, '#fff');
  g.addColorStop(centre === 'dome' ? 0.75 : 0.45, '#fff');
  g.addColorStop(1, 'rgba(255,255,255,.6)');
  x.fillStyle = g;
  disc(x, r);
  if (centre === 'lamp') {
    x.strokeStyle = 'rgba(0,0,0,.35)';
    x.lineWidth = 1;
    line(x, [C - r / 2, C], [C + r / 2, C]);
  }
}

/** The grille in front: a diagonal mesh of `cells` across the face, and 3 spokes meeting at a hub. */
function paintGrille(x: CanvasRenderingContext2D, cells: number): void {
  const step = (2 * C) / cells;
  x.strokeStyle = 'rgba(0,0,0,.45)';
  x.lineWidth = cells > 20 ? 0.6 : 1.2;
  for (let i = -2 * C; i <= 2 * C; i += step) {
    line(x, [i, 0], [i + 2 * C, 2 * C]);
    line(x, [i, 2 * C], [i + 2 * C, 0]);
  }
  x.strokeStyle = 'rgba(0,0,0,.5)';
  x.lineWidth = 4;
  for (let k = 0; k < 3; k++) line(x, [C, C], polar(R, (k / 3) * Math.PI * 2 - Math.PI / 2));
}

/** The face of a yoked-can product, white on black (128 px); the lens material tints it with the fixture colour. */
export function reflectorFace({ centre, grille }: YokedCanBody): CanvasPainter {
  return (x) => {
    paintReflector(x);
    paintCentre(x, centre);
    paintGrille(x, grille);
    x.globalCompositeOperation = 'destination-in';
    x.fillStyle = '#fff';
    disc(x, R);
  };
}
