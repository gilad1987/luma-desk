import { Scene } from 'three';
import { vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { StageScene } from '../../../../src/render/stage/StageScene';
import { buildVenue, type Venue } from '../../../../src/render/venue/Venue';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { withSeededRandom } from '../seededRandom';

/** A headless venue build: the scene, the venue handles and the scene children the venue added. */
export interface HeadlessVenue {
  readonly scene: Scene;
  readonly venue: Venue;
  readonly firstChild: number;
  readonly stageScene: StageScene;
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
    const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'foh' as const };
    const stageScene = new StageScene({ scene, surfaces: { setSurfaces: vi.fn() }, views }, BUILT_IN_DESIGN);
    const venue = withSeededRandom(() => buildVenue(scene, stageScene));
    return { scene, venue, firstChild, stageScene };
  } finally {
    vi.unstubAllGlobals();
  }
}
