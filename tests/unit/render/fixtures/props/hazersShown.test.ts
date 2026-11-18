/**
 * The built-in hazers hide on a stage that does not have them (an MVR import), cases and puffs alike, while the haze
 * master still reaches the beams: haze is the room's atmosphere, not a prop.
 */
import { Object3D, Scene, Sprite } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DECK } from '../../../../../src/domain/venue';
import { FohRig } from '../../../../../src/render/camera/FohRig';
import * as fx from '../../../../../src/render/fixtures';
import { stubCanvasDocument } from '../../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

function buildProps() {
  stubCanvasDocument();
  const scene = new Scene();
  const kit = { prims: new fx.ModelPrimitives(), materials: fx.createModelMaterials(fx.createTrimMaterial()) };
  const beamHaze = { value: 0 };
  const fohRig = new FohRig();
  fohRig.add(new Object3D());
  const props = new fx.Props({ scene, kit, fohRig, state: { haze: 0.5 }, beamHaze });
  const puffs = scene.children.filter((o) => o instanceof Sprite);
  const cases = scene.children.filter((o) => !(o instanceof Sprite) && o.position.y === DECK && o.position.z < -15);
  return { props, puffs, cases, beamHaze };
}

describe('Props hazers', () => {
  it('hides the hazer cases and puffs and keeps the beam haze', () => {
    const { props, puffs, cases, beamHaze } = buildProps();
    expect([puffs.length, cases.length]).toEqual([12, 4]);
    props.setHazersShown(false);
    props.update(1);
    expect([...cases, ...puffs].some((o) => o.visible)).toBe(false);
    expect(beamHaze.value).toBe(0.5);
  });

  it('shows them again on a stage that has them', () => {
    const { props, puffs, cases } = buildProps();
    props.setHazersShown(false);
    props.setHazersShown(true);
    props.update(1);
    expect([...cases, ...puffs].every((o) => o.visible)).toBe(true);
  });
});
