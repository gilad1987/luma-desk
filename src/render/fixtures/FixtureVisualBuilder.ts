import type { Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import { createDeviceBody } from './deviceBody';
import { createFixtureBody } from './fixtureBody';
import { createFixtureLightObjects } from './fixtureLightObjects';
import type { FixtureModelTable } from './FixtureModels';
import type { FixtureVisual } from './FixtureVisual';
import type { FixtureVisualDeps } from './FixtureVisualDeps';

export type { FixtureVisualDeps, ScreenMeshes } from './FixtureVisualDeps';

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
    else if (f.T.shape !== 'device') this.#modelOf(f);
  }

  build(f: Fixture): FixtureVisual {
    const deps = this.#deps,
      spec = f.T;
    if (spec.shape === 'screen') {
      deps.picker.register(this.#screenMeshOf(f), f);
      return { kind: 'screen', fixture: f };
    }
    if (spec.shape === 'device') return this.#device(f);
    const [s, buildModel] = this.#modelOf(f);
    const real = deps.gdtf?.modelOf(f);
    // a GDTF body is in metres, so its group is not scaled; `s` still sizes the glow
    const body = createFixtureBody(f, real ? 1 : s, deps.lensTextures[spec.model ?? ''], deps.scene);
    const gdtf = real?.(body);
    const b = gdtf ?? buildModel(body);
    const axisAt = gdtf?.axisAt ?? deps.gdtf?.fitDesk(f, body.g);
    const beamRadius = deps.gdtf?.beamRadiusOf(f);
    for (const m of b.pick) deps.picker.register(m, f);
    deps.gdtf?.drawAfterScenery(body.g);
    return {
      kind: 'light',
      fixture: f,
      g: body.g,
      pivot: body.pivot,
      head: b.head,
      lens: b.lens,
      lensOff: b.lensOff * (gdtf ? 1 : body.g.scale.y),
      ...(axisAt ? { axisAt } : {}),
      ...(gdtf ? { beamAtLens: true as const } : {}),
      ...(gdtf?.beamFrom ? { beamFrom: gdtf.beamFrom } : {}),
      ...(beamRadius ? { beamRadius } : {}),
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

  /** A device has no desk model: its GDTF body when it has one, else a box, marks the place; both are pick targets. */
  #device(f: Fixture): FixtureVisual {
    const gdtf = this.#deps.gdtf;
    const device = createDeviceBody(f, this.#deps.scene, gdtf?.modelOf(f));
    for (const m of [device.box, ...device.pick]) this.#deps.picker.register(m, f);
    gdtf?.drawAfterScenery(device.g);
    return { kind: 'device', fixture: f, ...device };
  }

  /**
   * The model and the size it is drawn at: the type's own, times the fixture's `bodyScale` when an MVR import knows
   * the product's real size. @throws Error when the fixture type has no model or no size.
   */
  #modelOf(f: Fixture): [size: number, model: FixtureModelTable[string]] {
    const { size, model } = f.T;
    const buildModel = model === undefined ? undefined : this.#deps.models[model];
    if (size === undefined || !buildModel) throw new Error(`Fixture ${f.id}: type ${f.type} has no model or size`);
    return [size * (f.bodyScale ?? 1), buildModel];
  }

  /** @throws Error when there is no mesh for this screen fixture. */
  #screenMeshOf(f: Fixture): Object3D {
    const mesh = this.#deps.screenMesh.get(f.id);
    if (!mesh) throw new Error(`Fixture ${f.id}: no screen mesh for this screen fixture`);
    return mesh;
  }
}
