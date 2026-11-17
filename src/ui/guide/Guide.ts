import { he } from '../../i18n/he';
import type { GuideChapter, GuideMarkup } from '../../i18n/he/guideChapter';
import { byId } from '../dom';
import { groupRowsMarkup, rigRowsMarkup, type GuideGroup } from './rigTable';

const SEEN_KEY = 'lumadesk-guide-seen';
const chapters: readonly GuideChapter[] = he.guide.chapters;

/**
 * The user-guide overlay: a chapter list, one chapter body and prev/next. Closing it marks the guide as seen, so the
 * first-run open happens once per browser.
 */
export class Guide {
  private index = 0;
  private readonly markup: GuideMarkup;

  /** `groups` is read only when the rig chapter renders, as before; `startTour` runs from the tour button. */
  constructor(
    groups: () => Readonly<Record<string, GuideGroup>>,
    private readonly startTour: () => void,
  ) {
    this.markup = {
      kbd: (k) => `<kbd>${k}</kbd>`,
      code: (c) => `<code>${c}</code>`,
      rigRows: rigRowsMarkup,
      groupRows: () => groupRowsMarkup(groups()),
    };
    byId('gClose').onclick = () => this.close();
    byId('gPrev').onclick = () => this.show(this.index - 1);
    byId('gNext').onclick = () => this.show(this.index + 1);
    const overlay = byId('guide');
    overlay.onclick = (ev) => {
      if (ev.target === overlay) this.close();
    };
  }

  /** Opens at chapter `i`, or at the last chapter shown when `i` is left out. */
  open(i?: number): void {
    this.show(i ?? this.index);
    byId('guide').classList.add('show');
  }

  close(): void {
    byId('guide').classList.remove('show');
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // storage can be blocked (private mode); the guide then opens again next visit, as before
    }
  }

  /** The keyboard handlers ask this: global keys are ignored while the guide is open. */
  isOpen(): boolean {
    return byId('guide').classList.contains('show');
  }

  /** On a first visit, opens chapter 1 after 600 ms so the stage has painted first. */
  openOnFirstRun(): void {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setTimeout(() => this.open(0), 600);
    } catch {
      // no storage: skip the first-run open, as before
    }
  }

  private show(i: number): void {
    this.index = i;
    const chapter = chapters[i];
    if (!chapter) throw new RangeError(`guide chapter ${i} does not exist`);
    const nav = byId('gNav');
    nav.innerHTML =
      `<div class="gt"><i></i>${he.guide.navTitle}</div>` +
      chapters
        .map((c, n) => `<button data-i="${n}" class="${n === i ? 'on' : ''}"><b>${n + 1}</b>${c.title}</button>`)
        .join('') +
      `<button class="tourBtn" id="gTour">${he.guide.tourButton}</button>`;
    byId('gTitle').textContent = `${i + 1}. ${chapter.title}`;
    const body = byId('gBody');
    body.innerHTML = chapter.html(this.markup);
    body.scrollTop = 0;
    byId('gPrev').style.visibility = i ? 'visible' : 'hidden';
    byId('gNext').style.visibility = i < chapters.length - 1 ? 'visible' : 'hidden';
    nav.querySelectorAll<HTMLElement>('button[data-i]').forEach((b) => {
      b.onclick = () => this.show(Number(b.dataset.i));
    });
    byId('gTour').onclick = () => {
      this.close();
      this.startTour();
    };
  }
}
