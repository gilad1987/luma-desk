import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { depthFragmentShader, depthVertexShader, shadowTileChunk } from '../../../../src/render/shadow/glsl';

describe('the shadow GLSL', () => {
  it('gives a sampler one function, with uniform arrays as long as the atlas has tiles', () => {
    const chunk = shadowTileChunk(40);
    expect(chunk.startsWith('#define SHADOW_TILES 40\n')).toBe(true);
    expect(chunk).toContain('float beamShadow(vec2 q, float z, int tile)');
    expect(chunk).toContain('uniform highp sampler2DShadow tShadowAtlas;');
    expect(chunk).toContain('uniform vec4 uShadowTile[SHADOW_TILES];');
    expect(chunk).toContain('uniform vec2 uShadowDepth[SHADOW_TILES];');
  });

  it('writes the linear depth of the beam march, for scenery and for instanced casters', () => {
    expect(depthVertexShader).toContain('vDepth = -view.z * uInvRange;');
    expect(depthVertexShader).toContain('#ifdef USE_INSTANCING');
    expect(depthFragmentShader).toContain('gl_FragDepth = vDepth + uSlope * fwidth(vDepth);');
  });

  it('stays out of the shader set of the built-in stages, whose text the baselines pin', () => {
    const builtIn = readFileSync('src/render/shaders/index.ts', 'utf8');
    expect(builtIn).not.toMatch(/shadow|beamShadow|uInvRange/i);
  });
});
