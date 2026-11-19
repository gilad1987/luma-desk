import { vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import type { BuilderDeps, BuilderSlots } from '../../../../src/ui/builder/BuilderDeps.ts';
import type { KeyPress } from '../../../../src/ui/builder/builderKeys.ts';
import type { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import type { PlanViewDeps } from '../../../../src/ui/builder/plan/PlanView.ts';
import { FakeNarrowScreen } from './fakeNarrowScreen.ts';
import { fakeStage } from './fakeStage.ts';

type KeyListener = (ev: KeyPress) => void;

/** A key press with no target and a spy for `preventDefault`; `mods` adds Ctrl, Cmd or Shift. */
export const press = (key: string, mods: Partial<Pick<KeyPress, 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  target: null,
  preventDefault: vi.fn(),
  ...mods,
});

/**
 * `BuilderDeps` as plain fakes that record what Builder mode does with them: the layout calls in order, the key
 * listeners it holds, the bus messages, the slots and session the tools were mounted with, and the pane the viewer
 * moved into. `narrow` is a wide screen unless the test passes `isNarrow`.
 */
export class BuilderHarness {
  readonly stage: ReturnType<typeof fakeStage>;
  readonly calls: string[] = [];
  readonly keys = new Set<KeyListener>();
  readonly emit = vi.fn();
  /** Each `setDeskInert` value in order; kept out of `calls`, whose order the layout tests check. */
  readonly deskInert: boolean[] = [];
  readonly narrow: FakeNarrowScreen;
  readonly deps: BuilderDeps;
  session: EditorSession | null = null;
  view: PlanViewDeps | null = null;
  slots: BuilderSlots | null = null;
  pane: HTMLElement | null = null;

  constructor(design?: StageDesign, isNarrow = false) {
    this.narrow = new FakeNarrowScreen(isNarrow);
    this.stage = fakeStage(design);
    this.deps = {
      stage: this.stage,
      bus: { emit: this.emit },
      keys: {
        addEventListener: (_type, listener) => void this.keys.add(listener),
        removeEventListener: (_type, listener) => void this.keys.delete(listener),
      },
      setConsoleHeight: (px) => this.calls.push(`height ${px}`),
      fitLayout: () => this.calls.push('fit'),
      setDeskInert: (inert) => void this.deskInert.push(inert),
      frames: { nextFrame: () => 0, cancelFrame: () => undefined },
      mountTools: (slots, session, view) => {
        this.slots = slots;
        this.session = session;
        this.view = view;
        this.calls.push('mount');
        return () => this.calls.push('unmount');
      },
      attachViewer: (pane) => {
        this.pane = pane;
        this.calls.push('viewer');
        return () => this.calls.push('viewer off');
      },
      narrow: this.narrow,
    };
  }

  /** Sends `ev` to every key listener the builder holds, as `document` would. */
  send(ev: KeyPress): void {
    this.keys.forEach((listener) => listener(ev));
  }
}
