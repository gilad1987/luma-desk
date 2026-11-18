/**
 * The `he` areas that hold new text, not legacy strings: the MVR area (plan mvr-v2). The legacy page has none of
 * their text and no context for them, so the i18n tests that compare `he` with the legacy page leave them out.
 */
export const NEW_TEXT_AREAS: readonly string[] = ['mvr'];
