import type { AttrName } from '../../../domain/attributes';
import { byId } from '../../dom';
import { LevelWheel } from './LevelWheel';
import { MaGrip, type GripTarget } from './MaGrip';
import type { MaReadoutSource } from './MaReadoutSource';
import { bindPaneWheelScroll } from './paneWheelScroll';
import { SpecialMasters } from './SpecialMasters';
import { TouchScreens } from './TouchScreens';

/** What the MA hardware needs from outside the layouts. */
export interface MaLayoutDeps {
  readonly readout: MaReadoutSource;
  /** FocusPad's redraw, called when the selection changes. */
  readonly redrawFocus: () => void;
  /** `EncodersPanel.delta`, driven by the level wheel. */
  readonly encoderDelta: (attr: AttrName, d: number) => void;
  /** The LayoutManager, which the grip resizes. */
  readonly grip: GripTarget;
  /** The renderer resize, after a grip refit. */
  readonly resize: () => void;
}

/**
 * The MA console hardware: special masters, touch-screen read-outs, level wheel, grip and wheel scrolling of the
 * screen panes. Built once at boot in that order; it does not move panels (LayoutManager does) and owns no state of
 * its own beyond the widgets'.
 */
export class MaLayout {
  private readonly masters = new SpecialMasters();
  private readonly screens: TouchScreens;

  constructor(deps: MaLayoutDeps) {
    this.screens = new TouchScreens(deps.readout, deps.redrawFocus);
    new LevelWheel(deps.encoderDelta);
    new MaGrip(deps.grip, deps.resize);
    bindPaneWheelScroll(byId('maBody'));
  }

  /** The MA part of the fast UI tick; call it only while the MA layout is shown. */
  update(): void {
    this.masters.paint();
    this.screens.update();
  }
}
