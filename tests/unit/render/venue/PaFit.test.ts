import { Box3, Group, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { deckFitOf } from '../../../../src/domain/stage/deckFit';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { highestTrussY } from '../../../../src/domain/stage/trussTop';
import { placePaHang } from '../../../../src/render/venue/PaFit';
import { buildPaHangs } from '../../../../src/render/venue/PaHangs';

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

  it('hangs the festival PA under its highest truss and above its deck', () => {
    const festival = createTemplate('festival');
    const { boxes } = fitted(festival);
    for (const box of boxes) {
      expect(box.max.y).toBeLessThanOrEqual(12);
      expect(box.max.y).toBeGreaterThan(11);
      expect(box.min.y).toBeGreaterThan(festival.deck.height);
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
});
