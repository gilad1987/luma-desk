/** Truss render order by kind: the parity order of the built-in rig and the data path for edited trusses. */
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, Scene, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageTruss } from '../../../../src/domain/stage/trussTypes';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { buildTrusses } from '../../../../src/render/stage/TrussBuilder';
import { TrussKit } from '../../../../src/render/stage/TrussKit';

function build(trusses: readonly StageTruss[]) {
  const scene = new Scene(),
    kit = new TrussKit(new MeshBasicMaterial());
  buildTrusses({ parent: scene, kit, dark: new MeshBasicMaterial() }, trusses, 25.5);
  const isChain = (o: Object3D) => o instanceof Mesh && o.material === kit.chainMaterial;
  return { scene, kit, isChain };
}

describe('buildTrusses', () => {
  it('hangs the angled and ring chains at once and the straight truss chains after every truss', () => {
    const { scene, isChain } = build(BUILT_IN_DESIGN.trusses);
    const kinds = scene.children.map((o) => (isChain(o) ? 'chain' : 'steel'));
    const straightChains = BUILT_IN_DESIGN.trusses
      .filter((t) => t.params.kind === 'straight' && t.role !== 'angled')
      .reduce((n, t) => n + (t.params.kind === 'straight' ? (t.params.chains?.length ?? 0) : 0), 0);
    expect(straightChains).toBe(20);
    expect(kinds.slice(-straightChains).every((k) => k === 'chain')).toBe(true);
    expect(kinds.at(-straightChains - 1)).toBe('chain');
    const angled = BUILT_IN_DESIGN.trusses.filter((t) => t.role === 'angled').length;
    const tail = kinds.slice(-straightChains - angled * 3, -straightChains);
    expect(tail).toEqual(Array.from({ length: angled }, () => ['steel', 'chain', 'chain']).flat());
  });

  it('builds a turned circle in its own group and hangs its chains in the world from the grid', () => {
    const ring: StageTruss = {
      id: 'r',
      name: 'Ring',
      role: 'ring',
      transform: { position: [0, 10, 0], rotation: [0, 0, Math.sin(0.25), Math.cos(0.25)] },
      params: { kind: 'circle', radius: 4, section: 0.4, chains: { count: 3, phase: 0 } },
    };
    const { scene, isChain } = build([ring]);
    const group = scene.children[0];
    expect(group).toBeInstanceOf(Group);
    expect(group?.children.filter((o) => o instanceof InstancedMesh)).toHaveLength(1);
    expect(group?.children).toHaveLength(5);
    const chains = scene.children.filter(isChain);
    expect(chains).toHaveLength(3);
    for (const c of chains) expect(c.position.y + c.scale.y / 2).toBeCloseTo(25.5);
  });

  it('builds a goalpost as two posts and a beam, and a roof as one slab', () => {
    const { scene } = build([
      {
        id: 'g',
        name: 'Goalpost',
        role: 'front',
        transform: { position: [0, 0, 2] },
        params: { kind: 'goalpost', width: 10, height: 6, section: 0.3 },
      },
      {
        id: 'roof',
        name: 'Roof',
        role: 'mid',
        transform: { position: [0, 8, 0] },
        params: { kind: 'roof', size: [4, 1, 4] },
      },
    ]);
    expect(scene.children.map((o) => o.type)).toEqual(['Group', 'Group', 'Group', 'Mesh']);
    expect(scene.children[2]?.position.toArray()).toEqual([0, 6, 2]);
  });
});
