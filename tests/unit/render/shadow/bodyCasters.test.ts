import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { collectScenery } from '../../../../src/render/surface/collectScenery';
import { BodyCasters } from '../../../../src/render/shadow/BodyCasters';
import { CasterScene } from '../../../../src/render/shadow/CasterScene';
import { casts } from '../../../../src/render/shadow/casts';
import { sceneryProbe } from '../../../../src/render/shadow/sceneryProbe';
import { frustumAt } from './casterShapes';

/** A fixture as the visuals build it: a body mesh, and a beam cone that writes no depth, in one group at `x`. */
function fixture(x: number, shape: BoxGeometry): Group {
  const body = new Mesh(shape);
  const beam = new Mesh(new BoxGeometry(2, 10, 2), new MeshBasicMaterial({ transparent: true, depthWrite: false }));
  beam.position.y = -5;
  const group = new Group().add(body, beam);
  group.position.set(x, 6, 0);
  return group;
}

describe('casts', () => {
  it('is true for what blocks light and false for a sheer sheet and for what is itself light', () => {
    expect(casts(new MeshBasicMaterial())).toBe(true);
    expect(casts(new MeshBasicMaterial({ transparent: true, opacity: 0.8 }))).toBe(true);
    expect(casts(new MeshBasicMaterial({ transparent: true, opacity: 0.3 }))).toBe(false);
    expect(casts(new MeshBasicMaterial({ depthWrite: false }))).toBe(false);
    expect(casts([])).toBe(false);
  });
});

describe('BodyCasters', () => {
  it('casts the solid meshes of each body where they stand, instanced per shared geometry and cell', () => {
    const scene = new Scene();
    const shared = new BoxGeometry(0.4, 0.6, 0.4);
    const bodies = new BodyCasters(scene, new MeshBasicMaterial(), 4);
    bodies.set([fixture(0, shared), fixture(1, shared), fixture(40, shared)]);
    // one geometry in two cells; the beam cones write no depth and are not casters
    expect(bodies.parts.instanced.map((chunk) => chunk.count).sort()).toEqual([1, 2]);
    expect(bodies.parts.instanced.every((chunk) => chunk.geometry === shared)).toBe(true);
    expect(bodies.parts.triangles).toBe(36);
    expect(scene.children).toHaveLength(2);
    const seen = bodies.parts.instanced.filter((chunk) => frustumAt(40).intersectsObject(chunk));
    expect(seen.map((chunk) => chunk.count)).toEqual([1]);
    const at = new Matrix4();
    seen[0]?.getMatrixAt(0, at);
    expect(new Vector3().setFromMatrixPosition(at).toArray()).toEqual([40, 6, 0]);
  });

  it('gives a hidden body no caster, and frees the old casters when the bodies are set again', () => {
    const scene = new Scene();
    const shared = new BoxGeometry(0.4, 0.6, 0.4);
    const sharedFreed = vi.fn();
    shared.addEventListener('dispose', sharedFreed);
    const bodies = new BodyCasters(scene, new MeshBasicMaterial(), 4);
    const hidden = fixture(8, shared);
    hidden.visible = false;
    const under = new Group().add(fixture(12, shared));
    under.visible = false;
    bodies.set([fixture(0, shared), hidden, under.children[0] ?? under]);
    expect(bodies.parts.instanced.map((chunk) => chunk.count)).toEqual([1]);
    const freed = vi.fn();
    bodies.parts.instanced[0]?.addEventListener('dispose', freed);
    bodies.set([]);
    expect(freed).toHaveBeenCalledTimes(1);
    expect([scene.children.length, bodies.parts.triangles]).toEqual([0, 0]);
    // the fixtures own the geometry
    expect(sharedFreed).not.toHaveBeenCalled();
  });

  it('casts every placement of an instanced source, such as a crowd', () => {
    const crowd = new InstancedMesh(new BoxGeometry(0.5, 1.7, 0.3), undefined, 3);
    [0, 1, 40].forEach((x, i) => crowd.setMatrixAt(i, new Matrix4().makeTranslation(x, 0, 0)));
    crowd.position.set(0, 1, 0);
    const bodies = new BodyCasters(new Scene(), new MeshBasicMaterial(), 4);
    bodies.set([crowd]);
    expect(bodies.parts.instanced.map((chunk) => chunk.count).sort()).toEqual([1, 2]);
    expect(bodies.parts.instanced.filter((chunk) => frustumAt(40).intersectsObject(chunk))).toHaveLength(1);
  });

  it('raises the epoch of the caster scene when the bodies are set', () => {
    const casters = new CasterScene(new Group());
    casters.setBodies([fixture(0, new BoxGeometry(0.4, 0.6, 0.4))]);
    expect(casters.epoch).toBe(2);
    expect(casters.scene.children).toHaveLength(1);
    casters.dispose();
    expect(casters.scene.children).toHaveLength(0);
  });
});

describe('sceneryProbe', () => {
  it('traces the scenery of the beam hit test, and hits nothing without scenery', () => {
    const root = new Group().add(new Group().add(new Mesh(new BoxGeometry(2, 1, 2))));
    const probe = sceneryProbe(collectScenery(root));
    const down = new Vector3(0, -1, 0);
    expect(probe(new Vector3(0, 6, 0), down, 0.5, 20)).toBeCloseTo(5.5, 6);
    expect(probe(new Vector3(0, 6, 0), down, 0.5, 3)).toBe(Infinity);
    expect(probe(new Vector3(5, 6, 0), down, 0.5, 20)).toBe(Infinity);
    expect(sceneryProbe(null)(new Vector3(0, 6, 0), down, 0.5, 20)).toBe(Infinity);
  });
});
