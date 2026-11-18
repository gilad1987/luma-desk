import { PointLight, Scene } from 'three';
import { vi } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { FohRig } from '../../../../src/render/camera/FohRig';
import { StageScene } from '../../../../src/render/stage/StageScene';
import type { StageMaterials } from '../../../../src/render/stage/StageSlots';
import { stubCanvasDocument } from '../stubCanvasDocument';

/** A booted stage scene with its venue in an empty scene, with spies for the surfaces, the views and the host. */
export function bootStageScene(design: StageDesign) {
  stubCanvasDocument();
  const scene = new Scene();
  const surfaces = { setSurfaces: vi.fn() };
  const views = { fitTo: vi.fn(), setView: vi.fn(), currentView: 'top' as const, fohRig: new FohRig() };
  const visuals = { assertBuildable: vi.fn<(fixtures: readonly Fixture[]) => void>(), rebuild: vi.fn() };
  const host = { visuals, overlay: { setFixtures: vi.fn() }, screenLight: new PointLight() };
  const stage = new StageScene({ scene, surfaces, views }, design);
  const deck = vi.spyOn(stage, 'deck');
  const venue = stage.buildVenue();
  const materials = deck.mock.calls[0]?.[0] as StageMaterials;
  deck.mockRestore();
  stage.connect(host, rigFromDesign(design).fixtures);
  return { scene, surfaces, views, host, stage, materials, venue };
}
