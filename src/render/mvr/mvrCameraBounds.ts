import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageBounds } from '../../domain/stage/types';
import { stageBox, type MvrGeometry } from '../../mvr/index';
import { mainRange, type AxisRange } from './mainRange';
import { proxyPoints, withPoints } from './proxyPoints';

const within = (range: AxisRange, value: number): boolean => value >= range.lo && value <= range.hi;

/** The layers `stageBox` leaves out of the camera box: the ones the user hid and the venue hall. */
export function excludedLayers(design: StageDesign, geometry: MvrGeometry): readonly string[] {
  return [...(design.mvr?.hiddenLayers ?? []), ...geometry.hallLayers];
}

/**
 * The box of a fixtures-only stage: the main fixture group and the design's own parts. Without a mesh the 8 m rule of
 * `stageBox` has nothing to measure from, so Tukey's fences (`mainRange`, never smaller than the deck) drop the few
 * far fixtures, such as follow spots at FOH, that would put the eye behind them and shrink the rig.
 */
function fixtureBounds(design: StageDesign): StageBounds {
  const { deck, fixtures } = design;
  const xs = mainRange(
    fixtures.map((fixture) => fixture.position[0]),
    { lo: deck.x0, hi: deck.x1 },
  );
  const zs = mainRange(
    fixtures.map((fixture) => fixture.position[2]),
    { lo: deck.z0, hi: deck.z1 },
  );
  const main = fixtures.filter(({ position: [x, , z] }) => within(xs, x) && within(zs, z));
  return boundsOf({ ...design, fixtures: main });
}

/**
 * The stage box, the same rule the fit offset centres (`stageBox`: the shown layers that are not the hall, plus the
 * fixtures at most 8 m outside them), so the camera and the fit agree on where the stage is. A file whose shown layers
 * hold no mesh is framed by its fixtures (`fixtureBounds`); an LED-only file without fixtures by its meshes alone.
 */
export function mvrStageBounds(design: StageDesign, geometry: MvrGeometry): StageBounds {
  const excluded = new Set(excludedLayers(design, geometry));
  if (geometry.layers.every((layer) => excluded.has(layer.layer))) return fixtureBounds(design);
  const positions = design.fixtures.map((fixture) => fixture.position);
  const { min, max } = stageBox(geometry.layers, positions, [...excluded]);
  return { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] };
}

/**
 * The box the camera views frame for an imported stage (decision S3): the stage box grown to hold the drawn seat and
 * LED-panel proxies of the shown layers (`proxyPoints`). Proxies have no mesh, so `stageBox` never sees them, and the
 * Wide and Audience views then cut the seat rows; a layer the import reports as far stays out.
 */
export function mvrCameraBounds(design: StageDesign, geometry: MvrGeometry): StageBounds {
  return withPoints(mvrStageBounds(design, geometry), proxyPoints(design, geometry));
}
