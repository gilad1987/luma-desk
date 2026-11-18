import { he } from '../../i18n/he';
import { byId } from '../dom';
import type { TourStepText } from '../../i18n/he/tourStepText';
import { tipPlacement, visibleTargetBox } from './tourGeometry';
import { TOUR_TARGETS, type TourHooks } from './tourTargets';

/** Space in px between the target and the edge of the highlight hole. */
const PAD = 6;

/**
 * The guided tour: a highlight hole over one element at a time and a tip card beside it. Steps measure their target
 * one animation frame after their `before` hook, so a tab switched by the hook has laid out.
 */
export class Tour {
  private index = -1;

  readonly #hooks: TourHooks;

  constructor(hooks: TourHooks) {
    this.#hooks = hooks;
    byId('tNext').onclick = () => this.show(this.index + 1);
    byId('tPrev').onclick = () => this.show(this.index - 1);
    byId('tEnd').onclick = () => this.end();
    addEventListener('resize', () => {
      if (this.isActive()) this.show(this.index);
    });
  }

  /** The keyboard handlers ask this: global keys are ignored while the tour runs. */
  isActive(): boolean {
    return this.index >= 0;
  }

  start(): void {
    this.show(0);
  }

  end(): void {
    this.index = -1;
    byId('tourHole').style.display = byId('tourTip').style.display = 'none';
  }

  private show(i: number): void {
    this.index = i;
    const target = TOUR_TARGETS[i],
      step = he.tour.steps[i];
    if (!target || !step) throw new RangeError(`tour step ${i} does not exist`);
    const text = this.#textFor(step);
    target.before?.(this.#hooks);
    requestAnimationFrame(() => {
      const e = document.querySelector<HTMLElement>(target.selector);
      if (!e) {
        this.end();
        return;
      }
      const r = visibleTargetBox(e),
        tip = byId('tourTip');
      Object.assign(byId('tourHole').style, {
        display: 'block',
        left: r.left - PAD + 'px',
        top: r.top - PAD + 'px',
        width: r.width + PAD * 2 + 'px',
        height: r.height + PAD * 2 + 'px',
      });
      byId('tTitle').textContent = step.title;
      byId('tText').textContent = text;
      byId('tCount').textContent = `${i + 1} / ${TOUR_TARGETS.length}`;
      byId('tPrev').style.visibility = i ? 'visible' : 'hidden';
      byId('tNext').style.display = i < TOUR_TARGETS.length - 1 ? '' : 'none';
      tip.style.display = 'block';
      const at = tipPlacement(r, tip.offsetHeight, innerWidth, innerHeight);
      tip.style.left = at.left + 'px';
      tip.style.top = at.top + 'px';
    });
  }

  /** Some steps word the text per layout; the layout is read before the step's `before` hook, as the old code did. */
  #textFor(step: TourStepText): string {
    if (typeof step.text === 'string') return step.text;
    return this.#hooks.isMa() ? step.text.ma : step.text.other;
  }
}
