/**
 * G2: the head the user sees points where the beam goes. For every pose the head's world rest axis (straight down in
 * the tilt group or the pivot) must equal `dirFrom`, with and without a body `rotation`.
 */
import { Euler, Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture';
import { FixtureVisualBuilder, type LightVisual } from '../../../../src/render/fixtures';
import { DOWN, syncPose } from '../../../../src/render/fixtures/sync/syncPose';
import { buildFixtureScene } from './buildFixtureScene';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

const ROTATION = new Quaternion().setFromEuler(new Euler(0.4, 1.1, -0.7));

function setup(): { build: (f: Fixture) => LightVisual; fixtures: readonly Fixture[] } {
  stubCanvasDocument();
  const { scene, prims, beam, gobo, models, lensTextures, screenMeshes, fixtures } = buildFixtureScene();
  const picker = { register: () => undefined };
  const builder = new FixtureVisualBuilder({
    scene,
    prims,
    beam,
    gobo,
    models,
    lensTextures,
    screenMesh: screenMeshes,
    picker,
  });
  const build = (f: Fixture): LightVisual => {
    const v = builder.build(f);
    if (v.kind !== 'light') throw new Error(`fixture ${f.id} is not a light`);
    return v;
  };
  return { build, fixtures };
}

/** Poses the head, then returns the beam direction and the head's world rest axis. */
function poseHead(v: LightVisual, pan: number, tilt: number): { beam: Vector3; head: Vector3 } {
  const beam = new Vector3();
  // dt 100 s: the mover ease factor is exactly 1, so the pose reaches the output in one step
  syncPose(v, { pan, tilt, grot: 0 }, 100, beam);
  v.g.updateMatrixWorld(true);
  const turned = v.joints ? v.joints.tiltG : v.pivot;
  return { beam, head: DOWN.clone().applyQuaternion(turned.getWorldQuaternion(new Quaternion())) };
}

const find = (fixtures: readonly Fixture[], test: (f: Fixture) => boolean): Fixture => {
  const f = fixtures.find(test);
  if (!f) throw new Error('rig has no such fixture');
  return f;
};

describe('fixture body rotation (G2)', () => {
  const cases = [
    ['hang mover', (f: Fixture) => f.T.moving && !f.T.tiltOnly && f.mount !== 'floor'],
    ['floor mover', (f: Fixture) => f.T.moving && !f.T.tiltOnly && f.mount === 'floor'],
    ['static', (f: Fixture) => !f.T.moving && f.T.shape !== 'screen' && !f.pix],
  ] as const;

  for (const [name, test] of cases) {
    it(`${name}: the head points along dirFrom without a rotation (today's pose)`, () => {
      const { build, fixtures } = setup();
      const { beam, head } = poseHead(build(find(fixtures, test)), 35, 50);
      expect(head.distanceTo(beam)).toBeLessThan(1e-9);
    });

    it(`${name}: the head points along dirFrom with a rotation, and the body takes the quaternion`, () => {
      const { build, fixtures } = setup();
      const f = find(fixtures, test);
      f.rotation = ROTATION.clone();
      const v = build(f);
      expect(v.g.quaternion.angleTo(ROTATION)).toBeLessThan(1e-9);
      expect(v.flip).toBe(false);
      for (const [pan, tilt] of [
        [0, 0],
        [35, 50],
        [-120, -80],
      ] as const) {
        const { beam, head } = poseHead(v, pan, tilt);
        expect(head.distanceTo(beam)).toBeLessThan(1e-9);
      }
    });
  }
});
