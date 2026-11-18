import { VIEWS, type ViewName } from '../../render/camera/viewTable';

/** Every key of the view table, `fohMa` included, as the original own-key check accepted it. */
const VIEW_NAMES: ReadonlySet<string> = new Set(Object.keys(VIEWS));

const isViewName = (name: string): name is ViewName => VIEW_NAMES.has(name);

/**
 * Turns a plain view name (a button's `data-view`, a test hook argument) into a typed `ViewName` once, at the DOM
 * edge; `undefined` for anything else, so the caller leaves the camera where it is. Inherited keys such as
 * `toString` are not views.
 */
export function parseViewName(name: string | undefined): ViewName | undefined {
  return name !== undefined && isViewName(name) ? name : undefined;
}
