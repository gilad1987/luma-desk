/**
 * A tile's draw returns the triangles of that tile alone, whether the renderer restarts its count at each render
 * (`info.autoReset`, the default) or runs it on over the frame (the `?test` hook).
 */
import { Camera, Scene, type WebGLRenderer } from 'three';
import { expect, it } from 'vitest';
import { STILL_LAYOUT } from '../../../../src/render/shadow/atlasLayout';
import { AtlasTarget } from '../../../../src/render/shadow/AtlasTarget';

/** A renderer that draws `tile` triangles per render, after `drawn` triangles of earlier draws this frame. */
function fakeRenderer(autoReset: boolean, drawn: number, tile: number): WebGLRenderer {
  const info = { autoReset, render: { triangles: drawn } };
  const render = (): void => {
    if (info.autoReset) info.render.triangles = 0;
    info.render.triangles += tile;
  };
  const fake = {
    info,
    render,
    autoClear: true,
    getRenderTarget: () => null,
    setRenderTarget: () => {},
    clear: () => {},
  };
  return fake as unknown as WebGLRenderer;
}

it('counts the triangles of the tile alone with the count restarted at each render', () => {
  const atlas = new AtlasTarget(STILL_LAYOUT);
  for (const drawn of [0, 50, 5000])
    expect(atlas.draw(fakeRenderer(true, drawn, 120), new Scene(), new Camera(), 3)).toBe(120);
  atlas.dispose();
});

it('counts the triangles of the tile alone with the count run on over the frame', () => {
  const atlas = new AtlasTarget(STILL_LAYOUT);
  for (const drawn of [0, 50, 5000])
    expect(atlas.draw(fakeRenderer(false, drawn, 120), new Scene(), new Camera(), 3)).toBe(120);
  atlas.dispose();
});
