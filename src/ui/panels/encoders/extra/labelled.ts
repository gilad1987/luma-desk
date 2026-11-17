import { createElement } from '../../../shared';

/** An `.xlabel` caption (HTML, so `&nbsp;` spacers work). */
export const xlabel = (html: string): HTMLDivElement => createElement('div', 'xlabel', html);

/** A plain block: the caption, then `children` in order; every extras group has this shape. */
export function labelled(label: string, ...children: HTMLElement[]): HTMLDivElement {
  const block = createElement('div');
  block.appendChild(xlabel(label));
  for (const child of children) block.appendChild(child);
  return block;
}
