/** The LED materials, the wall light and what they free. */
import { Group, InstancedMesh, Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wallLights, LedWallLights } from '../../../../../src/render/mvr/led/ledLights.ts';
import { setLedWallPercent } from '../../../../../src/render/mvr/led/ledUniforms.ts';
import { MvrScreenMaterials } from '../../../../../src/render/mvr/mvrScreenMaterial.ts';
import { proxyGeometry, proxyMaterial } from '../../../../../src/render/mvr/proxiesShapes.ts';

afterEach(() => setLedWallPercent(25));

const wall = { layers: [''], centre: [0, 3, -6], normal: [0, 0, -1], width: 12, height: 6 } as const;

describe('LED materials', () => {
  it('shows a file image as content, treats a placeholder as no content, and frees what it made', () => {
    const materials = new MvrScreenMaterials();
    const image = Object.assign(new Texture(), { name: 'loop.png' });
    const logo = Object.assign(new Texture(), { name: 'Vectorworks Logo RT.png' });
    const withImage = Object.assign(proxyMaterial('seat'), { map: image });
    const withLogo = Object.assign(proxyMaterial('seat'), { map: logo });
    const look = materials.of(withImage);
    expect(look).not.toBe(materials.panel);
    expect(materials.of(withImage)).toBe(look);
    expect('emissiveMap' in look && look.emissiveMap).toBe(image);
    expect(materials.of(withLogo)).toBe(materials.panel);
    const freed: string[] = [];
    look.addEventListener('dispose', () => freed.push('image'));
    materials.panel.addEventListener('dispose', () => freed.push('panel'));
    image.addEventListener('dispose', () => freed.push('texture'));
    materials.dispose();
    expect(freed.sort()).toEqual(['image', 'panel']);
  });

  it('marks the proxy variant, which reads wall coordinates from its instances', () => {
    expect(proxyMaterial('panel').defines).toHaveProperty('LED_PROXY');
    expect(new MvrScreenMaterials().panel.defines).not.toHaveProperty('LED_PROXY');
  });
});

describe('LedWallLights', () => {
  const venue = { min: [-15, 0, -15], max: [15, 10, 15] } as const;
  const walls = ['a', 'b', 'c', 'd', 'e'].map((layer, i) => ({ ...wall, layers: [layer], width: 12 - i }));
  const parked = { ...wall, layers: ['far'], centre: [-40, 3, -6], width: 30 } as const;
  const beside = { ...wall, layers: ['beside'], centre: [-21, 3, -6], width: 30 } as const;

  it('lights the largest walls on screen at the venue, never a far one, and skips a hidden layer', () => {
    const lights = new LedWallLights([...walls, parked, beside], [0, 0, 0], venue);
    const holders = new Map(['a', 'b', 'c', 'd', 'e', 'far', 'beside'].map((layer) => [layer, new Group()]));
    holders.forEach((holder, layer) => lights.attach(layer, holder));
    expect(holders.get('far')?.children).toHaveLength(0);
    lights.sync();
    expect(wallLights().map((light) => light.width)).toEqual([12, 11, 10, 9]);
    const first = holders.get('a');
    if (first) first.visible = false;
    lights.sync();
    // The wall beside the venue is the largest, but 6 m out it counts a fifth of its area, so a wall at the venue wins.
    expect(wallLights().map((light) => light.width)).toEqual([11, 10, 9, 8]);
    lights.dispose();
    expect([
      wallLights().length,
      holders.get('b')?.children.some((node) => node.visible && 'intensity' in node),
    ]).toEqual([0, false]);
  });

  it('lights in the content colour, follows the level, is dark when off and faces the audience', () => {
    const lights = new LedWallLights([{ ...wall, layers: ['a'] }], [0, 0, 0], venue);
    const holder = new Group();
    lights.attach('a', holder);
    lights.sync();
    const atQuarter = wallLights()[0]?.colour ?? [0, 0, 0];
    expect(Math.max(...atQuarter)).toBeGreaterThan(0);
    setLedWallPercent(100);
    expect(wallLights()[0]?.colour[0]).toBeCloseTo(atQuarter[0] * 4);
    expect(wallLights()[0]?.normal[2]).toBe(1);
    setLedWallPercent(0);
    lights.sync();
    // the fixed set of four lights, all dark
    expect(holder.children.flatMap((node) => ('intensity' in node ? [node.intensity] : []))).toEqual([0, 0, 0, 0]);
    lights.dispose();
  });

  it('frees geometry and material with the proxy mesh', () => {
    const mesh = new InstancedMesh(proxyGeometry('panel'), proxyMaterial('panel'), 1);
    const freed = vi.fn();
    mesh.material.addEventListener('dispose', freed);
    mesh.material.dispose();
    expect(freed).toHaveBeenCalledOnce();
  });
});
