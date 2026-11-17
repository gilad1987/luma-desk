import { quadInverse, type Point, type Quad } from './quadInverse';

/** The part of a pointer or mouse event a box map reads. */
type ClientPoint = Pick<MouseEvent, 'clientX' | 'clientY'>;

/** Pointer position to 0..1 box coordinates, plus the box size in client pixels for relative drags. */
export type BoxMap = ((ev: ClientPoint) => Point) & { readonly w: number; readonly h: number };

/** The corners of a box in its own units, clockwise from the top left, as fractions of width and height. */
const CORNERS: readonly [Point, Point, Point, Point] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** A zero-size probe at (x, y) in the host's coordinates; its client rect is where the browser projects that point. */
function probe(host: Element, x: number, y: number): HTMLElement {
  const i = document.createElement('i');
  i.style.cssText = `position:absolute;display:block;left:${x}px;top:${y}px;width:0;height:0;margin:0;padding:0;border:0;transform:none`;
  host.appendChild(i);
  return i;
}

/** The rectangle mapping, for a box the probes cannot resolve (zero size or a collapsed projection). */
function rectMap(element: HTMLElement): BoxMap {
  const r = element.getBoundingClientRect();
  const map = (ev: ClientPoint): Point => [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height];
  return Object.assign(map, { w: r.width, h: r.height });
}

/**
 * Pointer to position in the element's own untransformed border box (0..1), correct under the MA console's CSS 3D
 * perspective and zoom: zero-size probes at the four corners give the projected quad, and the inverse of the
 * square-to-quad homography maps the pointer back. Build it once per gesture, so a drag never forces layout per
 * move. A canvas cannot hold the probes, so they go into its offset parent at the canvas offset.
 */
export function boxMap(element: HTMLElement): BoxMap {
  const own = !(element instanceof HTMLCanvasElement),
    host = own ? element : element.offsetParent,
    w = element.offsetWidth,
    h = element.offsetHeight;
  if (!host) throw new Error('boxMap: the canvas has no offset parent to hold the probes');
  const ox = own ? -element.clientLeft : element.offsetLeft,
    oy = own ? -element.clientTop : element.offsetTop;
  const at = ([u, v]: Point): HTMLElement => probe(host, ox + u * w, oy + v * h);
  const probes = [at(CORNERS[0]), at(CORNERS[1]), at(CORNERS[2]), at(CORNERS[3])] as const;
  const corner = (i: HTMLElement): Point => {
    const r = i.getBoundingClientRect();
    return [r.left, r.top];
  };
  const quad: Quad = [corner(probes[0]), corner(probes[1]), corner(probes[2]), corner(probes[3])];
  probes.forEach((i) => i.remove());
  const inverse = quadInverse(quad);
  if (!inverse) return rectMap(element);
  const z = element.currentCSSZoom || 1;
  const map = (ev: ClientPoint): Point => inverse(ev.clientX, ev.clientY);
  return Object.assign(map, { w: w * z, h: h * z });
}
