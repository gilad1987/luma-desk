import { Box3, Group, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { deckFitOf } from '../../../../src/domain/stage/deckFit';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { highestTrussY } from '../../../../src/domain/stage/trussTop';
import { placePaHang } from '../../../../src/render/venue/PaFit';
import { buildPaHangs } from '../../../../src/render/venue/PaHangs';

/** Float slack for a box that sits exactly on the deck: the lift and the box offset each round once. */
const EPS = 1e-9;

/** Builds the PA into a fresh scene and fits its hangs to `design`, as `StageVenue.apply` does. */
function fitted(design: StageDesign) {
  const hangs = buildPaHangs(new Group(), new MeshStandardMaterial());
  const built = hangs.map((h) => h.group.position.toArray());
  for (const h of hangs) placePaHang(h, deckFitOf(design.deck), highestTrussY(design));
  return { hangs, built, boxes: hangs.map((h) => new Box3().setFromObject(h.group)) };
}

describe('placePaHang', () => {
  it('keeps the built-in PA at its exact built numbers', () => {
    const { hangs, built } = fitted(BUILT_IN_DESIGN);
    expect(hangs.map((h) => h.group.position.toArray())).toEqual(built);
    expect(built[0]).toEqual([-29, 21.5, 3]);
  });

  it('hangs the festival PA 0.3 m under its highest truss underside, at its fitted plan place', () => {
    const festival = createTemplate('festival');
    const fit = deckFitOf(festival.deck);
    const { hangs, boxes } = fitted(festival);
    for (const [i, box] of boxes.entries()) {
      // The mid and back trusses: 12 m less half their 0.52 m section is 11.74, less the 0.3 m gap.
      expect(box.max.y).toBeCloseTo(11.44);
      expect(box.min.y).toBeGreaterThan(festival.deck.height);
      const h = hangs[i];
      expect(h?.group.position.x).toBeCloseTo((h?.x ?? 0) * fit.scaleX + fit.offsetX);
      expect(h?.group.position.z).toBeCloseTo((h?.z ?? 0) * fit.scaleZ + fit.offsetZ);
    }
  });

  it('stands the PA of a design with no truss on its deck, at the side edges', () => {
    const empty = createTemplate('empty');
    const { hangs, boxes } = fitted(empty);
    for (const [i, box] of boxes.entries()) {
      expect(box.min.y).toBeCloseTo(empty.deck.height);
      const edge = (hangs[i]?.side ?? 0) < 0 ? empty.deck.x0 : empty.deck.x1;
      expect(Math.abs(box.getCenter(new Vector3()).x - edge)).toBeLessThan(1.5);
      expect(box.min.x).toBeGreaterThanOrEqual(empty.deck.x0);
      expect(box.max.x).toBeLessThanOrEqual(empty.deck.x1);
      expect(box.max.z).toBeLessThanOrEqual(empty.deck.z1);
    }
  });

  it('stands the two hangs of each side a row apart in z', () => {
    const { hangs } = fitted(createTemplate('empty'));
    for (const side of [-1, 1]) {
      const [outer, inner] = hangs.filter((h) => h.side === side).map((h) => h.group.position.z);
      expect((outer ?? 0) - (inner ?? 0)).toBeCloseTo(1.6);
    }
  });

  it('stands the PA on the deck when the highest truss is too low to hang it over the deck (theatre)', () => {
    const theatre = createTemplate('theatre');
    const { boxes } = fitted(theatre);
    for (const box of boxes) expect(box.min.y).toBeGreaterThanOrEqual(theatre.deck.height - EPS);
  });
});
