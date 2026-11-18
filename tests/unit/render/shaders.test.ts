import { describe, expect, it } from 'vitest';
import * as shaders from '../../../src/render/shaders';
import { readGolden } from '../../shared';

// tests/golden/shaders.json holds the shader strings evaluated from the pre-refactor src/main.ts (sky 173-174, crowd
// 1166-1169, LED wall 1234-1235, BEAM_VS/BEAM_FS 1432-1434), so the check outlives the legacy script.
describe('render/shaders', () => {
  it('every ?raw import equals, byte for byte, the string the legacy script gave three.js', () => {
    expect({ ...shaders }).toStrictEqual(readGolden('shaders'));
  });

  it('the crowd chunks rebuild the legacy onBeforeCompile vertex shader', () => {
    const threeVertex = 'void main(){\n#include <begin_vertex>\n#include <project_vertex>\n}';
    const legacy =
      'attribute float aPh;attribute float aAmp;uniform float uBeat;uniform float uJump;\n' +
      threeVertex.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed.y += abs(sin(uBeat + aPh)) * aAmp * uJump;',
      );
    const rebuilt =
      shaders.crowdBounceParsChunk +
      threeVertex.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + shaders.crowdBounceVertexChunk);
    expect(rebuilt).toBe(legacy);
  });
});
