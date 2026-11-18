import { vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import type { BuilderDeps } from '../../../../src/ui/builder/BuilderDeps.ts';
import type { KeyPress } from '../../../../src/ui/builder/builderKeys.ts';
import type { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
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
 * listeners it holds, the bus messages, and the session the tools were mounted with.
 */
export class BuilderHarness {
  readonly stage: ReturnType<typeof fakeStage>;
  readonly calls: string[] = [];
  readonly keys = new Set<KeyListener>();
  readonly emit = vi.fn();
  readonly deps: BuilderDeps;
  session: EditorSession | null = null;

  constructor(design?: StageDesign) {
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
      mountTools: (_slots, session) => {
        this.session = session;
        this.calls.push('mount');
        return () => this.calls.push('unmount');
      },
    };
  }

  /** Sends `ev` to every key listener the builder holds, as `document` would. */
  send(ev: KeyPress): void {
    this.keys.forEach((listener) => listener(ev));
  }
}
