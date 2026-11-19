import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FohRig } from './FohRig';
import type { StageBounds } from '../../domain/stage/types';
import { FittedTable } from './FittedTable';
import { tweenCamera } from './tweenCamera';
import { watchUserMove } from './userMove';
import type { ViewFitter } from './viewFrame';
import { applyViewRange, followFloor } from './viewRange';
import type { CameraView, ViewName, ViewTable } from './viewTable';

/** What the camera needs from the UI, passed in so render never reads or writes UI DOM. */
export interface CameraViewsOptions {
  /** Whether the MA desk layout is active; FOH then means the operator's eye behind the console. */
  readonly isMaLayout: () => boolean;
  /** Called when an animated view change starts, so the UI can mark the active view button. */
  readonly onViewChanged: (view: ViewName) => void;
}

/**
 * The stage camera, its orbit controls and the named views. It owns the FOH rig handle because only a view change
 * decides whether that rig is visible. Gets the stage canvas and the layout callbacks from main.ts; venue builders
 * register their FOH meshes through `fohRig`.
 */
export class CameraViews {
  readonly camera = new PerspectiveCamera(46, 1, 0.1, 1600);
  readonly controls: OrbitControls;
  /** Venue builders register the FOH riser, desk and RoboSpot station here. */
  readonly fohRig = new FohRig();
  private readonly options: CameraViewsOptions;
  private current: ViewName = 'foh';
  /** The views `setView` moves to: the built-in table, or a copy fitted by `fitTo`; the test hook reads its rig box. */
  readonly table = new FittedTable();
  /** True from `setView` until the user moves the camera; only then may a new frame move it again. */
  private isOnView = false;
  /** Stops the running view tween; every `setView` calls it first, so the latest view wins. */
  private stopTween: () => void = () => {};

  constructor(canvas: HTMLCanvasElement, options: CameraViewsOptions) {
    this.options = options;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    watchUserMove(this.camera, this.controls, () => (this.isOnView = false));
  }

  /** The last view set by name (`foh` also in the MA layout); the layout switch re-applies FOH with it. */
  get currentView(): ViewName {
    return this.current;
  }

  /** Advances the orbit damping; the frame loop calls it once per frame before rendering. */
  updateControls(): void {
    if (this.table.follow(this.camera) && this.isOnView) this.setView(this.current, true);
    followFloor(this.controls, this.table.scene);
    this.controls.update();
  }

  /**
   * Fits the views to a stage's bounds (G7, rule in `fitViews`), or restores the built-in table for null. It only
   * swaps the table: the camera stays where it is until the next `setView`, so a caller that wants the fitted
   * framing at once calls `setView(currentView)`, and a call at boot moves nothing. `own` replaces single fitted
   * views; an imported MVR stage passes a `ViewFitter` (`mvrViews`), whose views are computed for the frame now and
   * again whenever the window or the layout changes it, and whose scene box sets the zoom limits and clip planes.
   */
  fitTo(bounds: StageBounds | null, own: Partial<ViewTable> | ViewFitter = {}): void {
    this.table.set(bounds, own);
    applyViewRange(this.camera, this.controls, this.table.scene);
    this.table.follow(this.camera);
  }

  /**
   * Moves to a named view, at once or with a 700 ms tween. Only the animated path reports the change, as in the
   * legacy code where the instant path returned before the button update. It stops a running tween first
   * (quirk F9, orig:888).
   */
  setView(view: ViewName, isInstant = false): void {
    this.stopTween();
    const ma = view === 'foh' && this.options.isMaLayout();
    const next: CameraView = this.table.views[ma ? 'fohMa' : view];
    this.current = view;
    this.isOnView = true;
    this.fohRig.setVisible(!ma);
    this.camera.fov = next.fov ?? 46;
    this.camera.updateProjectionMatrix();
    const from = { position: this.camera.position.clone(), target: this.controls.target.clone() };
    const to = { position: new Vector3(...next.position), target: new Vector3(...next.target) };
    if (isInstant) {
      this.camera.position.copy(to.position);
      this.controls.target.copy(to.target);
      followFloor(this.controls, this.table.scene);
      this.controls.update();
      return;
    }
    this.stopTween = tweenCamera(this.camera, this.controls.target, from, to);
    this.options.onViewChanged(view);
  }
}
