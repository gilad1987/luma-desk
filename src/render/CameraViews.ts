import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FohRig } from './CameraViewsFohRig';
import { VIEWS } from './CameraViewsTable';
import { tweenCamera } from './CameraViewsTween';

/** What the camera needs from the UI, passed in so render never reads or writes UI DOM. */
export interface CameraViewsOptions {
  /** Whether the MA desk layout is active; FOH then means the operator's eye behind the console. */
  readonly isMaLayout: () => boolean;
  /** Called when an animated view change starts, so the UI can mark the active view button. */
  readonly onViewChanged: (view: string) => void;
}

/**
 * The stage camera, its orbit controls and the named views. It owns the FOH rig handle because only a view change
 * decides whether that rig is visible.
 */
export class CameraViews {
  readonly camera = new PerspectiveCamera(46, 1, 0.1, 1600);
  readonly controls: OrbitControls;
  /** Venue builders register the FOH riser, desk and RoboSpot station here. */
  readonly fohRig = new FohRig();
  private readonly options: CameraViewsOptions;
  private current = 'foh';

  constructor(canvas: HTMLCanvasElement, options: CameraViewsOptions) {
    this.options = options;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
  }

  /** The last view set by name (`foh` also in the MA layout); the layout switch re-applies FOH with it. */
  get currentView(): string {
    return this.current;
  }

  /** Advances the orbit damping; the frame loop calls it once per frame before rendering. */
  updateControls(): void {
    this.controls.update();
  }

  /**
   * Moves to a named view, at once or with a 700 ms tween. An unknown name does nothing. Only the animated path
   * reports the change, as in the legacy code where the instant path returned before the button update.
   */
  setView(view: string, instant = false): void {
    const ma = view === 'foh' && this.options.isMaLayout();
    const next = VIEWS[ma ? 'fohMa' : view];
    if (!next) return;
    this.current = view;
    this.fohRig.setVisible(!ma);
    this.camera.fov = next.fov ?? 46;
    this.camera.updateProjectionMatrix();
    const from = { position: this.camera.position.clone(), target: this.controls.target.clone() };
    const to = { position: new Vector3(...next.position), target: new Vector3(...next.target) };
    if (instant) {
      this.camera.position.copy(to.position);
      this.controls.target.copy(to.target);
      this.controls.update();
      return;
    }
    tweenCamera(this.camera, this.controls.target, from, to);
    this.options.onViewChanged(view);
  }
}
