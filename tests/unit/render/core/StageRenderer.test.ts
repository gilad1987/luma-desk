import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { StageRenderer, type StageRendererParts } from '../../../../src/render/StageRenderer';
import { fakeViewer } from './fakeElements';

function stage(): { renderer: StageRenderer; parts: StageRendererParts; calls: string[] } {
  const calls: string[] = [];
  const parts = {
    renderer: {
      setSize: vi.fn(() => calls.push('renderer.setSize')),
      render: vi.fn(() => calls.push('renderer.render')),
      shadowMap: { enabled: true },
    },
    scene: new Scene(),
    views: { camera: new PerspectiveCamera(), updateControls: vi.fn(() => calls.push('controls')) },
    postFx: { setSize: vi.fn(() => calls.push('postFx.setSize')), render: vi.fn(() => calls.push('postFx.render')) },
    overlay: {
      visible: false,
      resize: vi.fn(() => calls.push('overlay.resize')),
      draw: vi.fn(() => calls.push('overlay')),
    },
    viewer: fakeViewer(800, 400),
  } as unknown as StageRendererParts;
  return { renderer: new StageRenderer(parts), parts, calls };
}

afterEach(() => vi.unstubAllGlobals());

describe('StageRenderer', () => {
  it('sizes renderer, bloom pipeline, camera and overlay to the viewer, in the legacy order', () => {
    const { renderer, parts, calls } = stage();
    renderer.resize();
    expect(parts.renderer.setSize).toHaveBeenCalledWith(800, 400, false);
    expect(parts.postFx.setSize).toHaveBeenCalledWith(800, 400);
    expect(parts.overlay.resize).toHaveBeenCalledWith(800, 400);
    expect(calls).toEqual(['renderer.setSize', 'postFx.setSize', 'overlay.resize']);
    expect(parts.views.camera.aspect).toBe(2);
    expect(parts.views.camera.view).toBeNull();
  });

  it('offsets the view by half the MA console height and clears it again at 0', () => {
    const { renderer, parts } = stage();
    renderer.setConsoleHeight(151);
    renderer.resize();
    expect(parts.views.camera.view?.offsetY).toBe(76);
    renderer.setConsoleHeight(0);
    renderer.resize();
    expect(parts.views.camera.view?.enabled).toBe(false);
  });

  it('renders through bloom with glow on and straight to the canvas with glow off, then draws the ids', () => {
    const { renderer, parts, calls } = stage();
    renderer.renderFrame();
    renderer.setGlow(false);
    renderer.renderFrame();
    expect(calls).toEqual(['controls', 'postFx.render', 'overlay', 'controls', 'renderer.render', 'overlay']);
    expect(parts.renderer.render).toHaveBeenCalledWith(parts.scene, parts.views.camera);
  });

  it('forwards the shadow and id toggles', () => {
    const { renderer, parts } = stage();
    renderer.setShadows(false);
    renderer.setShowIds(true);
    expect([parts.renderer.shadowMap.enabled, parts.overlay.visible]).toEqual([false, true]);
  });

  it('observes the viewer and resizes at once', () => {
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
      },
    );
    const { renderer, parts, calls } = stage();
    renderer.observeViewer();
    expect(observe).toHaveBeenCalledWith(parts.viewer);
    expect(calls).toContain('renderer.setSize');
  });
});
