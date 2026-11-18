/** The inline style both modal inputs share; only the font differs (names in Inter, numbers in JetBrains Mono). */
const FIELD_STYLE =
  'width:100%;background:#000;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font:14px ';

/** The OK and Cancel row; the confirm label differs per dialog. */
const buttons = (ok: string): string =>
  `<div class="row"><button id="mOk" class="on">${ok}</button><button id="mCancel">Cancel</button></div>`;

/**
 * The rename dialog. Only `"` is escaped in the value, as before (known quirk Q11): the value sits in an attribute,
 * and the title is trusted code text such as `Cue 3`.
 */
export const renameMarkup = (title: string, value: string): string =>
  `<h2>Label ${title}</h2><input id="mIn" style="${FIELD_STYLE}Inter" value="${value.replace(/"/g, '&quot;')}">${buttons('OK')}`;

/** The number dialog: a free-step numeric input. */
export const numberMarkup = (title: string): string =>
  `<h2>${title}</h2><input id="mIn" type="number" step="any" style="${FIELD_STYLE}'JetBrains Mono'">${buttons('Set')}`;
