import { isHiddenWallFixture } from '../../domain/stage/hiddenWall';
import type { BuilderSelection } from './selection';
import type { TopScene } from './topViewDraw';
import { trussFootprint, type TrussFootprint } from './topViewShapes';
import type { TopTransform } from './topViewTransform';

/** The width of a truss line. */
const TRUSS_LINE_PX = 3;
/** The side of the square drawn for a tower, which is one point from above. */
const TOWER_PX = 8;
/** The side of the square drawn for a fixture. */
const FIXTURE_PX = 6;
/** The arc end angle that closes a ring. */
const FULL_TURN = 2 * Math.PI;

/** The picked ids of one selection as sets, so each drawn item tests its membership in constant time. */
interface PickedIds {
  readonly fixtures: ReadonlySet<number>;
  readonly trusses: ReadonlySet<string>;
}

/**
 * The sets per selection object. A drag draws every frame with one selection, so the sets are made once per selection
 * change, not per frame; a selection is never changed in place, so its sets never go stale.
 */
const pickedBySelection = new WeakMap<BuilderSelection, PickedIds>();

/** Strokes every truss footprint; picked trusses go last, in the selection colour, so they stay on top. */
export function drawTrusses(ctx: CanvasRenderingContext2D, scene: TopScene): void {
  ctx.lineWidth = TRUSS_LINE_PX;
  strokeTrusses(ctx, scene, false);
  strokeTrusses(ctx, scene, true);
}

/** Fills a square per fixture; picked fixtures go last, in the selection colour. */
export function drawFixtures(ctx: CanvasRenderingContext2D, scene: TopScene): void {
  ctx.fillStyle = scene.palette.fixture;
  fillFixtures(ctx, scene, false);
  ctx.fillStyle = scene.palette.selected;
  fillFixtures(ctx, scene, true);
}

function pickedIds(selection: BuilderSelection): PickedIds {
  let ids = pickedBySelection.get(selection);
  if (!ids) {
    ids = { fixtures: new Set(selection.fixtures), trusses: new Set(selection.trusses) };
    pickedBySelection.set(selection, ids);
  }
  return ids;
}

/** One pass over the fixtures whose pick state is `picked`, but a hidden wall's, with no array or closure per frame. */
function fillFixtures(ctx: CanvasRenderingContext2D, { design, selection, view }: TopScene, picked: boolean): void {
  const ids = pickedIds(selection).fixtures;
  for (const f of design.fixtures) {
    if (ids.has(f.id) !== picked || isHiddenWallFixture(design, f.id)) continue;
    const [px, py] = view.toCanvas(f.position[0], f.position[2]);
    ctx.fillRect(px - FIXTURE_PX / 2, py - FIXTURE_PX / 2, FIXTURE_PX, FIXTURE_PX);
  }
}

/** One pass over the trusses whose pick state is `picked`, in the truss or the selection colour. */
function strokeTrusses(ctx: CanvasRenderingContext2D, scene: TopScene, picked: boolean): void {
  const { design, selection, view, palette } = scene;
  const ids = pickedIds(selection).trusses;
  const colour = picked ? palette.selected : palette.truss;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  for (const t of design.trusses) {
    if (ids.has(t.id) === picked) strokeFootprint(ctx, view, trussFootprint(t));
  }
}

/** A ring, a tower square or a closed outline; the outline points are read in place, not copied. */
function strokeFootprint(ctx: CanvasRenderingContext2D, view: TopTransform, fp: TrussFootprint): void {
  ctx.beginPath();
  if (fp.kind === 'ring') {
    const [cx, cy] = view.toCanvas(fp.centre[0], fp.centre[1]);
    ctx.arc(cx, cy, fp.radius * view.scale, 0, FULL_TURN);
    ctx.stroke();
    return;
  }
  const { points } = fp;
  const first = points[0];
  if (!first) return;
  const [fx, fy] = view.toCanvas(first[0], first[1]);
  if (points.length === 1) {
    ctx.fillRect(fx - TOWER_PX / 2, fy - TOWER_PX / 2, TOWER_PX, TOWER_PX);
    return;
  }
  ctx.moveTo(fx, fy);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p) ctx.lineTo(...view.toCanvas(p[0], p[1]));
  }
  ctx.closePath();
  ctx.stroke();
}
