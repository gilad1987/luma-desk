import type { EngineBus } from '../engine/events';
import { he } from '../i18n/he';

/** The part of `document` fullscreen needs, so tests can hand in a fake. */
export interface FullscreenDocument {
  readonly activeElement: Pick<Element, 'tagName'> | null;
  readonly fullscreenElement: object | null;
  /** `requestFullscreen` is optional because iPhone Safari lacks it. */
  readonly documentElement: { requestFullscreen?: () => Promise<void> };
  exitFullscreen(): Promise<void>;
}

/** The key event fields the F shortcut reads. */
export type FullscreenKey = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'preventDefault' | 'stopImmediatePropagation'
>;

/** What {@link Fullscreen} needs from main.ts. */
export interface FullscreenDeps {
  readonly document: FullscreenDocument;
  /** Whether the guide (`#guide.show`) is open; the F shortcut is off while it is. */
  readonly isGuideOpen: () => boolean;
  readonly bus: EngineBus;
}

/**
 * Fullscreen on `#fsBtn` and the F key. main.ts forwards `#fsBtn` clicks to {@link Fullscreen.toggle} and registers
 * {@link Fullscreen.handleKey} as a capture-phase `keydown` listener on `document` (listener K4). Emits a toast.
 */
export class Fullscreen {
  readonly #deps: FullscreenDeps;

  constructor(deps: FullscreenDeps) {
    this.#deps = deps;
  }

  /** Leaves fullscreen, or enters it; a browser that refuses gets a toast. */
  toggle(): void {
    const { document, bus } = this.#deps;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement
      .requestFullscreen?.()
      .catch(() => bus.emit('message', { kind: 'toast', text: he.topBar.fullscreen.unavailable }));
  }

  /**
   * F (without Ctrl or Meta) toggles fullscreen unless the operator is typing or reading the guide. It stops the
   * event, so the desk's bubble-phase key listener never moves focus to the command line for it.
   */
  handleKey(event: FullscreenKey): void {
    const tag = this.#deps.document.activeElement?.tagName;
    // quirk Q5 (orig:2911): a SELECT, an open modal or the tour do not block F (03-ui.md §8.1)
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';
    const isShortcut = (event.key === 'f' || event.key === 'F') && !event.ctrlKey && !event.metaKey;
    if (!isShortcut || isTyping || this.#deps.isGuideOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.toggle();
  }
}
