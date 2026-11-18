/**
 * Owns the placement fields of one fixture: a position field moves the fixture through `moveFixtures` (its pixel line
 * with it), and an LED wall's 'screen' fixture has no position or aim fields. The other fields are owned by
 * `PropertyPanel.test.ts`; the move rules by tests/unit/domain/stage/edit/fixtureMoves.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { fixtureProps } from '../../../../src/ui/builder/fixtureProps.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { change, control, descendants } from './toolsDom.ts';

describe('fixtureProps', () => {
  const pool = createTemplate('sultans-pool');
  let session: EditorSession;
  beforeEach(() => {
    new FakeDom();
    session = new EditorSession({ stage: fakeStage(pool) });
  });
  afterEach(() => vi.unstubAllGlobals());
  const mount = (fixture: StageFixture): FakeElement => {
    const root = new FakeElement();
    fixtureProps(session, fixture).forEach((el) => root.appendChild(asReal<FakeElement>(el)));
    return root;
  };
  const strip = pool.fixtures.find((f) => f.id === 1201);
  if (!strip?.pixel) throw new Error('fixture 1201 of the Sultan’s Pool template has a pixel line');

  it('moves the fixture and its pixel line on the edited axis only', () => {
    change(control(mount(strip), 'X (m)'), String(strip.position[0] + 2));
    const moved = session.draft.fixtures.find((f) => f.id === 1201);
    const [x, y, z] = strip.pixel?.p ?? [0, 0, 0];
    expect([moved?.position, moved?.pixel?.p]).toEqual([
      [strip.position[0] + 2, strip.position[1], strip.position[2]],
      [x + 2, y, z],
    ]);
  });

  it('shows no position or aim fields for a screen fixture', () => {
    const labels = descendants(mount({ ...strip, type: 'screen' })).flatMap((el) =>
      el.tagName === 'label' ? [el.children[0]?.textContent ?? ''] : [],
    );
    expect(labels.filter((l) => /\(m\)|\(°\)/.test(l))).toEqual([]);
  });
});
