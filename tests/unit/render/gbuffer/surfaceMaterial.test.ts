import { DoubleSide, MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createSurfaceMaterial, isSurface, NEUTRAL_COLOR } from '../../../../src/render/gbuffer/surfaceMaterial';
import { SurfaceMaterials } from '../../../../src/render/gbuffer/SurfaceMaterials';

describe('the surface material of a scene material', () => {
  it('has the base colour of the material: the same colour object, so a later change is followed', () => {
    const source = new MeshStandardMaterial({ color: 0x336699, roughness: 0.4, metalness: 0.7, side: DoubleSide });
    const made = createSurfaceMaterial(source);
    expect(made.uniforms['uColor']?.value).toBe(source.color);
    source.color.setRGB(0.1, 0.2, 0.3);
    expect(made.uniforms['uColor']?.value).toEqual(source.color);
    expect(made.uniforms['uRoughness']?.value).toBe(0.4);
    expect(made.uniforms['uMetalness']?.value).toBe(0.7);
    expect(made.side).toBe(DoubleSide);
  });

  it('is matt, no metal and neutral for a material that names no look', () => {
    const made = createSurfaceMaterial(new ShaderMaterial());
    expect(made.uniforms['uColor']?.value).toBe(NEUTRAL_COLOR);
    expect(made.uniforms['uRoughness']?.value).toBe(1);
    expect(made.uniforms['uMetalness']?.value).toBe(0);
  });

  it('reads the colour map only when the material has one', () => {
    const map = new Texture();
    expect(createSurfaceMaterial(new MeshStandardMaterial({ map })).defines).toHaveProperty('USE_SURFACE_MAP');
    expect(createSurfaceMaterial(new MeshBasicMaterial()).defines).not.toHaveProperty('USE_SURFACE_MAP');
  });

  it('counts only an opaque material that writes depth as a surface', () => {
    expect(isSurface(new MeshStandardMaterial())).toBe(true);
    expect(isSurface(new MeshBasicMaterial({ transparent: true }))).toBe(false);
    expect(isSurface(new MeshBasicMaterial({ depthWrite: false }))).toBe(false);
  });

  it('is made once per scene material and freed with it', () => {
    const materials = new SurfaceMaterials();
    const source = new MeshStandardMaterial();
    const made = materials.of(source);
    const onDispose = vi.fn();
    made.addEventListener('dispose', onDispose);
    expect(materials.of(source)).toBe(made);
    source.dispose();
    expect(onDispose).toHaveBeenCalledTimes(1);
    expect(materials.size).toBe(0);
  });
});
