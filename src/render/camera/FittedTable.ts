import type { PerspectiveCamera } from 'three';
import type { StageBounds } from '../../domain/stage/types';
import { fitViews } from './fitViews';
import { frameOf, isViewFitter, type ViewFitter, type ViewFrame } from './viewFrame';
import { VIEWS, type CameraView, type ViewTable } from './viewTable';

/** Whether two frames are the same, number by number: the camera asks every frame, so nothing is allocated for it. */
const sameFrame = (a: ViewFrame, b: ViewFrame): boolean =>
  a.width === b.width &&
  a.height === b.height &&
  a.free.x === b.free.x &&
  a.free.y === b.free.y &&
  a.free.width === b.free.width &&
  a.free.height === b.free.height;

/**
 * The view table of the current stage. The built-in stage and the templates have a fixed one. An imported stage has
 * views that depend on the frame (`ViewFitter`), so its table is computed again when the frame is no longer the one
 * it was made for; the camera asks once per frame, and a fixed table answers "no change" without any work.
 */
export class FittedTable {
  /** The views `setView` moves to. */
  views: ViewTable = VIEWS;
  /** The fixed views below the fitter's own, the fitter, and the frame its views were last made for. */
  private fitted: { readonly base: ViewTable; readonly fitter: ViewFitter; frame: ViewFrame | null } | null = null;

  /** The box the whole-stage views of an imported stage hold in frame; null for the other stages. */
  get rig(): StageBounds | null {
    return this.fitted?.fitter.rig ?? null;
  }

  /** The box the overview and the plan of an imported stage hold in frame; null for the other stages. */
  get house(): StageBounds | null {
    return this.fitted?.fitter.house ?? this.rig;
  }

  /** How many fixtures of an imported stage stand far from its rig box, outside the whole-stage views. */
  get outliers(): number {
    return this.fitted?.fitter.outliers ?? 0;
  }

  /** How many drawn seats and panels of an imported stage stand far from its house box, outside every named view. */
  get farProxies(): number {
    return this.fitted?.fitter.farProxies ?? 0;
  }

  /** The views whose eye found no clear place and kept its best one (`clearEye`), by name, with their faults. */
  get unclear(): Readonly<Record<string, number>> {
    const kept = Object.entries<CameraView>(this.views).filter(([, view]) => view.faults !== undefined);
    return Object.fromEntries(kept.map(([name, view]) => [name, view.faults ?? 0]));
  }

  /** Everything the camera of an imported stage may look at; null for the other stages. */
  get scene(): StageBounds | null {
    return this.fitted?.fitter.scene ?? null;
  }

  /**
   * Sets the table for a stage's bounds (`fitViews`; `VIEWS` for null) with the stage's own views over it. Null
   * bounds mean the built-in stage, which has no fitter: one passed with them is dropped, so the built-in table, its
   * clip planes and its orbit limit never depend on a stage that was shown before.
   */
  set(bounds: StageBounds | null, own: Partial<ViewTable> | ViewFitter): void {
    const base = bounds ? fitViews(bounds) : VIEWS;
    this.fitted = bounds && isViewFitter(own) ? { base, fitter: own, frame: null } : null;
    this.views = isViewFitter(own) ? base : { ...base, ...own };
  }

  /** Computes the frame-dependent views again when the camera's frame changed; true when it did. */
  follow(camera: PerspectiveCamera): boolean {
    const fitted = this.fitted;
    if (!fitted) return false;
    const frame = frameOf(camera);
    if (fitted.frame && sameFrame(frame, fitted.frame)) return false;
    fitted.frame = frame;
    this.views = { ...fitted.base, ...fitted.fitter.tableFor(frame) };
    return true;
  }
}
