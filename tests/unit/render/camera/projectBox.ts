/**
 * Projects a box through a view the way the renderer draws it: three's own camera with the lens of the view, the
 * aspect of the frame and the view offset that centres the free rectangle (`axisShift`, as `StageRenderer.resize`).
 */
import { PerspectiveCamera, Vector3 } from 'three';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { boxCorners } from '../../../../src/render/camera/boxFit';
import { axisShift, type ViewFrame } from '../../../../src/render/camera/viewFrame';
import type { CameraView } from '../../../../src/render/camera/viewTable';

/** A canvas of `width` x `height` pixels whose lowest `covered` pixels lie under the MA console. */
export function frameOf(width: number, height: number, covered = 0): ViewFrame {
  return { width, height, free: { x: 0, y: 0, width, height: height - covered } };
}

/** Where a box lies in the free rectangle: the empty share on each side and the share it fills, 0 to 1. */
export interface BoxInFrame {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

/** The camera of a view in a frame, as the renderer sets it up. */
export function cameraOf(view: CameraView, frame: ViewFrame): PerspectiveCamera {
  const camera = new PerspectiveCamera(view.fov ?? 46, frame.width / frame.height, 0.1, 1e5);
  const shift = axisShift(frame);
  if (shift.x !== 0 || shift.y !== 0)
    camera.setViewOffset(frame.width, frame.height, shift.x, shift.y, frame.width, frame.height);
  camera.position.set(...view.position);
  camera.lookAt(...view.target);
  camera.updateMatrixWorld();
  return camera;
}

/** The box's place in the free rectangle of `frame`, seen through `view`. */
export function boxInFrame(view: CameraView, box: StageBounds, frame: ViewFrame): BoxInFrame {
  const camera = cameraOf(view, frame);
  const points = boxCorners(box).map((corner) => new Vector3(...corner).project(camera));
  const xs = points.map((p) => (((p.x + 1) / 2) * frame.width - frame.free.x) / frame.free.width);
  const ys = points.map((p) => (((1 - p.y) / 2) * frame.height - frame.free.y) / frame.free.height);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  const [right, bottom] = [1 - Math.max(...xs), 1 - Math.max(...ys)];
  return { left, right, top, bottom, width: 1 - left - right, height: 1 - top - bottom };
}

/** The smallest empty share around the box: negative when a corner is outside the free rectangle. */
export const smallestMargin = (at: BoxInFrame): number => Math.min(at.left, at.right, at.top, at.bottom);
