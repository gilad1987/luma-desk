import { Box3, Group, MeshStandardMaterial, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deckFitOf } from '../../../../src/domain/stage/deckFit';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { highestTrussY } from '../../../../src/domain/stage/trussTop';
import { SceneryRegistry } from '../../../../src/render/stage/SceneryRegistry';
import { createVenueMaterials } from '../../../../src/render/venue/materials';
import { placePaHang } from '../../../../src/render/venue/PaFit';
import { buildPaHangs } from '../../../../src/render/venue/PaHangs';
import { buildBandArea } from '../../../../src/render/venue/sceneryParts';
import { stubCanvasDocument } from '../stubCanvasDocument';

/** The PA builds first, two hangs (groups) and four subs (meshes) per side: the first 12 scene children. */
const PA_CHILDREN = 12;

/** Builds the real band area into a fresh scene and splits the PA into its hangs and its subs. */
function bandArea() {
  stubCanvasDocument();
  const scene = new Group();
  const scenery = new SceneryRegistry();
  const area = buildBandArea(scene, createVenueMaterials(), scenery);
  const pa = scene.children.slice(0, PA_CHILDREN);
  const hangs = pa.filter((o) => o.type === 'Group');
  const subs = pa.filter((o) => o.type === 'Mesh');
  return { area, scenery, hangs, subs };
}

const positions = (objects: readonly Object3D[]) => objects.map((o) => o.position.toArray());

afterEach(() => vi.unstubAllGlobals());

describe('buildBandArea', () => {
  it('hangs the PA of the festival through the band fit, as placePaHang places it', () => {
    const festival = createTemplate('festival');
    const { area, hangs } = bandArea();
    area.band.fit(deckFitOf(festival.deck), highestTrussY(festival));
    const expected = buildPaHangs(new Group(), new MeshStandardMaterial());
    for (const h of expected) placePaHang(h, deckFitOf(festival.deck), highestTrussY(festival));
    expect(hangs).toHaveLength(4);
    expect(positions(hangs)).toEqual(positions(expected.map((h) => h.group)));
    expect(hangs[0]?.position.y).not.toBe(21.5);
  });

  it('keeps the subs on the ground when the theatre deck is lower than the built-in one', () => {
    const theatre = createTemplate('theatre');
    const { area, subs } = bandArea();
    area.band.fit(deckFitOf(theatre.deck), highestTrussY(theatre));
    expect(subs).toHaveLength(8);
    for (const sub of subs) expect(new Box3().setFromObject(sub).min.y).toBeCloseTo(0);
  });

  it('hides and shows the PA hangs with the band scenery part', () => {
    const { scenery, hangs, subs } = bandArea();
    scenery.setVisible('band', false);
    expect([...hangs, ...subs].map((o) => o.visible)).not.toContain(true);
    scenery.setVisible('band', true);
    expect([...hangs, ...subs].map((o) => o.visible)).not.toContain(false);
  });
});
