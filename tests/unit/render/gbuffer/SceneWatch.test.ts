import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { PerspectiveCamera, Scene, Sprite } from 'three';
import { describe, expect, it } from 'vitest';
import { SceneSwap } from '../../../../src/render/gbuffer/SceneSwap';

const replacement = new MeshBasicMaterial();
const box = new BoxGeometry();

function createScene() {
  const scene = new Scene();
  const band = new Group();
  const singer = new Mesh(box, new MeshStandardMaterial());
  band.add(singer);
  const crowd = new InstancedMesh(box, new MeshStandardMaterial(), 4);
  const glow = new Sprite();
  const haze = new Mesh(box, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
  scene.add(new Mesh(box, new MeshStandardMaterial()), band, crowd, glow, haze);
  scene.updateMatrixWorld();
  return { scene, band, singer, crowd, glow, haze };
}

/** One swap and back, as a draw of the buffers does it; returns the stamp of what it saw. */
function stampOf(swap: SceneSwap, scene: Scene): number {
  swap.apply(scene, new PerspectiveCamera(), () => replacement, replacement);
  swap.restore();
  scene.updateMatrixWorld();
  return swap.watch.stamp();
}

describe('the scene-moved stamp', () => {
  it('is one value for a scene at rest, frame after frame and draw after draw', () => {
    const { scene } = createScene();
    const swap = new SceneSwap();
    const first = stampOf(swap, scene);
    expect(swap.watch.stamp()).toBe(first);
    expect(stampOf(swap, scene)).toBe(first);
  });

  it('changes in the frame a figure moves, turns, hides, loads or leaves, with no draw in between', () => {
    const { scene, band, singer, crowd } = createScene();
    const swap = new SceneSwap();
    let last = stampOf(swap, scene);
    const moves = [
      (): unknown => (singer.position.y += 0.01),
      (): unknown => (band.rotation.y += 0.02),
      (): unknown => (band.visible = false),
      (): unknown => (band.visible = true),
      (): unknown => band.add(new Mesh(box, new MeshStandardMaterial())),
      (): unknown => crowd.setMatrixAt(1, new Matrix4().makeTranslation(1, 0, 0)),
      (): unknown => (crowd.instanceMatrix.needsUpdate = true),
      (): unknown => scene.remove(band),
    ];
    for (const [index, move] of moves.entries()) {
      move();
      scene.updateMatrixWorld();
      // writing an instance matrix alone tells nobody: the version of the buffer does
      if (index !== 5) expect(swap.watch.stamp(), `move ${String(index)}`).not.toBe(last);
      last = stampOf(swap, scene);
    }
  });

  it('is at rest for what is no surface and holds none: a glow that goes dark, a haze sheet that moves', () => {
    const { scene, glow, haze } = createScene();
    const swap = new SceneSwap();
    const last = stampOf(swap, scene);
    glow.visible = false;
    haze.position.x = 3;
    scene.updateMatrixWorld();
    expect(swap.watch.stamp()).toBe(last);
  });

  it('watches a hidden layer for its return', () => {
    const { scene, band } = createScene();
    band.visible = false;
    const swap = new SceneSwap();
    const hidden = stampOf(swap, scene);
    band.visible = true;
    expect(swap.watch.stamp()).not.toBe(hidden);
  });
});
