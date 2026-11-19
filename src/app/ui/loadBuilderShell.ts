/** The event Vite's preload helper dispatches on `window` when a dependency of a dynamic import fails to load. */
const PRELOAD_ERROR = 'vite:preloadError';

/** The message Vite's preload helper gives a failed CSS dependency; the URL follows it. */
const CSS_FAILURE = /^Unable to preload CSS for (\S+)$/;

/** The builder CSS files whose preload failed in this tab and that a later load must ask for again. */
const failedCss = new Set<string>();

/** What one chunk load works with; a test passes its own target, record and load. */
export interface ShellLoad {
  readonly head: HTMLElement;
  /** Where Vite dispatches `vite:preloadError` (`window`). */
  readonly events: EventTarget;
  /** The CSS URLs that failed before and are still missing; kept across loads. */
  readonly failed: Set<string>;
  readonly load: () => Promise<void>;
}

/**
 * Loads the Web Awesome chunk and waits until its components are defined. A dynamic import keeps the components out of
 * the desk's main chunk: a session that never opens the builder never parses them.
 */
export function loadBuilderShell(): Promise<void> {
  const load = (): Promise<void> => import('../../ui/builder/wa/registerWa').then((wa) => wa.whenWaReady());
  return loadWithCssRetry({ head: document.head, events: window, failed: failedCss, load });
}

/**
 * Runs `load`, first asking again for every CSS file that failed before. Vite's preload helper keeps a failed URL in
 * its module-level `seen` record (`preloadOnce`), so it never requests that file again, and a retry would open the
 * builder unstyled. A CSS failure is recorded from `vite:preloadError` while `load` runs; the event is not cancelled,
 * so the load still rejects and the toast shows. A re-link that fails rejects too and keeps the URL recorded. Risk:
 * this depends on Vite internals (the event, its `payload`, the message text); a Vite upgrade can change them.
 */
export async function loadWithCssRetry(shell: ShellLoad): Promise<void> {
  const relinks = [...shell.failed].map((href) =>
    relinkStylesheet(shell.head, href).then(() => shell.failed.delete(href)),
  );
  await Promise.all(relinks);
  const record = (event: Event): void => {
    const url = cssUrlOf('payload' in event ? event.payload : null);
    if (url !== null) shell.failed.add(url);
  };
  shell.events.addEventListener(PRELOAD_ERROR, record);
  try {
    await shell.load();
  } finally {
    shell.events.removeEventListener(PRELOAD_ERROR, record);
  }
}

/** The CSS URL in a Vite preload error (`Unable to preload CSS for <url>`), or null for any other error. */
export function cssUrlOf(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return CSS_FAILURE.exec(error.message)?.[1] ?? null;
}

/**
 * Replaces any `<link rel="stylesheet">` for `href` in `head` with a new one, which makes the browser request the file
 * again; it resolves on the link's `load` and rejects on its `error`.
 */
export function relinkStylesheet(head: HTMLElement, href: string): Promise<void> {
  head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((old) => {
    if (old.href === href) old.remove();
  });
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  return new Promise((resolve, reject) => {
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => reject(new Error(`Unable to load CSS ${href}`)));
    head.appendChild(link);
  });
}
