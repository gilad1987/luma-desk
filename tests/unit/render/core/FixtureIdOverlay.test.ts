import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { FixtureIdOverlay } from '../../../../src/render/StageRendererOverlay';

function overlay(fixtures = [{ id: 7, pos: new Vector3(0, 0, -10) }]) {
  const context = { clearRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '', fillStyle: '' };
  const canvas = { width: 400, height: 200, clientWidth: 200, getContext: () => context };
  const ids = new FixtureIdOverlay(canvas as unknown as HTMLCanvasElement, fixtures, (id) => id === 7);
  const camera = new PerspectiveCamera(46, 2, 0.1, 1600);
  camera.updateMatrixWorld();
  return { ids, context, canvas, camera };
}

afterEach(() => vi.unstubAllGlobals());

describe('FixtureIdOverlay', () => {
  it('only clears the canvas while hidden', () => {
    const { ids, context, camera } = overlay();
    ids.draw(camera);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 400, 200);
    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('labels on-screen fixtures 10 css px above their point, scaled by the canvas ratio', () => {
    const { ids, context, camera } = overlay();
    ids.visible = true;
    ids.draw(camera);
    expect(context.font).toBe('20px JetBrains Mono');
    expect(context.textAlign).toBe('center');
    expect(context.fillStyle).toBe('#ffc21a');
    expect(context.fillText).toHaveBeenCalledWith('7', 200, 100 - 20);
  });

  it('skips fixtures behind the camera or outside the view', () => {
    const { ids, context, camera } = overlay([
      { id: 1, pos: new Vector3(0, 0, 10) },
      { id: 2, pos: new Vector3(500, 0, -10) },
      { id: 3, pos: new Vector3(0, 0, -10) },
    ]);
    ids.visible = true;
    ids.draw(camera);
    expect(context.fillText).toHaveBeenCalledTimes(1);
    expect(context.fillStyle).toBe('#ffffff99');
  });

  it('caps the backing store ratio at 1.5', () => {
    vi.stubGlobal('devicePixelRatio', 3);
    const { ids, canvas } = overlay();
    ids.resize(100, 50);
    expect([canvas.width, canvas.height]).toEqual([150, 75]);
  });
});
