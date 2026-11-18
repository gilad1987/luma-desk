/**
 * Writes the error of the last failed MVR import into the Show File dialog's `#mvrImportError` line; an empty
 * `message` clears it. The line keeps the text until the next import, unlike the toast that hides after 1.8 s. The
 * dialog markup exists only while the dialog is open, so a closed dialog has no line and this writes nothing.
 */
export function setMvrImportError(message: string): void {
  const line = document.getElementById('mvrImportError');
  if (line) line.textContent = message;
}
