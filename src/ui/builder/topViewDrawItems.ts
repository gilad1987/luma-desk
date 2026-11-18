import type { StageFixture } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import type { TopScene } from './topViewDraw';
import { trussFootprint } from './topViewShapes';

/** The width of a truss line. */
const TRUSS_LINE_PX = 3;
/** The side of the square drawn for a tower, which is one point from above. */
const TOWER_PX = 8;
/** The side of the square drawn for a fixture. */
const FIXTURE_PX = 6;
/** The arc end angle that closes a ring. */
const FULL_TURN = 2 * Math.PI;

/** Strokes every truss footprint; picked trusses go last, in the selection colour, so they stay on top. */
export function drawTrusses(ctx: CanvasRenderingContext2D, scene: TopScene): void {
  const picked = new Set(scene.selection.trusses);
  const isPicked = (t: StageTruss): boolean => picked.has(t.id);
  ctx.lineWidth = TRUSS_LINE_PX;
  strokeTrusses(
    ctx,
    scene,
    scene.design.trusses.filter((t) => !isPicked(t)),
    scene.palette.truss,
  );
  strokeTrusses(ctx, scene, scene.design.trusses.filter(isPicked), scene.palette.selected);
}

/** Fills a square per fixture; picked fixtures go last, in the selection colour. */
export function drawFixtures(ctx: CanvasRenderingContext2D, { design, selection, view, palette }: TopScene): void {
  const picked = new Set(selection.fixtures);
  const square = (f: StageFixture): void => {
    const [px, py] = view.toCanvas(f.position[0], f.position[2]);
    ctx.fillRect(px - FIXTURE_PX / 2, py - FIXTURE_PX / 2, FIXTURE_PX, FIXTURE_PX);
  };
  ctx.fillStyle = palette.fixture;
  design.fixtures.filter((f) => !picked.has(f.id)).forEach(square);
  ctx.fillStyle = palette.selected;
  design.fixtures.filter((f) => picked.has(f.id)).forEach(square);
}

function strokeTrusses(
  ctx: CanvasRenderingContext2D,
  { view }: TopScene,
  trusses: readonly StageTruss[],
  colour: string,
): void {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  for (const t of trusses) {
    const fp = trussFootprint(t);
    ctx.beginPath();
    if (fp.kind === 'ring') {
      ctx.arc(...view.toCanvas(...fp.centre), fp.radius * view.scale, 0, FULL_TURN);
      ctx.stroke();
      continue;
    }
    const [first, ...rest] = fp.points.map(([x, z]) => view.toCanvas(x, z));
    if (!first) continue;
    if (rest.length === 0) {
      ctx.fillRect(first[0] - TOWER_PX / 2, first[1] - TOWER_PX / 2, TOWER_PX, TOWER_PX);
      continue;
    }
    ctx.moveTo(...first);
    rest.forEach((p) => ctx.lineTo(...p));
    ctx.closePath();
    ctx.stroke();
  }
}
