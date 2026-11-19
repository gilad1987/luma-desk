import { Box3, Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import type { StageService } from '../../engine/stage/StageService';
import type { FixtureVisuals } from '../../render/fixtures/FixtureVisuals';
import { GDTF_ROOT } from '../../render/fixtures/gdtf/gdtfRoot';

type Triple = readonly [number, number, number];

/** One fixture as drawn: metres, Y up, fit offset included; rotations as x, y, z, w. */
export interface MvrPlacement {
  readonly id: number;
  /** The MVR `<Fixture>` uuid, or null for a stage that did not come from a file. */
  readonly uuid: string | null;
  /** The rig position: the desk model origin (the tilt axis), moved from the insertion point by the mount shift. */
  readonly position: Triple;
  /** The rig's body rotation relative to the hanging rest pose, or null when the fixture has none. */
  readonly rotation: readonly [number, number, number, number] | null;
  /** What is drawn: `gdtf` is a body built from the GDTF geometry, `desk` a desk model; null without a body. */
  readonly kind: 'gdtf' | 'desk' | null;
  /**
   * The drawn body's mounting point. `gdtf`: the world position of the GDTF root geometry's origin, the point the MVR
   * matrix places. `desk`: the top of the model's rest-pose box on the group's own Y axis.
   */
  readonly clamp: Triple | null;
  /** The drawn group's world rotation. */
  readonly bodyRotation: readonly [number, number, number, number] | null;
}

/** What `__desk.test.mvrPlacements()` reports: the exact fit offset (m) and every fixture's drawn pose. */
export interface MvrPlacements {
  /** The full-precision offset; the summary dialog rounds it to 1 cm, too coarse for a 1 mm check. */
  readonly offset: Triple | null;
  readonly fixtures: readonly MvrPlacement[];
}

const isMesh = (o: Object3D): o is Mesh => (o as Partial<Mesh>).isMesh === true;

/**
 * The drawn mounting point of `g` in the world. A GDTF body: the origin of its root geometry group, read from the
 * scene; MVR places that origin, and the top of the box is another point when a mesh reaches above it. A desk model:
 * `fitDeskModel` puts the top of the model (its base plate) on the MVR insertion point along the group's Y axis, so
 * the top is read from the meshes and a wrong shift or scale shows up. A local walk: no lazy GDTF chunk is loaded.
 */
function clampOf(g: Object3D): { kind: 'gdtf' | 'desk'; at: Triple; turn: Quaternion } {
  g.updateMatrixWorld(true);
  const [at, turn, scale] = [new Vector3(), new Quaternion(), new Vector3()];
  g.matrixWorld.decompose(at, turn, scale);
  const root = g.getObjectByName(GDTF_ROOT)?.getWorldPosition(new Vector3());
  if (root) return { kind: 'gdtf', at: [root.x, root.y, root.z], turn };
  const toBody = new Matrix4().compose(at, turn, new Vector3(1, 1, 1)).invert();
  const [box, part, m] = [new Box3(), new Box3(), new Matrix4()];
  g.traverse((o) => {
    if (!isMesh(o)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const local = o.geometry.boundingBox;
    if (local) box.union(part.copy(local).applyMatrix4(m.multiplyMatrices(toBody, o.matrixWorld)));
  });
  const top = new Vector3(0, box.max.y, 0).applyQuaternion(turn).add(at);
  return { kind: 'desk', at: [top.x, top.y, top.z], turn };
}

type Deps = { stage: Pick<StageService, 'design' | 'rig'>; fixtureVisuals: Pick<FixtureVisuals, 'visuals'> };

/**
 * Reads the rig and the drawn fixture groups, for the accuracy spec's independent reader to compare with. Like
 * `measureBodies`, it puts each head at rest first (the next frame update turns it again), so the box is the body's.
 */
export function mvrPlacementHook({ stage, fixtureVisuals }: Deps): { mvrPlacements(): MvrPlacements } {
  return {
    mvrPlacements: () => {
      const info = stage.design.mvr;
      const drawn = new Map(fixtureVisuals.visuals.flatMap((v) => (v.kind === 'light' ? [[v.fixture.id, v]] : [])));
      const fixtures = stage.rig.fixtures.map(({ id, pos, rotation: q }) => {
        const v = drawn.get(id);
        v?.pivot.quaternion.identity();
        if (v?.joints) [v.joints.yoke.rotation.y, v.joints.tiltG.rotation.x] = [0, 0];
        const body = v ? clampOf(v.g) : null;
        return {
          id,
          uuid: info?.fixtures[String(id)]?.uuid ?? null,
          position: [pos.x, pos.y, pos.z] as const,
          rotation: q ? ([q.x, q.y, q.z, q.w] as const) : null,
          kind: body?.kind ?? null,
          clamp: body?.at ?? null,
          bodyRotation: body ? ([body.turn.x, body.turn.y, body.turn.z, body.turn.w] as const) : null,
        };
      });
      return { offset: info ? [info.offset[0], info.offset[1], info.offset[2]] : null, fixtures };
    },
  };
}
