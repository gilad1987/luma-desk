import { Keypad } from '../../ui/components/Keypad';
import type { LayoutHost } from '../../ui/layouts/LayoutHost';
import type { LayoutDeps } from './LayoutDeps';

/** The part of {@link LayoutDeps} a layout change touches. */
export type LayoutHostDeps = Pick<
  LayoutDeps,
  'sideTabs' | 'encoders' | 'commandLine' | 'storeMode' | 'stageRenderer' | 'views' | 'setView' | 'layoutPrefs'
>;

/**
 * Connects the LayoutManager to the panels and the renderer. The keypad is built on the first desk or MA layout, as
 * before, so a classic-only session never creates it. The console height goes straight to the renderer: DeskFit is
 * its one writer and computes it per fit, so no stored copy can drift from what the renderer got.
 */
export function layoutHost(deps: LayoutHostDeps): LayoutHost {
  let keypad: Keypad | null = null;
  return {
    sideTabs: deps.sideTabs,
    prefs: deps.layoutPrefs,
    keypad: () => {
      keypad ??= new Keypad(deps.commandLine, deps.storeMode);
      return keypad.element;
    },
    removeKeypad: () => keypad?.element.remove(),
    renderEncoders: () => deps.encoders.render(),
    resize: () => deps.stageRenderer.resize(),
    currentView: () => deps.views.currentView,
    setView: (view, instant) => deps.setView(view, instant),
    setConsoleHeight: (px) => deps.stageRenderer.setConsoleHeight(px),
  };
}
