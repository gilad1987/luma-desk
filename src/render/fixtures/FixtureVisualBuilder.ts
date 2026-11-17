import type { Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { FixturePicker } from '../FixturePicker';
import { createFixtureBody } from './fixtureBody';
import { createFixtureLightObjects, type LightObjectKit } from './fixtureLightObjects';
import type { FixtureModelTable } from './FixtureModels';
import type { FixtureVisual } from './FixtureVisual';
import type { LensTextureSet } from './LensTextures';

/** What the builder adds to and reads from; `screenMesh` belongs to the venue, `picker` to render core. */
export interface FixtureVisualDeps extends LightObjectKit {
  readonly models: FixtureModelTable;
  readonly lensTextures: LensTextureSet;
  /** The venue's LED screen: the screen fixture's visual and pick target. */
  readonly screenMesh: Object3D;
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
      T = f.T;
    if (T.shape === 'screen') {
      deps.picker.register(deps.screenMesh, f);
      return { kind: 'screen', fixture: f };
    }
    const s = T.size;
    const buildModel = T.model === undefined ? undefined : deps.models[T.model];
    if (s === undefined || !buildModel) throw new Error(`Fixture ${f.id}: type ${f.type} has no model or size`);
    const body = createFixtureBody(f, s, deps.lensTextures[T.model ?? ''], deps.scene);
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
}
