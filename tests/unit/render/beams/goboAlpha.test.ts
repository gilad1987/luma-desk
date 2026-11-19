/**
 * A gobo mask is white with its shape in alpha (`drawGobo` in `GoboAtlas.ts`: a white fill, cut by
 * `destination-in`), and the sheet is not premultiplied, so its red channel is about 1 wherever the alpha is above 0.
 * The shaft and the pool must read the alpha, or a ring loses its gaps and a soft edge its fade. The picture itself
 * is checked by the e2e gate.
 */
import { describe, expect, it } from 'vitest';
import scatter from '../../../../src/render/beams/glsl/scatter.glsl?raw';
import light from '../../../../src/render/lighting/glsl/light.frag.glsl?raw';

/** The body of the `goboAt` function of a shader source. */
function goboAt(source: string): string {
  const start = source.indexOf('float goboAt(');
  return source.slice(start, source.indexOf('\n}', start));
}

describe.each([
  ['scatter.glsl (the shaft)', scatter],
  ['light.frag.glsl (the pool)', light],
])('the gobo lookup of %s', (_name, source) => {
  it('reads the alpha channel of the gobo sheet', () => {
    const body = goboAt(source);
    expect(body).toMatch(/textureLod\(tGobo,[^;]*\)\.a;/);
    expect(body).not.toMatch(/\)\.[rgb];/);
  });

  it('keeps the open gate (slot 0) at 1, with no read of the sheet', () => {
    expect(goboAt(source)).toContain('if (vGobo.x < 0.5) return 1.0;');
  });
});
