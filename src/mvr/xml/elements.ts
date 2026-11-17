/**
 * Direct child elements, optionally only those with one tag. It matches `localName`, so a writer that adds a
 * namespace prefix still matches, and it never descends, because MVR nests the same tags (`ChildList`, `Matrix`) at
 * every level and a deep search would mix a child's data into its parent.
 */
export function childElements(el: Element, tag?: string): Element[] {
  return Array.from(el.children).filter((child) => tag === undefined || child.localName === tag);
}

/** The first direct child with a tag, or `undefined`; MVR allows most children at most once. */
export function childElement(el: Element, tag: string): Element | undefined {
  return childElements(el, tag)[0];
}

/**
 * The trimmed text of the first direct child with a tag, or `undefined` when there is no such child. Trimmed because
 * writers indent text nodes (`<Matrix>` over several lines) and the value parsers expect bare text.
 */
export function childText(el: Element, tag: string): string | undefined {
  return childElement(el, tag)?.textContent?.trim();
}

/**
 * The untrimmed text of the first direct child with a tag, or `undefined` when there is no such child. For GDTF names
 * only: the spec says "GDTFMode has to match the name of a DMXMode", and GDTF files keep trailing spaces in names
 * (`"Full Access Extended Mode "`), so trimming would lose them when no GDTF file restores them, as in a luma export.
 */
export function childRawText(el: Element, tag: string): string | undefined {
  return childElement(el, tag)?.textContent ?? undefined;
}

/** An attribute value, or `undefined` when it is missing, so callers use `??` instead of testing for `null`. */
export function attr(el: Element, name: string): string | undefined {
  return el.getAttribute(name) ?? undefined;
}

/**
 * Every descendant element with a tag, in document order, matched by `localName` like the child helpers. Only for
 * the few GDTF lookups that must search a whole tree (a `Beam` inside a template geometry); MVR scene reads use the
 * child helpers, because a deep search there mixes a child's data into its parent.
 */
export function descendantElements(el: Element, tag: string): Element[] {
  return Array.from(el.getElementsByTagName('*')).filter((descendant) => descendant.localName === tag);
}
