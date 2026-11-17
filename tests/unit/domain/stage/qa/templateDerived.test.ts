/**
 * QA2: every built-in template goes through the pure stage functions (rig derivation, frame, surfaces, bounds) and
 * through mirror without a throw, a NaN or a broken link, so a template edit cannot break the app on load.
 */
import { describe, expect, it } from 'vitest';
import { boundsOf } from '../../../../../src/domain/stage/bounds.ts';
import { rigFromDesign } from '../../../../../src/domain/stage/deriveRig.ts';
import { mirrorStageLeft } from '../../../../../src/domain/stage/edit/itemOps.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { frameOf } from '../../../../../src/domain/stage/StageFrame.ts';
import { surfacesOf } from '../../../../../src/domain/stage/surfaces.ts';
import { createTemplate, TEMPLATE_IDS } from '../../../../../src/domain/stage/templates/index.ts';

const allFinite = (values: readonly number[]): boolean => values.every((v) => Number.isFinite(v));

function expectLinksValid(d: StageDesign): void {
  const ids = d.fixtures.map((f) => f.id);
  const trussIds = new Set(d.trusses.map((t) => t.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(d.trusses.map((t) => t.id)).size).toBe(d.trusses.length);
  expect(d.fixtures.filter((f) => f.trussId !== null && !trussIds.has(f.trussId))).toEqual([]);
}

describe.each(TEMPLATE_IDS)('QA2 template %s through the pure stage functions', (id) => {
  const d = createTemplate(id);

  it('derives a rig with one fixture per design fixture, same ids, finite positions', () => {
    const rig = rigFromDesign(d);
    expect(rig.fixtures.map((f) => f.id)).toEqual(d.fixtures.map((f) => f.id));
    expect(new Set(rig.fixtures.map((f) => f.id)).size).toBe(rig.fixtures.length);
    expect(rig.fixtures.filter((f) => !allFinite([f.pos.x, f.pos.y, f.pos.z]))).toEqual([]);
  });

  it('gives a finite frame, surfaces and bounds', () => {
    const frame = frameOf(d);
    const { x0, x1, z0, z1, height } = frame.deck;
    expect(allFinite([x0, x1, z0, z1, height])).toBe(true);
    if (frame.ring) expect(allFinite([frame.ring.x, frame.ring.y, frame.ring.z, frame.ring.R])).toBe(true);
    expect(frame.bandPoints.every((p) => allFinite(Object.values(p).filter((v) => typeof v === 'number')))).toBe(true);
    const boxes = surfacesOf(d);
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((b) => allFinite([...b.min, ...b.max]))).toBe(true);
    const bounds = boundsOf(d);
    expect(allFinite([...bounds.min, ...bounds.max])).toBe(true);
    bounds.min.forEach((v, axis) => expect(v).toBeLessThanOrEqual(bounds.max[axis] ?? Number.NaN));
  });

  it('builds a fresh design on every call, so one edit cannot leak into the next template', () => {
    expect(createTemplate(id)).not.toBe(d);
    expect(createTemplate(id)).toEqual(d);
  });

  it('mirrors into a design with valid links, and a second mirror adds nothing', () => {
    const once = mirrorStageLeft(d);
    expectLinksValid(once);
    const twice = mirrorStageLeft(once);
    expect(twice.fixtures.length).toBe(once.fixtures.length);
    expect(twice.trusses.length).toBe(once.trusses.length);
  });
});
