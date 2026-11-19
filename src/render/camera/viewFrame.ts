import type { PerspectiveCamera } from 'three';
import type { StageBounds } from '../../domain/stage/types';
import type { ViewTable } from './viewTable';

/** A rectangle in CSS pixels, y down, from the top left corner of the 3D canvas. */
export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The 3D canvas and the part of it that no console covers. Only the ratios matter to a fit, so any unit works. */
export interface ViewFrame {
  readonly width: number;
  readonly height: number;
  readonly free: ScreenRect;
}

/** The share of the free rectangle that stays empty on each side of a fitted box. */
export const FIT_MARGIN = 0.06;

/**
 * Views that depend on the frame: an imported stage is framed again for every window shape and layout, where the
 * built-in table is fixed. `rig` is the box the whole-stage views hold in frame; `scene` is everything the camera may
 * look at, which sets the zoom limits and the clip planes. `house` is the box the overview and the plan hold in frame
 * (the rig and the seats; absent, the rig), `outliers` how many fixtures stand far from the rig box, and `farProxies`
 * how many drawn seats and panels stand far from the house box.
 */
export interface ViewFitter {
  readonly rig: StageBounds;
  readonly scene: StageBounds;
  readonly house?: StageBounds;
  readonly outliers?: number;
  readonly farProxies?: number;
  tableFor(frame: ViewFrame): Partial<ViewTable>;
}

/** Whether `fitTo` got frame-dependent views and not a fixed table. */
export const isViewFitter = (own: Partial<ViewTable> | ViewFitter): own is ViewFitter => 'tableFor' in own;

/**
 * The tangents of the half angles the free rectangle spans about its own centre. The lens (`fov`, vertical, degrees)
 * covers the whole canvas height, so one pixel is `tan(fov / 2) / (height / 2)` wide at distance 1 in both directions.
 */
export function freeTangents(fov: number, frame: ViewFrame): { readonly h: number; readonly v: number } {
  const perPixel = Math.tan((fov * Math.PI) / 360) / (frame.height / 2);
  return { h: (perPixel * frame.free.width) / 2, v: (perPixel * frame.free.height) / 2 };
}

/**
 * The `setViewOffset` shift (pixels) that puts the optical axis on the centre of the free rectangle. A shifted
 * principal point keeps verticals upright; a tilted camera would make them lean.
 */
export function axisShift({ width, height, free }: ViewFrame): { readonly x: number; readonly y: number } {
  return { x: width / 2 - (free.x + free.width / 2), y: height / 2 - (free.y + free.height / 2) };
}

/** One axis of `frameOf`: the free span that a shift of `offset` centres, for a cover on one side only. */
const freeSpan = (full: number, offset: number): { readonly from: number; readonly size: number } => ({
  from: Math.max(0, -2 * offset),
  size: Math.max(1e-6, full - 2 * Math.abs(offset)),
});

/**
 * The frame a camera draws: the inverse of `axisShift`. The renderer shifts the axis by half of what the MA console
 * covers (`StageRenderer.resize`), so the free rectangle is read back from the camera itself and the views need no
 * second source for the layout. Without a shift the whole canvas is free, in units of its height.
 */
export function frameOf(camera: PerspectiveCamera): ViewFrame {
  const view = camera.view;
  if (!view?.enabled) return { width: camera.aspect, height: 1, free: { x: 0, y: 0, width: camera.aspect, height: 1 } };
  const [across, down] = [freeSpan(view.fullWidth, view.offsetX), freeSpan(view.fullHeight, view.offsetY)];
  return {
    width: view.fullWidth,
    height: view.fullHeight,
    free: { x: across.from, y: down.from, width: across.size, height: down.size },
  };
}
