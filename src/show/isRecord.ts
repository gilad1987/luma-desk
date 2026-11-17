/**
 * Whether parsed JSON is a value whose fields can be read (arrays included, as the original read them). Storage and
 * imported files are untrusted, so the show readers check this before they read a field.
 */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}
