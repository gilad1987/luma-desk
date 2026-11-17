import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCanvasTexture, drawCanvas } from '../../../src/render/shared';
import { fakeCanvas } from './fakeCanvas';
import { withSeededRandom } from './seededRandom';

const settings = (t: CanvasTexture) => ({
  wrap: [t.wrapS, t.wrapT],
  repeat: t.repeat.toArray(),
  center: t.center.toArray(),
  anisotropy: t.anisotropy,
  colorSpace: t.colorSpace,
});

afterEach(() => vi.unstubAllGlobals());

describe('drawCanvas', () => {
  it('sizes the canvas, then paints it with its 2D context and size', () => {
    const context = {};
    const canvas = fakeCanvas({ context });
    vi.stubGlobal('document', { createElement: () => canvas });
    const paint = vi.fn((_: CanvasRenderingContext2D, w: number, h: number) => expect([w, h]).toEqual([64, 32]));
    expect(drawCanvas(64, 32, paint)).toBe(canvas);
    expect([canvas.width, canvas.height]).toEqual([64, 32]);
    expect(paint).toHaveBeenCalledWith(context, 64, 32);
  });

  it('fails loudly when the browser gives no 2D context', () => {
    vi.stubGlobal('document', { createElement: () => fakeCanvas({ context: null }) });
    expect(() => drawCanvas(8, 8, () => undefined)).toThrow('no 2D canvas context');
  });
});

describe('createCanvasTexture', () => {
  it('keeps every three default except the required colour space', () => {
    const plain = new CanvasTexture(fakeCanvas());
    expect(settings(createCanvasTexture(fakeCanvas(), { colorSpace: NoColorSpace }))).toEqual(settings(plain));
  });

  it('NoColorSpace leaves gobo and glow masks exactly as a bare CanvasTexture (no sRGB)', () => {
    expect(createCanvasTexture(fakeCanvas(), { colorSpace: NoColorSpace }).colorSpace).toBe(
      new CanvasTexture(fakeCanvas()).colorSpace,
    );
  });

  it('applies the deck settings: sRGB, repeat wrap on both axes, repeat 12 x 6, anisotropy 8', () => {
    const options = { colorSpace: SRGBColorSpace, wrap: RepeatWrapping, repeat: [12, 6], anisotropy: 8 } as const;
    const texture = createCanvasTexture(fakeCanvas(), options);
    expect(settings(texture)).toEqual({
      wrap: [RepeatWrapping, RepeatWrapping],
      repeat: [12, 6],
      center: [0, 0],
      anisotropy: 8,
      colorSpace: SRGBColorSpace,
    });
  });

  it('applies the gobo centre so the mask spins about its middle', () => {
    const texture = createCanvasTexture(fakeCanvas(), { colorSpace: NoColorSpace, center: [0.5, 0.5] });
    expect(texture.center.toArray()).toEqual([0.5, 0.5]);
  });

  it('paints before the texture exists, as canvasTex(w, h, draw) did (same uuids under seeded random)', () => {
    const noise = () => Array.from({ length: 5 }, () => Math.random());
    const legacy = withSeededRandom(() => {
      const dots = noise();
      const texture = new CanvasTexture(fakeCanvas());
      texture.colorSpace = SRGBColorSpace;
      return [dots, texture.uuid, texture.source.uuid];
    });
    vi.stubGlobal('document', { createElement: () => fakeCanvas() });
    const now = withSeededRandom(() => {
      let dots: number[] = [];
      const texture = createCanvasTexture(
        drawCanvas(4, 4, () => (dots = noise())),
        { colorSpace: SRGBColorSpace },
      );
      return [dots, texture.uuid, texture.source.uuid];
    });
    expect(now).toEqual(legacy);
  });
});
