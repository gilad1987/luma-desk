/** A GPU-backed resource: a geometry, material or texture. */
export interface DisposableResource {
  dispose(): void;
}

/**
 * Collects the resources one build owns and frees them together on a rebuild. It is a set, so a resource tracked
 * twice is disposed once. Shared resources (kit geometry, model materials, atlas textures) must never be tracked:
 * the next build still uses them.
 */
export class Disposer {
  readonly #owned = new Set<DisposableResource>();

  /** Marks a resource as owned by the current build; returns it so a creation site can track inline. */
  track<T extends DisposableResource>(resource: T): T {
    this.#owned.add(resource);
    return resource;
  }

  /** Disposes every tracked resource once and forgets them, so the next build starts empty. */
  dispose(): void {
    for (const resource of this.#owned) resource.dispose();
    this.#owned.clear();
  }
}
