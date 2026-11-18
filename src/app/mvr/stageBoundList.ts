import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageSource } from '../../domain/stage/types';
import type { MarkLed } from '../../ui/panels/mvr/layerList';
import { hideMvrLayers } from './hideMvrLayers';
import { markLedLayers } from './markLedLayers';
import type { MvrFlowDeps } from './MvrFlowDeps';

/** The layer list now open (the "Layers" dialog or the import summary): the stage it was built for, how to close it. */
interface OpenList {
  readonly source: StageSource;
  /** True while the list's rows are still on the page; another dialog in the modal took them away. */
  readonly shown: () => boolean;
  readonly close: () => void;
}

let open: OpenList | undefined;

/** The handlers of a layer list: they write into the stage only while it is the stage the list was built for. */
export interface BoundHandlers {
  readonly hide: (uuids: readonly string[]) => void;
  readonly markLed: MarkLed;
}

/**
 * The handlers of a layer list opened now, bound to the stage's file source of this moment. The source object, not
 * the file hash, is the check: a show load of the same file or a new import of it makes a new source, and the list
 * then names hidden and marked layers of a design the stage no longer has. A layer change keeps the source
 * (`updateMeta` copies the design). `register` gives the list's host once the modal shows it.
 */
export function bindLayerList(deps: MvrFlowDeps): BoundHandlers & { register: (host: HTMLElement) => void } {
  const { source } = deps.stage.design;
  const live = (): boolean => deps.stage.design.source === source;
  const hide = (uuids: readonly string[]): void => {
    if (live()) hideMvrLayers(deps, uuids);
  };
  const marked = deps.stage.design.mvr?.ledLayers ?? [];
  const set: MarkLed['set'] = (uuids) => (live() ? markLedLayers(deps, uuids) : Promise.resolve(undefined));
  const register = (host: HTMLElement): void => {
    const modal = deps.modal();
    open = { source, shown: () => host.isConnected, close: () => modal.close() };
  };
  return { hide, markLed: { marked, set }, register };
}

/**
 * Closes the open layer list when `design` is no longer the stage it was built for: another file, or the same file
 * loaded again. A list another dialog already replaced is left alone, so that dialog stays open.
 */
export function closeStaleLayerList(design: StageDesign): void {
  if (!open || design.source === open.source) return;
  const stale = open;
  open = undefined;
  if (stale.shown()) stale.close();
}
