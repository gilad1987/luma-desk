/**
 * Creates an element with an optional class and inner HTML in one call. The UI builds its widgets from small HTML
 * strings, as the original code did, so the markup and therefore the screenshots stay the same.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (html !== undefined) element.innerHTML = html;
  return element;
}
