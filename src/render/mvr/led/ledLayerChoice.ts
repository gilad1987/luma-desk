/** The stages that take the user's LED layer choice; the app has one, which lives as long as the page. */
const stages = new Set<(uuids: readonly string[]) => void>();

/** Lets a stage take every later LED layer choice through `apply`; the returned call ends that when the stage goes. */
export function followLedLayers(apply: (uuids: readonly string[]) => void): () => void {
  stages.add(apply);
  return () => void stages.delete(apply);
}

/** Draws the layers with these uuids as LED walls on the stage now built, and every other layer as the file gives it. */
export function setLedLayers(uuids: readonly string[]): void {
  for (const apply of stages) apply(uuids);
}
