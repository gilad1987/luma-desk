import type { FakeElement } from './FakeElement';

type Matcher = (el: FakeElement) => boolean;

const ID = /^#([\w-]+)$/;
const DATA_ATTRIBUTE = /^\[data-([\w-]+)="(.*)"\]$/;

/**
 * `CSS.escape` for the FakeDom: a backslash before every character outside `[\w-]`. Node has no `CSS` global, and
 * `matcherFor` undoes exactly this, so a key with spaces or brackets (`X (m)`) round-trips as on a real page.
 */
export function escapeCss(value: string): string {
  return value.replace(/[^\w-]/g, (c) => `\\${c}`);
}

/**
 * A test for the selectors the fake finds by walking its children: `#id` and `[data-name="value"]` (the value
 * escaped by `escapeCss`). Any other selector gives null; `querySelector` then hands out its stable parts.
 */
export function matcherFor(selector: string): Matcher | null {
  const id = ID.exec(selector)?.[1];
  if (id !== undefined) return (el) => el.id === id;
  const [, name, value] = DATA_ATTRIBUTE.exec(selector) ?? [];
  if (name === undefined || value === undefined) return null;
  const key = name.replace(/-(\w)/g, (_dash, c: string) => c.toUpperCase());
  const wanted = value.replace(/\\(.)/g, '$1');
  return (el) => el.dataset[key] === wanted;
}
