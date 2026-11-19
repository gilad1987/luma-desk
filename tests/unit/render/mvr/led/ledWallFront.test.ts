/**
 * Which side of an LED wall is its front: toward the seats, else downstage, and for a wall side-on to that the side
 * toward the venue middle. Panel proxies emit on that face only, and a screen the file names gets its front too.
 */
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import type { MvrGeometry, MvrProxy } from '../../../../../src/mvr/index.ts';
import { classifyProxies } from '../../../../../src/mvr/scene/proxyClassify.ts';
import { drawAsLed, freeLedMaterials } from '../../../../../src/render/mvr/led/ledLayerLook.ts';
import { createLedMaterial, ledFrontIn } from '../../../../../src/render/mvr/led/ledMaterial.ts';
import { proxyPose } from '../../../../../src/render/mvr/led/ledPose.ts';
import { LedProxyLook } from '../../../../../src/render/mvr/led/ledProxyLook.ts';
import { LED_VERTEX } from '../../../../../src/render/mvr/led/ledShader.ts';
import { frontSign, seatsCentre } from '../../../../../src/render/mvr/led/ledWallFront.ts';
import { proxyGeometry, proxyMaterial } from '../../../../../src/render/mvr/proxiesShapes.ts';
import { proxyAt, wallGrid } from '../../../../shared/index.ts';

const venue = { min: [-10, 0, -10], max: [10, 8, 10] } as const;
const panels = classifyProxies(wallGrid(5, 4, 500)).filter((proxy) => proxy.kind === 'panel');
/** A drawn seat 30 m upstage of the wall (MVR +Y is upstage), so the audience is behind the usual front. */
const seat: MvrProxy = { ...proxyAt([0, 30000, 0]), kind: 'seat', inferred: true, evidence: 'name', pitch: 550 };
const upstageSeat = { ...seat, frame: seat.matrix };
const geometryWith = (proxies: readonly MvrProxy[]): MvrGeometry => ({
  placements: [],
  offset: [0, 0, 0],
  bounds: venue,
  surfaces: [],
  layers: [],
  hallLayers: [],
  proxies,
});

/** The front sign the look writes for the first panel, times that panel's own normal: the emitting direction. */
function emitsTo(proxies: readonly MvrProxy[]): number {
  const look = new LedProxyLook(geometryWith(proxies));
  const [group] = look.split(panels);
  if (!group) throw new Error('the panels draw');
  const mesh = new InstancedMesh(proxyGeometry('panel'), proxyMaterial('panel'), group.panels.length);
  look.dress(mesh, group);
  const sides = Array.from(mesh.geometry.getAttribute('ledSide').array);
  // The import turns the frames of a grid both ways, so the sign differs by panel and the world side does not.
  const to = new Set(group.panels.map((panel, i) => (sides[i] ?? 0) * (proxyPose(panel)?.normal[2] ?? 0)));
  expect(to.size).toBe(1);
  return [...to][0] ?? 0;
}

describe('frontSign', () => {
  it('takes downstage without seats, the seats with them, and the venue middle for a side-on wall', () => {
    expect(frontSign([0, 3, -6], [0, 0, 1], { seats: undefined, venue })).toBe(1);
    expect(frontSign([0, 3, -6], [0, 0, -1], { seats: undefined, venue })).toBe(-1);
    expect(frontSign([0, 3, -6], [0, 0, 1], { seats: [0, 0, -30], venue })).toBe(-1);
    expect(frontSign([-9, 3, 0], [1, 0, 0], { seats: undefined, venue })).toBe(1);
    expect(frontSign([9, 3, 0], [1, 0, 0], { seats: [9, 0, 20], venue })).toBe(-1);
    expect(seatsCentre([upstageSeat, ...panels], [1, 0, 0])).toEqual([1, 0, -30]);
    expect(seatsCentre(panels, [0, 0, 0])).toBeUndefined();
  });
});

describe('panel proxies', () => {
  it('emit on one face only: downstage without seats, toward the seats with them', () => {
    expect(panels).toHaveLength(20);
    expect(LED_VERTEX).toContain('vLedFace = max(0.0, normal.y * ledSide);');
    expect(emitsTo(panels)).toBe(1);
    expect(emitsTo([...panels, upstageSeat])).toBe(-1);
  });
});

describe('a screen the file names', () => {
  it('gets a material with the front of its mesh; instances that face two ways keep every face lit', () => {
    const panel = createLedMaterial();
    const screen = new Mesh(new BoxGeometry(4, 2, 0.2), panel);
    const pair = new InstancedMesh(new BoxGeometry(4, 2, 0.2), panel, 2);
    pair.setMatrixAt(0, new Matrix4());
    pair.setMatrixAt(1, new Matrix4().makeRotationY(Math.PI / 2));
    // A screen that stands side-on at stage right: its wide face toward the stage middle wins over its thin edge.
    const sideOn = new Mesh(new BoxGeometry(4, 2, 0.2), panel);
    sideOn.rotation.y = Math.PI / 2;
    sideOn.position.set(20, 0, 0);
    const layer = new Group().add(screen, pair, sideOn);
    drawAsLed(layer, panel, false);
    const sideFront = Array.isArray(sideOn.material) ? undefined : ledFrontIn(sideOn.material);
    expect(sideFront?.toArray().map(Math.round)).toEqual([-1, 0, 0]);
    drawAsLed(layer, panel, false);
    const front = Array.isArray(screen.material) ? undefined : ledFrontIn(screen.material);
    expect([front?.toArray().map(Math.round), screen.material === panel]).toEqual([[0, 0, 1], false]);
    expect(pair.material).toBe(panel);
    const made = screen.material;
    drawAsLed(layer, panel, false);
    expect(screen.material).toBe(made);
    let freed = 0;
    if (!Array.isArray(made)) made.addEventListener('dispose', () => (freed += 1));
    freeLedMaterials(layer);
    expect(freed).toBe(1);
  });
});
