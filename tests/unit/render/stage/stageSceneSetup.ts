import { PointLight, Scene } from 'three';
import { vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { StageScene } from '../../../../src/render/stage/StageScene';
import { createVenueMaterials } from '../../../../src/render/venue/materials';
import { stubCanvasDocument } from '../stubCanvasDocument';

/** A booted stage scene in an empty scene, with spies for the surfaces, the views and the fixture host. */
export function bootStageScene(design: StageDesign) {
  stubCanvasDocument();
  const scene = new Scene();
  const surfaces = { setSurfaces: vi.fn() };
  const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'top' as const };
  const host = { visuals: { rebuild: vi.fn() }, overlay: { setFixtures: vi.fn() }, screenLight: new PointLight() };
  const stage = new StageScene({ scene, surfaces, views }, design);
  const materials = createVenueMaterials();
  stage.deck(materials);
  stage.trusses(materials);
  stage.screens(materials);
  stage.connect(host, rigFromDesign(design).fixtures);
  return { scene, surfaces, views, host, stage, materials };
}
