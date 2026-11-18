import type { Object3D } from 'three';
import type { FixturePicker } from '../picking/FixturePicker';
import type { LightObjectKit } from './fixtureLightObjects';
import type { FixtureModelTable } from './FixtureModels';
import type { GdtfBodySource } from './gdtf/GdtfBodySource';
import type { LensTextureSet } from './LensTextures';

/** The LED screen meshes by screen fixture id; each is the visual and pick target of its screen fixture. */
export type ScreenMeshes = ReadonlyMap<number, Object3D>;

/** What the builder adds to and reads from; `screenMesh` belongs to the stage, `picker` to render core. */
export interface FixtureVisualDeps extends LightObjectKit {
  readonly models: FixtureModelTable;
  readonly lensTextures: LensTextureSet;
  readonly screenMesh: ScreenMeshes;
  /** Registered in build order, the order the picker tests hits. */
  readonly picker: Pick<FixturePicker, 'register'>;
  /** The real GDTF bodies of an imported stage; a fixture without one keeps the desk model of its type. */
  readonly gdtf?: GdtfBodySource | undefined;
}
