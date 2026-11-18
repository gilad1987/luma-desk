import { VIEWS, type ViewName } from '../../render/camera/viewTable';

/**
 * Whether a plain string from a view button or the test hook names a camera view. It asks for an own key, so an
 * inherited name such as `toString` is not a view and moves no camera.
 */
export const isViewName = (view: string): view is ViewName => Object.hasOwn(VIEWS, view);
