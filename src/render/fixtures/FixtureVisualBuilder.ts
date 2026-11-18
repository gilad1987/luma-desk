import { Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { FixturePicker } from '../picking/FixturePicker';
import { createFixtureBody } from './fixtureBody';
import { createFixtureLightObjects, type LightObjectKit } from './fixtureLightObjects';
import type { FixtureModelTable } from './FixtureModels';
import type { FixtureVisual } from './FixtureVisual';
import type { LensTextureSet } from './LensTextures';

/**
 * The LED screen meshes, each the visual and pick target of its screen fixture: one mesh used by every screen
 * fixture (the boot wiring of the built-in rig, which has one screen), or a mesh per screen fixture id (a rebuild).
 */
export type ScreenMeshes = Object3D | ReadonlyMap<number, Object3D>;

/** What the builder adds to and reads from; `screenMesh` belongs to the stage, `picker` to render core. */
export interface FixtureVisualDeps extends LightObjectKit {
  readonly models: FixtureModelTable;
  readonly lensTextures: LensTextureSet;
  readonly screenMesh: ScreenMeshes;
  /** Registered in build order, the order the picker tests hits. */
  readonly picker: Pick<FixturePicker, 'register'>;
}

/**
 * Builds the visual of each fixture (legacy `buildVis`). Call {@link build} for every fixture in fixture array
 * order: models build their shared geometry on first use, so the order decides creation order (decision 24).
 */
export class FixtureVisualBuilder {
  readonly #deps: FixtureVisualDeps;

  constructor(deps: FixtureVisualDeps) {
    this.#deps = deps;
  }

  build(f: Fixture): FixtureVisual {
    const deps = this.#deps,
      spec = f.T;
    if (spec.shape === 'screen') {
      deps.picker.register(this.#screenMeshOf(f), f);
      return { kind: 'screen', fixture: f };
    }
    const s = spec.size;
    const buildModel = spec.model === undefined ? undefined : deps.models[spec.model];
    if (s === undefined || !buildModel) throw new Error(`Fixture ${f.id}: type ${f.type} has no model or size`);
    const body = createFixtureBody(f, s, deps.lensTextures[spec.model ?? ''], deps.scene);
    const b = buildModel(body);
    for (const m of b.pick) deps.picker.register(m, f);
    return {
      kind: 'light',
      fixture: f,
      g: body.g,
      pivot: body.pivot,
      head: b.head,
      lens: b.lens,
      lensOff: b.lensOff * s,
      bodyMat: body.bodyMat,
      lensMat: body.lensMat,
      ...createFixtureLightObjects(f, deps),
      poolTex: [],
      s,
      joints: b.joints,
      flip: body.floor,
      pose: { pan: f.fixed?.pan ?? 0, tilt: f.fixed?.tilt ?? 0, gang: 0 },
    };
  }

  /** @throws Error when a per-id map has no mesh for this screen fixture. */
  #screenMeshOf(f: Fixture): Object3D {
    const meshes = this.#deps.screenMesh;
    if (meshes instanceof Object3D) return meshes;
    const mesh = meshes.get(f.id);
    if (!mesh) throw new Error(`Fixture ${f.id}: no screen mesh for this screen fixture`);
    return mesh;
  }
}
