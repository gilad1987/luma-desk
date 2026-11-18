/** The user's "LED" mark on a layer: its file meshes draw as LED walls, come back when the mark goes, and are saved. */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { parseMvrInfo } from '../../../../../src/domain/stage/parse/parseMvrInfo.ts';
import { Reader } from '../../../../../src/domain/stage/parse/readers.ts';
import { createLedMaterial } from '../../../../../src/render/mvr/led/ledMaterial.ts';
import { drawAsLed, followLedLayers, setLedLayers } from '../../../../../src/render/mvr/led/ledLayerLook.ts';
import { PROXY_GROUP } from '../../../../../src/render/mvr/proxies.ts';

describe('drawAsLed', () => {
  it('draws the meshes of a marked layer with the LED material and gives them their own back; proxies stay', () => {
    const [own, two] = [new MeshStandardMaterial(), [new MeshStandardMaterial(), new MeshStandardMaterial()]];
    const solid = new Mesh(new BoxGeometry(), own);
    const parts = new Mesh(new BoxGeometry(), two);
    const proxy = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    proxy.name = 'mvr-proxy-panel';
    const proxyOwn = proxy.material;
    const layer = new Group().add(solid, new Group().add(parts), proxy);
    const panel = createLedMaterial();
    drawAsLed(layer, panel, true);
    const first = solid.material;
    drawAsLed(layer, panel, true);
    // each mesh has an LED material of its own (its front differs), with the one program of every LED wall
    const keys = [solid.material, parts.material].map((m) => (Array.isArray(m) ? '' : m.customProgramCacheKey()));
    expect([keys, solid.material === first, proxy.material]).toEqual([['mvr-led', 'mvr-led'], true, proxyOwn]);
    expect([solid.material, parts.material]).not.toContain(own);
    drawAsLed(layer, panel, false);
    expect([solid.material, parts.material]).toEqual([own, two]);
  });

  it('leaves what the desk draws in the proxy group as it is: the audience keeps its clothes on a marked layer', () => {
    const figures = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    figures.name = 'mvr-audience-near';
    const seats = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    seats.name = 'mvr-proxy-seat';
    const holder = new Group().add(seats, new Group().add(figures));
    holder.name = PROXY_GROUP;
    const solid = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    const [figuresOwn, seatsOwn, solidOwn] = [figures.material, seats.material, solid.material];
    drawAsLed(new Group().add(solid, holder), createLedMaterial(), true);
    expect([figures.material === figuresOwn, seats.material === seatsOwn, solid.material === solidOwn]).toEqual([
      true,
      true,
      false,
    ]);
  });

  it('hands a later choice to every stage that follows it, until the stage ends that', () => {
    const seen: string[][] = [];
    const end = followLedLayers((uuids) => seen.push([...uuids]));
    setLedLayers(['L2']);
    end();
    setLedLayers(['L3']);
    expect(seen).toEqual([['L2']]);
  });
});

describe('parseMvrInfo', () => {
  const info = { fixtures: {}, layers: [{ uuid: 'L', name: 'Wall' }], hiddenLayers: [], offset: [0, 0, 0] };

  it('reads the layers marked as LED walls, and a design saved before the mark existed', () => {
    expect(parseMvrInfo(new Reader(), { mvr: { ...info, ledLayers: ['L'] } }, 'mvr', '')?.ledLayers).toEqual(['L']);
    const old = parseMvrInfo(new Reader(), { mvr: info }, 'mvr', '');
    expect(old && 'ledLayers' in old).toBe(false);
  });

  it('records an error for a mark list that is not a list of uuids, so the design is not loaded', () => {
    const r = new Reader();
    parseMvrInfo(r, { mvr: { ...info, ledLayers: [3] } }, 'mvr', '');
    expect(r.errors[0]).toMatch(/ledLayers/);
  });
});
