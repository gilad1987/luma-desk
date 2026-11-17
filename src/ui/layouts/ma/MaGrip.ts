import { byId } from '../../dom';
import { gripShare } from '../fitMath';

/** The part of the layout the grip drives: the console's height share, the fit and the saved layout. */
export interface GripTarget {
  maSize: number | undefined;
  fit(): void;
  save(): void;
}

/**
 * The drag handle above the MA screens: dragging sets the console's share of the window height (one refit per
 * frame), double-click goes back to the adaptive size. It stops the pointer-down so the 3D view does not orbit.
 */
export class MaGrip {
  private frame = 0;

  constructor(
    private readonly target: GripTarget,
    private readonly resize: () => void,
  ) {
    const grip = byId('maGrip');
    grip.onpointerdown = (ev) => {
      grip.setPointerCapture(ev.pointerId);
      grip.classList.add('on');
      ev.preventDefault();
      ev.stopPropagation();
    };
    grip.onpointermove = (ev) => {
      if (!grip.hasPointerCapture(ev.pointerId)) return;
      target.maSize = gripShare(ev.clientY, innerHeight);
      if (!this.frame) this.frame = requestAnimationFrame(() => this.refit());
    };
    grip.onlostpointercapture = () => {
      grip.classList.remove('on');
      target.save();
    };
    grip.ondblclick = () => {
      target.maSize = undefined;
      target.fit();
      resize();
      target.save();
    };
  }

  private refit(): void {
    this.frame = 0;
    this.target.fit();
    this.resize();
  }
}
