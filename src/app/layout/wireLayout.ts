import { colorPad } from '../../ui/components/ColorPad';
import { focusPad } from '../../ui/components/FocusPad';
import { byId } from '../../ui/dom';
import { LayoutManager } from '../../ui/layouts/LayoutManager';
import { MaLayout } from '../../ui/layouts/ma/MaLayout';
import { startConsoleInfo } from '../../ui/layouts/startConsoleInfo';
import type { LayoutMode } from '../../ui/panels/layoutMode';
import { consoleInfoSource } from './consoleInfoSource';
import type { LayoutDeps } from './LayoutDeps';
import { layoutHost } from './layoutHost';
import { maReadout } from './maReadout';

/** What the composition root keeps of the layouts. */
export interface LayoutHandles {
  /** The shown layout, for the panels that read it at call time. */
  readonly mode: () => LayoutMode;
  /**
   * Boot only: reads the saved layout, shows it in the selects and moves the panels into it. Kept apart from
   * {@link wireLayout} because the encoders must exist before it runs.
   */
  readonly restore: () => void;
  /** The MA part of the fast UI tick (the old `if (deskMode === 'ma') updateMaUI()`). */
  readonly fast: () => void;
}

/**
 * Builds the MA touch-screen pads, the layout switch with its selects and window refit, the MA hardware (special
 * masters, read-outs, level wheel, grip, pane wheel scrolling) and the 250 ms console labels. It creates no three.js
 * object and draws no random number; it moves no panel until {@link LayoutHandles.restore}.
 */
export function wireLayout(deps: LayoutDeps): LayoutHandles {
  const { programmer, selection, stage } = deps;
  colorPad(byId('tsCol', HTMLCanvasElement), programmer);
  // built before MaLayout, which redraws it when the selection changes
  const redrawFocus = focusPad(byId('tsPos', HTMLCanvasElement), {
    bus: deps.bus,
    selection,
    programmer,
    rig: { get: (id) => stage.rig.get(id) },
    aimHeight: deps.aimHeight,
  });
  const layout = new LayoutManager(layoutHost(deps));
  const ma = new MaLayout({
    readout: maReadout(deps),
    redrawFocus: () => redrawFocus(),
    encoderDelta: (attr, d) => deps.encoders.delta(attr, d),
    grip: layout,
    resize: () => deps.stageRenderer.resize(),
  });
  const mode = (): LayoutMode => layout.mode;
  startConsoleInfo(mode, consoleInfoSource(deps));
  return {
    mode,
    restore: () => layout.restore(),
    fast: () => {
      if (layout.mode === 'ma') ma.update();
    },
  };
}
