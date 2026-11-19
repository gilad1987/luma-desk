/**
 * The guard over the bodies of the non-mover families: each `tiltBar` and `yokedCan` row is drawable, with no part
 * drawn inside out or through another at rest. The mover rule and the other body facts are catalogueBodies.test.ts's.
 */
import { describe, expect, it } from 'vitest';
import type { ProductBody, TiltBarBody, YokedCanBody } from '../../../../src/domain/fixtureProducts/FixtureProduct.ts';
import { PRODUCT_IDS, PRODUCTS, type ProductId } from '../../../../src/domain/fixtureProducts/index.ts';

const BODIES: { id: ProductId; body: ProductBody }[] = PRODUCT_IDS.map((id) => ({ id, body: PRODUCTS[id].body }));

/** Every tilting bar product with its body, narrowed on the family. */
const TILT_BARS: { id: ProductId; body: TiltBarBody }[] = BODIES.flatMap(({ id, body }) =>
  body.family === 'tiltBar' ? [{ id, body }] : [],
);

/** Every yoked can product with its body, narrowed on the family. */
const YOKED_CANS: { id: ProductId; body: YokedCanBody }[] = BODIES.flatMap(({ id, body }) =>
  body.family === 'yokedCan' ? [{ id, body }] : [],
);

describe('non-mover product bodies', () => {
  it.each(TILT_BARS)('keeps the $id head, frame, cells and yoke apart, so no part is drawn inside out', ({ body }) => {
    const { base, yoke, head, frame, cells, lens } = body;
    expect([
      // the head spans the tilt axis and its rear clears the crossbar at rest
      head.front < 0 && 0 < head.rear && head.rear < yoke.y,
      // a divider between two cells is pitch - w wide, and the cell row fits the lens
      cells.w < cells.pitch && (cells.count - 1) * cells.pitch + cells.w <= lens.w,
      // the frame's side and edge strips (half - lens.w / 2, (frame.d - lens.h) / 2 in tiltBarFamily.ts) are positive
      lens.w < head.w + 2 * yoke.arm && lens.h < frame.d,
      // the crossbar ends below the base, so the pan neck between them has a positive height
      yoke.y + yoke.h < base.y - base.h,
    ]).toStrictEqual([true, true, true, true]);
  });

  it.each(YOKED_CANS)('keeps the $id dish inside its bezel and the bezel inside its arch', ({ body }) => {
    const { rim, bowl, rear, mouth, lens, arch, knob } = body;
    /** The farthest can point from the pivot, which the arch top must clear at any tilt. */
    const sweep = Math.max(Math.hypot(rim.r, rim.front), Math.hypot(rim.r, rim.back), Math.hypot(rear.r, rear.y));
    expect([
      // the reflector face sits inside the mouth, the mouth inside the bezel ring
      0 < lens.r && lens.r < mouth && mouth < rim.r,
      // the reflector face is recessed behind the bezel front, and the bezel spans the pivot
      rim.front < lens.y && rim.front < 0 && 0 < rim.back,
      // the dish narrows and runs back from bezel to bowl to rear connector
      rear.r < bowl.r && bowl.r < rim.r && rim.back < bowl.y && bowl.y < rear.y,
      // the arch sides clear the bezel, the T-knobs stand outside the arch, and the can turns under the arch top
      rim.r < arch.halfWidth && arch.halfWidth < knob && sweep < arch.height,
    ]).toStrictEqual([true, true, true, true]);
  });
});
