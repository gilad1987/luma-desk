/**
 * Owns the guard of the MVR post chain against non-finite pixels: the scene copy, the bright pass of the bloom and
 * the output pass read their input through `finiteOrZero`, so one NaN pixel can never be blurred over the frame.
 */
import { GLSL3, RawShaderMaterial } from 'three';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { LuminosityHighPassShader } from 'three/addons/shaders/LuminosityHighPassShader.js';
import { OutputShader } from 'three/addons/shaders/OutputShader.js';
import { describe, expect, it } from 'vitest';
import { createDitheredOutputPass } from '../../../../src/render/post/ditherOutput';
import { FINITE_GLSL, finiteOrZero, guardFinite, withFiniteGuard } from '../../../../src/render/post/finiteGuard';

const READ = 'texture2D( tDiffuse, vUv )';
const GUARDED = `finiteOrZero( ${READ} )`;
const count = (text: string, part: string): number => text.split(part).length - 1;

describe('the guard against non-finite pixels', () => {
  it('replaces NaN and both infinities by 0 and keeps every finite value', () => {
    expect([NaN, Infinity, -Infinity].map(finiteOrZero)).toEqual([0, 0, 0]);
    expect([0, -2.5, 1e30, 65504].map(finiteOrZero)).toEqual([0, -2.5, 1e30, 65504]);
  });

  it('tests every channel for NaN and for infinity, and selects, never mixes', () => {
    for (const name of ['r', 'g', 'b', 'a'])
      expect(FINITE_GLSL).toContain(`isnan( c.${name} ) || isinf( c.${name} ) ? 0.0 : c.${name}`);
    expect(FINITE_GLSL).not.toContain('mix(');
  });

  it.each([
    ['the scene copy', CopyShader.fragmentShader],
    ['the bright pass of the bloom', LuminosityHighPassShader.fragmentShader],
    ['the output pass', OutputShader.fragmentShader],
  ])('guards every input read of %s, with the function declared before main', (_, source) => {
    const guarded = withFiniteGuard(source);
    expect(count(source, READ)).toBeGreaterThan(0);
    expect(count(guarded, GUARDED)).toBe(count(source, READ));
    expect(count(guarded, READ)).toBe(count(source, READ));
    expect(guarded.indexOf(FINITE_GLSL)).toBeGreaterThan(-1);
    expect(guarded.indexOf(FINITE_GLSL)).toBeLessThan(guarded.indexOf('void main()'));
    expect(guarded.split(FINITE_GLSL).join('').split(GUARDED).join(READ).replace('\nvoid main()', 'void main()')).toBe(
      source,
    );
  });

  it('returns a shader without the input read unchanged', () => {
    const source = 'void main() {\n\tgl_FragColor = vec4( 1.0 );\n}\n';
    expect(withFiniteGuard(source)).toBe(source);
  });

  it('compiles the raw output pass as GLSL ES 3.00, which has isnan and isinf, with the old words defined', () => {
    const { material } = createDitheredOutputPass();
    expect(material.glslVersion).toBe(GLSL3);
    expect(material.fragmentShader).toContain(GUARDED);
    for (const word of ['#define varying in', '#define gl_FragColor pc_fragColor', '#define texture2D texture'])
      expect(material.fragmentShader.indexOf(word)).toBeLessThan(material.fragmentShader.indexOf('precision'));
    expect(material.fragmentShader).toContain('layout(location = 0) out highp vec4 pc_fragColor;');
    expect(material.vertexShader.startsWith('#define attribute in\n#define varying out\n')).toBe(true);
    // a raw material is the one kind three.js does not move to GLSL ES 3.00 itself
    expect(material).toBeInstanceOf(RawShaderMaterial);
  });

  it('changes the fragment stage of a pass material in place', () => {
    const material = { fragmentShader: CopyShader.fragmentShader };
    guardFinite(material);
    expect(material.fragmentShader).toBe(withFiniteGuard(CopyShader.fragmentShader));
  });
});
