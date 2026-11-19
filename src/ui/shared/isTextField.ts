/** Tags that take typed text: a key pressed there edits the field, so page and builder shortcuts must not act on it. */
const TEXT_FIELD_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT'];

/**
 * True when `el` is a form field that takes keys. The page keys leave every key in such a field to it (Space types a
 * space, Delete deletes a digit). The builder keys start from this test but narrow it (`takesTyping` in
 * builderKeys.ts): they still act on a checkbox, a radio button and a `select`, which take no typed text.
 */
export function isTextField(el: Element | null): boolean {
  return TEXT_FIELD_TAGS.includes(el?.tagName ?? '');
}
