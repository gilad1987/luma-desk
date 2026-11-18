import type { Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { FixturePicker } from '../picking/FixturePicker';
import { createFixtureBody } from './fixtureBody';
import { createFixtureLightObjects, type LightObjectKit } from './fixtureLightObjects';
import type { FixtureModelTable } from './FixtureModels';
import type { FixtureVisual } from './FixtureVisual';
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

  /**
   * Checks that {@link build} can build `f`, without building anything, so a rebuild can refuse a rig before it
   * frees the old one. @throws Error when a screen fixture has no mesh or a light type has no model or size.
   */
  assertBuildable(f: Fixture): void {
    if (f.T.shape === 'screen') this.#screenMeshOf(f);
    else this.#modelOf(f);
  }

  build(f: Fixture): FixtureVisual {
    const deps = this.#deps,
      spec = f.T;
    if (spec.shape === 'screen') {
      deps.picker.register(this.#screenMeshOf(f), f);
      return { kind: 'screen', fixture: f };
    }
    const [s, buildModel] = this.#modelOf(f);
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

  /** @throws Error when the fixture type has no model or no size. */
  #modelOf(f: Fixture): [size: number, model: FixtureModelTable[string]] {
    const { size, model } = f.T;
    const buildModel = model === undefined ? undefined : this.#deps.models[model];
    if (size === undefined || !buildModel) throw new Error(`Fixture ${f.id}: type ${f.type} has no model or size`);
    return [size, buildModel];
  }

  /** @throws Error when there is no mesh for this screen fixture. */
  #screenMeshOf(f: Fixture): Object3D {
    const mesh = this.#deps.screenMesh.get(f.id);
    if (!mesh) throw new Error(`Fixture ${f.id}: no screen mesh for this screen fixture`);
    return mesh;
  }
}
