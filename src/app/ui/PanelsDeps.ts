import type { LayoutMode } from '../../ui/panels/layoutMode';
import type { EngineHandles } from '../boot/wireEngine';
import type { RenderHandles } from '../boot/wireRender';
import type { AutoShowHandles } from '../uix/createAutoShow';
import type { ShowFiles } from '../uix/createShowFiles';
import type { UiServices } from './createUiServices';

/**
 * What the DOM panels are built from: the engine, the render objects, the show files and the auto-show, plus two
 * readers of areas the composition root builds after the panels (the layout and the guide).
 */
export interface PanelsDeps {
  readonly engine: EngineHandles;
  readonly render: RenderHandles;
  readonly files: ShowFiles;
  readonly auto: AutoShowHandles;
  /** The active layout; the layout area is built after the panels, so this reads it at call time. */
  readonly layoutMode: () => LayoutMode;
  /** The guide or the tour covers the page; the io area builds them after the panels. */
  readonly guideOrTourOpen: () => boolean;
}

/** {@link PanelsDeps} with the dialog and store-mode services that every panel after the top bar takes. */
export type PanelsWithServices = PanelsDeps & { readonly services: UiServices };
