/**
 * The camera box of an imported stage holds the drawn seat and LED-panel proxies of the shown layers, so the Wide and
 * Audience views see the seat rows; hidden layers, layers the import reports as far, and unknown proxies stay out.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { MvrGeometry, MvrProxy, ProxyKind } from '../../../../src/mvr/index';
import { fromThree } from '../../../../src/mvr/math/axes';
import { identity } from '../../../../src/mvr/math/Mat4';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';

const template = createTemplate('festival');
/** A 30 m x 20 m deck; the template's fixtures stand over it. */
const STAGE: StageDesign = { ...template, deck: { x0: -15, x1: 15, z0: -20, z1: 0, height: 1.5 }, fixtures: [] };

/** A proxy at a point of the three frame (metres, Y up), with its matrix and frame in the MVR frame. */
function proxy(layer: string, at: readonly [number, number, number], kind: ProxyKind = 'seat'): MvrProxy {
  const shift = identity();
  [shift[12], shift[13], shift[14]] = at;
  const m = fromThree(shift);
  const common = {
    symdef: 's',
    symdefName: '',
    name: '',
    layer,
    layerName: layer,
    matrix: m,
    kind,
    inferred: true as const,
  };
  return kind === 'unknown'
    ? { ...common, evidence: 'none' }
    : { ...common, evidence: 'spacing', pitch: 500, frame: m };
}

/** The stage layer, an audience hall floor 40 m deep in front of it, and the given proxies; fit offset 1 m in x. */
const geometry = (proxies: readonly MvrProxy[]): MvrGeometry => ({
  placements: [],
  offset: [1, 0, 0],
  bounds: { min: [-15, 0, -20], max: [15, 15, 40] },
  surfaces: [],
  layers: [
    { layer: 'stage', name: 'stage', box: { min: [-15, 0, -20], max: [15, 12, 0] }, rig: true, drapes: false },
    { layer: 'hall', name: 'hall', box: { min: [-30, 0, 0], max: [30, 0.1, 40] }, rig: false, drapes: false },
  ],
  hallLayers: ['hall'],
  proxies,
});

const SEATS = [proxy('aud', [-20, 0.5, 30]), proxy('aud', [20, 0.5, 35])];

describe('mvrCameraBounds with proxies', () => {
  it('grows the stage box to hold the seat rows, placed with the fit offset', () => {
    const box = mvrCameraBounds(STAGE, geometry(SEATS));
    expect(box.max[2]).toBeCloseTo(35);
    expect(box.min[0]).toBeCloseTo(-19);
    expect(box.max[0]).toBeCloseTo(21);
    expect(mvrCameraBounds(STAGE, geometry([])).max[2]).toBeCloseTo(0);
  });

  it('leaves out the proxies of a hidden layer', () => {
    const hidden: StageDesign = {
      ...STAGE,
      mvr: { fixtures: {}, layers: [], hiddenLayers: ['aud'], offset: [1, 0, 0] },
    };
    expect(mvrCameraBounds(hidden, geometry(SEATS))).toEqual(mvrCameraBounds(hidden, geometry([])));
  });

  it('holds a shown layer with a far part, and leaves the layer out once it is hidden', () => {
    // The import keeps a layer with one near proxy shown, so what is on screen is in the camera box; a layer that
    // is far as a whole starts hidden, and a hidden layer is out.
    const stray = [proxy('stray', [0, 0.5, 120]), proxy('stray', [0, 0.5, 30])];
    expect(mvrCameraBounds(STAGE, geometry([...SEATS, ...stray])).max[2]).toBeGreaterThan(119);
    const hidden: StageDesign = {
      ...STAGE,
      mvr: { fixtures: {}, layers: [], hiddenLayers: ['stray'], offset: [1, 0, 0] },
    };
    expect(mvrCameraBounds(hidden, geometry([...SEATS, ...stray]))).toEqual(mvrCameraBounds(hidden, geometry(SEATS)));
  });

  it('never counts an unknown proxy, which is not drawn', () => {
    const unknown = proxy('aud', [0, 0.5, 39], 'unknown');
    expect(mvrCameraBounds(STAGE, geometry([...SEATS, unknown]))).toEqual(mvrCameraBounds(STAGE, geometry(SEATS)));
  });
});
