/**
 * The stage and the LED look: a stage takes the user's LED layer choice only while it holds scenery, a banner with
 * a cut-out keeps the alpha of its image, and the camera box holds every proxy that is on screen.
 */
import { MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import type { MvrGeometry } from '../../../../src/mvr/index.ts';
import { classifyProxies } from '../../../../src/mvr/scene/proxyClassify.ts';
import { setLedLayers } from '../../../../src/render/mvr/led/ledLayerLook.ts';
import { createLedMaterial } from '../../../../src/render/mvr/led/ledMaterial.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { MvrScreenMaterials } from '../../../../src/render/mvr/mvrScreenMaterial.ts';
import { proxyPoints } from '../../../../src/render/mvr/proxyPoints.ts';
import { proxyAt, wallGrid } from '../../../shared/index.ts';

const mvr = { fixtures: {}, layers: [], hiddenLayers: ['L8'], offset: [0, 0, 0] } as const;
const design = { ...createTemplate('theatre'), mvr } as unknown as StageDesign;
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-6, 0, -6], max: [6, 9, 6] },
  surfaces: [],
  layers: [],
  hallLayers: [],
};

describe('MvrStage', () => {
  it('follows the LED layer choice from `show` on and no longer after `dispose`', async () => {
    const stage = new MvrStage();
    const taken = vi.spyOn(stage, 'setLedLayers');
    setLedLayers(['L1']);
    expect(taken).not.toHaveBeenCalled();
    await stage.show({ design, geometry, meshes: new Map(), meshResources: new Map() });
    taken.mockClear();
    setLedLayers(['L1']);
    expect(taken).toHaveBeenCalledExactlyOnceWith(['L1']);
    stage.dispose();
    setLedLayers(['L2']);
    expect(taken).toHaveBeenCalledOnce();
  });
});

describe('an LED banner with a cut-out', () => {
  it('keeps the alpha of its image as the colour map; a plain screen image is the emissive map only', () => {
    const image = Object.assign(new Texture(), { name: 'banner.png' });
    expect(createLedMaterial({ image, alphaTest: 0.5 }).map).toBe(image);
    expect(createLedMaterial({ image, transparent: true }).map).toBe(image);
    expect(createLedMaterial({ image, alphaTest: 0, transparent: false }).map).toBeNull();
    const source = new MeshStandardMaterial({ map: image, alphaTest: 0.5 });
    const screen = new MvrScreenMaterials().of(source);
    expect(screen instanceof MeshStandardMaterial && [screen.map, screen.alphaTest]).toEqual([image, 0.5]);
  });
});

describe('proxyPoints', () => {
  it('holds every proxy of a shown layer, also far ones, and none of a hidden layer', () => {
    const near = wallGrid(5, 4, 500);
    const sideScreen = wallGrid(5, 4, 500, { symdef: 'S2' }).map((p) =>
      proxyAt([(p.matrix[12] ?? 0) + 60000, 0, p.matrix[14] ?? 0], p),
    );
    const hidden = wallGrid(5, 4, 500, { layer: 'L8', symdef: 'S3' }).map((p) =>
      proxyAt([(p.matrix[12] ?? 0) - 90000, 0, p.matrix[14] ?? 0], p),
    );
    const proxies = classifyProxies([...near, ...sideScreen, ...hidden]);
    const points = proxyPoints(design, { ...geometry, proxies });
    expect(points).toHaveLength(40);
    expect(Math.max(...points.map((point) => point[0]))).toBeGreaterThan(60);
    expect(Math.min(...points.map((point) => point[0]))).toBeGreaterThan(-1);
  });
});
