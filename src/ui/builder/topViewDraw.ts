import type { StageDesign } from '../../domain/stage/StageDesign';
import type { BuilderSelection } from './selection';
import { drawFixtures, drawTrusses } from './topViewDrawItems';
import type { TopViewPalette } from './topViewPalette';
import type { CanvasSize, Point2, TopTransform } from './topViewTransform';

/** Everything one draw of the top view reads; the view builds it per frame, the draw keeps no state. */
export interface TopScene {
  readonly design: StageDesign;
  readonly selection: BuilderSelection;
  readonly view: TopTransform;
  readonly palette: TopViewPalette;
  readonly size: CanvasSize;
}

/** The drawn grid step: the 0.5 m drag snap, so the user sees where an item lands. */
const GRID_M = 0.5;
/** The thickness of an LED wall or side screen line. */
const SCREEN_LINE_PX = 3;

/** Paints the design from above: grid, deck, risers, LED walls, trusses and fixtures, the selection highlighted. */
export function drawTopView(ctx: CanvasRenderingContext2D, scene: TopScene): void {
  const { size, palette } = scene;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, size.width, size.height);
  drawGrid(ctx, scene);
  drawDeck(ctx, scene);
  drawScreens(ctx, scene);
  drawTrusses(ctx, scene);
  drawFixtures(ctx, scene);
}

/** Grid lines over the whole canvas, by index, so the lines do not drift from adding 0.5 many times. */
function drawGrid(ctx: CanvasRenderingContext2D, { view, size, palette }: TopScene): void {
  const [x0, z0] = view.toWorld(0, 0);
  const [x1, z1] = view.toWorld(size.width, size.height);
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = Math.ceil(x0 / GRID_M); i * GRID_M <= x1; i++) {
    const [px] = view.toCanvas(i * GRID_M, 0);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, size.height);
  }
  for (let i = Math.ceil(z0 / GRID_M); i * GRID_M <= z1; i++) {
    const [, py] = view.toCanvas(0, i * GRID_M);
    ctx.moveTo(0, py);
    ctx.lineTo(size.width, py);
  }
  ctx.stroke();
}

function drawDeck(ctx: CanvasRenderingContext2D, { design, view, palette }: TopScene): void {
  const { deck } = design;
  ctx.fillStyle = palette.deck;
  fillBox(ctx, view, [deck.x0, deck.z0], [deck.x1, deck.z1]);
  ctx.fillStyle = palette.riser;
  for (const { at, size } of design.risers) {
    fillBox(ctx, view, [at[0] - size[0] / 2, at[2] - size[2] / 2], [at[0] + size[0] / 2, at[2] + size[2] / 2]);
  }
}

/** LED walls and their side screens; hidden with the `ledWall` scenery part, as in 3D and in the camera fit. */
function drawScreens(ctx: CanvasRenderingContext2D, { design, view, palette }: TopScene): void {
  if (!design.scenery.ledWall) return;
  ctx.strokeStyle = palette.screen;
  ctx.lineWidth = SCREEN_LINE_PX;
  ctx.beginPath();
  for (const s of design.screens) {
    line(ctx, view.toCanvas(s.x0, s.z), view.toCanvas(s.x1, s.z));
    for (const { at, yaw, width } of s.sides ?? []) {
      // a turn by `yaw` about Y takes local x to (cos yaw, -sin yaw) in x/z
      const dx = (Math.cos(yaw) * width) / 2,
        dz = (-Math.sin(yaw) * width) / 2;
      line(ctx, view.toCanvas(at[0] - dx, at[2] - dz), view.toCanvas(at[0] + dx, at[2] + dz));
    }
  }
  ctx.stroke();
}

function fillBox(ctx: CanvasRenderingContext2D, view: TopTransform, lo: Point2, hi: Point2): void {
  const [px0, py0] = view.toCanvas(...lo);
  const [px1, py1] = view.toCanvas(...hi);
  ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
}

function line(ctx: CanvasRenderingContext2D, from: Point2, to: Point2): void {
  ctx.moveTo(...from);
  ctx.lineTo(...to);
}
