import type { MvrActions } from './MvrActions';

/**
 * Hands the file chosen in `input` to the import and clears the input, so picking the same file again fires
 * `change` again. The Show File dialog and the missing-file prompt both have an MVR file input.
 */
export function importPickedFile(input: HTMLInputElement, mvr: Pick<MvrActions, 'importFile'>): void {
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  mvr.importFile(file);
}
