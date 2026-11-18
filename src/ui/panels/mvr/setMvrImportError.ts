/**
 * Writes the error of the last failed MVR import into the Show File dialog's `#mvrImportError` line; an empty
 * `message` clears it. The line keeps the text until the next import, unlike the toast that hides after 1.8 s.
 * `Modal.close` keeps the dialog markup until the next `open`, so after a close this writes into hidden markup, which
 * is harmless; after another dialog opened, the line is gone and this writes nothing.
 */
export function setMvrImportError(message: string): void {
  const line = document.getElementById('mvrImportError');
  if (line) line.textContent = message;
}
