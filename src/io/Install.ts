import type { EngineBus } from '../engine/events';
import { he } from '../i18n/he';

/** Chromium's `beforeinstallprompt` event, which the DOM typings do not declare. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<unknown>;
}

/** What {@link Install} needs from main.ts. */
export interface InstallDeps {
  /** `#installBtn`; the markup starts it hidden. */
  readonly button: { readonly style: Pick<CSSStyleDeclaration, 'display'> };
  readonly bus: EngineBus;
}

/** Tells the browser's install offer apart from a plain event, since the DOM typings know only `Event`. */
function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && 'userChoice' in event;
}

/**
 * The "install app" button: shown only while the browser offers to install the page as an app, hidden once it is
 * installed. main.ts forwards window `beforeinstallprompt` to {@link Install.offer}, `appinstalled` to
 * {@link Install.installed} and `#installBtn` clicks to {@link Install.prompt}. Emits a `message` toast.
 */
export class Install {
  readonly #deps: InstallDeps;
  #offer: InstallPromptEvent | null = null;

  constructor(deps: InstallDeps) {
    this.#deps = deps;
  }

  /** Keeps the browser's offer for a later click instead of letting the browser show its own banner. */
  offer(event: Event): void {
    event.preventDefault();
    if (!isInstallPrompt(event)) return;
    this.#offer = event;
    this.#deps.button.style.display = '';
  }

  /** Shows the kept offer; an offer can be shown only once, so the button hides whatever the operator chose. */
  async prompt(): Promise<void> {
    const offer = this.#offer;
    if (!offer) return;
    // not awaited, as in the original: the choice below settles after the dialog anyway
    void offer.prompt();
    await offer.userChoice;
    this.#offer = null;
    this.#deps.button.style.display = 'none';
  }

  /** The app is installed: the button has nothing left to offer. */
  installed(): void {
    this.#deps.button.style.display = 'none';
    this.#deps.bus.emit('message', { kind: 'toast', text: he.install.done });
  }
}
