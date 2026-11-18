/**
 * The MVR screen material is a flat, saturated LED blue that does not depend on the mesh's UVs: imported meshes have
 * arbitrary UVs or none, and a UV-based LED pixel grid turns into a wavy moire on them. It ignores fog, so the far
 * upstage screen keeps its colour, and it goes through the renderer's tone mapping like the rest of the scene, so it
 * reads the same with the glow pass on (OutputPass) and off (direct to canvas).
 */
import { Color, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createMvrScreenMaterial } from '../../../../src/render/mvr/mvrScreenMaterial.ts';

describe('createMvrScreenMaterial', () => {
  it('draws one flat colour without textures, UVs or lighting', () => {
    const material = createMvrScreenMaterial();
    expect(material).toBeInstanceOf(MeshBasicMaterial);
    expect(material.map).toBeNull();
  });

  it('is a saturated blue, kept clear of fog and tone mapped with the scene', () => {
    const material = createMvrScreenMaterial();
    const hsl = material.color.getHSL({ h: 0, s: 0, l: 0 });
    expect(hsl.h).toBeCloseTo(new Color(0x2a4bd7).getHSL({ h: 0, s: 0, l: 0 }).h, 1);
    expect(hsl.s).toBeGreaterThan(0.9);
    expect(material.fog).toBe(false);
    expect(material.toneMapped).toBe(true);
  });
});
