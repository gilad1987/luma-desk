import { BoxGeometry, InstancedMesh, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { surfaceVertexShader } from '../../../../src/render/gbuffer/glsl';
import { SceneSwap } from '../../../../src/render/gbuffer/SceneSwap';
import { createSurfaceMaterial } from '../../../../src/render/gbuffer/surfaceMaterial';
import { audiencePass, audienceVertexShader } from '../../../../src/render/venue/audience/audienceShader';

const uniforms = { uTime: { value: 0 } };

describe('the audience in the surface buffers', () => {
  it('draws a mesh that offers the audience hook with the hooked replacement, and puts its material back', () => {
    const scene = new Scene();
    const own = new MeshStandardMaterial();
    const people = new InstancedMesh(new BoxGeometry(), own, 2);
    const deck = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    const hook = vi.fn((override: MeshStandardMaterial) => audiencePass(override, uniforms));
    people.userData['audiencePass'] = hook;
    scene.add(people, deck);
    const replacement = new MeshStandardMaterial();
    const swap = new SceneSwap();
    swap.apply(scene, new PerspectiveCamera(), () => replacement, new MeshStandardMaterial());
    expect(hook).toHaveBeenCalledWith(replacement);
    expect(people.material).toBe(audiencePass(replacement, uniforms));
    expect(people.material).not.toBe(replacement);
    expect(deck.material).toBe(replacement);
    swap.restore();
    expect(people.material).toBe(own);
  });

  it('has the three.js chunks in the surface vertex shader, so the sway, the head turn and the colours land in it', () => {
    const patched = audienceVertexShader(surfaceVertexShader);
    for (const code of [
      'transformed = mix(transformed,',
      'objectNormal = mix(objectNormal,',
      'vColor.rgb *= aPart.y',
    ]) {
      expect(patched).toContain(code);
    }
    // the moved vertex and the turned normal are what the shader places, not the attributes of the mesh
    expect(surfaceVertexShader).toContain('vec4(transformed, 1.0)');
    expect(surfaceVertexShader).toMatch(/\* objectNormal;/);
    expect(patched.indexOf('transformed = mix')).toBeLessThan(patched.indexOf('vec4(transformed, 1.0)'));
  });

  it('makes one hooked material per surface material and frees it with that material', () => {
    const surface = createSurfaceMaterial(new MeshStandardMaterial());
    const hooked = audiencePass(surface, uniforms);
    expect(audiencePass(surface, uniforms)).toBe(hooked);
    const freed = vi.fn();
    hooked.addEventListener('dispose', freed);
    surface.dispose();
    expect(freed).toHaveBeenCalledTimes(1);
  });
});
