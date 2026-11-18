import { he } from '../../../i18n/he';

/**
 * The `.mvr` file picker: a label with the import tooltip around a file input. The Show File dialog and the
 * missing-file prompt both offer it, so the two pickers look and filter alike. `label` stays English (decisions 15-16).
 */
export const mvrPickMarkup = (label: string, inputId: string): string =>
  `<label class="mvrPick" title="${he.mvr.importTip}">${label} <input type="file" id="${inputId}" accept=".mvr"></label>`;
