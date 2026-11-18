/**
 * Loads the Web Awesome chunk and waits until its components are defined. A dynamic import keeps the components out of
 * the desk's main chunk: a session that never opens the builder never parses them.
 */
export function loadBuilderShell(): Promise<void> {
  return import('../../ui/builder/wa/registerWa').then((wa) => wa.whenWaReady());
}
