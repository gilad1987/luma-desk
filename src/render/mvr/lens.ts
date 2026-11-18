/** The frame the MVR views are framed for: the 16:9 canvas of a desk window (a narrower window shows less width). */
export const FRAME_ASPECT = 16 / 9;

/** The vertical lens (degrees) of a view without `fov`, as `CameraViews.setView` sets it. */
export const DEFAULT_FOV = 46;

/** Tangent of half the vertical lens: the frame half-height at 1 m. */
export const tanHalfV = (fov: number): number => Math.tan((fov * Math.PI) / 360);

/** Tangent of half the horizontal lens at `FRAME_ASPECT`: the frame half-width at 1 m. */
export const tanHalfH = (fov: number): number => tanHalfV(fov) * FRAME_ASPECT;

/** The vertical lens (degrees) whose frame half-height at 1 m is `tangent`. */
export const fovOf = (tangent: number): number => (Math.atan(tangent) * 360) / Math.PI;
