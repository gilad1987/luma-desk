import { Scene } from 'three';
import { vi } from 'vitest';
import { buildVenue, type Venue } from '../../../../src/render/venue/Venue';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { withSeededRandom } from '../seededRandom';

/** A headless venue build: the scene, the venue handles and the scene children the venue added. */
export interface HeadlessVenue {
  readonly scene: Scene;
  readonly venue: Venue;
  readonly firstChild: number;
}

/**
 * Builds the venue in Node under the seeded `Math.random`, with a fake document for the canvas textures. The scene
 * exists before seeding, as in the app (where the renderer, camera and environment lights come first).
 */
export function buildVenueHeadless(): HeadlessVenue {
  stubCanvasDocument();
  try {
    const scene = new Scene();
    const firstChild = scene.children.length;
    const venue = withSeededRandom(() => buildVenue(scene));
    return { scene, venue, firstChild };
  } finally {
    vi.unstubAllGlobals();
  }
}
