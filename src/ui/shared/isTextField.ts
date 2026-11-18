/** Tags that take typed text: a key pressed there edits the field, so page and builder shortcuts must not act on it. */
const TEXT_FIELD_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT'];

/**
 * True when `el` is a form field that takes keys. The page keys and the builder keys both leave such a key to the
 * field (Space types a space, Delete deletes a digit), so they share this one test of what counts as a field.
 */
export function isTextField(el: Element | null): boolean {
  return TEXT_FIELD_TAGS.includes(el?.tagName ?? '');
}
