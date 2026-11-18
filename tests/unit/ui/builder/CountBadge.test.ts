/**
 * Owns the fixture count badge: the count follows the draft, and above the soft limit (500) it gets `is-warning` and
 * the Hebrew title. The one toast after an apply is owned by the StageService tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_SOFT_LIMIT, type StageFixture } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import { CountBadge } from '../../../../src/ui/builder/CountBadge.ts';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';

/** The badge element; the fake element has no `title`, so this one adds it. */
class TitledElement extends FakeElement {
  title = '';
}

const fixturesUpTo = (n: number, sample: StageFixture): StageFixture[] =>
  Array.from({ length: n }, (_, i) => ({ ...sample, id: i + 1 }));

describe('CountBadge', () => {
  let root: TitledElement, session: EditorSession, badge: CountBadge, sample: StageFixture;
  beforeEach(() => {
    new FakeDom();
    root = new TitledElement();
    const theatre = createTemplate('theatre');
    const [first] = theatre.fixtures;
    if (!first) throw new Error('the theatre template has fixtures');
    sample = first;
    session = new EditorSession({ stage: fakeStage(theatre) });
    badge = new CountBadge(asReal<HTMLElement>(root), session);
  });
  afterEach(() => vi.unstubAllGlobals());
  const paint = (): [string, string, boolean] => [root.textContent, root.title, root.classList.contains('is-warning')];

  it('shows the count of the draft without a warning up to the soft limit', () => {
    session.edit((d) => ({ ...d, fixtures: fixturesUpTo(FIXTURE_SOFT_LIMIT, sample) }));
    expect(paint()).toEqual(['500 fixtures', '', false]);
  });

  it('warns with the Hebrew title above the soft limit', () => {
    session.edit((d) => ({ ...d, fixtures: fixturesUpTo(FIXTURE_SOFT_LIMIT + 1, sample) }));
    expect(paint()).toEqual(['501 fixtures', he.builder.tooManyFixtures(501), true]);
  });

  it('stops following the session after dispose', () => {
    const before = paint();
    badge.dispose();
    session.edit((d) => ({ ...d, fixtures: [] }));
    expect(paint()).toEqual(before);
  });
});
